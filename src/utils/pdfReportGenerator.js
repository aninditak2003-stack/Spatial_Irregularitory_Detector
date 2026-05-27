/**
 * PDFReportGenerator - Generates comprehensive PDF reports for handwriting analysis
 * Includes reference images, irregularity annotations, comparisons, and recommendations
 */

class PDFReportGenerator {
    constructor() {
        this.pageWidth = 210; // A4 width in mm
        this.pageHeight = 297; // A4 height in mm
        this.margin = 15;
        this.contentWidth = this.pageWidth - (2 * this.margin);
        this.currentY = this.margin;
        this.pdf = null;

        // Color scheme
        this.colors = {
            primary: [52, 152, 219],      // Blue
            success: [39, 174, 96],        // Green
            warning: [243, 156, 18],       // Orange
            danger: [231, 76, 60],         // Red
            purple: [155, 89, 182],        // Purple
            dark: [44, 62, 80],            // Dark gray
            light: [236, 240, 241],        // Light gray
            white: [255, 255, 255]
        };

        // Category colors
        this.categoryColors = {
            'normal': [39, 174, 96],       // Green
            'tremor': [231, 76, 60],       // Red
            'dysgraphia': [230, 126, 34],  // Orange
            'fatigue': [243, 156, 18],     // Yellow-Orange
            'elderly': [155, 89, 182]      // Purple
        };

        // Reference values for each category (typical ranges)
        this.categoryReferenceValues = {
            'normal': {
                fluency_score: { value: 75, range: '65-85', unit: '' },
                smoothness_index: { value: 0.72, range: '0.6-0.85', unit: '' },
                rhythm_regularity: { value: 0.78, range: '0.65-0.90', unit: '' },
                mean_velocity: { value: 0.45, range: '0.35-0.55', unit: 'px/ms' },
                normalized_jerk: { value: 0.35, range: '0.2-0.5', unit: '' },
                pause_frequency: { value: 0.8, range: '0.5-1.2', unit: '/sec' },
                mean_pressure: { value: 0.55, range: '0.4-0.7', unit: '' },
                writing_tempo: { value: 2.5, range: '2.0-3.5', unit: 'strokes/sec' }
            },
            'tremor': {
                fluency_score: { value: 35, range: '20-45', unit: '' },
                smoothness_index: { value: 0.25, range: '0.15-0.35', unit: '' },
                rhythm_regularity: { value: 0.40, range: '0.25-0.50', unit: '' },
                mean_velocity: { value: 0.28, range: '0.15-0.40', unit: 'px/ms' },
                normalized_jerk: { value: 1.8, range: '1.2-2.5', unit: '' },
                pause_frequency: { value: 2.5, range: '1.8-3.5', unit: '/sec' },
                mean_pressure: { value: 0.65, range: '0.5-0.85', unit: '' },
                writing_tempo: { value: 1.2, range: '0.8-1.8', unit: 'strokes/sec' }
            },
            'dysgraphia': {
                fluency_score: { value: 42, range: '30-55', unit: '' },
                smoothness_index: { value: 0.38, range: '0.25-0.50', unit: '' },
                rhythm_regularity: { value: 0.35, range: '0.20-0.45', unit: '' },
                mean_velocity: { value: 0.32, range: '0.20-0.45', unit: 'px/ms' },
                normalized_jerk: { value: 1.2, range: '0.8-1.8', unit: '' },
                pause_frequency: { value: 2.2, range: '1.5-3.0', unit: '/sec' },
                mean_pressure: { value: 0.70, range: '0.55-0.90', unit: '' },
                writing_tempo: { value: 1.5, range: '1.0-2.2', unit: 'strokes/sec' }
            },
            'fatigue': {
                fluency_score: { value: 52, range: '40-65', unit: '' },
                smoothness_index: { value: 0.48, range: '0.35-0.60', unit: '' },
                rhythm_regularity: { value: 0.52, range: '0.40-0.65', unit: '' },
                mean_velocity: { value: 0.35, range: '0.25-0.45', unit: 'px/ms' },
                normalized_jerk: { value: 0.85, range: '0.6-1.2', unit: '' },
                pause_frequency: { value: 1.8, range: '1.2-2.5', unit: '/sec' },
                mean_pressure: { value: 0.45, range: '0.30-0.60', unit: '' },
                writing_tempo: { value: 1.8, range: '1.3-2.5', unit: 'strokes/sec' }
            },
            'elderly': {
                fluency_score: { value: 55, range: '45-68', unit: '' },
                smoothness_index: { value: 0.50, range: '0.38-0.62', unit: '' },
                rhythm_regularity: { value: 0.55, range: '0.42-0.68', unit: '' },
                mean_velocity: { value: 0.30, range: '0.22-0.42', unit: 'px/ms' },
                normalized_jerk: { value: 0.75, range: '0.55-1.0', unit: '' },
                pause_frequency: { value: 1.5, range: '1.0-2.2', unit: '/sec' },
                mean_pressure: { value: 0.50, range: '0.35-0.65', unit: '' },
                writing_tempo: { value: 1.6, range: '1.2-2.2', unit: 'strokes/sec' }
            }
        };

        // Irregularity type descriptions and fix recommendations
        this.irregularityInfo = {
            'low_fluency': {
                title: 'Low Writing Fluency',
                description: 'Writing appears hesitant with interrupted flow. Indicates difficulty in continuous motor control.',
                visualIndicators: [
                    'Frequent stops and starts visible in stroke patterns',
                    'Uneven ink distribution along strokes',
                    'Variable stroke thickness'
                ],
                recommendations: [
                    'Practice continuous writing exercises without lifting the pen',
                    'Use lined paper to maintain consistent flow',
                    'Try relaxation techniques before writing to reduce tension',
                    'Practice figure-8 and spiral patterns to improve fluidity',
                    'Slow down writing speed to focus on smooth movements'
                ],
                severity: 'high'
            },
            'moderate_fluency': {
                title: 'Moderate Fluency Issues',
                description: 'Writing shows some interruptions but maintains reasonable continuity.',
                visualIndicators: [
                    'Occasional hesitation marks',
                    'Some variation in stroke smoothness'
                ],
                recommendations: [
                    'Practice daily writing for 10-15 minutes',
                    'Focus on maintaining even pressure throughout strokes',
                    'Use warm-up exercises before extended writing'
                ],
                severity: 'medium'
            },
            'low_smoothness': {
                title: 'Jerky/Unsmooth Movements',
                description: 'High jerk values indicate irregular accelerations and decelerations during writing.',
                visualIndicators: [
                    'Visible tremor-like patterns in strokes',
                    'Jagged edges instead of smooth curves',
                    'Irregular stroke endings',
                    'Visible direction changes within single strokes'
                ],
                recommendations: [
                    'Support the writing hand with the other hand initially',
                    'Use a thicker pen grip to reduce fine motor demands',
                    'Practice large-scale movements before fine writing',
                    'Consider using weighted pens for stabilization',
                    'Ensure proper sitting posture and desk height'
                ],
                severity: 'high'
            },
            'irregular_rhythm': {
                title: 'Inconsistent Writing Rhythm',
                description: 'Variable timing between strokes indicates irregular motor planning.',
                visualIndicators: [
                    'Uneven spacing between letters/strokes',
                    'Variable letter sizes',
                    'Inconsistent slant angles'
                ],
                recommendations: [
                    'Practice with metronome or rhythmic music',
                    'Use graph paper to maintain consistent spacing',
                    'Focus on writing one word at a time with pauses',
                    'Practice copying regular patterns before free writing'
                ],
                severity: 'medium'
            },
            'velocity_variance': {
                title: 'Inconsistent Writing Speed',
                description: 'High variation in velocity suggests unstable motor control.',
                visualIndicators: [
                    'Variable stroke thicknesses (thin = fast, thick = slow)',
                    'Some strokes appear rushed while others drag',
                    'Uneven pressure throughout the writing'
                ],
                recommendations: [
                    'Practice maintaining steady pace with simple patterns',
                    'Use visual guides to pace writing',
                    'Focus on breathing rhythm while writing',
                    'Break writing into smaller segments with rest periods'
                ],
                severity: 'medium'
            },
            'excessive_pauses': {
                title: 'Frequent Writing Pauses',
                description: 'More frequent pauses than normal indicate cognitive or motor processing delays.',
                visualIndicators: [
                    'Visible ink pooling at pause points',
                    'Heavier dots at stroke beginnings',
                    'Irregular spacing suggesting hesitation'
                ],
                recommendations: [
                    'Practice familiar words to reduce cognitive load',
                    'Use planning strategies - think before writing',
                    'Work on automaticity with repetitive exercises',
                    'Consider if environmental distractions are a factor'
                ],
                severity: 'low'
            }
        };

        // Category descriptions with detailed characteristics
        this.categoryInfo = {
            'normal': {
                title: 'Normal Handwriting',
                description: 'Writing patterns fall within typical ranges for healthy adults. Consistent rhythm, smooth strokes, and balanced pressure.',
                characteristics: [
                    'Smooth, continuous stroke flow',
                    'Consistent letter sizing and spacing',
                    'Balanced writing pressure',
                    'Regular rhythm and tempo',
                    'Minimal hesitations or corrections'
                ],
                color: this.colors.success
            },
            'tremor': {
                title: 'Tremor Patterns',
                description: 'Writing shows oscillatory movements characteristic of tremor conditions such as essential tremor or Parkinson\'s disease.',
                characteristics: [
                    'Visible oscillations in stroke paths',
                    'Micrographia (progressively smaller writing)',
                    'Increased writing time',
                    'High jerk and low smoothness values',
                    'Difficulty with curved strokes'
                ],
                color: this.colors.danger
            },
            'dysgraphia': {
                title: 'Dysgraphia Indicators',
                description: 'Writing patterns suggest developmental writing difficulties affecting letter formation and spatial organization.',
                characteristics: [
                    'Inconsistent letter sizes and shapes',
                    'Poor spatial organization',
                    'Irregular baseline alignment',
                    'Mixed upper/lower case letters',
                    'Unusual pen grip pressure patterns'
                ],
                color: this.colors.warning
            },
            'fatigue': {
                title: 'Fatigue Patterns',
                description: 'Writing shows degradation patterns typical of muscular fatigue, often worsening over the writing session.',
                characteristics: [
                    'Declining stroke quality over time',
                    'Reduced writing pressure',
                    'Increasing pause frequency',
                    'Slower writing tempo',
                    'Less precise letter formation'
                ],
                color: [243, 156, 18]
            },
            'elderly': {
                title: 'Age-Related Changes',
                description: 'Writing patterns consistent with typical aging effects on motor control, generally slower but still organized.',
                characteristics: [
                    'Slower overall writing speed',
                    'Slightly increased tremor',
                    'Maintained letter recognition',
                    'More deliberate stroke formation',
                    'Increased rest periods'
                ],
                color: this.colors.purple
            }
        };
    }

    /**
     * Generate a complete PDF report
     */
    async generateReport(analysisData, handwritingImage, options = {}) {
        // Initialize jsPDF
        if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
            throw new Error('jsPDF library not loaded. Please include jsPDF in your HTML.');
        }

        const { jsPDF } = window.jspdf || { jsPDF: window.jsPDF };
        this.pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        this.currentY = this.margin;

        // Store analysis data for reference
        this.analysisData = analysisData;

        // Generate report sections
        this.addHeader(options.patientName || 'Anonymous', options.date || new Date());
        this.addExecutiveSummary(analysisData);

        // Add the original handwriting sample with annotations
        if (handwritingImage) {
            await this.addHandwritingSampleWithAnnotations(handwritingImage, analysisData);
        }

        // Add the 5-category comparison section with values
        this.addFiveCategoryComparison(analysisData);

        // Add detailed feature comparison table
        this.addDetailedFeatureTable(analysisData);

        // Add detailed irregularity analysis
        if (analysisData.analysis?.indicators?.length > 0) {
            this.addIrregularityDetails(analysisData);
        }

        // Add recommendations
        this.addRecommendations(analysisData);

        // Add glossary/reference page
        this.addGlossaryPage();

        // Add footer with page numbers
        this.addFooters();

        return this.pdf;
    }

    /**
     * Add report header
     */
    addHeader(patientName, date) {
        // Header background
        this.pdf.setFillColor(...this.colors.primary);
        this.pdf.rect(0, 0, this.pageWidth, 40, 'F');

        // Title
        this.pdf.setTextColor(...this.colors.white);
        this.pdf.setFontSize(22);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Handwriting Analysis Report', this.margin, 18);

        // Subtitle
        this.pdf.setFontSize(12);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text('Comprehensive Irregularity Detection & Recommendations', this.margin, 28);

        // Date and patient info (right side)
        this.pdf.setFontSize(10);
        const dateStr = date instanceof Date ? date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        }) : date;
        this.pdf.text(`Date: ${dateStr}`, this.pageWidth - this.margin - 50, 18);
        this.pdf.text(`Subject: ${patientName}`, this.pageWidth - this.margin - 50, 26);

        this.currentY = 50;
    }

    /**
     * Add executive summary
     */
    addExecutiveSummary(analysisData) {
        this.addSectionTitle('Executive Summary');

        const { analysis, mlPrediction } = analysisData;

        // Overall assessment box
        const assessmentColor = this.getAssessmentColor(analysis?.classification || mlPrediction?.prediction);
        this.pdf.setFillColor(...assessmentColor);
        this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 35, 3, 3, 'F');

        this.pdf.setTextColor(...this.colors.white);
        this.pdf.setFontSize(14);
        this.pdf.setFont('helvetica', 'bold');

        const classificationText = this.formatClassification(analysis?.classification || mlPrediction?.prediction || 'Unknown');
        this.pdf.text('Overall Assessment: ' + classificationText, this.margin + 5, this.currentY + 12);

        // Score and confidence on same line
        this.pdf.setFontSize(11);
        let infoY = this.currentY + 22;

        if (analysis?.irregularityScore !== undefined) {
            this.pdf.text(`Irregularity Score: ${analysis.irregularityScore.toFixed(1)}/100`, this.margin + 5, infoY);
        }

        if (mlPrediction?.confidence) {
            this.pdf.text(`ML Confidence: ${(mlPrediction.confidence * 100).toFixed(0)}%`, this.margin + 80, infoY);
        }

        if (mlPrediction?.prediction) {
            this.pdf.text(`Classification: ${this.capitalizeFirst(mlPrediction.prediction)}`, this.margin + 140, infoY);
        }

        this.currentY += 43;

        // Summary text
        this.pdf.setTextColor(...this.colors.dark);
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'normal');

        if (analysis?.summary) {
            const summaryLines = this.pdf.splitTextToSize(analysis.summary, this.contentWidth - 10);
            this.pdf.text(summaryLines, this.margin + 5, this.currentY);
            this.currentY += summaryLines.length * 5 + 5;
        }

        // Key findings in a box
        if (analysis?.indicators && analysis.indicators.length > 0) {
            this.pdf.setFillColor(255, 248, 225); // Light yellow
            this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 8 + analysis.indicators.length * 6, 2, 2, 'F');

            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setFontSize(10);
            this.pdf.setTextColor(...this.colors.dark);
            this.pdf.text('Key Findings:', this.margin + 5, this.currentY + 6);
            this.currentY += 10;

            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setFontSize(9);
            analysis.indicators.forEach(indicator => {
                const color = indicator.severity === 'high' ? this.colors.danger :
                             indicator.severity === 'medium' ? this.colors.warning : this.colors.primary;
                this.pdf.setTextColor(...color);
                this.pdf.text(`• ${indicator.message}`, this.margin + 8, this.currentY);
                this.currentY += 5;
            });
            this.currentY += 3;
        }

        this.currentY += 5;
    }

    /**
     * Add handwriting sample with visual annotations
     */
    async addHandwritingSampleWithAnnotations(imageData, analysisData) {
        this.checkPageBreak(90);
        this.addSectionTitle('Your Handwriting Sample');

        // Create annotated image canvas
        const annotatedImage = await this.createAnnotatedImage(imageData, analysisData);

        if (annotatedImage) {
            const maxWidth = this.contentWidth;
            const maxHeight = 50;

            try {
                this.pdf.addImage(annotatedImage, 'PNG', this.margin, this.currentY, maxWidth, maxHeight);
                this.currentY += maxHeight + 5;
            } catch (e) {
                console.warn('Could not add annotated image:', e);
            }
        }

        // Add legend for annotations
        this.addAnnotationLegend();
    }

    /**
     * Create annotated version of the handwriting image
     */
    async createAnnotatedImage(imageData, analysisData) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (typeof imageData === 'string' && imageData.startsWith('data:')) {
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    this.drawAnnotations(ctx, canvas, analysisData);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.src = imageData;
            } else if (imageData instanceof HTMLCanvasElement) {
                canvas.width = imageData.width;
                canvas.height = imageData.height;
                ctx.drawImage(imageData, 0, 0);
                this.drawAnnotations(ctx, canvas, analysisData);
                resolve(canvas.toDataURL('image/png'));
            } else {
                resolve(null);
            }
        });
    }

    /**
     * Draw visual annotations on the canvas
     */
    drawAnnotations(ctx, canvas, analysisData) {
        const { analysis } = analysisData;
        if (!analysis?.indicators) return;

        ctx.lineWidth = 2;
        ctx.font = 'bold 12px Arial';

        // Draw problem zone highlights on the side
        const indicators = analysis.indicators || [];

        indicators.forEach((indicator, index) => {
            const color = indicator.severity === 'high' ? '#e74c3c' :
                         indicator.severity === 'medium' ? '#f39c12' : '#3498db';

            const x = canvas.width - 25;
            const y = 15 + (index * 25);

            // Bracket
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(x - 5, y);
            ctx.lineTo(x, y);
            ctx.lineTo(x, y + 18);
            ctx.lineTo(x - 5, y + 18);
            ctx.stroke();

            // Number circle
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x - 12, y + 9, 8, 0, 2 * Math.PI);
            ctx.fill();

            // Number
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText((index + 1).toString(), x - 12, y + 13);
        });

        // Label
        ctx.fillStyle = 'rgba(52, 152, 219, 0.9)';
        ctx.fillRect(5, canvas.height - 22, 160, 18);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Numbers indicate detected issues', 10, canvas.height - 8);
    }

    /**
     * Add legend for annotation colors
     */
    addAnnotationLegend() {
        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(...this.colors.dark);
        this.pdf.text('Legend:', this.margin, this.currentY);

        const legends = [
            { color: this.colors.danger, label: 'High Severity' },
            { color: this.colors.warning, label: 'Medium Severity' },
            { color: this.colors.primary, label: 'Low Severity' }
        ];

        let x = this.margin + 20;
        legends.forEach((legend) => {
            this.pdf.setFillColor(...legend.color);
            this.pdf.circle(x + 2, this.currentY - 1, 2, 'F');
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.text(legend.label, x + 6, this.currentY);
            x += 40;
        });

        this.currentY += 8;
    }

    /**
     * Add the 5-category comparison section with detailed values
     */
    addFiveCategoryComparison(analysisData) {
        this.checkPageBreak(120);
        this.addSectionTitle('Category Comparison Analysis');

        const { mlPrediction } = analysisData;
        const categories = ['normal', 'tremor', 'dysgraphia', 'fatigue', 'elderly'];

        // Calculate probabilities if not available - use confidence-based estimation
        let probabilities = mlPrediction?.probabilities || {};

        // If probabilities are all 0 or missing, generate estimated probabilities based on prediction
        const hasValidProbabilities = Object.values(probabilities).some(p => p > 0);
        if (!hasValidProbabilities && mlPrediction?.prediction) {
            const matchedCategory = mlPrediction.prediction;
            const confidence = mlPrediction.confidence || 0.6;

            // Distribute probabilities: matched category gets confidence, rest share remaining
            const remaining = 1 - confidence;
            const otherShare = remaining / (categories.length - 1);

            categories.forEach(cat => {
                if (cat === matchedCategory) {
                    probabilities[cat] = confidence;
                } else {
                    probabilities[cat] = otherShare;
                }
            });
        }

        // Intro text
        this.pdf.setFontSize(9);
        this.pdf.setTextColor(...this.colors.dark);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text('Your handwriting patterns compared against 5 reference categories (based on 300 training samples):', this.margin, this.currentY);
        this.currentY += 8;

        // Draw each category box with details
        const boxWidth = (this.contentWidth - 8) / 2.5;
        const boxHeight = 38;
        let col = 0;
        let startY = this.currentY;

        categories.forEach((category, index) => {
            const prob = probabilities[category] || 0;
            const info = this.categoryInfo[category];
            const color = this.categoryColors[category];
            const isMatch = mlPrediction?.prediction === category;

            // Calculate position
            const x = this.margin + (col * (boxWidth + 4));
            const y = startY + Math.floor(index / 2) * (boxHeight + 5);

            // Box background
            if (isMatch) {
                this.pdf.setFillColor(...color);
                this.pdf.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'F');
                this.pdf.setTextColor(...this.colors.white);
            } else {
                this.pdf.setFillColor(248, 249, 250);
                this.pdf.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'F');
                this.pdf.setDrawColor(...color);
                this.pdf.setLineWidth(0.5);
                this.pdf.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'S');
                this.pdf.setTextColor(...this.colors.dark);
            }

            // Category name
            this.pdf.setFontSize(10);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.text(this.capitalizeFirst(category), x + 3, y + 7);

            // Match indicator
            if (isMatch) {
                this.pdf.setFontSize(7);
                this.pdf.text('MATCH', x + boxWidth - 18, y + 7);
            }

            // Probability bar
            const barY = y + 11;
            const barWidth = boxWidth - 30;
            this.pdf.setFillColor(200, 200, 200);
            this.pdf.rect(x + 3, barY, barWidth, 4, 'F');

            if (isMatch) {
                this.pdf.setFillColor(...this.colors.white);
            } else {
                this.pdf.setFillColor(...color);
            }
            this.pdf.rect(x + 3, barY, barWidth * prob, 4, 'F');

            // Probability percentage
            this.pdf.setFontSize(9);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.text(`${(prob * 100).toFixed(0)}%`, x + boxWidth - 22, barY + 3.5);

            // Description (truncated)
            this.pdf.setFontSize(7);
            this.pdf.setFont('helvetica', 'normal');
            const desc = info.description.substring(0, 80) + (info.description.length > 80 ? '...' : '');
            const descLines = this.pdf.splitTextToSize(desc, boxWidth - 6);
            this.pdf.text(descLines.slice(0, 2), x + 3, y + 22);

            col = (col + 1) % 2;
        });

        // Position for next row (3 rows: 2+2+1)
        this.currentY = startY + Math.ceil(categories.length / 2) * (boxHeight + 5) + 5;

        // Add interpretation note
        this.pdf.setFillColor(232, 245, 233);
        this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 18, 2, 2, 'F');
        this.pdf.setFillColor(...this.colors.success);
        this.pdf.rect(this.margin, this.currentY, 3, 18, 'F');

        this.pdf.setTextColor(...this.colors.dark);
        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Interpretation:', this.margin + 6, this.currentY + 6);

        this.pdf.setFont('helvetica', 'normal');
        const matchCategory = mlPrediction?.prediction || 'normal';
        const matchInfo = this.categoryInfo[matchCategory];
        const interpretation = `Your writing most closely matches the "${matchCategory}" category. ${matchInfo?.description || ''}`;
        const interpLines = this.pdf.splitTextToSize(interpretation, this.contentWidth - 12);
        this.pdf.text(interpLines.slice(0, 2), this.margin + 6, this.currentY + 11);

        this.currentY += 25;
    }

    /**
     * Add detailed feature comparison table with all 5 categories
     */
    addDetailedFeatureTable(analysisData) {
        this.checkPageBreak(100);
        this.addSectionTitle('Detailed Feature Comparison');

        const { mlPrediction, temporal } = analysisData;
        const categories = ['normal', 'tremor', 'dysgraphia', 'fatigue', 'elderly'];
        const features = [
            'fluency_score', 'smoothness_index', 'rhythm_regularity',
            'mean_velocity', 'normalized_jerk', 'pause_frequency'
        ];

        // Calculate column widths
        const labelWidth = 35;
        const yourValueWidth = 22;
        const catWidth = (this.contentWidth - labelWidth - yourValueWidth - 2) / 5;

        // Table header
        this.pdf.setFillColor(...this.colors.primary);
        this.pdf.rect(this.margin, this.currentY, this.contentWidth, 10, 'F');
        this.pdf.setTextColor(...this.colors.white);
        this.pdf.setFontSize(7);
        this.pdf.setFont('helvetica', 'bold');

        this.pdf.text('Feature', this.margin + 2, this.currentY + 6);
        this.pdf.text('Your Value', this.margin + labelWidth + 2, this.currentY + 6);

        categories.forEach((cat, i) => {
            const x = this.margin + labelWidth + yourValueWidth + (i * catWidth) + 2;
            this.pdf.text(this.capitalizeFirst(cat), x, this.currentY + 6);
        });

        this.currentY += 12;

        // Get user's feature values
        const userFeatures = this.extractUserFeatures(analysisData);

        // Table rows
        features.forEach((feature, rowIndex) => {
            const rowY = this.currentY;
            const bgColor = rowIndex % 2 === 0 ? [255, 255, 255] : [248, 249, 250];
            this.pdf.setFillColor(...bgColor);
            this.pdf.rect(this.margin, rowY, this.contentWidth, 8, 'F');

            this.pdf.setTextColor(...this.colors.dark);
            this.pdf.setFontSize(7);
            this.pdf.setFont('helvetica', 'normal');

            // Feature name
            this.pdf.text(this.formatFeatureName(feature), this.margin + 2, rowY + 5);

            // Your value
            const userValue = userFeatures[feature];
            const userValueStr = userValue !== undefined ? userValue.toFixed(2) : 'N/A';
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.text(userValueStr, this.margin + labelWidth + 2, rowY + 5);

            // Category reference values
            this.pdf.setFont('helvetica', 'normal');
            categories.forEach((cat, i) => {
                const refData = this.categoryReferenceValues[cat]?.[feature];
                const x = this.margin + labelWidth + yourValueWidth + (i * catWidth) + 2;

                if (refData) {
                    // Color code if this is the matched category
                    if (mlPrediction?.prediction === cat) {
                        this.pdf.setTextColor(...this.categoryColors[cat]);
                        this.pdf.setFont('helvetica', 'bold');
                    } else {
                        this.pdf.setTextColor(100, 100, 100);
                        this.pdf.setFont('helvetica', 'normal');
                    }
                    this.pdf.text(`${refData.value}`, x, rowY + 5);
                }
            });

            this.currentY += 8;
        });

        // Add legend for the table
        this.currentY += 3;
        this.pdf.setFontSize(7);
        this.pdf.setTextColor(100, 100, 100);
        this.pdf.setFont('helvetica', 'italic');
        this.pdf.text('Bold values indicate the matched category. Reference values are typical means from training data.', this.margin, this.currentY);

        this.currentY += 8;

        // Add range reference box
        this.addRangeReferenceBox();
    }

    /**
     * Extract user's feature values from analysis data
     */
    extractUserFeatures(analysisData) {
        const { temporal, mlPrediction } = analysisData;
        const features = {};

        // From temporal features
        if (temporal?.fluency) {
            features.fluency_score = temporal.fluency.fluencyScore;
            features.rhythm_regularity = temporal.fluency.rhythmRegularity;
        }
        if (temporal?.jerk) {
            features.smoothness_index = temporal.jerk.smoothnessIndex;
            features.normalized_jerk = temporal.jerk.normalizedJerk;
        }
        if (temporal?.velocity) {
            features.mean_velocity = temporal.velocity.mean;
        }
        if (temporal?.pauses) {
            features.pause_frequency = temporal.pauses.pauseFrequency;
        }
        if (temporal?.pressure) {
            features.mean_pressure = temporal.pressure.mean;
        }

        // Also check comparison data
        if (mlPrediction?.comparison?.featureAnalysis) {
            Object.entries(mlPrediction.comparison.featureAnalysis).forEach(([key, data]) => {
                if (data.userValue !== undefined && features[key] === undefined) {
                    features[key] = data.userValue;
                }
            });
        }

        return features;
    }

    /**
     * Add reference range box
     */
    addRangeReferenceBox() {
        this.checkPageBreak(45);

        this.pdf.setFillColor(240, 248, 255); // Light blue
        this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 35, 2, 2, 'F');

        this.pdf.setTextColor(...this.colors.primary);
        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Reference Ranges for Normal Handwriting:', this.margin + 5, this.currentY + 7);

        this.pdf.setFontSize(7);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(...this.colors.dark);

        const ranges = [
            'Fluency Score: 65-85 (higher = better)',
            'Smoothness Index: 0.6-0.85 (higher = smoother)',
            'Rhythm Regularity: 0.65-0.90 (higher = more regular)',
            'Mean Velocity: 0.35-0.55 px/ms',
            'Normalized Jerk: 0.2-0.5 (lower = smoother)',
            'Pause Frequency: 0.5-1.2 /sec (lower = better flow)'
        ];

        const col1 = ranges.slice(0, 3);
        const col2 = ranges.slice(3);

        col1.forEach((range, i) => {
            this.pdf.text('• ' + range, this.margin + 5, this.currentY + 14 + (i * 5));
        });

        col2.forEach((range, i) => {
            this.pdf.text('• ' + range, this.margin + 95, this.currentY + 14 + (i * 5));
        });

        this.currentY += 40;
    }

    /**
     * Add detailed irregularity breakdown
     */
    addIrregularityDetails(analysisData) {
        const { analysis } = analysisData;
        if (!analysis?.indicators || analysis.indicators.length === 0) return;

        this.checkPageBreak(50);
        this.addSectionTitle('Detected Irregularities');

        analysis.indicators.forEach((indicator, index) => {
            this.checkPageBreak(45);

            const info = this.irregularityInfo[indicator.type] || {
                title: this.formatIndicatorType(indicator.type),
                description: indicator.message,
                visualIndicators: [],
                recommendations: [],
                severity: indicator.severity
            };

            const severityColor = indicator.severity === 'high' ? this.colors.danger :
                                 indicator.severity === 'medium' ? this.colors.warning : this.colors.primary;

            // Box with colored left border
            this.pdf.setFillColor(248, 249, 250);
            this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 35, 2, 2, 'F');
            this.pdf.setFillColor(...severityColor);
            this.pdf.rect(this.margin, this.currentY, 3, 35, 'F');

            // Number badge
            this.pdf.setFillColor(...severityColor);
            this.pdf.circle(this.margin + 10, this.currentY + 8, 5, 'F');
            this.pdf.setTextColor(...this.colors.white);
            this.pdf.setFontSize(9);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.text((index + 1).toString(), this.margin + 8.5, this.currentY + 9.5);

            // Title and severity
            this.pdf.setTextColor(...severityColor);
            this.pdf.setFontSize(10);
            this.pdf.text(info.title, this.margin + 18, this.currentY + 9);

            this.pdf.setFillColor(...severityColor);
            this.pdf.roundedRect(this.margin + 100, this.currentY + 4, 20, 7, 2, 2, 'F');
            this.pdf.setTextColor(...this.colors.white);
            this.pdf.setFontSize(6);
            this.pdf.text(indicator.severity.toUpperCase(), this.margin + 102, this.currentY + 8.5);

            // Measured value
            if (indicator.value !== undefined) {
                this.pdf.setTextColor(...this.colors.dark);
                this.pdf.setFontSize(8);
                this.pdf.text(`Value: ${typeof indicator.value === 'number' ? indicator.value.toFixed(3) : indicator.value}`, this.margin + 125, this.currentY + 8.5);
            }

            // Description
            this.pdf.setTextColor(...this.colors.dark);
            this.pdf.setFontSize(8);
            this.pdf.setFont('helvetica', 'normal');
            const descLines = this.pdf.splitTextToSize(info.description, this.contentWidth - 25);
            this.pdf.text(descLines.slice(0, 2), this.margin + 18, this.currentY + 18);

            // Visual indicators (what to look for)
            if (info.visualIndicators && info.visualIndicators.length > 0) {
                this.pdf.setFontSize(7);
                this.pdf.setTextColor(100, 100, 100);
                this.pdf.text('Look for: ' + info.visualIndicators[0], this.margin + 18, this.currentY + 30);
            }

            this.currentY += 40;
        });
    }

    /**
     * Add recommendations section
     */
    addRecommendations(analysisData) {
        const { analysis } = analysisData;

        this.checkPageBreak(70);
        this.addSectionTitle('Recommendations for Improvement');

        // Gather all relevant recommendations
        const allRecommendations = new Map();

        if (analysis?.indicators) {
            analysis.indicators.forEach(indicator => {
                const info = this.irregularityInfo[indicator.type];
                if (info?.recommendations) {
                    info.recommendations.forEach(rec => {
                        if (!allRecommendations.has(rec)) {
                            allRecommendations.set(rec, indicator.severity);
                        }
                    });
                }
            });
        }

        if (allRecommendations.size === 0) {
            this.pdf.setFillColor(232, 245, 233);
            this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 20, 2, 2, 'F');
            this.pdf.setTextColor(...this.colors.success);
            this.pdf.setFontSize(10);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.text('No significant irregularities detected!', this.margin + 5, this.currentY + 8);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setFontSize(9);
            this.pdf.setTextColor(...this.colors.dark);
            this.pdf.text('Continue with current writing practices to maintain good handwriting quality.', this.margin + 5, this.currentY + 15);
            this.currentY += 25;
            return;
        }

        // Priority-based recommendations
        const priorityGroups = { high: [], medium: [], low: [] };
        allRecommendations.forEach((severity, rec) => {
            priorityGroups[severity]?.push(rec) || priorityGroups.low.push(rec);
        });

        // Render each priority group
        if (priorityGroups.high.length > 0) {
            this.addRecommendationGroup('Immediate Actions (High Priority)', priorityGroups.high, this.colors.danger);
        }
        if (priorityGroups.medium.length > 0) {
            this.addRecommendationGroup('Suggested Improvements (Medium Priority)', priorityGroups.medium, this.colors.warning);
        }
        if (priorityGroups.low.length > 0) {
            this.addRecommendationGroup('General Tips (Low Priority)', priorityGroups.low, this.colors.primary);
        }

        // General advice box
        this.checkPageBreak(35);
        this.pdf.setFillColor(232, 245, 233);
        this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 28, 2, 2, 'F');
        this.pdf.setFillColor(...this.colors.success);
        this.pdf.rect(this.margin, this.currentY, 3, 28, 'F');

        this.pdf.setTextColor(...this.colors.success);
        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('General Advice', this.margin + 6, this.currentY + 7);

        this.pdf.setTextColor(...this.colors.dark);
        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'normal');
        const advice = 'Practice regularly in a comfortable, well-lit environment. Ensure proper posture and pen grip. Take breaks during extended writing sessions. If irregularities persist, consider consulting a healthcare professional or occupational therapist.';
        const adviceLines = this.pdf.splitTextToSize(advice, this.contentWidth - 12);
        this.pdf.text(adviceLines, this.margin + 6, this.currentY + 13);

        this.currentY += 33;
    }

    /**
     * Add a group of recommendations
     */
    addRecommendationGroup(title, recommendations, color) {
        this.checkPageBreak(12 + recommendations.length * 5);

        this.pdf.setFillColor(...color);
        this.pdf.rect(this.margin, this.currentY, 3, 7, 'F');

        this.pdf.setTextColor(...color);
        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(title, this.margin + 6, this.currentY + 5);
        this.currentY += 9;

        this.pdf.setTextColor(...this.colors.dark);
        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'normal');

        recommendations.slice(0, 4).forEach((rec, i) => {
            this.pdf.text(`${i + 1}. ${rec}`, this.margin + 6, this.currentY);
            this.currentY += 5;
        });

        this.currentY += 3;
    }

    /**
     * Add glossary/reference page
     */
    addGlossaryPage() {
        this.pdf.addPage();
        this.currentY = this.margin;

        this.addSectionTitle('Reference Guide: Understanding the Categories');

        const categories = ['normal', 'tremor', 'dysgraphia', 'fatigue', 'elderly'];

        categories.forEach((category) => {
            this.checkPageBreak(50);

            const info = this.categoryInfo[category];
            const color = this.categoryColors[category];
            const refValues = this.categoryReferenceValues[category];

            // Category header
            this.pdf.setFillColor(...color);
            this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 8, 2, 2, 'F');
            this.pdf.setTextColor(...this.colors.white);
            this.pdf.setFontSize(10);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.text(info.title, this.margin + 5, this.currentY + 5.5);
            this.currentY += 10;

            // Description
            this.pdf.setTextColor(...this.colors.dark);
            this.pdf.setFontSize(8);
            this.pdf.setFont('helvetica', 'normal');
            const descLines = this.pdf.splitTextToSize(info.description, this.contentWidth - 10);
            this.pdf.text(descLines, this.margin + 5, this.currentY);
            this.currentY += descLines.length * 4 + 3;

            // Characteristics
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setFontSize(8);
            this.pdf.text('Key Characteristics:', this.margin + 5, this.currentY);
            this.currentY += 4;

            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setFontSize(7);
            info.characteristics.slice(0, 3).forEach(char => {
                this.pdf.text('• ' + char, this.margin + 8, this.currentY);
                this.currentY += 3.5;
            });

            // Reference values table (compact)
            this.currentY += 2;
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setFontSize(7);
            this.pdf.text('Typical Values:', this.margin + 5, this.currentY);

            this.pdf.setFont('helvetica', 'normal');
            const valueText = Object.entries(refValues).slice(0, 4).map(([key, data]) =>
                `${this.formatFeatureName(key)}: ${data.value} (${data.range})`
            ).join('  |  ');

            this.currentY += 3.5;
            const valueLines = this.pdf.splitTextToSize(valueText, this.contentWidth - 10);
            this.pdf.text(valueLines, this.margin + 5, this.currentY);

            this.currentY += valueLines.length * 3.5 + 8;
        });
    }

    /**
     * Add section title
     */
    addSectionTitle(title) {
        this.checkPageBreak(12);

        this.pdf.setFillColor(...this.colors.primary);
        this.pdf.rect(this.margin, this.currentY, 3, 8, 'F');

        this.pdf.setTextColor(...this.colors.primary);
        this.pdf.setFontSize(12);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(title, this.margin + 6, this.currentY + 6);

        this.currentY += 12;
    }

    /**
     * Add page footers with page numbers
     */
    addFooters() {
        const pageCount = this.pdf.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            this.pdf.setPage(i);

            this.pdf.setDrawColor(...this.colors.light);
            this.pdf.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15);

            this.pdf.setTextColor(...this.colors.dark);
            this.pdf.setFontSize(8);
            this.pdf.text(`Page ${i} of ${pageCount}`, this.pageWidth / 2 - 10, this.pageHeight - 10);

            this.pdf.setFontSize(6);
            this.pdf.setTextColor(150, 150, 150);
            this.pdf.text('This report is for informational purposes only and does not constitute medical advice.', this.margin, this.pageHeight - 8);
        }
    }

    /**
     * Check if we need a page break
     */
    checkPageBreak(requiredSpace) {
        if (this.currentY + requiredSpace > this.pageHeight - 20) {
            this.pdf.addPage();
            this.currentY = this.margin;
        }
    }

    /**
     * Helper methods
     */
    getAssessmentColor(classification) {
        const colorMap = {
            'normal': this.colors.success,
            'mild_irregularity': this.colors.warning,
            'moderate_irregularity': [230, 126, 34],
            'high_irregularity': this.colors.danger,
            'tremor': this.colors.danger,
            'dysgraphia': this.colors.warning,
            'fatigue': [243, 156, 18],
            'elderly': this.colors.purple
        };
        return colorMap[classification] || this.colors.primary;
    }

    formatClassification(classification) {
        return classification.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatIndicatorType(type) {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatFeatureName(name) {
        const nameMap = {
            'fluency_score': 'Fluency',
            'smoothness_index': 'Smoothness',
            'rhythm_regularity': 'Rhythm',
            'mean_velocity': 'Velocity',
            'normalized_jerk': 'Jerk',
            'pause_frequency': 'Pauses',
            'mean_pressure': 'Pressure',
            'writing_tempo': 'Tempo'
        };
        return nameMap[name] || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Download the generated PDF
     */
    download(filename = 'handwriting_analysis_report.pdf') {
        if (this.pdf) {
            this.pdf.save(filename);
        }
    }

    /**
     * Get PDF as blob
     */
    getBlob() {
        if (this.pdf) {
            return this.pdf.output('blob');
        }
        return null;
    }

    /**
     * Get PDF as data URL
     */
    getDataUrl() {
        if (this.pdf) {
            return this.pdf.output('dataurlstring');
        }
        return null;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFReportGenerator;
}