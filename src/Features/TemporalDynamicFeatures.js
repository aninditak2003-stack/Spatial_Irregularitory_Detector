/**
 * TemporalDynamicFeatures - Extract temporal and kinematic features from live handwriting
 * Only available for live canvas data (not static images)
 */

class TemporalDynamicFeatures {
    constructor() {
        this.features = {};
    }

    /**
     * Extract all temporal and dynamic features from canvas data
     */
    extractFromCanvasData(canvasData) {
        const { strokes, rawData, sessionDuration } = canvasData;

        if (!strokes || strokes.length === 0 || !rawData || rawData.length === 0) {
            return this.getEmptyFeatures();
        }

        // Temporal features
        const temporalFeatures = this.extractTemporalFeatures(strokes, rawData, sessionDuration);

        // Velocity features
        const velocityFeatures = this.extractVelocityFeatures(rawData, strokes);

        // Acceleration features
        const accelerationFeatures = this.extractAccelerationFeatures(rawData);

        // Jerk features (smoothness)
        const jerkFeatures = this.extractJerkFeatures(rawData);

        // Pressure features
        const pressureFeatures = this.extractPressureFeatures(rawData, strokes);

        // Pause analysis
        const pauseFeatures = this.extractPauseFeatures(strokes);

        // Rhythm and fluency
        const fluencyFeatures = this.calculateFluencyMetrics(strokes, velocityFeatures, jerkFeatures);

        this.features = {
            type: 'live_temporal_dynamic',
            temporal: temporalFeatures,
            velocity: velocityFeatures,
            acceleration: accelerationFeatures,
            jerk: jerkFeatures,
            pressure: pressureFeatures,
            pauses: pauseFeatures,
            fluency: fluencyFeatures
        };

        return this.features;
    }

    // ==================== TEMPORAL FEATURES ====================

    extractTemporalFeatures(strokes, rawData, sessionDuration) {
        const strokeDurations = strokes.map(s => s.endTime - s.startTime);
        const totalPenDownTime = strokeDurations.reduce((a, b) => a + b, 0);
        const totalPenUpTime = sessionDuration - totalPenDownTime;

        // Calculate in-air times (between strokes)
        const inAirTimes = [];
        for (let i = 1; i < strokes.length; i++) {
            const inAirTime = strokes[i].startTime - strokes[i-1].endTime;
            if (inAirTime > 0) {
                inAirTimes.push(inAirTime);
            }
        }

        return {
            sessionDuration: sessionDuration,
            totalPenDownTime: totalPenDownTime,
            totalPenUpTime: totalPenUpTime,
            penDownRatio: sessionDuration > 0 ? totalPenDownTime / sessionDuration : 0,

            strokeCount: strokes.length,
            strokeDurations: {
                mean: this.mean(strokeDurations),
                std: this.std(strokeDurations),
                min: Math.min(...strokeDurations),
                max: Math.max(...strokeDurations),
                values: strokeDurations
            },

            inAirTimes: {
                mean: this.mean(inAirTimes),
                std: this.std(inAirTimes),
                total: inAirTimes.reduce((a, b) => a + b, 0),
                count: inAirTimes.length
            },

            writingTempo: sessionDuration > 0 ? (strokes.length / sessionDuration) * 1000 : 0, // strokes per second
            pointsPerSecond: sessionDuration > 0 ? (rawData.length / sessionDuration) * 1000 : 0
        };
    }

    // ==================== VELOCITY FEATURES ====================

    extractVelocityFeatures(rawData, strokes) {
        const velocities = [];
        const horizontalVelocities = [];
        const verticalVelocities = [];
        const velocityPeaks = [];

        let prevVelocity = 0;
        let peakCount = 0;

        for (let i = 1; i < rawData.length; i++) {
            const curr = rawData[i];
            const prev = rawData[i - 1];

            // Skip if different strokes (pen was lifted)
            if (curr.strokeId !== prev.strokeId) continue;

            const dt = curr.timestamp - prev.timestamp;
            if (dt <= 0) continue;

            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const velocity = distance / dt;
            const vx = dx / dt;
            const vy = dy / dt;

            velocities.push(velocity);
            horizontalVelocities.push(vx);
            verticalVelocities.push(vy);

            // Detect velocity peaks (local maxima)
            if (i > 1 && velocity > prevVelocity && velocities.length > 2) {
                const prevPrevV = velocities[velocities.length - 3];
                if (prevVelocity > prevPrevV) {
                    // This is after a peak
                    if (prevVelocity > velocity) {
                        peakCount++;
                        velocityPeaks.push({
                            index: i - 1,
                            velocity: prevVelocity,
                            timestamp: prev.timestamp
                        });
                    }
                }
            }
            prevVelocity = velocity;
        }

        // Stroke-level velocity analysis
        const strokeVelocities = strokes.map(stroke => {
            const strokePoints = rawData.filter(p => p.strokeId === stroke.id);
            const strokeVels = [];

            for (let i = 1; i < strokePoints.length; i++) {
                const dt = strokePoints[i].timestamp - strokePoints[i-1].timestamp;
                if (dt > 0) {
                    const dist = Math.sqrt(
                        Math.pow(strokePoints[i].x - strokePoints[i-1].x, 2) +
                        Math.pow(strokePoints[i].y - strokePoints[i-1].y, 2)
                    );
                    strokeVels.push(dist / dt);
                }
            }

            return {
                strokeId: stroke.id,
                meanVelocity: this.mean(strokeVels),
                maxVelocity: strokeVels.length > 0 ? Math.max(...strokeVels) : 0,
                velocityVariance: this.variance(strokeVels)
            };
        });

        return {
            instantaneous: velocities,
            horizontal: horizontalVelocities,
            vertical: verticalVelocities,

            mean: this.mean(velocities),
            std: this.std(velocities),
            min: velocities.length > 0 ? Math.min(...velocities) : 0,
            max: velocities.length > 0 ? Math.max(...velocities) : 0,
            variance: this.variance(velocities),

            meanHorizontal: this.mean(horizontalVelocities),
            meanVertical: this.mean(verticalVelocities),

            peakCount: peakCount,
            velocityPeaks: velocityPeaks,
            peakFrequency: rawData.length > 0 ?
                peakCount / ((rawData[rawData.length-1].timestamp - rawData[0].timestamp) / 1000) : 0,

            strokeLevel: strokeVelocities
        };
    }

    // ==================== ACCELERATION FEATURES ====================

    extractAccelerationFeatures(rawData) {
        const accelerations = [];
        const horizontalAccels = [];
        const verticalAccels = [];
        let directionChanges = 0;

        let prevVx = 0, prevVy = 0, prevStrokeId = null;

        for (let i = 2; i < rawData.length; i++) {
            const curr = rawData[i];
            const prev = rawData[i - 1];
            const prevPrev = rawData[i - 2];

            // Skip stroke boundaries
            if (curr.strokeId !== prev.strokeId || prev.strokeId !== prevPrev.strokeId) {
                prevStrokeId = null;
                continue;
            }

            const dt1 = prev.timestamp - prevPrev.timestamp;
            const dt2 = curr.timestamp - prev.timestamp;

            if (dt1 <= 0 || dt2 <= 0) continue;

            // Velocities
            const vx1 = (prev.x - prevPrev.x) / dt1;
            const vy1 = (prev.y - prevPrev.y) / dt1;
            const vx2 = (curr.x - prev.x) / dt2;
            const vy2 = (curr.y - prev.y) / dt2;

            // Accelerations
            const dt = (dt1 + dt2) / 2;
            const ax = (vx2 - vx1) / dt;
            const ay = (vy2 - vy1) / dt;
            const totalAccel = Math.sqrt(ax * ax + ay * ay);

            accelerations.push(totalAccel);
            horizontalAccels.push(ax);
            verticalAccels.push(ay);

            // Count direction changes (acceleration sign changes)
            if (prevStrokeId === curr.strokeId) {
                if ((prevVx > 0 && vx2 < 0) || (prevVx < 0 && vx2 > 0)) {
                    directionChanges++;
                }
                if ((prevVy > 0 && vy2 < 0) || (prevVy < 0 && vy2 > 0)) {
                    directionChanges++;
                }
            }

            prevVx = vx2;
            prevVy = vy2;
            prevStrokeId = curr.strokeId;
        }

        // Separate positive (acceleration) and negative (deceleration) phases
        const positiveAccels = accelerations.filter((a, i) => {
            // Approximate: if velocity is increasing
            return i > 0 && accelerations[i] > accelerations[i-1];
        });

        const negativeAccels = accelerations.filter((a, i) => {
            return i > 0 && accelerations[i] < accelerations[i-1];
        });

        return {
            instantaneous: accelerations,
            horizontal: horizontalAccels,
            vertical: verticalAccels,

            mean: this.mean(accelerations),
            std: this.std(accelerations),
            min: accelerations.length > 0 ? Math.min(...accelerations) : 0,
            max: accelerations.length > 0 ? Math.max(...accelerations) : 0,
            variance: this.variance(accelerations),

            meanHorizontal: this.mean(horizontalAccels),
            meanVertical: this.mean(verticalAccels),

            directionChanges: directionChanges,

            accelerationPhase: {
                mean: this.mean(positiveAccels),
                ratio: accelerations.length > 0 ? positiveAccels.length / accelerations.length : 0
            },
            decelerationPhase: {
                mean: this.mean(negativeAccels),
                ratio: accelerations.length > 0 ? negativeAccels.length / accelerations.length : 0
            }
        };
    }

    // ==================== JERK FEATURES (SMOOTHNESS) ====================

    extractJerkFeatures(rawData) {
        const jerks = [];

        for (let i = 3; i < rawData.length; i++) {
            const p0 = rawData[i - 3];
            const p1 = rawData[i - 2];
            const p2 = rawData[i - 1];
            const p3 = rawData[i];

            // Skip stroke boundaries
            if (p3.strokeId !== p2.strokeId || p2.strokeId !== p1.strokeId || p1.strokeId !== p0.strokeId) {
                continue;
            }

            const dt01 = p1.timestamp - p0.timestamp;
            const dt12 = p2.timestamp - p1.timestamp;
            const dt23 = p3.timestamp - p2.timestamp;

            if (dt01 <= 0 || dt12 <= 0 || dt23 <= 0) continue;

            // Calculate velocities
            const v01 = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2)) / dt01;
            const v12 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)) / dt12;
            const v23 = Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2)) / dt23;

            // Calculate accelerations
            const a1 = (v12 - v01) / ((dt01 + dt12) / 2);
            const a2 = (v23 - v12) / ((dt12 + dt23) / 2);

            // Calculate jerk
            const jerk = (a2 - a1) / ((dt12));
            jerks.push(Math.abs(jerk));
        }

        // Calculate normalized jerk (dimensionless smoothness measure)
        const totalDuration = rawData.length > 1 ?
            (rawData[rawData.length - 1].timestamp - rawData[0].timestamp) : 1;

        // Total path length
        let pathLength = 0;
        for (let i = 1; i < rawData.length; i++) {
            if (rawData[i].strokeId === rawData[i-1].strokeId) {
                pathLength += Math.sqrt(
                    Math.pow(rawData[i].x - rawData[i-1].x, 2) +
                    Math.pow(rawData[i].y - rawData[i-1].y, 2)
                );
            }
        }

        // Jerk cost (integral of squared jerk)
        const jerkCost = jerks.reduce((sum, j) => sum + j * j, 0);

        // Normalized jerk (lower is smoother)
        const normalizedJerk = pathLength > 0 && totalDuration > 0 ?
            Math.sqrt(jerkCost * Math.pow(totalDuration, 5) / Math.pow(pathLength, 2)) : 0;

        return {
            instantaneous: jerks,
            mean: this.mean(jerks),
            std: this.std(jerks),
            max: jerks.length > 0 ? Math.max(...jerks) : 0,
            jerkCost: jerkCost,
            normalizedJerk: normalizedJerk,
            smoothnessIndex: normalizedJerk > 0 ? 1 / normalizedJerk : 1
        };
    }

    // ==================== PRESSURE FEATURES ====================

    extractPressureFeatures(rawData, strokes) {
        const pressures = rawData.map(p => p.pressure).filter(p => p !== undefined);

        if (pressures.length === 0) {
            return this.getEmptyPressureFeatures();
        }

        // Pressure changes
        const pressureChanges = [];
        for (let i = 1; i < rawData.length; i++) {
            if (rawData[i].strokeId === rawData[i-1].strokeId) {
                const dt = rawData[i].timestamp - rawData[i-1].timestamp;
                if (dt > 0) {
                    pressureChanges.push(Math.abs(rawData[i].pressure - rawData[i-1].pressure) / dt);
                }
            }
        }

        // Stroke-level pressure
        const strokePressures = strokes.map(stroke => {
            const strokePoints = rawData.filter(p => p.strokeId === stroke.id);
            const ps = strokePoints.map(p => p.pressure);
            return {
                strokeId: stroke.id,
                meanPressure: this.mean(ps),
                maxPressure: Math.max(...ps),
                minPressure: Math.min(...ps),
                pressureRange: Math.max(...ps) - Math.min(...ps)
            };
        });

        return {
            mean: this.mean(pressures),
            std: this.std(pressures),
            min: Math.min(...pressures),
            max: Math.max(...pressures),
            variance: this.variance(pressures),
            range: Math.max(...pressures) - Math.min(...pressures),

            meanPressureChange: this.mean(pressureChanges),
            maxPressureChange: pressureChanges.length > 0 ? Math.max(...pressureChanges) : 0,

            strokeLevel: strokePressures
        };
    }

    // ==================== PAUSE FEATURES ====================

    extractPauseFeatures(strokes) {
        if (strokes.length < 2) {
            return {
                pauseCount: 0,
                totalPauseDuration: 0,
                meanPauseDuration: 0,
                maxPauseDuration: 0,
                pauseFrequency: 0
            };
        }

        const pauses = [];
        const PAUSE_THRESHOLD = 100; // ms - pauses longer than this are counted

        for (let i = 1; i < strokes.length; i++) {
            const gap = strokes[i].startTime - strokes[i-1].endTime;
            if (gap > PAUSE_THRESHOLD) {
                pauses.push({
                    afterStroke: strokes[i-1].id,
                    beforeStroke: strokes[i].id,
                    duration: gap
                });
            }
        }

        const pauseDurations = pauses.map(p => p.duration);
        const totalDuration = strokes[strokes.length - 1].endTime - strokes[0].startTime;

        return {
            pauseCount: pauses.length,
            pauses: pauses,
            totalPauseDuration: pauseDurations.reduce((a, b) => a + b, 0),
            meanPauseDuration: this.mean(pauseDurations),
            maxPauseDuration: pauseDurations.length > 0 ? Math.max(...pauseDurations) : 0,
            minPauseDuration: pauseDurations.length > 0 ? Math.min(...pauseDurations) : 0,
            pauseDurationVariance: this.variance(pauseDurations),
            pauseFrequency: totalDuration > 0 ? (pauses.length / totalDuration) * 1000 : 0 // pauses per second
        };
    }

    // ==================== FLUENCY METRICS ====================

    calculateFluencyMetrics(strokes, velocityFeatures, jerkFeatures) {
        // Automation index: ratio of in-stroke time to total time (higher = more automated)
        const totalStrokeDuration = strokes.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
        const totalSessionTime = strokes.length > 0 ?
            strokes[strokes.length - 1].endTime - strokes[0].startTime : 0;

        const automationIndex = totalSessionTime > 0 ? totalStrokeDuration / totalSessionTime : 0;

        // Velocity consistency (coefficient of variation - lower is more consistent)
        const velocityCV = velocityFeatures.mean > 0 ?
            velocityFeatures.std / velocityFeatures.mean : 0;

        // Smoothness from jerk (inverse relationship)
        const smoothnessFromJerk = jerkFeatures.smoothnessIndex;

        // Combined fluency score (0-100)
        const fluencyScore = Math.min(100, Math.max(0,
            (automationIndex * 40) +
            ((1 - Math.min(1, velocityCV)) * 30) +
            (Math.min(1, smoothnessFromJerk) * 30)
        ));

        // Rhythm regularity (based on stroke duration consistency)
        const strokeDurations = strokes.map(s => s.endTime - s.startTime);
        const rhythmCV = this.mean(strokeDurations) > 0 ?
            this.std(strokeDurations) / this.mean(strokeDurations) : 0;
        const rhythmRegularity = 1 - Math.min(1, rhythmCV);

        return {
            automationIndex: automationIndex,
            velocityConsistency: 1 - Math.min(1, velocityCV),
            smoothnessIndex: smoothnessFromJerk,
            fluencyScore: fluencyScore,
            rhythmRegularity: rhythmRegularity,

            // Irregularity indicators
            irregularityIndex: 1 - (fluencyScore / 100),
            velocityCV: velocityCV,
            rhythmCV: rhythmCV
        };
    }

    // ==================== HELPER METHODS ====================

    mean(arr) {
        if (!arr || arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    std(arr) {
        return Math.sqrt(this.variance(arr));
    }

    variance(arr) {
        if (!arr || arr.length < 2) return 0;
        const m = this.mean(arr);
        return arr.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / arr.length;
    }

    getEmptyFeatures() {
        return {
            type: 'empty_temporal',
            temporal: {},
            velocity: {},
            acceleration: {},
            jerk: {},
            pressure: {},
            pauses: {},
            fluency: {}
        };
    }

    getEmptyPressureFeatures() {
        return {
            mean: 0.5,
            std: 0,
            min: 0.5,
            max: 0.5,
            variance: 0,
            range: 0,
            meanPressureChange: 0,
            maxPressureChange: 0,
            strokeLevel: []
        };
    }

    /**
     * Get flattened feature vector for ML
     */
    getFlatFeatureVector() {
        const f = this.features;
        const vector = [];

        // Temporal
        if (f.temporal) {
            vector.push(
                f.temporal.sessionDuration || 0,
                f.temporal.penDownRatio || 0,
                f.temporal.strokeDurations?.mean || 0,
                f.temporal.strokeDurations?.std || 0,
                f.temporal.writingTempo || 0,
                f.temporal.inAirTimes?.mean || 0
            );
        }

        // Velocity
        if (f.velocity) {
            vector.push(
                f.velocity.mean || 0,
                f.velocity.std || 0,
                f.velocity.max || 0,
                f.velocity.peakCount || 0,
                f.velocity.peakFrequency || 0
            );
        }

        // Acceleration
        if (f.acceleration) {
            vector.push(
                f.acceleration.mean || 0,
                f.acceleration.std || 0,
                f.acceleration.max || 0,
                f.acceleration.directionChanges || 0
            );
        }

        // Jerk
        if (f.jerk) {
            vector.push(
                f.jerk.mean || 0,
                f.jerk.normalizedJerk || 0,
                f.jerk.smoothnessIndex || 0
            );
        }

        // Pressure
        if (f.pressure) {
            vector.push(
                f.pressure.mean || 0,
                f.pressure.std || 0,
                f.pressure.range || 0
            );
        }

        // Pauses
        if (f.pauses) {
            vector.push(
                f.pauses.pauseCount || 0,
                f.pauses.meanPauseDuration || 0,
                f.pauses.pauseFrequency || 0
            );
        }

        // Fluency
        if (f.fluency) {
            vector.push(
                f.fluency.fluencyScore || 0,
                f.fluency.automationIndex || 0,
                f.fluency.rhythmRegularity || 0,
                f.fluency.irregularityIndex || 0
            );
        }

        return vector;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemporalDynamicFeatures;
}