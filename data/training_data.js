/**
 * Training Dataset for Handwriting Irregularity Detection
 * 300 samples with labeled handwriting features
 *
 * Categories:
 * - normal: Healthy adult handwriting (150 samples)
 * - tremor: Parkinson's/Essential tremor patterns (50 samples)
 * - dysgraphia: Learning disability patterns (50 samples)
 * - fatigue: Tired/stressed writing (30 samples)
 * - elderly: Age-related changes (20 samples)
 *
 * Features based on research from:
 * - MovAlyzeR studies
 * - Parkinson's handwriting analysis literature
 * - Dysgraphia detection research
 */

const TRAINING_DATA = {
    version: "1.0",
    created: "2024-12-15",
    description: "Handwriting feature dataset for irregularity detection",

    // Feature names (must match CSVExporter output)
    featureNames: [
        "total_width",
        "total_height",
        "aspect_ratio",
        "total_strokes",
        "total_points",
        "center_of_mass_x",
        "center_of_mass_y",
        "mean_stroke_width",
        "std_stroke_width",
        "mean_stroke_height",
        "std_stroke_height",
        "mean_path_length",
        "std_path_length",
        "mean_straightness",
        "std_straightness",
        "mean_curvature",
        "std_curvature",
        "mean_slant",
        "std_slant",
        "writing_density",
        "horizontal_uniformity",
        "vertical_uniformity",
        "session_duration",
        "pen_down_ratio",
        "mean_stroke_duration",
        "std_stroke_duration",
        "writing_tempo",
        "mean_in_air_time",
        "mean_velocity",
        "std_velocity",
        "max_velocity",
        "velocity_peak_count",
        "velocity_peak_frequency",
        "mean_acceleration",
        "std_acceleration",
        "max_acceleration",
        "direction_changes",
        "mean_jerk",
        "normalized_jerk",
        "smoothness_index",
        "mean_pressure",
        "std_pressure",
        "pressure_range",
        "pause_count",
        "mean_pause_duration",
        "pause_frequency",
        "fluency_score",
        "automation_index",
        "rhythm_regularity",
        "irregularity_index"
    ],

    // Reference ranges for normal handwriting (for comparison display)
    normalRanges: {
        mean_velocity: { min: 0.15, max: 0.45, unit: "px/ms" },
        std_velocity: { min: 0.05, max: 0.20, unit: "px/ms" },
        mean_pressure: { min: 0.35, max: 0.65, unit: "0-1" },
        std_pressure: { min: 0.02, max: 0.12, unit: "0-1" },
        fluency_score: { min: 55, max: 85, unit: "0-100" },
        smoothness_index: { min: 0.4, max: 0.8, unit: "0-1" },
        rhythm_regularity: { min: 0.5, max: 0.85, unit: "0-1" },
        normalized_jerk: { min: 0.5, max: 2.5, unit: "" },
        pen_down_ratio: { min: 0.55, max: 0.80, unit: "0-1" },
        writing_tempo: { min: 1.5, max: 4.0, unit: "strokes/sec" },
        pause_frequency: { min: 0.1, max: 0.8, unit: "pauses/sec" },
        mean_stroke_duration: { min: 150, max: 500, unit: "ms" },
        mean_curvature: { min: 0.005, max: 0.025, unit: "1/px" },
        mean_slant: { min: -15, max: 15, unit: "degrees" }
    },

    // Labels and their descriptions
    labels: {
        "normal": {
            description: "Healthy adult handwriting",
            characteristics: [
                "Consistent stroke velocity",
                "Smooth movements (low jerk)",
                "Regular rhythm",
                "Moderate pressure variation",
                "High fluency score (60-85)"
            ]
        },
        "tremor": {
            description: "Tremor-affected handwriting (Parkinson's, Essential Tremor)",
            characteristics: [
                "High-frequency oscillations",
                "Increased jerk/acceleration",
                "Variable velocity",
                "Micrographia (small writing)",
                "Low fluency score (<50)"
            ]
        },
        "dysgraphia": {
            description: "Developmental writing difficulty",
            characteristics: [
                "Irregular letter sizing",
                "Poor spacing",
                "Inconsistent slant",
                "High variability in all features",
                "Many pauses and corrections"
            ]
        },
        "fatigue": {
            description: "Fatigue or stress-affected writing",
            characteristics: [
                "Decreasing velocity over time",
                "Increased pauses",
                "Reduced pressure",
                "Lower automation",
                "Moderate irregularity"
            ]
        },
        "elderly": {
            description: "Age-related handwriting changes",
            characteristics: [
                "Slower velocity",
                "More careful strokes",
                "Higher pause frequency",
                "Slightly reduced smoothness",
                "Maintained but slower rhythm"
            ]
        }
    },

    // 300 training samples
    samples: []
};

// Generate training samples with realistic distributions
function generateTrainingSamples() {
    const samples = [];

    // Helper functions
    const randNormal = (mean, std) => {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + z * std;
    };

    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    // Generate NORMAL samples (150)
    for (let i = 0; i < 150; i++) {
        samples.push({
            label: "normal",
            features: {
                total_width: randNormal(450, 80),
                total_height: randNormal(120, 25),
                aspect_ratio: randNormal(3.5, 0.8),
                total_strokes: Math.round(randNormal(12, 4)),
                total_points: Math.round(randNormal(350, 100)),
                center_of_mass_x: randNormal(400, 50),
                center_of_mass_y: randNormal(150, 20),
                mean_stroke_width: randNormal(35, 10),
                std_stroke_width: randNormal(12, 4),
                mean_stroke_height: randNormal(45, 12),
                std_stroke_height: randNormal(15, 5),
                mean_path_length: randNormal(85, 25),
                std_path_length: randNormal(30, 10),
                mean_straightness: randNormal(0.72, 0.08),
                std_straightness: randNormal(0.12, 0.03),
                mean_curvature: randNormal(0.015, 0.005),
                std_curvature: randNormal(0.008, 0.002),
                mean_slant: randNormal(5, 8),
                std_slant: randNormal(6, 2),
                writing_density: randNormal(0.12, 0.03),
                horizontal_uniformity: randNormal(0.75, 0.08),
                vertical_uniformity: randNormal(0.70, 0.10),
                session_duration: randNormal(4500, 1200),
                pen_down_ratio: randNormal(0.68, 0.08),
                mean_stroke_duration: randNormal(280, 70),
                std_stroke_duration: randNormal(85, 25),
                writing_tempo: randNormal(2.8, 0.6),
                mean_in_air_time: randNormal(120, 40),
                mean_velocity: randNormal(0.28, 0.06),
                std_velocity: randNormal(0.12, 0.03),
                max_velocity: randNormal(0.65, 0.15),
                velocity_peak_count: Math.round(randNormal(25, 8)),
                velocity_peak_frequency: randNormal(5.5, 1.5),
                mean_acceleration: randNormal(0.002, 0.0008),
                std_acceleration: randNormal(0.003, 0.001),
                max_acceleration: randNormal(0.012, 0.004),
                direction_changes: Math.round(randNormal(45, 15)),
                mean_jerk: randNormal(0.00008, 0.00003),
                normalized_jerk: randNormal(1.2, 0.4),
                smoothness_index: randNormal(0.65, 0.12),
                mean_pressure: randNormal(0.52, 0.08),
                std_pressure: randNormal(0.06, 0.02),
                pressure_range: randNormal(0.25, 0.08),
                pause_count: Math.round(randNormal(4, 2)),
                mean_pause_duration: randNormal(180, 60),
                pause_frequency: randNormal(0.35, 0.15),
                fluency_score: randNormal(72, 8),
                automation_index: randNormal(0.70, 0.08),
                rhythm_regularity: randNormal(0.68, 0.10),
                irregularity_index: randNormal(0.22, 0.08)
            }
        });
    }

    // Generate TREMOR samples (50)
    for (let i = 0; i < 50; i++) {
        samples.push({
            label: "tremor",
            features: {
                total_width: randNormal(280, 70),  // Micrographia - smaller
                total_height: randNormal(80, 20),
                aspect_ratio: randNormal(3.2, 0.9),
                total_strokes: Math.round(randNormal(15, 5)),  // More strokes (fragmented)
                total_points: Math.round(randNormal(420, 120)),
                center_of_mass_x: randNormal(400, 60),
                center_of_mass_y: randNormal(150, 25),
                mean_stroke_width: randNormal(22, 8),  // Smaller strokes
                std_stroke_width: randNormal(10, 4),
                mean_stroke_height: randNormal(28, 10),
                std_stroke_height: randNormal(12, 5),
                mean_path_length: randNormal(55, 20),
                std_path_length: randNormal(25, 10),
                mean_straightness: randNormal(0.55, 0.12),  // Less straight (tremor)
                std_straightness: randNormal(0.18, 0.05),
                mean_curvature: randNormal(0.035, 0.012),  // Higher curvature (oscillations)
                std_curvature: randNormal(0.018, 0.006),
                mean_slant: randNormal(3, 12),
                std_slant: randNormal(10, 4),  // More variable slant
                writing_density: randNormal(0.08, 0.03),
                horizontal_uniformity: randNormal(0.55, 0.12),
                vertical_uniformity: randNormal(0.50, 0.12),
                session_duration: randNormal(7500, 2000),  // Takes longer
                pen_down_ratio: randNormal(0.52, 0.10),
                mean_stroke_duration: randNormal(380, 100),  // Slower strokes
                std_stroke_duration: randNormal(140, 45),  // More variable
                writing_tempo: randNormal(1.8, 0.5),  // Slower
                mean_in_air_time: randNormal(220, 80),  // More hesitation
                mean_velocity: randNormal(0.15, 0.05),  // Slower
                std_velocity: randNormal(0.22, 0.06),  // More variable (tremor)
                max_velocity: randNormal(0.55, 0.18),
                velocity_peak_count: Math.round(randNormal(55, 15)),  // More peaks (oscillations)
                velocity_peak_frequency: randNormal(12, 4),  // Higher frequency
                mean_acceleration: randNormal(0.005, 0.002),  // Higher acceleration (jerky)
                std_acceleration: randNormal(0.008, 0.003),
                max_acceleration: randNormal(0.028, 0.010),
                direction_changes: Math.round(randNormal(85, 25)),  // Many direction changes
                mean_jerk: randNormal(0.00025, 0.00010),  // High jerk (not smooth)
                normalized_jerk: randNormal(4.5, 1.5),  // High normalized jerk
                smoothness_index: randNormal(0.25, 0.10),  // Low smoothness
                mean_pressure: randNormal(0.42, 0.12),
                std_pressure: randNormal(0.15, 0.05),  // Variable pressure
                pressure_range: randNormal(0.45, 0.12),
                pause_count: Math.round(randNormal(10, 4)),  // More pauses
                mean_pause_duration: randNormal(350, 120),
                pause_frequency: randNormal(1.2, 0.4),
                fluency_score: randNormal(35, 12),  // Low fluency
                automation_index: randNormal(0.45, 0.12),
                rhythm_regularity: randNormal(0.35, 0.12),  // Irregular rhythm
                irregularity_index: randNormal(0.72, 0.12)  // High irregularity
            }
        });
    }

    // Generate DYSGRAPHIA samples (50)
    for (let i = 0; i < 50; i++) {
        samples.push({
            label: "dysgraphia",
            features: {
                total_width: randNormal(520, 120),  // Often larger, sprawling
                total_height: randNormal(160, 45),
                aspect_ratio: randNormal(3.0, 1.2),  // Inconsistent
                total_strokes: Math.round(randNormal(18, 6)),  // More strokes (corrections)
                total_points: Math.round(randNormal(380, 110)),
                center_of_mass_x: randNormal(400, 80),
                center_of_mass_y: randNormal(150, 35),
                mean_stroke_width: randNormal(42, 18),  // High variability
                std_stroke_width: randNormal(22, 8),  // Very variable
                mean_stroke_height: randNormal(55, 22),
                std_stroke_height: randNormal(25, 10),  // Very variable
                mean_path_length: randNormal(75, 35),
                std_path_length: randNormal(45, 15),  // High variability
                mean_straightness: randNormal(0.58, 0.15),
                std_straightness: randNormal(0.22, 0.07),
                mean_curvature: randNormal(0.022, 0.010),
                std_curvature: randNormal(0.015, 0.005),
                mean_slant: randNormal(8, 18),  // Inconsistent slant
                std_slant: randNormal(16, 6),  // Very variable slant
                writing_density: randNormal(0.10, 0.04),
                horizontal_uniformity: randNormal(0.48, 0.15),  // Poor uniformity
                vertical_uniformity: randNormal(0.45, 0.15),
                session_duration: randNormal(8000, 2500),  // Takes long
                pen_down_ratio: randNormal(0.48, 0.12),
                mean_stroke_duration: randNormal(320, 120),
                std_stroke_duration: randNormal(160, 55),  // Very variable
                writing_tempo: randNormal(2.0, 0.7),
                mean_in_air_time: randNormal(280, 100),  // Long pauses
                mean_velocity: randNormal(0.20, 0.08),
                std_velocity: randNormal(0.18, 0.06),  // Variable
                max_velocity: randNormal(0.58, 0.20),
                velocity_peak_count: Math.round(randNormal(35, 12)),
                velocity_peak_frequency: randNormal(6, 2.5),
                mean_acceleration: randNormal(0.003, 0.0015),
                std_acceleration: randNormal(0.005, 0.002),
                max_acceleration: randNormal(0.018, 0.007),
                direction_changes: Math.round(randNormal(65, 22)),
                mean_jerk: randNormal(0.00015, 0.00006),
                normalized_jerk: randNormal(2.8, 0.9),
                smoothness_index: randNormal(0.38, 0.12),
                mean_pressure: randNormal(0.55, 0.15),  // Variable pressure
                std_pressure: randNormal(0.12, 0.05),
                pressure_range: randNormal(0.40, 0.12),
                pause_count: Math.round(randNormal(12, 5)),  // Many pauses
                mean_pause_duration: randNormal(420, 150),  // Long pauses
                pause_frequency: randNormal(1.5, 0.5),
                fluency_score: randNormal(42, 12),
                automation_index: randNormal(0.42, 0.12),
                rhythm_regularity: randNormal(0.38, 0.12),
                irregularity_index: randNormal(0.65, 0.12)
            }
        });
    }

    // Generate FATIGUE samples (30)
    for (let i = 0; i < 30; i++) {
        samples.push({
            label: "fatigue",
            features: {
                total_width: randNormal(420, 70),
                total_height: randNormal(110, 25),
                aspect_ratio: randNormal(3.6, 0.7),
                total_strokes: Math.round(randNormal(11, 3)),
                total_points: Math.round(randNormal(300, 80)),
                center_of_mass_x: randNormal(400, 45),
                center_of_mass_y: randNormal(150, 20),
                mean_stroke_width: randNormal(38, 12),
                std_stroke_width: randNormal(14, 5),
                mean_stroke_height: randNormal(42, 12),
                std_stroke_height: randNormal(16, 5),
                mean_path_length: randNormal(78, 22),
                std_path_length: randNormal(28, 10),
                mean_straightness: randNormal(0.65, 0.10),
                std_straightness: randNormal(0.15, 0.04),
                mean_curvature: randNormal(0.018, 0.006),
                std_curvature: randNormal(0.010, 0.003),
                mean_slant: randNormal(6, 10),
                std_slant: randNormal(8, 3),
                writing_density: randNormal(0.11, 0.03),
                horizontal_uniformity: randNormal(0.65, 0.10),
                vertical_uniformity: randNormal(0.62, 0.10),
                session_duration: randNormal(5500, 1500),
                pen_down_ratio: randNormal(0.58, 0.10),
                mean_stroke_duration: randNormal(350, 90),  // Slower
                std_stroke_duration: randNormal(110, 35),
                writing_tempo: randNormal(2.2, 0.5),  // Slower
                mean_in_air_time: randNormal(180, 60),
                mean_velocity: randNormal(0.20, 0.05),  // Reduced velocity
                std_velocity: randNormal(0.14, 0.04),
                max_velocity: randNormal(0.52, 0.14),
                velocity_peak_count: Math.round(randNormal(22, 7)),
                velocity_peak_frequency: randNormal(4.5, 1.2),
                mean_acceleration: randNormal(0.0018, 0.0007),
                std_acceleration: randNormal(0.0028, 0.001),
                max_acceleration: randNormal(0.010, 0.004),
                direction_changes: Math.round(randNormal(42, 14)),
                mean_jerk: randNormal(0.00010, 0.00004),
                normalized_jerk: randNormal(1.8, 0.5),
                smoothness_index: randNormal(0.52, 0.10),
                mean_pressure: randNormal(0.42, 0.10),  // Reduced pressure
                std_pressure: randNormal(0.08, 0.03),
                pressure_range: randNormal(0.30, 0.10),
                pause_count: Math.round(randNormal(7, 3)),
                mean_pause_duration: randNormal(260, 80),
                pause_frequency: randNormal(0.65, 0.25),
                fluency_score: randNormal(55, 10),
                automation_index: randNormal(0.58, 0.10),
                rhythm_regularity: randNormal(0.55, 0.10),
                irregularity_index: randNormal(0.40, 0.10)
            }
        });
    }

    // Generate ELDERLY samples (20)
    for (let i = 0; i < 20; i++) {
        samples.push({
            label: "elderly",
            features: {
                total_width: randNormal(380, 65),
                total_height: randNormal(105, 22),
                aspect_ratio: randNormal(3.4, 0.7),
                total_strokes: Math.round(randNormal(10, 3)),
                total_points: Math.round(randNormal(280, 70)),
                center_of_mass_x: randNormal(400, 40),
                center_of_mass_y: randNormal(150, 18),
                mean_stroke_width: randNormal(36, 10),
                std_stroke_width: randNormal(12, 4),
                mean_stroke_height: randNormal(40, 10),
                std_stroke_height: randNormal(14, 4),
                mean_path_length: randNormal(72, 20),
                std_path_length: randNormal(26, 8),
                mean_straightness: randNormal(0.68, 0.09),
                std_straightness: randNormal(0.13, 0.04),
                mean_curvature: randNormal(0.016, 0.005),
                std_curvature: randNormal(0.009, 0.003),
                mean_slant: randNormal(4, 8),
                std_slant: randNormal(7, 2.5),
                writing_density: randNormal(0.11, 0.025),
                horizontal_uniformity: randNormal(0.68, 0.09),
                vertical_uniformity: randNormal(0.65, 0.09),
                session_duration: randNormal(6000, 1400),  // Takes longer
                pen_down_ratio: randNormal(0.60, 0.09),
                mean_stroke_duration: randNormal(400, 90),  // Slower, more careful
                std_stroke_duration: randNormal(95, 30),
                writing_tempo: randNormal(1.9, 0.4),  // Slower
                mean_in_air_time: randNormal(200, 65),
                mean_velocity: randNormal(0.18, 0.05),  // Slower
                std_velocity: randNormal(0.10, 0.03),
                max_velocity: randNormal(0.45, 0.12),
                velocity_peak_count: Math.round(randNormal(18, 6)),
                velocity_peak_frequency: randNormal(3.8, 1.0),
                mean_acceleration: randNormal(0.0015, 0.0006),
                std_acceleration: randNormal(0.0022, 0.0008),
                max_acceleration: randNormal(0.008, 0.003),
                direction_changes: Math.round(randNormal(38, 12)),
                mean_jerk: randNormal(0.00007, 0.00003),
                normalized_jerk: randNormal(1.5, 0.4),
                smoothness_index: randNormal(0.55, 0.10),
                mean_pressure: randNormal(0.48, 0.09),
                std_pressure: randNormal(0.07, 0.025),
                pressure_range: randNormal(0.28, 0.08),
                pause_count: Math.round(randNormal(6, 2.5)),
                mean_pause_duration: randNormal(300, 90),
                pause_frequency: randNormal(0.55, 0.20),
                fluency_score: randNormal(58, 9),
                automation_index: randNormal(0.60, 0.09),
                rhythm_regularity: randNormal(0.58, 0.09),
                irregularity_index: randNormal(0.35, 0.09)
            }
        });
    }

    return samples;
}

// Generate and store samples
TRAINING_DATA.samples = generateTrainingSamples();

// Convert to feature vectors for ML
TRAINING_DATA.getFeatureVectors = function() {
    return this.samples.map(sample => {
        return this.featureNames.map(name => sample.features[name] || 0);
    });
};

TRAINING_DATA.getLabels = function() {
    return this.samples.map(sample => sample.label);
};

// Get statistics for each label
TRAINING_DATA.getStatsByLabel = function() {
    const stats = {};

    for (const label of Object.keys(this.labels)) {
        const labelSamples = this.samples.filter(s => s.label === label);
        stats[label] = {
            count: labelSamples.length,
            features: {}
        };

        for (const featureName of this.featureNames) {
            const values = labelSamples.map(s => s.features[featureName]);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const std = Math.sqrt(
                values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
            );
            stats[label].features[featureName] = { mean, std };
        }
    }

    return stats;
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TRAINING_DATA;
}