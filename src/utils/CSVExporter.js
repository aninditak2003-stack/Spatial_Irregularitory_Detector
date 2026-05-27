/**
 * CSVExporter - Export handwriting data and features to CSV format
 * Supports multiple export modes: raw data, stroke features, aggregated features
 */

class CSVExporter {
    constructor() {
        this.exportHistory = [];
    }

    /**
     * Export raw point data to CSV
     * Each row = one sample point
     */
    exportRawData(canvasData, filename = 'handwriting_raw_data.csv') {
        const { rawData } = canvasData;

        if (!rawData || rawData.length === 0) {
            throw new Error('No raw data to export');
        }

        const headers = [
            'point_id',
            'stroke_id',
            'x',
            'y',
            'timestamp',
            'relative_time',
            'pressure',
            'tilt_x',
            'tilt_y',
            'velocity',
            'velocity_x',
            'velocity_y',
            'direction',
            'is_stroke_start',
            'is_stroke_end',
            'pointer_type'
        ];

        const rows = rawData.map((point, index) => [
            index,
            point.strokeId || 0,
            point.x?.toFixed(2) || 0,
            point.y?.toFixed(2) || 0,
            point.timestamp?.toFixed(2) || 0,
            point.relativeTime?.toFixed(2) || 0,
            point.pressure?.toFixed(4) || 0.5,
            point.tiltX || 0,
            point.tiltY || 0,
            point.velocity?.toFixed(4) || 0,
            point.velocityX?.toFixed(4) || 0,
            point.velocityY?.toFixed(4) || 0,
            point.direction?.toFixed(2) || 0,
            point.isStrokeStart ? 1 : 0,
            point.isStrokeEnd ? 1 : 0,
            point.pointerType || 'unknown'
        ]);

        return this.generateCSV(headers, rows, filename);
    }

    /**
     * Export stroke-level features to CSV
     * Each row = one stroke
     */
    exportStrokeFeatures(canvasData, spatialFeatures, temporalFeatures, filename = 'stroke_features.csv') {
        const { strokes } = canvasData;

        if (!strokes || strokes.length === 0) {
            throw new Error('No strokes to export');
        }

        const headers = [
            'stroke_id',
            'point_count',
            'duration_ms',
            'start_time',
            'end_time',
            // Spatial
            'width',
            'height',
            'aspect_ratio',
            'path_length',
            'direct_distance',
            'straightness',
            'mean_curvature',
            'max_curvature',
            'slant_angle',
            'center_x',
            'center_y',
            // Dynamic (from stroke features)
            'mean_pressure',
            'mean_velocity',
            'max_velocity',
            'velocity_variance'
        ];

        const rows = strokes.map(stroke => {
            const sf = stroke.features || {};
            return [
                stroke.id,
                stroke.points?.length || 0,
                sf.duration?.toFixed(2) || 0,
                stroke.startTime?.toFixed(2) || 0,
                stroke.endTime?.toFixed(2) || 0,
                sf.width?.toFixed(2) || 0,
                sf.height?.toFixed(2) || 0,
                sf.aspectRatio?.toFixed(4) || 0,
                sf.pathLength?.toFixed(2) || 0,
                (sf.pathLength * sf.straightness)?.toFixed(2) || 0,
                sf.straightness?.toFixed(4) || 0,
                sf.meanCurvature?.toFixed(6) || 0,
                sf.maxCurvature?.toFixed(6) || 0,
                sf.slantAngle?.toFixed(2) || 0,
                ((sf.boundingBox?.minX || 0) + (sf.boundingBox?.maxX || 0)) / 2,
                ((sf.boundingBox?.minY || 0) + (sf.boundingBox?.maxY || 0)) / 2,
                sf.meanPressure?.toFixed(4) || 0.5,
                sf.meanVelocity?.toFixed(4) || 0,
                sf.maxVelocity?.toFixed(4) || 0,
                sf.velocityVariance?.toFixed(6) || 0
            ];
        });

        return this.generateCSV(headers, rows, filename);
    }

    /**
     * Export aggregated session features to CSV
     * Each row = one writing session (for ML training)
     */
    exportSessionFeatures(spatialFeatures, temporalFeatures, label = null, filename = 'session_features.csv') {
        const headers = this.getSessionFeatureHeaders();
        const values = this.getSessionFeatureValues(spatialFeatures, temporalFeatures, label);

        return this.generateCSV(headers, [values], filename);
    }

    /**
     * Export multiple sessions to a single CSV (for batch ML training)
     */
    exportBatchSessions(sessions, filename = 'batch_features.csv') {
        const headers = this.getSessionFeatureHeaders();

        const rows = sessions.map(session => {
            return this.getSessionFeatureValues(
                session.spatialFeatures,
                session.temporalFeatures,
                session.label
            );
        });

        return this.generateCSV(headers, rows, filename);
    }

    /**
     * Get standardized headers for session features
     */
    getSessionFeatureHeaders() {
        return [
            // Meta
            'session_id',
            'timestamp',
            'source_type',
            'label',

            // Global spatial
            'total_width',
            'total_height',
            'aspect_ratio',
            'total_strokes',
            'total_points',
            'center_of_mass_x',
            'center_of_mass_y',

            // Aggregated spatial
            'mean_stroke_width',
            'std_stroke_width',
            'mean_stroke_height',
            'std_stroke_height',
            'mean_path_length',
            'std_path_length',
            'mean_straightness',
            'std_straightness',
            'mean_curvature',
            'std_curvature',
            'mean_slant',
            'std_slant',

            // Density
            'writing_density',
            'horizontal_uniformity',
            'vertical_uniformity',

            // Temporal
            'session_duration',
            'pen_down_ratio',
            'mean_stroke_duration',
            'std_stroke_duration',
            'writing_tempo',
            'mean_in_air_time',

            // Velocity
            'mean_velocity',
            'std_velocity',
            'max_velocity',
            'velocity_peak_count',
            'velocity_peak_frequency',

            // Acceleration
            'mean_acceleration',
            'std_acceleration',
            'max_acceleration',
            'direction_changes',

            // Jerk / Smoothness
            'mean_jerk',
            'normalized_jerk',
            'smoothness_index',

            // Pressure
            'mean_pressure',
            'std_pressure',
            'pressure_range',

            // Pauses
            'pause_count',
            'mean_pause_duration',
            'pause_frequency',

            // Fluency
            'fluency_score',
            'automation_index',
            'rhythm_regularity',
            'irregularity_index'
        ];
    }

    /**
     * Extract feature values in order matching headers
     */
    getSessionFeatureValues(spatial, temporal, label = null) {
        const s = spatial || {};
        const t = temporal || {};
        const sg = s.global || {};
        const sa = s.aggregated || {};
        const sd = s.density || {};
        const tt = t.temporal || {};
        const tv = t.velocity || {};
        const ta = t.acceleration || {};
        const tj = t.jerk || {};
        const tp = t.pressure || {};
        const tpa = t.pauses || {};
        const tf = t.fluency || {};

        return [
            // Meta
            this.generateSessionId(),
            new Date().toISOString(),
            s.type || 'unknown',
            label || '',

            // Global spatial
            this.formatNum(sg.totalWidth || sg.writingWidth),
            this.formatNum(sg.totalHeight || sg.writingHeight),
            this.formatNum(sg.aspectRatio),
            sg.totalStrokes || sg.componentCount || 0,
            sg.totalPoints || sg.pathCount || 0,
            this.formatNum(sg.centerOfMassX),
            this.formatNum(sg.centerOfMassY),

            // Aggregated spatial
            this.formatNum(sa.width?.mean),
            this.formatNum(sa.width?.std),
            this.formatNum(sa.height?.mean),
            this.formatNum(sa.height?.std),
            this.formatNum(sa.pathLength?.mean),
            this.formatNum(sa.pathLength?.std),
            this.formatNum(sa.straightness?.mean),
            this.formatNum(sa.straightness?.std),
            this.formatNum(sa.meanCurvature?.mean),
            this.formatNum(sa.meanCurvature?.std),
            this.formatNum(sa.slantAngle?.mean),
            this.formatNum(sa.slantAngle?.std),

            // Density
            this.formatNum(sd.writingDensity || sd.inkDensity),
            this.formatNum(sd.horizontalUniformity),
            this.formatNum(sd.verticalUniformity),

            // Temporal
            this.formatNum(tt.sessionDuration),
            this.formatNum(tt.penDownRatio),
            this.formatNum(tt.strokeDurations?.mean),
            this.formatNum(tt.strokeDurations?.std),
            this.formatNum(tt.writingTempo),
            this.formatNum(tt.inAirTimes?.mean),

            // Velocity
            this.formatNum(tv.mean),
            this.formatNum(tv.std),
            this.formatNum(tv.max),
            tv.peakCount || 0,
            this.formatNum(tv.peakFrequency),

            // Acceleration
            this.formatNum(ta.mean),
            this.formatNum(ta.std),
            this.formatNum(ta.max),
            ta.directionChanges || 0,

            // Jerk
            this.formatNum(tj.mean),
            this.formatNum(tj.normalizedJerk),
            this.formatNum(tj.smoothnessIndex),

            // Pressure
            this.formatNum(tp.mean),
            this.formatNum(tp.std),
            this.formatNum(tp.range),

            // Pauses
            tpa.pauseCount || 0,
            this.formatNum(tpa.meanPauseDuration),
            this.formatNum(tpa.pauseFrequency),

            // Fluency
            this.formatNum(tf.fluencyScore),
            this.formatNum(tf.automationIndex),
            this.formatNum(tf.rhythmRegularity),
            this.formatNum(tf.irregularityIndex)
        ];
    }

    /**
     * Export image-only features (for PNG uploads)
     */
    exportImageFeatures(spatialFeatures, label = null, filename = 'image_features.csv') {
        const headers = [
            'session_id',
            'timestamp',
            'label',
            'image_width',
            'image_height',
            'writing_width',
            'writing_height',
            'aspect_ratio',
            'component_count',
            'path_count',
            'ink_density',
            'mean_component_width',
            'std_component_width',
            'mean_component_height',
            'std_component_height',
            'mean_component_density',
            'baseline_y',
            'baseline_deviation',
            'average_slant'
        ];

        const s = spatialFeatures || {};
        const sg = s.global || {};
        const sa = s.aggregated || {};
        const sd = s.density || {};
        const al = s.alignment || {};

        const values = [
            this.generateSessionId(),
            new Date().toISOString(),
            label || '',
            sg.imageWidth || 0,
            sg.imageHeight || 0,
            this.formatNum(sg.writingWidth),
            this.formatNum(sg.writingHeight),
            this.formatNum(sg.aspectRatio),
            sg.componentCount || 0,
            sg.pathCount || 0,
            this.formatNum(sd.inkDensity),
            this.formatNum(sa.width?.mean),
            this.formatNum(sa.width?.std),
            this.formatNum(sa.height?.mean),
            this.formatNum(sa.height?.std),
            this.formatNum(sa.density?.mean),
            this.formatNum(al.baselineY),
            this.formatNum(al.baselineDeviation),
            this.formatNum(al.averageSlant)
        ];

        return this.generateCSV(headers, [values], filename);
    }

    // ==================== UTILITY METHODS ====================

    generateCSV(headers, rows, filename) {
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(val => this.escapeCSV(val)).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        // Track export
        this.exportHistory.push({
            filename,
            timestamp: new Date().toISOString(),
            rowCount: rows.length
        });

        return {
            content: csvContent,
            blob: blob,
            url: url,
            filename: filename,
            download: () => this.downloadBlob(blob, filename)
        };
    }

    escapeCSV(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    formatNum(value, decimals = 4) {
        if (value === null || value === undefined || isNaN(value)) return 0;
        return Number(value).toFixed(decimals);
    }

    generateSessionId() {
        return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    downloadBlob(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    /**
     * Get feature vector as array (for direct ML input)
     */
    getFeatureVector(spatialFeatures, temporalFeatures) {
        const values = this.getSessionFeatureValues(spatialFeatures, temporalFeatures);
        // Skip meta columns (session_id, timestamp, source_type, label)
        return values.slice(4).map(v => Number(v) || 0);
    }

    /**
     * Get feature names (for ML model interpretation)
     */
    getFeatureNames() {
        return this.getSessionFeatureHeaders().slice(4);
    }

    getExportHistory() {
        return this.exportHistory;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSVExporter;
}