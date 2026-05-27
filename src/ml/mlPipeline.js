/**
 * MLPipeline - Machine Learning integration for handwriting analysis
 * Handles feature normalization, model loading, prediction, and training data management
 */

class MLPipeline {
    constructor() {
        this.model = null;
        this.modelType = null;
        this.featureScaler = null;
        this.featureNames = [];
        this.trainingData = [];
        this.labels = [];
        this.isModelLoaded = false;
        this.referenceStats = null;  // Stats from training data for comparison

        // Initialize feature scaler with default values
        this.initializeScaler();

        // Load pre-built training data if available
        this.loadPrebuiltTrainingData();
    }

    /**
     * Load the 300-sample training dataset
     */
    loadPrebuiltTrainingData() {
        if (typeof TRAINING_DATA !== 'undefined') {
            this.featureNames = TRAINING_DATA.featureNames;
            this.referenceStats = TRAINING_DATA.getStatsByLabel();
            this.normalRanges = TRAINING_DATA.normalRanges;
            this.labelDescriptions = TRAINING_DATA.labels;

            // Load all samples into training data
            const vectors = TRAINING_DATA.getFeatureVectors();
            const labels = TRAINING_DATA.getLabels();

            this.trainingData = vectors;
            this.labels = labels;

            // Fit scaler on training data
            this.fitScaler();

            // Train the classifier
            this.trainKNNClassifier();

            console.log(`Loaded ${vectors.length} training samples with ${Object.keys(this.referenceStats).length} categories`);
        }
    }

    /**
     * Train a simple K-Nearest Neighbors classifier
     */
    trainKNNClassifier() {
        if (this.trainingData.length === 0) return;

        // Scale all training data
        const scaledData = this.trainingData.map(sample => this.transformFeatures(sample));

        this.model = {
            type: 'knn',
            k: 5,  // Number of neighbors
            trainingData: scaledData,
            labels: this.labels
        };

        this.modelType = 'knn';
        this.isModelLoaded = true;
    }

    /**
     * Initialize feature scaler for normalization
     */
    initializeScaler() {
        this.featureScaler = {
            means: {},
            stds: {},
            mins: {},
            maxs: {},
            method: 'zscore' // 'zscore' or 'minmax'
        };
    }

    /**
     * Add training sample
     */
    addTrainingSample(spatialFeatures, temporalFeatures, label) {
        const csvExporter = new CSVExporter();
        const featureVector = csvExporter.getFeatureVector(spatialFeatures, temporalFeatures);
        const featureNames = csvExporter.getFeatureNames();

        this.trainingData.push(featureVector);
        this.labels.push(label);

        if (this.featureNames.length === 0) {
            this.featureNames = featureNames;
        }

        return {
            sampleIndex: this.trainingData.length - 1,
            featureCount: featureVector.length,
            label: label
        };
    }

    /**
     * Fit scaler on training data
     */
    fitScaler() {
        if (this.trainingData.length === 0) {
            throw new Error('No training data available');
        }

        const numFeatures = this.trainingData[0].length;
        const numSamples = this.trainingData.length;

        // Calculate statistics for each feature
        for (let f = 0; f < numFeatures; f++) {
            const values = this.trainingData.map(sample => sample[f]);

            const mean = values.reduce((a, b) => a + b, 0) / numSamples;
            const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numSamples;
            const std = Math.sqrt(variance) || 1; // Avoid division by zero
            const min = Math.min(...values);
            const max = Math.max(...values);

            const featureName = this.featureNames[f] || `feature_${f}`;
            this.featureScaler.means[featureName] = mean;
            this.featureScaler.stds[featureName] = std;
            this.featureScaler.mins[featureName] = min;
            this.featureScaler.maxs[featureName] = max;
        }

        return this.featureScaler;
    }

    /**
     * Transform features using fitted scaler
     */
    transformFeatures(featureVector) {
        if (Object.keys(this.featureScaler.means).length === 0) {
            // Return original if scaler not fitted
            return featureVector;
        }

        return featureVector.map((value, index) => {
            const featureName = this.featureNames[index] || `feature_${index}`;

            if (this.featureScaler.method === 'zscore') {
                const mean = this.featureScaler.means[featureName] || 0;
                const std = this.featureScaler.stds[featureName] || 1;
                return (value - mean) / std;
            } else {
                const min = this.featureScaler.mins[featureName] || 0;
                const max = this.featureScaler.maxs[featureName] || 1;
                return max !== min ? (value - min) / (max - min) : 0;
            }
        });
    }

    /**
     * Get scaled training data
     */
    getScaledTrainingData() {
        this.fitScaler();
        return this.trainingData.map(sample => this.transformFeatures(sample));
    }

    /**
     * Export training data for external ML frameworks
     */
    exportTrainingData(format = 'json') {
        const scaledData = this.getScaledTrainingData();

        if (format === 'json') {
            return {
                features: scaledData,
                labels: this.labels,
                featureNames: this.featureNames,
                scaler: this.featureScaler,
                metadata: {
                    numSamples: this.trainingData.length,
                    numFeatures: this.featureNames.length,
                    uniqueLabels: [...new Set(this.labels)],
                    exportedAt: new Date().toISOString()
                }
            };
        } else if (format === 'csv') {
            const headers = [...this.featureNames, 'label'];
            const rows = scaledData.map((features, i) => [...features, this.labels[i]]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            return csvContent;
        }
    }

    /**
     * Load a pre-trained model (TensorFlow.js format)
     */
    async loadModel(modelUrl) {
        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js not loaded. Include tf.min.js in your HTML.');
        }

        try {
            this.model = await tf.loadLayersModel(modelUrl);
            this.modelType = 'tensorflow';
            this.isModelLoaded = true;
            return { success: true, modelType: 'tensorflow' };
        } catch (error) {
            throw new Error(`Failed to load model: ${error.message}`);
        }
    }

    /**
     * Load model from JSON configuration (simple classifier)
     */
    loadSimpleModel(modelConfig) {
        this.model = modelConfig;
        this.modelType = 'simple';
        this.isModelLoaded = true;

        // Load scaler if provided
        if (modelConfig.scaler) {
            this.featureScaler = modelConfig.scaler;
        }

        return { success: true, modelType: 'simple' };
    }

    /**
     * Make prediction on new sample
     */
    async predict(spatialFeatures, temporalFeatures) {
        const csvExporter = new CSVExporter();
        const featureVector = csvExporter.getFeatureVector(spatialFeatures, temporalFeatures);
        const scaledFeatures = this.transformFeatures(featureVector);

        if (!this.isModelLoaded) {
            // Return feature vector if no model loaded
            return {
                prediction: null,
                confidence: null,
                features: scaledFeatures,
                message: 'No model loaded. Returning extracted features.'
            };
        }

        if (this.modelType === 'tensorflow') {
            return this.predictTensorFlow(scaledFeatures);
        } else if (this.modelType === 'knn') {
            return this.predictKNN(scaledFeatures, featureVector);
        } else if (this.modelType === 'simple') {
            return this.predictSimple(scaledFeatures);
        }
    }

    /**
     * K-Nearest Neighbors prediction
     */
    predictKNN(scaledFeatures, originalFeatures) {
        const k = this.model.k || 5;
        const trainingData = this.model.trainingData;
        const trainingLabels = this.model.labels;

        // Calculate distances to all training samples
        const distances = trainingData.map((trainSample, index) => {
            const dist = this.euclideanDistance(scaledFeatures, trainSample);
            return { index, distance: dist, label: trainingLabels[index] };
        });

        // Sort by distance and get k nearest
        distances.sort((a, b) => a.distance - b.distance);
        const kNearest = distances.slice(0, k);

        // Count votes for each label
        const votes = {};
        kNearest.forEach(neighbor => {
            votes[neighbor.label] = (votes[neighbor.label] || 0) + 1;
        });

        // Find the label with most votes
        let prediction = null;
        let maxVotes = 0;
        for (const [label, count] of Object.entries(votes)) {
            if (count > maxVotes) {
                maxVotes = count;
                prediction = label;
            }
        }

        // Calculate confidence based on vote proportion
        const confidence = maxVotes / k;

        // Get probability distribution - ensure all 5 categories are included
        const allCategories = ['normal', 'tremor', 'dysgraphia', 'fatigue', 'elderly'];
        const probabilities = {};
        for (const label of allCategories) {
            probabilities[label] = (votes[label] || 0) / k;
        }

        // Compare with reference data
        const comparison = this.compareWithReference(originalFeatures);

        return {
            prediction: prediction,
            confidence: confidence,
            probabilities: probabilities,
            kNearest: kNearest,
            comparison: comparison,
            features: scaledFeatures
        };
    }

    /**
     * Calculate Euclidean distance between two feature vectors
     */
    euclideanDistance(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.pow((a[i] || 0) - (b[i] || 0), 2);
        }
        return Math.sqrt(sum);
    }

    /**
     * Compare user's features with reference training data
     */
    compareWithReference(featureVector) {
        if (!this.referenceStats) return null;

        const comparison = {
            withinNormalRange: [],
            outsideNormalRange: [],
            featureAnalysis: {}
        };

        // Key features to compare
        const keyFeatures = [
            'mean_velocity', 'std_velocity', 'mean_pressure', 'std_pressure',
            'fluency_score', 'smoothness_index', 'rhythm_regularity',
            'normalized_jerk', 'pen_down_ratio', 'writing_tempo',
            'pause_frequency', 'mean_stroke_duration', 'mean_curvature'
        ];

        const normalStats = this.referenceStats['normal'];
        if (!normalStats) return comparison;

        keyFeatures.forEach(featureName => {
            const featureIndex = this.featureNames.indexOf(featureName);
            if (featureIndex === -1) return;

            const userValue = featureVector[featureIndex];
            const normalMean = normalStats.features[featureName]?.mean || 0;
            const normalStd = normalStats.features[featureName]?.std || 1;

            // Check if within 2 standard deviations of normal
            const zScore = (userValue - normalMean) / normalStd;
            const isNormal = Math.abs(zScore) <= 2;

            // Get range info if available
            const range = this.normalRanges?.[featureName];

            comparison.featureAnalysis[featureName] = {
                userValue: userValue,
                normalMean: normalMean,
                normalStd: normalStd,
                zScore: zScore,
                isWithinNormal: isNormal,
                range: range,
                deviation: isNormal ? 'normal' : (zScore > 0 ? 'high' : 'low')
            };

            if (isNormal) {
                comparison.withinNormalRange.push(featureName);
            } else {
                comparison.outsideNormalRange.push({
                    feature: featureName,
                    zScore: zScore,
                    direction: zScore > 0 ? 'above' : 'below'
                });
            }
        });

        return comparison;
    }

    /**
     * TensorFlow.js prediction
     */
    async predictTensorFlow(scaledFeatures) {
        const inputTensor = tf.tensor2d([scaledFeatures]);
        const prediction = this.model.predict(inputTensor);
        const predArray = await prediction.array();

        inputTensor.dispose();
        prediction.dispose();

        // Assuming classification with softmax output
        const probabilities = predArray[0];
        const predictedClass = probabilities.indexOf(Math.max(...probabilities));
        const confidence = Math.max(...probabilities);

        return {
            prediction: predictedClass,
            probabilities: probabilities,
            confidence: confidence,
            features: scaledFeatures
        };
    }

    /**
     * Simple threshold-based prediction
     */
    predictSimple(scaledFeatures) {
        const thresholds = this.model.thresholds || {};
        const weights = this.model.weights || {};

        // Calculate weighted score
        let score = 0;
        let totalWeight = 0;

        this.featureNames.forEach((name, index) => {
            const weight = weights[name] || 1;
            const threshold = thresholds[name];

            if (threshold !== undefined) {
                const normalizedValue = scaledFeatures[index];
                score += weight * normalizedValue;
                totalWeight += Math.abs(weight);
            }
        });

        const normalizedScore = totalWeight > 0 ? score / totalWeight : 0;

        // Map score to prediction
        let prediction = 'normal';
        let confidence = 0.5;

        if (normalizedScore > 1) {
            prediction = 'irregular_high';
            confidence = Math.min(1, 0.5 + normalizedScore * 0.25);
        } else if (normalizedScore < -1) {
            prediction = 'irregular_low';
            confidence = Math.min(1, 0.5 + Math.abs(normalizedScore) * 0.25);
        } else {
            prediction = 'normal';
            confidence = Math.max(0.5, 1 - Math.abs(normalizedScore) * 0.25);
        }

        return {
            prediction: prediction,
            score: normalizedScore,
            confidence: confidence,
            features: scaledFeatures
        };
    }

    /**
     * Create a simple irregularity detection model
     */
    createIrregularityModel() {
        // Default model based on research findings
        const model = {
            type: 'irregularity_detector',
            version: '1.0',
            thresholds: {
                'fluency_score': 50,
                'smoothness_index': 0.5,
                'rhythm_regularity': 0.5,
                'irregularity_index': 0.5,
                'normalized_jerk': 1.0,
                'mean_velocity': 0.1,
                'std_velocity': 0.1,
                'pause_frequency': 0.5
            },
            weights: {
                'fluency_score': -2.0,      // Lower fluency = more irregular
                'smoothness_index': -1.5,    // Lower smoothness = more irregular
                'rhythm_regularity': -1.5,   // Lower rhythm = more irregular
                'irregularity_index': 3.0,   // Higher = more irregular
                'normalized_jerk': 2.0,      // Higher jerk = more irregular
                'std_velocity': 1.5,         // Higher variance = more irregular
                'pause_frequency': 1.0,      // More pauses = more irregular
                'pressure_range': 1.0        // More pressure variation = potential issue
            },
            scaler: this.featureScaler
        };

        this.loadSimpleModel(model);
        return model;
    }

    /**
     * Analyze handwriting for irregularities
     */
    analyzeIrregularities(spatialFeatures, temporalFeatures) {
        const tf = temporalFeatures?.fluency || {};
        const tj = temporalFeatures?.jerk || {};
        const tp = temporalFeatures?.pauses || {};
        const tv = temporalFeatures?.velocity || {};

        const indicators = [];
        let overallRisk = 0;
        let factorCount = 0;

        // Check fluency
        if (tf.fluencyScore !== undefined) {
            if (tf.fluencyScore < 40) {
                indicators.push({
                    type: 'low_fluency',
                    severity: 'high',
                    value: tf.fluencyScore,
                    message: 'Significantly reduced writing fluency'
                });
                overallRisk += 3;
            } else if (tf.fluencyScore < 60) {
                indicators.push({
                    type: 'moderate_fluency',
                    severity: 'medium',
                    value: tf.fluencyScore,
                    message: 'Moderately reduced writing fluency'
                });
                overallRisk += 1.5;
            }
            factorCount++;
        }

        // Check smoothness
        if (tj.smoothnessIndex !== undefined) {
            if (tj.smoothnessIndex < 0.3) {
                indicators.push({
                    type: 'low_smoothness',
                    severity: 'high',
                    value: tj.smoothnessIndex,
                    message: 'Jerky, unsmooth writing movements'
                });
                overallRisk += 2.5;
            }
            factorCount++;
        }

        // Check rhythm
        if (tf.rhythmRegularity !== undefined) {
            if (tf.rhythmRegularity < 0.4) {
                indicators.push({
                    type: 'irregular_rhythm',
                    severity: 'medium',
                    value: tf.rhythmRegularity,
                    message: 'Inconsistent writing rhythm'
                });
                overallRisk += 1.5;
            }
            factorCount++;
        }

        // Check velocity consistency
        if (tv.std !== undefined && tv.mean !== undefined && tv.mean > 0) {
            const velocityCV = tv.std / tv.mean;
            if (velocityCV > 1.5) {
                indicators.push({
                    type: 'velocity_variance',
                    severity: 'medium',
                    value: velocityCV,
                    message: 'High variability in writing speed'
                });
                overallRisk += 1.5;
            }
            factorCount++;
        }

        // Check pause patterns
        if (tp.pauseFrequency !== undefined) {
            if (tp.pauseFrequency > 2) {
                indicators.push({
                    type: 'excessive_pauses',
                    severity: 'low',
                    value: tp.pauseFrequency,
                    message: 'Frequent pauses during writing'
                });
                overallRisk += 1;
            }
            factorCount++;
        }

        // Calculate overall irregularity score
        const maxRisk = factorCount * 3;
        const irregularityScore = maxRisk > 0 ? (overallRisk / maxRisk) * 100 : 0;

        let classification = 'normal';
        if (irregularityScore > 60) {
            classification = 'high_irregularity';
        } else if (irregularityScore > 30) {
            classification = 'moderate_irregularity';
        } else if (irregularityScore > 10) {
            classification = 'mild_irregularity';
        }

        return {
            irregularityScore: irregularityScore,
            classification: classification,
            indicators: indicators,
            factorsAnalyzed: factorCount,
            summary: this.generateAnalysisSummary(classification, indicators)
        };
    }

    generateAnalysisSummary(classification, indicators) {
        const summaries = {
            'normal': 'Handwriting patterns appear within normal range.',
            'mild_irregularity': 'Minor irregularities detected. May be due to fatigue, stress, or environmental factors.',
            'moderate_irregularity': 'Moderate irregularities detected. Consider factors like writing conditions, health status, or motor function.',
            'high_irregularity': 'Significant irregularities detected. Professional evaluation may be beneficial if patterns persist.'
        };

        let summary = summaries[classification] || summaries['normal'];

        if (indicators.length > 0) {
            summary += ` Key observations: ${indicators.map(i => i.message).join('; ')}.`;
        }

        return summary;
    }

    /**
     * Get training statistics
     */
    getTrainingStats() {
        const labelCounts = {};
        this.labels.forEach(label => {
            labelCounts[label] = (labelCounts[label] || 0) + 1;
        });

        return {
            totalSamples: this.trainingData.length,
            numFeatures: this.featureNames.length,
            labelDistribution: labelCounts,
            featureNames: this.featureNames,
            scalerFitted: Object.keys(this.featureScaler.means).length > 0
        };
    }

    /**
     * Clear training data
     */
    clearTrainingData() {
        this.trainingData = [];
        this.labels = [];
        this.initializeScaler();
    }

    /**
     * Save model and scaler to JSON
     */
    exportModelConfig() {
        return JSON.stringify({
            model: this.model,
            scaler: this.featureScaler,
            featureNames: this.featureNames,
            exportedAt: new Date().toISOString()
        }, null, 2);
    }

    /**
     * Load model and scaler from JSON
     */
    importModelConfig(jsonString) {
        const config = JSON.parse(jsonString);
        this.model = config.model;
        this.featureScaler = config.scaler || this.featureScaler;
        this.featureNames = config.featureNames || this.featureNames;
        this.isModelLoaded = true;
        this.modelType = config.model?.type || 'simple';
        return { success: true };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MLPipeline;
}