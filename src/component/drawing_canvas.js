/**
 * DrawingCanvas - Real-time handwriting capture with full data recording
 * Captures: x, y, timestamp, pressure, tilt, stroke segmentation
 */

class DrawingCanvas {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Configuration
        this.options = {
            width: options.width || 800,
            height: options.height || 400,
            lineColor: options.lineColor || '#000000',
            lineWidth: options.lineWidth || 2,
            backgroundColor: options.backgroundColor || '#ffffff',
            sampleRate: options.sampleRate || 100, // samples per second target
            ...options
        };

        // Initialize canvas
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;
        this.clear();

        // Drawing state
        this.isDrawing = false;
        this.currentStroke = null;
        this.strokeId = 0;

        // Data storage
        this.rawData = [];           // All sample points
        this.strokes = [];           // Segmented strokes
        this.sessionStartTime = null;
        this.lastSampleTime = 0;
        this.minSampleInterval = 1000 / this.options.sampleRate;

        // Bind events
        this.bindEvents();
    }

    bindEvents() {
        // Pointer events for pressure support
        this.canvas.addEventListener('pointerdown', (e) => this.startStroke(e));
        this.canvas.addEventListener('pointermove', (e) => this.continueStroke(e));
        this.canvas.addEventListener('pointerup', (e) => this.endStroke(e));
        this.canvas.addEventListener('pointerleave', (e) => this.endStroke(e));
        this.canvas.addEventListener('pointercancel', (e) => this.endStroke(e));

        // Prevent scrolling on touch devices
        this.canvas.style.touchAction = 'none';
    }

    getPointerData(e) {
        const rect = this.canvas.getBoundingClientRect();
        const timestamp = performance.now();

        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            timestamp: timestamp,
            pressure: e.pressure || 0.5, // Default pressure for mouse
            tiltX: e.tiltX || 0,
            tiltY: e.tiltY || 0,
            twist: e.twist || 0,
            pointerType: e.pointerType, // 'pen', 'touch', 'mouse'
            width: e.width || 1,
            height: e.height || 1
        };
    }

    startStroke(e) {
        if (this.sessionStartTime === null) {
            this.sessionStartTime = performance.now();
        }

        this.isDrawing = true;
        this.strokeId++;

        const point = this.getPointerData(e);
        point.strokeId = this.strokeId;
        point.isStrokeStart = true;
        point.relativeTime = point.timestamp - this.sessionStartTime;

        this.currentStroke = {
            id: this.strokeId,
            points: [point],
            startTime: point.timestamp,
            endTime: null
        };

        this.rawData.push(point);

        // Start drawing
        this.ctx.beginPath();
        this.ctx.moveTo(point.x, point.y);
        this.ctx.lineWidth = this.options.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = this.options.lineColor;

        this.lastSampleTime = point.timestamp;
    }

    continueStroke(e) {
        if (!this.isDrawing) return;

        const point = this.getPointerData(e);

        // Rate limiting for consistent sampling
        if (point.timestamp - this.lastSampleTime < this.minSampleInterval) {
            // Still draw but don't record
            this.ctx.lineTo(point.x, point.y);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(point.x, point.y);
            return;
        }

        point.strokeId = this.strokeId;
        point.isStrokeStart = false;
        point.relativeTime = point.timestamp - this.sessionStartTime;

        // Calculate instantaneous velocity from previous point
        const prevPoint = this.currentStroke.points[this.currentStroke.points.length - 1];
        const dt = point.timestamp - prevPoint.timestamp;
        const dx = point.x - prevPoint.x;
        const dy = point.y - prevPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        point.velocityX = dx / dt;
        point.velocityY = dy / dt;
        point.velocity = distance / dt;
        point.direction = Math.atan2(dy, dx) * (180 / Math.PI);

        this.currentStroke.points.push(point);
        this.rawData.push(point);

        // Draw
        this.ctx.lineTo(point.x, point.y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(point.x, point.y);

        this.lastSampleTime = point.timestamp;
    }

    endStroke(e) {
        if (!this.isDrawing) return;

        this.isDrawing = false;

        if (this.currentStroke && this.currentStroke.points.length > 0) {
            const lastPoint = this.currentStroke.points[this.currentStroke.points.length - 1];
            lastPoint.isStrokeEnd = true;
            this.currentStroke.endTime = lastPoint.timestamp;

            // Calculate stroke-level features
            this.calculateStrokeFeatures(this.currentStroke);

            this.strokes.push(this.currentStroke);
        }

        this.currentStroke = null;
        this.ctx.beginPath();
    }

    calculateStrokeFeatures(stroke) {
        const points = stroke.points;
        if (points.length < 2) return;

        // Bounding box
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let totalLength = 0;
        let totalPressure = 0;
        let velocities = [];
        let accelerations = [];

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
            totalPressure += p.pressure;

            if (i > 0) {
                const prev = points[i - 1];
                const segLength = Math.sqrt(
                    Math.pow(p.x - prev.x, 2) + Math.pow(p.y - prev.y, 2)
                );
                totalLength += segLength;

                if (p.velocity !== undefined) {
                    velocities.push(p.velocity);
                }
            }

            if (i > 1 && velocities.length > 1) {
                const dv = velocities[velocities.length - 1] - velocities[velocities.length - 2];
                const dt = points[i].timestamp - points[i - 1].timestamp;
                accelerations.push(dv / dt);
            }
        }

        // Calculate stroke features
        stroke.features = {
            // Spatial
            width: maxX - minX,
            height: maxY - minY,
            boundingBox: { minX, maxX, minY, maxY },
            pathLength: totalLength,
            aspectRatio: (maxY - minY) !== 0 ? (maxX - minX) / (maxY - minY) : 0,
            straightness: this.calculateStraightness(points, totalLength),

            // Temporal
            duration: stroke.endTime - stroke.startTime,
            pointCount: points.length,

            // Dynamic
            meanPressure: totalPressure / points.length,
            meanVelocity: velocities.length > 0 ?
                velocities.reduce((a, b) => a + b, 0) / velocities.length : 0,
            maxVelocity: velocities.length > 0 ? Math.max(...velocities) : 0,
            velocityVariance: this.calculateVariance(velocities),
            meanAcceleration: accelerations.length > 0 ?
                accelerations.reduce((a, b) => a + b, 0) / accelerations.length : 0,

            // Curvature
            meanCurvature: this.calculateMeanCurvature(points),

            // Slant
            slantAngle: this.calculateSlant(points)
        };
    }

    calculateStraightness(points, pathLength) {
        if (points.length < 2 || pathLength === 0) return 1;
        const first = points[0];
        const last = points[points.length - 1];
        const directDistance = Math.sqrt(
            Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
        );
        return directDistance / pathLength;
    }

    calculateVariance(values) {
        if (values.length < 2) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    }

    calculateMeanCurvature(points) {
        if (points.length < 3) return 0;
        let totalCurvature = 0;
        let count = 0;

        for (let i = 1; i < points.length - 1; i++) {
            const p0 = points[i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];

            // Calculate angle change
            const v1x = p1.x - p0.x;
            const v1y = p1.y - p0.y;
            const v2x = p2.x - p1.x;
            const v2y = p2.y - p1.y;

            const dot = v1x * v2x + v1y * v2y;
            const cross = v1x * v2y - v1y * v2x;
            const angle = Math.abs(Math.atan2(cross, dot));

            // Curvature = angle change / arc length
            const arcLength = Math.sqrt(v1x*v1x + v1y*v1y) + Math.sqrt(v2x*v2x + v2y*v2y);
            if (arcLength > 0) {
                totalCurvature += angle / arcLength;
                count++;
            }
        }

        return count > 0 ? totalCurvature / count : 0;
    }

    calculateSlant(points) {
        if (points.length < 2) return 0;

        // Use linear regression to find dominant direction
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        const n = points.length;

        for (const p of points) {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumX2 += p.x * p.x;
        }

        const denominator = n * sumX2 - sumX * sumX;
        if (denominator === 0) return 90; // Vertical

        const slope = (n * sumXY - sumX * sumY) / denominator;
        return Math.atan(slope) * (180 / Math.PI);
    }

    // Public methods
    clear() {
        this.ctx.fillStyle = this.options.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.rawData = [];
        this.strokes = [];
        this.strokeId = 0;
        this.sessionStartTime = null;
    }

    getData() {
        return {
            rawData: this.rawData,
            strokes: this.strokes,
            sessionDuration: this.sessionStartTime ?
                performance.now() - this.sessionStartTime : 0,
            totalStrokes: this.strokes.length,
            totalPoints: this.rawData.length
        };
    }

    getImageData() {
        return this.canvas.toDataURL('image/png');
    }

    setLineColor(color) {
        this.options.lineColor = color;
    }

    setLineWidth(width) {
        this.options.lineWidth = width;
    }

    undo() {
        if (this.strokes.length === 0) return;

        // Remove last stroke
        const removedStroke = this.strokes.pop();

        // Remove corresponding raw data
        this.rawData = this.rawData.filter(p => p.strokeId !== removedStroke.id);

        // Redraw
        this.redraw();
    }

    redraw() {
        this.ctx.fillStyle = this.options.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (const stroke of this.strokes) {
            if (stroke.points.length < 2) continue;

            this.ctx.beginPath();
            this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

            for (let i = 1; i < stroke.points.length; i++) {
                this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }

            this.ctx.lineWidth = this.options.lineWidth;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.strokeStyle = this.options.lineColor;
            this.ctx.stroke();
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DrawingCanvas;
}