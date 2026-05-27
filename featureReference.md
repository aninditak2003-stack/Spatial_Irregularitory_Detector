# Handwriting Features Reference Guide

## Overview

This document provides a comprehensive list of spatial, temporal, and dynamic features used in handwriting analysis for writing irregularity detection.

---

# 1. SPATIAL FEATURES

Spatial features describe the geometric and positional properties of handwriting.

## 1.1 Stroke-Level Spatial Features

| Feature | Description | Unit |
|---------|-------------|------|
| stroke_length | Total path length of a stroke | pixels |
| stroke_width | Horizontal extent of stroke | pixels |
| stroke_height | Vertical extent of stroke | pixels |
| stroke_area | Bounding box area (width × height) | pixels² |
| aspect_ratio | Width/Height ratio | ratio |
| stroke_slant | Angle of stroke from vertical | degrees |
| curvature | Average curvature along stroke path | 1/pixels |
| max_curvature | Maximum curvature point | 1/pixels |
| straightness | Ratio of endpoint distance to path length | ratio (0-1) |

---

## 1.2 Letter/Character Spatial Features

| Feature | Description | Unit |
|---------|-------------|------|
| letter_width | Width of individual letters | pixels |
| letter_height | Height of individual letters | pixels |
| x_height | Height of lowercase letters (e.g., 'x') | pixels |
| ascender_height | Height above x-height (b, d, h) | pixels |
| descender_depth | Depth below baseline (g, p, y) | pixels |
| baseline_deviation | Deviation from baseline | pixels |

---

## 1.3 Word/Line Spatial Features

| Feature | Description | Unit |
|---------|-------------|------|
| word_spacing | Distance between words | pixels |
| letter_spacing | Distance between letters | pixels |
| line_spacing | Vertical distance between lines | pixels |
| left_margin | Distance from left edge | pixels |
| right_margin | Distance from right edge | pixels |
| line_slant | Overall slant of text line | degrees |
| baseline_consistency | Variance in baseline position | pixels |

---

## 1.4 Global Spatial Features

| Feature | Description | Unit |
|---------|-------------|------|
| writing_density | Ink pixels / total area | ratio |
| horizontal_distribution | Distribution of writing across width | statistical |
| vertical_distribution | Distribution of writing across height | statistical |
| center_of_mass_x | X coordinate of writing center | pixels |
| center_of_mass_y | Y coordinate of writing center | pixels |

---

# 2. TEMPORAL FEATURES

Temporal features capture time-based properties of handwriting (live capture only).

## 2.1 Duration Features

| Feature | Description | Unit |
|---------|-------------|------|
| total_duration | Total time to complete writing | ms |
| stroke_duration | Time to complete single stroke | ms |
| mean_stroke_duration | Average stroke duration | ms |
| stroke_duration_variance | Variance in stroke durations | ms² |
| pen_down_time | Total time pen is on surface | ms |
| pen_up_time | Total time pen is lifted | ms |
| pen_down_ratio | pen_down_time / total_duration | ratio |

---

## 2.2 Pause Features

| Feature | Description | Unit |
|---------|-------------|------|
| pause_count | Number of pauses during writing | count |
| total_pause_duration | Sum of all pause durations | ms |
| mean_pause_duration | Average pause duration | ms |
| max_pause_duration | Longest pause | ms |
| pause_frequency | Pauses per second | Hz |
| in_air_time | Time between strokes (pen lifted) | ms |

---

## 2.3 Timing Patterns

| Feature | Description | Unit |
|---------|-------------|------|
| writing_tempo | Strokes per second | Hz |
| rhythm_regularity | Consistency of stroke timing | coefficient |
| acceleration_time | Time spent accelerating | ms |
| deceleration_time | Time spent decelerating | ms |

---

# 3. DYNAMIC / KINEMATIC FEATURES

Dynamic features describe the motion characteristics of handwriting.

## 3.1 Velocity Features

| Feature | Description | Unit |
|---------|-------------|------|
| instantaneous_velocity | Speed at each sample point | pixels/ms |
| mean_velocity | Average writing speed | pixels/ms |
| max_velocity | Peak writing speed | pixels/ms |
| min_velocity | Minimum writing speed | pixels/ms |
| velocity_variance | Variance in velocity | (pixels/ms)² |
| velocity_peaks | Number of velocity maxima | count |
| horizontal_velocity | Speed in x-direction | pixels/ms |
| vertical_velocity | Speed in y-direction | pixels/ms |

---

## 3.2 Acceleration Features

| Feature | Description | Unit |
|---------|-------------|------|
| instantaneous_acceleration | Acceleration at each point | pixels/ms² |
| mean_acceleration | Average acceleration | pixels/ms² |
| max_acceleration | Peak acceleration | pixels/ms² |
| acceleration_variance | Variance in acceleration | (pixels/ms²)² |
| acceleration_changes | Sign changes in acceleration | count |

---

## 3.3 Jerk Features (Rate of Acceleration Change)

| Feature | Description | Unit |
|---------|-------------|------|
| instantaneous_jerk | Jerk at each point | pixels/ms³ |
| mean_jerk | Average jerk | pixels/ms³ |
| normalized_jerk | Jerk normalized by duration | dimensionless |
| jerk_cost | Integral of squared jerk | pixels²/ms⁵ |
| smoothness_index | Inverse of normalized jerk | dimensionless |

---

## 3.4 Pressure Features (if available)

| Feature | Description | Unit |
|---------|-------------|------|
| mean_pressure | Average pen pressure | 0-1 |
| max_pressure | Maximum pressure | 0-1 |
| min_pressure | Minimum pressure | 0-1 |
| pressure_variance | Variance in pressure | (0-1)² |
| pressure_changes | Rate of pressure change | 1/ms |

---

## 3.5 Angular Features

| Feature | Description | Unit |
|---------|-------------|------|
| pen_tilt_x | Pen tilt in x-axis | degrees |
| pen_tilt_y | Pen tilt in y-axis | degrees |
| azimuth | Pen rotation angle | degrees |
| direction_changes | Number of direction reversals | count |
| angular_velocity | Rate of direction change | degrees/ms |

---

# 4. FLUENCY / QUALITY FEATURES

Derived features indicating writing quality and fluency.

| Feature | Description | Unit |
|---------|-------------|------|
| fluency_score | Overall writing smoothness | 0-100 |
| consistency_score | Uniformity of features | 0-100 |
| automation_index | Degree of motor automation | 0-1 |
| irregularity_index | Deviation from normal patterns | 0-1 |
| tremor_frequency | Detected tremor frequency | Hz |
| tremor_amplitude | Detected tremor magnitude | pixels |

---

# 5. FEATURES EXTRACTED FROM STATIC IMAGES (PNG)

## Available from PNG

- All Spatial Features (Section 1)
- Writing density and distribution
- Stroke geometry (estimated)
- Letter/word spacing
- Baseline analysis
- Slant analysis

---

## NOT Available from PNG (Requires Live Capture)

- Temporal Features (Section 2)
- Dynamic/Kinematic Features (Section 3)
- Pressure data
- Velocity/Acceleration data

---

# 6. FEATURE EXTRACTION METHODS

## From Live Canvas

1. Capture raw data: `(x, y, timestamp, pressure)` at each sample
2. Segment into strokes using pen-up/pen-down events
3. Apply low-pass filtering to reduce noise
4. Calculate derivatives for velocity, acceleration, jerk
5. Extract statistical features per stroke and overall

---

## From PNG Image

1. Convert to grayscale
2. Apply thresholding/binarization
3. Detect contours and connected components
4. Skeletonize for stroke path estimation
5. Extract geometric measurements
6. Analyze spacing and alignment

---

# 7. CLINICAL SIGNIFICANCE

| Feature Category | Relevant Conditions |
|------------------|--------------------|
| Tremor features | Parkinson's, Essential Tremor |
| Velocity/acceleration | Motor impairment, Fatigue |
| Pressure variations | Fine motor control issues |
| Spatial consistency | Dysgraphia, ADHD |
| Fluency measures | Developmental disorders |
| Pause patterns | Cognitive load, Aging |

---

# References

- MovAlyzeR by NeuroScript
- Handwriting Analysis: Theory and Applications
- OASIS (Online Acquisition of Signatures and Introspective Segments)