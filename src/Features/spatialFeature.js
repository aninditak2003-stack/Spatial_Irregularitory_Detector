/**
 * SpatialFeatures - Extract spatial features from handwriting data
 * Works with both live canvas data and processed image data
 */

class SpatialFeatures {
    constructor() {
        this.features = {};
    }

    /**
     * Extract all spatial features from live canvas data
     */
    extractFromCanvasData(canvasData) {
        const { strokes, rawData } = canvasData;

        if (!strokes || strokes.length === 0) {
            return this.getEmptyFeatures();
        }

        // Global bounding box
        const globalBounds = this.calculateGlobalBounds(rawData);

        // Stroke-level features
        const strokeFeatures = strokes.map(stroke => this.extractStrokeFeatures(stroke));

        // Aggregate features
        const aggregated = this.aggregateStrokeFeatures(strokeFeatures);

        // Spacing and alignment features
        const spacingFeatures = this.calculateSpacingFeatures(strokes);

        // Writing density
        const densityFeatures = this.calculateDensityFeatures(rawData, globalBounds);

        this.features = {
            type: 'live_canvas',
            global: {
                bounds: globalBounds,
                totalWidth: globalBounds.maxX - globalBounds.minX,
                totalHeight: globalBounds.maxY - globalBounds.minY,
                aspectRatio: (globalBounds.maxY - globalBounds.minY) !== 0 ?
                    (globalBounds.maxX - globalBounds.minX) / (globalBounds.maxY - globalBounds.minY) : 0,
                centerOfMassX: this.calculateCenterOfMass(rawData, 'x'),
                centerOfMassY: this.calculateCenterOfMass(rawData, 'y'),
                totalPoints: rawData.length,
                totalStrokes: strokes.length
            },
            strokeLevel: strokeFeatures,
            aggregated: aggregated,
            spacing: spacingFeatures,
            density: densityFeatures
        };

        return this.features;
    }

    /**
     * Extract spatial features from processed image data
     */
    extractFromImageData(imageData) {
        const { width, height, components, skeletonPaths, binaryData } = imageData;

        if (!components || components.length === 0) {
            return this.getEmptyFeatures();
        }

        // Global bounds
        const globalBounds = this.calculateImageBounds(components);

        // Component-level features (treating each component as a "stroke")
        const componentFeatures = components.map(comp => this.extractComponentFeatures(comp));

        // Path-level features from skeleton
        const pathFeatures = skeletonPaths.map(path => this.extractPathFeatures(path));

        // Aggregate features
        const aggregated = this.aggregateComponentFeatures(componentFeatures);

        // Density features
        const densityFeatures = this.calculateImageDensity(binaryData, width, height);

        // Baseline and alignment
        const alignmentFeatures = this.analyzeAlignment(components, height);

        this.features = {
            type: 'static_image',
            global: {
                imageWidth: width,
                imageHeight: height,
                bounds: globalBounds,
                writingWidth: globalBounds.maxX - globalBounds.minX,
                writingHeight: globalBounds.maxY - globalBounds.minY,
                aspectRatio: (globalBounds.maxY - globalBounds.minY) !== 0 ?
                    (globalBounds.maxX - globalBounds.minX) / (globalBounds.maxY - globalBounds.minY) : 0,
                componentCount: components.length,
                pathCount: skeletonPaths.length
            },
            componentLevel: componentFeatures,
            pathLevel: pathFeatures,
            aggregated: aggregated,
            density: densityFeatures,
            alignment: alignmentFeatures
        };

        return this.features;
    }

    // ==================== HELPER METHODS ====================

    calculateGlobalBounds(points) {
        if (!points || points.length === 0) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        }

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (const p of points) {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        }

        return { minX, maxX, minY, maxY };
    }

    calculateImageBounds(components) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (const comp of components) {
            for (const p of comp.points) {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            }
        }

        return { minX, maxX, minY, maxY };
    }

    calculateCenterOfMass(points, axis) {
        if (!points || points.length === 0) return 0;
        const sum = points.reduce((acc, p) => acc + p[axis], 0);
        return sum / points.length;
    }

    extractStrokeFeatures(stroke) {
        const points = stroke.points;
        if (!points || points.length < 2) {
            return this.getEmptyStrokeFeatures();
        }

        // Bounding box
        const bounds = this.calculateGlobalBounds(points);

        // Path length
        let pathLength = 0;
        for (let i = 1; i < points.length; i++) {
            pathLength += Math.sqrt(
                Math.pow(points[i].x - points[i-1].x, 2) +
                Math.pow(points[i].y - points[i-1].y, 2)
            );
        }

        // Direct distance (start to end)
        const directDistance = Math.sqrt(
            Math.pow(points[points.length-1].x - points[0].x, 2) +
            Math.pow(points[points.length-1].y - points[0].y, 2)
        );

        // Curvature analysis
        const curvatures = this.calculateCurvatures(points);

        // Slant angle
        const slant = this.calculateSlantAngle(points);

        return {
            strokeId: stroke.id,
            pointCount: points.length,
            bounds: bounds,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY,
            aspectRatio: (bounds.maxY - bounds.minY) !== 0 ?
                (bounds.maxX - bounds.minX) / (bounds.maxY - bounds.minY) : 0,
            pathLength: pathLength,
            directDistance: directDistance,
            straightness: pathLength > 0 ? directDistance / pathLength : 1,
            meanCurvature: curvatures.mean,
            maxCurvature: curvatures.max,
            curvatureVariance: curvatures.variance,
            slantAngle: slant,
            centerX: (bounds.minX + bounds.maxX) / 2,
            centerY: (bounds.minY + bounds.maxY) / 2
        };
    }

    extractComponentFeatures(component) {
        const points = component.points;
        const bounds = this.calculateGlobalBounds(points);

        return {
            componentId: component.id,
            pixelCount: component.pixelCount,
            bounds: bounds,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY,
            aspectRatio: (bounds.maxY - bounds.minY) !== 0 ?
                (bounds.maxX - bounds.minX) / (bounds.maxY - bounds.minY) : 0,
            density: component.pixelCount / ((bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1)),
            centerX: (bounds.minX + bounds.maxX) / 2,
            centerY: (bounds.minY + bounds.maxY) / 2
        };
    }

    extractPathFeatures(path) {
        if (!path || path.length < 2) {
            return { pathLength: 0, straightness: 1, slant: 0 };
        }

        let pathLength = 0;
        for (let i = 1; i < path.length; i++) {
            pathLength += Math.sqrt(
                Math.pow(path[i].x - path[i-1].x, 2) +
                Math.pow(path[i].y - path[i-1].y, 2)
            );
        }

        const directDistance = Math.sqrt(
            Math.pow(path[path.length-1].x - path[0].x, 2) +
            Math.pow(path[path.length-1].y - path[0].y, 2)
        );

        return {
            pointCount: path.length,
            pathLength: pathLength,
            directDistance: directDistance,
            straightness: pathLength > 0 ? directDistance / pathLength : 1,
            slant: this.calculateSlantAngle(path)
        };
    }

    calculateCurvatures(points) {
        if (points.length < 3) {
            return { mean: 0, max: 0, variance: 0, values: [] };
        }

        const curvatures = [];

        for (let i = 1; i < points.length - 1; i++) {
            const p0 = points[i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];

            // Vectors
            const v1x = p1.x - p0.x;
            const v1y = p1.y - p0.y;
            const v2x = p2.x - p1.x;
            const v2y = p2.y - p1.y;

            // Cross and dot products
            const cross = v1x * v2y - v1y * v2x;
            const dot = v1x * v2x + v1y * v2y;
            const angle = Math.abs(Math.atan2(cross, dot));

            // Arc length
            const arcLength = Math.sqrt(v1x*v1x + v1y*v1y) + Math.sqrt(v2x*v2x + v2y*v2y);

            if (arcLength > 0) {
                curvatures.push(angle / arcLength);
            }
        }

        if (curvatures.length === 0) {
            return { mean: 0, max: 0, variance: 0, values: [] };
        }

        const mean = curvatures.reduce((a, b) => a + b, 0) / curvatures.length;
        const max = Math.max(...curvatures);
        const variance = curvatures.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / curvatures.length;

        return { mean, max, variance, values: curvatures };
    }

    calculateSlantAngle(points) {
        if (points.length < 2) return 0;

        // Linear regression
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        const n = points.length;

        for (const p of points) {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumX2 += p.x * p.x;
        }

        const denominator = n * sumX2 - sumX * sumX;
        if (denominator === 0) return 90;

        const slope = (n * sumXY - sumX * sumY) / denominator;
        return Math.atan(slope) * (180 / Math.PI);
    }

    calculateSpacingFeatures(strokes) {
        if (strokes.length < 2) {
            return {
                meanHorizontalSpacing: 0,
                meanVerticalSpacing: 0,
                spacingVariance: 0
            };
        }

        const horizontalSpacings = [];
        const verticalSpacings = [];

        // Sort strokes by position
        const sortedByX = [...strokes].sort((a, b) => {
            const aCenter = (a.features?.boundingBox?.minX || 0);
            const bCenter = (b.features?.boundingBox?.minX || 0);
            return aCenter - bCenter;
        });

        for (let i = 1; i < sortedByX.length; i++) {
            const prevBounds = sortedByX[i-1].features?.boundingBox;
            const currBounds = sortedByX[i].features?.boundingBox;

            if (prevBounds && currBounds) {
                const hSpacing = currBounds.minX - prevBounds.maxX;
                if (hSpacing > 0) {
                    horizontalSpacings.push(hSpacing);
                }

                const vDiff = Math.abs(
                    (currBounds.minY + currBounds.maxY) / 2 -
                    (prevBounds.minY + prevBounds.maxY) / 2
                );
                verticalSpacings.push(vDiff);
            }
        }

        return {
            meanHorizontalSpacing: horizontalSpacings.length > 0 ?
                horizontalSpacings.reduce((a, b) => a + b, 0) / horizontalSpacings.length : 0,
            meanVerticalSpacing: verticalSpacings.length > 0 ?
                verticalSpacings.reduce((a, b) => a + b, 0) / verticalSpacings.length : 0,
            spacingVariance: this.calculateVariance(horizontalSpacings)
        };
    }

    calculateDensityFeatures(points, bounds) {
        if (!points || points.length === 0) {
            return { writingDensity: 0, horizontalDistribution: [], verticalDistribution: [] };
        }

        const width = bounds.maxX - bounds.minX + 1;
        const height = bounds.maxY - bounds.minY + 1;
        const area = width * height;

        // Simple density: points per area
        const writingDensity = points.length / area;

        // Distribution across horizontal bins
        const hBins = 10;
        const horizontalDistribution = new Array(hBins).fill(0);
        const binWidth = width / hBins;

        for (const p of points) {
            const binIndex = Math.min(Math.floor((p.x - bounds.minX) / binWidth), hBins - 1);
            horizontalDistribution[binIndex]++;
        }

        // Normalize
        const maxH = Math.max(...horizontalDistribution);
        if (maxH > 0) {
            for (let i = 0; i < hBins; i++) {
                horizontalDistribution[i] /= maxH;
            }
        }

        // Vertical distribution
        const vBins = 10;
        const verticalDistribution = new Array(vBins).fill(0);
        const binHeight = height / vBins;

        for (const p of points) {
            const binIndex = Math.min(Math.floor((p.y - bounds.minY) / binHeight), vBins - 1);
            verticalDistribution[binIndex]++;
        }

        const maxV = Math.max(...verticalDistribution);
        if (maxV > 0) {
            for (let i = 0; i < vBins; i++) {
                verticalDistribution[i] /= maxV;
            }
        }

        return {
            writingDensity,
            horizontalDistribution,
            verticalDistribution,
            horizontalUniformity: this.calculateUniformity(horizontalDistribution),
            verticalUniformity: this.calculateUniformity(verticalDistribution)
        };
    }

    calculateImageDensity(binaryData, width, height) {
        let inkPixels = 0;
        for (const pixel of binaryData) {
            if (pixel === 1) inkPixels++;
        }

        return {
            totalPixels: width * height,
            inkPixels: inkPixels,
            inkDensity: inkPixels / (width * height)
        };
    }

    analyzeAlignment(components, imageHeight) {
        if (components.length === 0) {
            return { baselineY: 0, baselineDeviation: 0, averageSlant: 0 };
        }

        // Estimate baseline from bottom of components
        const bottomYs = components.map(c => {
            const bounds = this.calculateGlobalBounds(c.points);
            return bounds.maxY;
        });

        const meanBaseline = bottomYs.reduce((a, b) => a + b, 0) / bottomYs.length;
        const baselineVariance = this.calculateVariance(bottomYs);

        // Estimate overall slant from component centers
        const centers = components.map(c => {
            const bounds = this.calculateGlobalBounds(c.points);
            return {
                x: (bounds.minX + bounds.maxX) / 2,
                y: (bounds.minY + bounds.maxY) / 2
            };
        });

        const slant = this.calculateSlantAngle(centers);

        return {
            baselineY: meanBaseline,
            baselineDeviation: Math.sqrt(baselineVariance),
            averageSlant: slant
        };
    }

    aggregateStrokeFeatures(strokeFeatures) {
        if (strokeFeatures.length === 0) return {};

        const aggregate = (arr, key) => {
            const values = arr.map(f => f[key]).filter(v => v !== undefined && !isNaN(v));
            if (values.length === 0) return { mean: 0, std: 0, min: 0, max: 0 };
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const std = Math.sqrt(this.calculateVariance(values));
            return {
                mean,
                std,
                min: Math.min(...values),
                max: Math.max(...values)
            };
        };

        return {
            pathLength: aggregate(strokeFeatures, 'pathLength'),
            width: aggregate(strokeFeatures, 'width'),
            height: aggregate(strokeFeatures, 'height'),
            straightness: aggregate(strokeFeatures, 'straightness'),
            meanCurvature: aggregate(strokeFeatures, 'meanCurvature'),
            slantAngle: aggregate(strokeFeatures, 'slantAngle')
        };
    }

    aggregateComponentFeatures(componentFeatures) {
        if (componentFeatures.length === 0) return {};

        const aggregate = (arr, key) => {
            const values = arr.map(f => f[key]).filter(v => v !== undefined && !isNaN(v));
            if (values.length === 0) return { mean: 0, std: 0, min: 0, max: 0 };
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const std = Math.sqrt(this.calculateVariance(values));
            return {
                mean,
                std,
                min: Math.min(...values),
                max: Math.max(...values)
            };
        };

        return {
            width: aggregate(componentFeatures, 'width'),
            height: aggregate(componentFeatures, 'height'),
            aspectRatio: aggregate(componentFeatures, 'aspectRatio'),
            pixelCount: aggregate(componentFeatures, 'pixelCount'),
            density: aggregate(componentFeatures, 'density')
        };
    }

    calculateVariance(values) {
        if (values.length < 2) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    }

    calculateUniformity(distribution) {
        // Measure how uniform the distribution is (1 = perfectly uniform)
        const n = distribution.length;
        const expected = 1 / n;
        const normalized = distribution.map(v => v / distribution.reduce((a, b) => a + b, 1));
        const deviation = normalized.reduce((sum, v) => sum + Math.abs(v - expected), 0);
        return 1 - (deviation / 2);
    }

    getEmptyFeatures() {
        return {
            type: 'empty',
            global: {},
            strokeLevel: [],
            aggregated: {}
        };
    }

    getEmptyStrokeFeatures() {
        return {
            pointCount: 0,
            width: 0,
            height: 0,
            pathLength: 0,
            straightness: 1,
            meanCurvature: 0,
            slantAngle: 0
        };
    }

    /**
     * Get flattened feature vector for ML
     */
    getFlatFeatureVector() {
        const features = this.features;
        const vector = [];

        // Global features
        if (features.global) {
            vector.push(
                features.global.totalWidth || 0,
                features.global.totalHeight || 0,
                features.global.aspectRatio || 0,
                features.global.totalStrokes || features.global.componentCount || 0
            );
        }

        // Aggregated features
        if (features.aggregated) {
            for (const key of Object.keys(features.aggregated)) {
                const agg = features.aggregated[key];
                if (agg && typeof agg === 'object') {
                    vector.push(agg.mean || 0, agg.std || 0, agg.min || 0, agg.max || 0);
                }
            }
        }

        // Density features
        if (features.density) {
            vector.push(
                features.density.writingDensity || features.density.inkDensity || 0,
                features.density.horizontalUniformity || 0,
                features.density.verticalUniformity || 0
            );
        }

        return vector;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpatialFeatures;
}