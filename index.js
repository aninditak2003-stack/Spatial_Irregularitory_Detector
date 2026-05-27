/**
 * Main Application - Handwriting Analysis System
 * Combines all components for complete handwriting feature extraction and analysis
 */

class HandwritingAnalyzer {
    constructor() {
        // Initialize components
        this.canvas = null;
        this.imageProcessor = new ImageProcessor();
        this.spatialExtractor = new SpatialFeatures();
        this.temporalExtractor = new TemporalDynamicFeatures();
        this.csvExporter = new CSVExporter();
        this.mlPipeline = new MLPipeline();
        this.pdfGenerator = new PDFReportGenerator();

        // State
        this.currentMode = 'canvas'; // 'canvas' or 'image'
        this.currentData = null;
        this.extractedFeatures = null;

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        // Initialize drawing canvas
        this.canvas = new DrawingCanvas('drawingCanvas', {
            width: 800,
            height: 300,
            lineWidth: 2,
            lineColor: '#000000'
        });

        // Set up event listeners
        this.setupEventListeners();

        // Create default irregularity model
        this.mlPipeline.createIrregularityModel();

        // Display training data reference
        this.displayTrainingDataReference();

        console.log('Handwriting Analyzer initialized');
    }

    setupEventListeners() {
        // Mode switching
        document.getElementById('modeCanvas')?.addEventListener('click', () => this.switchMode('canvas'));
        document.getElementById('modeImage')?.addEventListener('click', () => this.switchMode('image'));

        // Canvas controls
        document.getElementById('clearCanvas')?.addEventListener('click', () => this.clearCanvas());
        document.getElementById('undoStroke')?.addEventListener('click', () => this.undoStroke());

        // Image upload
        document.getElementById('imageUpload')?.addEventListener('change', (e) => this.handleImageUpload(e));
        document.getElementById('dropZone')?.addEventListener('drop', (e) => this.handleDrop(e));
        document.getElementById('dropZone')?.addEventListener('dragover', (e) => e.preventDefault());

        // Analysis
        document.getElementById('analyzeBtn')?.addEventListener('click', () => this.analyze());

        // Export
        document.getElementById('exportRaw')?.addEventListener('click', () => this.exportRawData());
        document.getElementById('exportStrokes')?.addEventListener('click', () => this.exportStrokeFeatures());
        document.getElementById('exportSession')?.addEventListener('click', () => this.exportSessionFeatures());

        // Training
        document.getElementById('addToTraining')?.addEventListener('click', () => this.addToTrainingSet());
        document.getElementById('exportTraining')?.addEventListener('click', () => this.exportTrainingData());

        // Training data display toggle
        document.getElementById('toggleDetailedStats')?.addEventListener('click', () => this.toggleDetailedStats());

        // PDF Report generation
        document.getElementById('generatePdfBtn')?.addEventListener('click', () => this.generatePdfReport());
        document.getElementById('previewPdfBtn')?.addEventListener('click', () => this.previewPdfReport());

        // Line settings
        document.getElementById('lineWidth')?.addEventListener('input', (e) => {
            this.canvas?.setLineWidth(parseInt(e.target.value));
        });
        document.getElementById('lineColor')?.addEventListener('input', (e) => {
            this.canvas?.setLineColor(e.target.value);
        });
    }

    switchMode(mode) {
        this.currentMode = mode;

        // Update UI
        document.getElementById('canvasSection')?.classList.toggle('hidden', mode !== 'canvas');
        document.getElementById('imageSection')?.classList.toggle('hidden', mode !== 'image');
        document.getElementById('modeCanvas')?.classList.toggle('active', mode === 'canvas');
        document.getElementById('modeImage')?.classList.toggle('active', mode === 'image');

        // Clear previous results
        this.clearResults();
    }

    clearCanvas() {
        this.canvas?.clear();
        this.clearResults();
    }

    undoStroke() {
        this.canvas?.undo();
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        await this.processImage(file);
    }

    async handleDrop(event) {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (!file) return;

        await this.processImage(file);
    }

    async processImage(file) {
        try {
            this.showLoading(true);

            // Load and process image
            await this.imageProcessor.loadImage(file);
            const processedData = await this.imageProcessor.processImage(file);

            this.currentData = processedData;

            // Show processed image
            const previewImg = document.getElementById('imagePreview');
            if (previewImg) {
                previewImg.src = this.imageProcessor.getProcessedImage();
                previewImg.classList.remove('hidden');
            }

            // Show skeleton overlay option
            document.getElementById('showSkeleton')?.classList.remove('hidden');

            this.showLoading(false);
            this.updateStatus('Image processed successfully');
        } catch (error) {
            this.showLoading(false);
            this.showError('Failed to process image: ' + error.message);
        }
    }

    async analyze() {
        try {
            this.showLoading(true);

            if (this.currentMode === 'canvas') {
                await this.analyzeCanvasData();
            } else {
                await this.analyzeImageData();
            }

            this.showLoading(false);
        } catch (error) {
            this.showLoading(false);
            this.showError('Analysis failed: ' + error.message);
        }
    }

    async analyzeCanvasData() {
        const canvasData = this.canvas.getData();

        if (canvasData.totalStrokes === 0) {
            this.showError('Please write something on the canvas first');
            return;
        }

        // Extract features
        const spatialFeatures = this.spatialExtractor.extractFromCanvasData(canvasData);
        const temporalFeatures = this.temporalExtractor.extractFromCanvasData(canvasData);

        // Analyze for irregularities (rule-based)
        const analysis = this.mlPipeline.analyzeIrregularities(spatialFeatures, temporalFeatures);

        // ML-based classification using KNN with 300 training samples
        const mlPrediction = await this.mlPipeline.predict(spatialFeatures, temporalFeatures);

        this.extractedFeatures = {
            spatial: spatialFeatures,
            temporal: temporalFeatures,
            analysis: analysis,
            mlPrediction: mlPrediction
        };

        this.displayResults();
    }

    async analyzeImageData() {
        if (!this.currentData) {
            this.showError('Please upload an image first');
            return;
        }

        // Extract spatial features only (temporal not available for images)
        const spatialFeatures = this.spatialExtractor.extractFromImageData(this.currentData);

        this.extractedFeatures = {
            spatial: spatialFeatures,
            temporal: null,
            analysis: {
                note: 'Temporal/dynamic features not available for static images',
                spatialOnly: true
            }
        };

        this.displayResults();
    }

    displayResults() {
        const resultsDiv = document.getElementById('results');
        if (!resultsDiv) return;

        const { spatial, temporal, analysis, mlPrediction } = this.extractedFeatures;

        let html = '<div class="results-container">';

        // ML Classification Result (from 300 training samples)
        if (mlPrediction && mlPrediction.prediction) {
            html += this.formatMLPrediction(mlPrediction);
        }

        // Analysis Summary
        if (analysis && !analysis.spatialOnly) {
            html += `
                <div class="result-section analysis-summary">
                    <h3>Rule-Based Analysis</h3>
                    <div class="score-display ${analysis.classification}">
                        <span class="score-label">Irregularity Score:</span>
                        <span class="score-value">${analysis.irregularityScore.toFixed(1)}</span>
                        <span class="classification">${analysis.classification.replace(/_/g, ' ')}</span>
                    </div>
                    <p class="summary-text">${analysis.summary}</p>
                    ${analysis.indicators?.length > 0 ? `
                        <div class="indicators">
                            <h4>Detected Indicators:</h4>
                            <ul>
                                ${analysis.indicators.map(i => `
                                    <li class="indicator ${i.severity}">
                                        <strong>${i.type.replace(/_/g, ' ')}:</strong> ${i.message}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Spatial Features
        html += `
            <div class="result-section">
                <h3>Spatial Features</h3>
                <div class="feature-grid">
                    ${this.formatFeatureSection('Global', spatial.global)}
                    ${spatial.aggregated ? this.formatAggregatedFeatures(spatial.aggregated) : ''}
                    ${this.formatFeatureSection('Density', spatial.density)}
                </div>
            </div>
        `;

        // Temporal Features (if available)
        if (temporal && temporal.type !== 'empty_temporal') {
            html += `
                <div class="result-section">
                    <h3>Temporal & Dynamic Features</h3>
                    <div class="feature-grid">
                        ${this.formatFeatureSection('Timing', temporal.temporal)}
                        ${this.formatVelocityFeatures(temporal.velocity)}
                        ${this.formatFeatureSection('Smoothness', temporal.jerk)}
                        ${this.formatFeatureSection('Pressure', temporal.pressure)}
                        ${this.formatFeatureSection('Pauses', temporal.pauses)}
                        ${this.formatFeatureSection('Fluency', temporal.fluency)}
                    </div>
                </div>
            `;
        } else if (this.currentMode === 'image') {
            html += `
                <div class="result-section notice">
                    <p><strong>Note:</strong> Temporal and dynamic features are only available for live handwriting capture.
                    Upload a handwriting sample via the canvas for full analysis.</p>
                </div>
            `;
        }

        html += '</div>';

        resultsDiv.innerHTML = html;
        resultsDiv.classList.remove('hidden');
    }

    formatFeatureSection(title, features) {
        if (!features || typeof features !== 'object') return '';

        const items = Object.entries(features)
            .filter(([key, val]) => typeof val !== 'object' && key !== 'values' && key !== 'instantaneous')
            .map(([key, val]) => {
                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
                const formattedVal = typeof val === 'number' ? val.toFixed(4) : val;
                return `<div class="feature-item"><span class="key">${formattedKey}:</span><span class="value">${formattedVal}</span></div>`;
            })
            .join('');

        return `<div class="feature-group"><h4>${title}</h4>${items}</div>`;
    }

    formatAggregatedFeatures(aggregated) {
        let html = '<div class="feature-group"><h4>Aggregated (per stroke)</h4>';

        for (const [key, stats] of Object.entries(aggregated)) {
            if (stats && typeof stats === 'object') {
                html += `
                    <div class="aggregated-item">
                        <strong>${key.replace(/([A-Z])/g, ' $1')}:</strong>
                        mean=${stats.mean?.toFixed(3) || 'N/A'},
                        std=${stats.std?.toFixed(3) || 'N/A'}
                    </div>
                `;
            }
        }

        html += '</div>';
        return html;
    }

    formatVelocityFeatures(velocity) {
        if (!velocity) return '';

        return `
            <div class="feature-group">
                <h4>Velocity</h4>
                <div class="feature-item"><span class="key">Mean:</span><span class="value">${velocity.mean?.toFixed(4) || 'N/A'}</span></div>
                <div class="feature-item"><span class="key">Std:</span><span class="value">${velocity.std?.toFixed(4) || 'N/A'}</span></div>
                <div class="feature-item"><span class="key">Max:</span><span class="value">${velocity.max?.toFixed(4) || 'N/A'}</span></div>
                <div class="feature-item"><span class="key">Peak Count:</span><span class="value">${velocity.peakCount || 0}</span></div>
                <div class="feature-item"><span class="key">Peak Frequency:</span><span class="value">${velocity.peakFrequency?.toFixed(4) || 'N/A'} /sec</span></div>
            </div>
        `;
    }

    formatMLPrediction(prediction) {
        const labelColors = {
            'normal': '#27ae60',
            'tremor': '#e74c3c',
            'dysgraphia': '#e67e22',
            'fatigue': '#f39c12',
            'elderly': '#9b59b6'
        };

        const labelDescriptions = this.mlPipeline.labelDescriptions || {};
        const predLabel = prediction.prediction;
        const color = labelColors[predLabel] || '#3498db';

        let html = `
            <div class="result-section ml-prediction" style="border-left: 4px solid ${color};">
                <h3>ML Classification (KNN with 300 Training Samples)</h3>

                <div class="prediction-result" style="display: flex; align-items: center; gap: 20px; margin-bottom: 15px;">
                    <div class="prediction-label" style="background: ${color}; color: white; padding: 10px 20px; border-radius: 8px; font-size: 1.2rem; font-weight: bold; text-transform: capitalize;">
                        ${predLabel}
                    </div>
                </div>

                ${labelDescriptions[predLabel] ? `
                    <div class="label-description" style="background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
                        <strong>${labelDescriptions[predLabel].description}</strong>
                        <ul style="margin: 8px 0 0 20px; color: #555;">
                            ${labelDescriptions[predLabel].characteristics.map(c => `<li>${c}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
        `;

        // Feature comparison with normal reference
        if (prediction.comparison) {
            html += this.formatFeatureComparison(prediction.comparison);
        }

        html += '</div>';
        return html;
    }

    formatFeatureComparison(comparison) {
        if (!comparison || !comparison.featureAnalysis) return '';

        const keyFeatures = ['mean_velocity', 'fluency_score', 'smoothness_index', 'rhythm_regularity',
                            'normalized_jerk', 'mean_pressure', 'pause_frequency'];

        let html = `
            <div class="feature-comparison" style="margin-top: 15px;">
                <h4 style="margin-bottom: 10px;">Comparison with Normal Reference (150 samples):</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead>
                        <tr style="background: #f0f4f8;">
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e1e5eb;">Feature</th>
                            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e1e5eb;">Your Value</th>
                            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e1e5eb;">Normal Mean</th>
                            <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e1e5eb;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const feature of keyFeatures) {
            const analysis = comparison.featureAnalysis[feature];
            if (!analysis) continue;

            const statusColor = analysis.isWithinNormal ? '#27ae60' :
                              (analysis.deviation === 'high' ? '#e74c3c' : '#e67e22');
            const statusText = analysis.isWithinNormal ? 'Normal' :
                              (analysis.deviation === 'high' ? 'Above' : 'Below');
            const statusIcon = analysis.isWithinNormal ? '✓' : '⚠';

            html += `
                <tr style="border-bottom: 1px solid #e1e5eb;">
                    <td style="padding: 8px; text-transform: capitalize;">${feature.replace(/_/g, ' ')}</td>
                    <td style="padding: 8px; text-align: right; font-family: monospace;">${analysis.userValue?.toFixed(3) || 'N/A'}</td>
                    <td style="padding: 8px; text-align: right; font-family: monospace; color: #666;">${analysis.normalMean?.toFixed(3) || 'N/A'}</td>
                    <td style="padding: 8px; text-align: center;">
                        <span style="color: ${statusColor}; font-weight: bold;">${statusIcon} ${statusText}</span>
                    </td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
                <p style="margin-top: 10px; color: #666; font-size: 0.85rem;">
                    <strong>Within normal:</strong> ${comparison.withinNormalRange?.length || 0} features |
                    <strong>Outside normal:</strong> ${comparison.outsideNormalRange?.length || 0} features
                </p>
            </div>
        `;

        return html;
    }

    // Export functions
    exportRawData() {
        if (this.currentMode !== 'canvas') {
            this.showError('Raw data export only available for canvas mode');
            return;
        }

        const canvasData = this.canvas.getData();
        if (canvasData.totalPoints === 0) {
            this.showError('No data to export');
            return;
        }

        const result = this.csvExporter.exportRawData(canvasData);
        result.download();
        this.showCSVPreview(result.content, result.filename);
        this.updateStatus('Raw data exported to Downloads folder: ' + result.filename);
    }

    exportStrokeFeatures() {
        if (this.currentMode !== 'canvas') {
            this.showError('Stroke features export only available for canvas mode');
            return;
        }

        const canvasData = this.canvas.getData();
        if (canvasData.totalStrokes === 0) {
            this.showError('No strokes to export');
            return;
        }

        const result = this.csvExporter.exportStrokeFeatures(
            canvasData,
            this.extractedFeatures?.spatial,
            this.extractedFeatures?.temporal
        );
        result.download();
        this.showCSVPreview(result.content, result.filename);
        this.updateStatus('Stroke features exported to Downloads folder: ' + result.filename);
    }

    exportSessionFeatures() {
        if (!this.extractedFeatures) {
            this.showError('Please analyze first before exporting');
            return;
        }

        const label = document.getElementById('sampleLabel')?.value || '';
        let result;

        if (this.currentMode === 'canvas') {
            result = this.csvExporter.exportSessionFeatures(
                this.extractedFeatures.spatial,
                this.extractedFeatures.temporal,
                label
            );
        } else {
            result = this.csvExporter.exportImageFeatures(
                this.extractedFeatures.spatial,
                label
            );
        }

        result.download();
        this.showCSVPreview(result.content, result.filename);
        this.updateStatus('Session features exported to Downloads folder: ' + result.filename);
    }

    addToTrainingSet() {
        if (!this.extractedFeatures) {
            this.showError('Please analyze first');
            return;
        }

        const label = document.getElementById('sampleLabel')?.value;
        if (!label) {
            this.showError('Please enter a label for the training sample');
            return;
        }

        const result = this.mlPipeline.addTrainingSample(
            this.extractedFeatures.spatial,
            this.extractedFeatures.temporal,
            label
        );

        this.updateTrainingStats();
        this.updateStatus(`Added sample ${result.sampleIndex + 1} with label "${label}"`);
    }

    updateTrainingStats() {
        const stats = this.mlPipeline.getTrainingStats();
        const statsDiv = document.getElementById('trainingStats');
        if (statsDiv) {
            statsDiv.innerHTML = `
                <strong>Training Set:</strong> ${stats.totalSamples} samples<br>
                <strong>Labels:</strong> ${Object.entries(stats.labelDistribution).map(([k, v]) => `${k}: ${v}`).join(', ')}
            `;
        }
    }

    exportTrainingData() {
        const stats = this.mlPipeline.getTrainingStats();
        if (stats.totalSamples === 0) {
            this.showError('No training data to export');
            return;
        }

        const format = document.getElementById('exportFormat')?.value || 'json';
        const data = this.mlPipeline.exportTrainingData(format);

        const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
            type: format === 'json' ? 'application/json' : 'text/csv'
        });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `training_data.${format}`;
        link.click();

        this.updateStatus('Training data exported');
    }

    // PDF Report Generation
    async generatePdfReport() {
        if (!this.extractedFeatures) {
            this.showError('Please analyze handwriting first before generating a report');
            return;
        }

        try {
            this.showLoading(true);
            this.updateStatus('Generating PDF report...');

            // Get handwriting image
            let handwritingImage = null;
            if (this.currentMode === 'canvas') {
                handwritingImage = this.canvas.getImageData();
            } else if (this.imageProcessor.originalImage) {
                handwritingImage = this.imageProcessor.getProcessedImage();
            }

            // Get subject name
            const subjectName = document.getElementById('subjectName')?.value || 'Anonymous';

            // Prepare analysis data for the report
            const analysisData = {
                spatial: this.extractedFeatures.spatial,
                temporal: this.extractedFeatures.temporal,
                analysis: this.extractedFeatures.analysis,
                mlPrediction: this.extractedFeatures.mlPrediction
            };

            // Generate the PDF
            await this.pdfGenerator.generateReport(analysisData, handwritingImage, {
                patientName: subjectName,
                date: new Date()
            });

            // Download the PDF
            const timestamp = new Date().toISOString().slice(0, 10);
            this.pdfGenerator.download(`handwriting_analysis_${subjectName.replace(/\s+/g, '_')}_${timestamp}.pdf`);

            this.showLoading(false);
            this.updateStatus('PDF report generated and downloaded successfully!');

        } catch (error) {
            this.showLoading(false);
            this.showError('Failed to generate PDF report: ' + error.message);
            console.error('PDF generation error:', error);
        }
    }

    async previewPdfReport() {
        if (!this.extractedFeatures) {
            this.showError('Please analyze handwriting first before previewing the report');
            return;
        }

        try {
            this.showLoading(true);
            this.updateStatus('Generating PDF preview...');

            // Get handwriting image
            let handwritingImage = null;
            if (this.currentMode === 'canvas') {
                handwritingImage = this.canvas.getImageData();
            } else if (this.imageProcessor.originalImage) {
                handwritingImage = this.imageProcessor.getProcessedImage();
            }

            // Get subject name
            const subjectName = document.getElementById('subjectName')?.value || 'Anonymous';

            // Prepare analysis data for the report
            const analysisData = {
                spatial: this.extractedFeatures.spatial,
                temporal: this.extractedFeatures.temporal,
                analysis: this.extractedFeatures.analysis,
                mlPrediction: this.extractedFeatures.mlPrediction
            };

            // Generate the PDF
            await this.pdfGenerator.generateReport(analysisData, handwritingImage, {
                patientName: subjectName,
                date: new Date()
            });

            // Get the PDF as data URL and show in iframe
            const pdfDataUrl = this.pdfGenerator.getDataUrl();

            const previewContainer = document.getElementById('pdfPreviewContainer');
            const previewFrame = document.getElementById('pdfPreviewFrame');

            if (previewFrame && previewContainer) {
                previewFrame.src = pdfDataUrl;
                previewContainer.classList.remove('hidden');

                // Scroll to preview
                previewContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            this.showLoading(false);
            this.updateStatus('PDF preview ready!');

        } catch (error) {
            this.showLoading(false);
            this.showError('Failed to preview PDF report: ' + error.message);
            console.error('PDF preview error:', error);
        }
    }

    // UI helpers
    clearResults() {
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) {
            resultsDiv.innerHTML = '';
            resultsDiv.classList.add('hidden');
        }
        this.extractedFeatures = null;
    }

    showLoading(show) {
        const loader = document.getElementById('loading');
        if (loader) {
            loader.classList.toggle('hidden', !show);
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
            setTimeout(() => errorDiv.classList.add('hidden'), 5000);
        } else {
            alert(message);
        }
    }

    showCSVPreview(content, filename) {
        // Show CSV content in a preview area
        let previewDiv = document.getElementById('csvPreview');
        if (!previewDiv) {
            previewDiv = document.createElement('div');
            previewDiv.id = 'csvPreview';
            previewDiv.className = 'section';
            document.querySelector('.container').appendChild(previewDiv);
        }

        const lines = content.split('\n');
        const previewLines = lines.slice(0, 10).join('\n');
        const hasMore = lines.length > 10;

        previewDiv.innerHTML = `
            <h2>CSV Export: ${filename}</h2>
            <p style="color: #27ae60; margin-bottom: 10px;">
                <strong>File downloaded to your Downloads folder:</strong><br>
                ~/Downloads/${filename}
            </p>
            <p style="margin-bottom: 10px;">Preview (first 10 rows):</p>
            <textarea id="csvContent" readonly style="width: 100%; height: 200px; font-family: monospace; font-size: 12px; padding: 10px; border: 1px solid #e1e5eb; border-radius: 6px;">${previewLines}${hasMore ? '\n... (' + (lines.length - 10) + ' more rows)' : ''}</textarea>
            <div style="margin-top: 10px;">
                <button onclick="navigator.clipboard.writeText(document.getElementById('csvContent').value.replace(/\\.\\.\\.[^]*$/, '') + '${content.replace(/'/g, "\\'")}'); app.updateStatus('CSV copied to clipboard!');" class="btn-secondary">Copy Full CSV</button>
                <button onclick="document.getElementById('csvPreview').remove();" class="btn-secondary">Close Preview</button>
            </div>
        `;
        previewDiv.classList.remove('hidden');
    }

    updateStatus(message) {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.textContent = message;
            setTimeout(() => { statusDiv.textContent = ''; }, 3000);
        }
        console.log(message);
    }

    displayTrainingDataReference() {
        if (typeof TRAINING_DATA === 'undefined') {
            console.log('Training data not loaded');
            return;
        }

        const container = document.getElementById('trainingDataDisplay');
        if (!container) return;

        const labelColors = {
            'normal': '#27ae60',
            'tremor': '#e74c3c',
            'dysgraphia': '#e67e22',
            'fatigue': '#f39c12',
            'elderly': '#9b59b6'
        };

        const stats = TRAINING_DATA.getStatsByLabel();

        let html = '';
        for (const [label, info] of Object.entries(TRAINING_DATA.labels)) {
            const count = stats[label]?.count || 0;
            const color = labelColors[label] || '#3498db';

            html += `
                <div class="training-category" style="background: white; border-radius: 8px; padding: 15px; border-left: 4px solid ${color};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 style="margin: 0; text-transform: capitalize; color: ${color};">${label}</h4>
                        <span style="background: ${color}; color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.85rem;">${count} samples</span>
                    </div>
                    <p style="color: #666; font-size: 0.9rem; margin-bottom: 8px;">${info.description}</p>
                    <ul style="margin: 0; padding-left: 20px; font-size: 0.85rem; color: #555;">
                        ${info.characteristics.slice(0, 3).map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        container.innerHTML = html;

        // Add summary
        const totalSamples = Object.values(stats).reduce((sum, s) => sum + s.count, 0);
        const summaryHtml = `
            <div style="grid-column: 1 / -1; background: #f0f4f8; padding: 12px; border-radius: 6px; text-align: center; margin-top: 10px;">
                <strong>Total Training Samples:</strong> ${totalSamples} |
                <strong>Features per sample:</strong> ${TRAINING_DATA.featureNames.length} |
                <strong>Categories:</strong> ${Object.keys(stats).length}
            </div>
        `;
        container.insertAdjacentHTML('beforeend', summaryHtml);
    }

    toggleDetailedStats() {
        const detailedDiv = document.getElementById('detailedStats');
        const btn = document.getElementById('toggleDetailedStats');

        if (!detailedDiv || typeof TRAINING_DATA === 'undefined') return;

        if (detailedDiv.classList.contains('hidden')) {
            // Show detailed stats
            const stats = TRAINING_DATA.getStatsByLabel();
            const keyFeatures = ['mean_velocity', 'fluency_score', 'smoothness_index', 'rhythm_regularity',
                                'normalized_jerk', 'mean_pressure', 'pause_frequency', 'writing_tempo'];

            let html = `
                <h4>Key Feature Statistics by Category</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                    <thead>
                        <tr style="background: #f0f4f8;">
                            <th style="padding: 8px; text-align: left; border: 1px solid #e1e5eb;">Feature</th>
                            ${Object.keys(stats).map(label =>
                                `<th style="padding: 8px; text-align: center; border: 1px solid #e1e5eb; text-transform: capitalize;">${label}</th>`
                            ).join('')}
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (const feature of keyFeatures) {
                html += `<tr>
                    <td style="padding: 6px 8px; border: 1px solid #e1e5eb; font-weight: 500;">${feature.replace(/_/g, ' ')}</td>
                `;
                for (const label of Object.keys(stats)) {
                    const mean = stats[label].features[feature]?.mean || 0;
                    const std = stats[label].features[feature]?.std || 0;
                    html += `<td style="padding: 6px 8px; border: 1px solid #e1e5eb; text-align: center; font-family: monospace;">
                        ${mean.toFixed(2)} <span style="color: #999;">±${std.toFixed(2)}</span>
                    </td>`;
                }
                html += '</tr>';
            }

            html += '</tbody></table>';

            // Add normal ranges reference
            html += `
                <h4 style="margin-top: 20px;">Normal Reference Ranges</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
            `;

            for (const [feature, range] of Object.entries(TRAINING_DATA.normalRanges)) {
                html += `
                    <div style="background: #e8f5e9; padding: 8px; border-radius: 4px; font-size: 0.85rem;">
                        <strong>${feature.replace(/_/g, ' ')}:</strong><br>
                        ${range.min} - ${range.max} ${range.unit}
                    </div>
                `;
            }
            html += '</div>';

            detailedDiv.innerHTML = html;
            detailedDiv.classList.remove('hidden');
            btn.textContent = 'Hide Detailed Statistics';
        } else {
            detailedDiv.classList.add('hidden');
            btn.textContent = 'Show Detailed Statistics';
        }
    }
}

// Initialize on load
const app = new HandwritingAnalyzer();