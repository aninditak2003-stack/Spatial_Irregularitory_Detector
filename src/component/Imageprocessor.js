/**
 * ImageProcessor - PNG image processing for handwriting feature extraction
 * Handles image upload, preprocessing, and spatial feature extraction from static images
 */

class ImageProcessor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.originalImage = null;
        this.processedData = null;
    }

    /**
     * Load image from file input or URL
     */
    async loadImage(source) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                this.originalImage = img;
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                this.ctx.drawImage(img, 0, 0);
                resolve(img);
            };

            img.onerror = (e) => reject(new Error('Failed to load image'));

            if (source instanceof File) {
                const reader = new FileReader();
                reader.onload = (e) => { img.src = e.target.result; };
                reader.onerror = (e) => reject(new Error('Failed to read file'));
                reader.readAsDataURL(source);
            } else if (typeof source === 'string') {
                img.src = source;
            } else {
                reject(new Error('Invalid source type'));
            }
        });
    }

    /**
     * Convert image to grayscale
     */
    toGrayscale() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = data[i + 1] = data[i + 2] = gray;
        }

        this.ctx.putImageData(imageData, 0, 0);
        return imageData;
    }

    /**
     * Apply Otsu's thresholding for binarization
     */
    binarize(threshold = null) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        // Calculate threshold using Otsu's method if not provided
        if (threshold === null) {
            threshold = this.calculateOtsuThreshold(data);
        }

        const binaryData = new Uint8Array(this.canvas.width * this.canvas.height);

        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i];
            const binary = gray < threshold ? 0 : 255;
            data[i] = data[i + 1] = data[i + 2] = binary;
            binaryData[i / 4] = binary === 0 ? 1 : 0; // 1 for ink, 0 for background
        }

        this.ctx.putImageData(imageData, 0, 0);
        return { imageData, binaryData, threshold };
    }

    /**
     * Calculate Otsu's threshold
     */
    calculateOtsuThreshold(data) {
        const histogram = new Array(256).fill(0);
        const totalPixels = data.length / 4;

        // Build histogram
        for (let i = 0; i < data.length; i += 4) {
            histogram[data[i]]++;
        }

        let sum = 0;
        for (let i = 0; i < 256; i++) {
            sum += i * histogram[i];
        }

        let sumB = 0;
        let wB = 0;
        let wF = 0;
        let maxVariance = 0;
        let threshold = 0;

        for (let i = 0; i < 256; i++) {
            wB += histogram[i];
            if (wB === 0) continue;

            wF = totalPixels - wB;
            if (wF === 0) break;

            sumB += i * histogram[i];
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;

            const variance = wB * wF * Math.pow(mB - mF, 2);

            if (variance > maxVariance) {
                maxVariance = variance;
                threshold = i;
            }
        }

        return threshold;
    }

    /**
     * Find connected components (strokes)
     */
    findConnectedComponents(binaryData) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const labels = new Int32Array(width * height);
        const components = [];
        let currentLabel = 0;

        const getIndex = (x, y) => y * width + x;

        // Flood fill for component labeling
        const floodFill = (startX, startY, label) => {
            const stack = [[startX, startY]];
            const points = [];

            while (stack.length > 0) {
                const [x, y] = stack.pop();
                const idx = getIndex(x, y);

                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                if (labels[idx] !== 0 || binaryData[idx] !== 1) continue;

                labels[idx] = label;
                points.push({ x, y });

                stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
                // 8-connectivity
                stack.push([x + 1, y + 1], [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1]);
            }

            return points;
        };

        // Scan image for components
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = getIndex(x, y);
                if (binaryData[idx] === 1 && labels[idx] === 0) {
                    currentLabel++;
                    const points = floodFill(x, y, currentLabel);
                    if (points.length > 5) { // Filter noise
                        components.push({
                            id: currentLabel,
                            points: points,
                            pixelCount: points.length
                        });
                    }
                }
            }
        }

        return components;
    }

    /**
     * Extract skeleton using Zhang-Suen thinning
     */
    skeletonize(binaryData) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const skeleton = new Uint8Array(binaryData);

        const getPixel = (data, x, y) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return 0;
            return data[y * width + x];
        };

        const setPixel = (data, x, y, value) => {
            if (x >= 0 && x < width && y >= 0 && y < height) {
                data[y * width + x] = value;
            }
        };

        let changed = true;
        let iterations = 0;
        const maxIterations = 100;

        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;

            // Step 1
            const toRemove1 = [];
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    if (skeleton[y * width + x] !== 1) continue;

                    const p2 = getPixel(skeleton, x, y - 1);
                    const p3 = getPixel(skeleton, x + 1, y - 1);
                    const p4 = getPixel(skeleton, x + 1, y);
                    const p5 = getPixel(skeleton, x + 1, y + 1);
                    const p6 = getPixel(skeleton, x, y + 1);
                    const p7 = getPixel(skeleton, x - 1, y + 1);
                    const p8 = getPixel(skeleton, x - 1, y);
                    const p9 = getPixel(skeleton, x - 1, y - 1);

                    const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
                    if (B < 2 || B > 6) continue;

                    const A = (p2 === 0 && p3 === 1 ? 1 : 0) +
                              (p3 === 0 && p4 === 1 ? 1 : 0) +
                              (p4 === 0 && p5 === 1 ? 1 : 0) +
                              (p5 === 0 && p6 === 1 ? 1 : 0) +
                              (p6 === 0 && p7 === 1 ? 1 : 0) +
                              (p7 === 0 && p8 === 1 ? 1 : 0) +
                              (p8 === 0 && p9 === 1 ? 1 : 0) +
                              (p9 === 0 && p2 === 1 ? 1 : 0);

                    if (A !== 1) continue;
                    if (p2 * p4 * p6 !== 0) continue;
                    if (p4 * p6 * p8 !== 0) continue;

                    toRemove1.push([x, y]);
                }
            }

            for (const [x, y] of toRemove1) {
                setPixel(skeleton, x, y, 0);
                changed = true;
            }

            // Step 2
            const toRemove2 = [];
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    if (skeleton[y * width + x] !== 1) continue;

                    const p2 = getPixel(skeleton, x, y - 1);
                    const p3 = getPixel(skeleton, x + 1, y - 1);
                    const p4 = getPixel(skeleton, x + 1, y);
                    const p5 = getPixel(skeleton, x + 1, y + 1);
                    const p6 = getPixel(skeleton, x, y + 1);
                    const p7 = getPixel(skeleton, x - 1, y + 1);
                    const p8 = getPixel(skeleton, x - 1, y);
                    const p9 = getPixel(skeleton, x - 1, y - 1);

                    const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
                    if (B < 2 || B > 6) continue;

                    const A = (p2 === 0 && p3 === 1 ? 1 : 0) +
                              (p3 === 0 && p4 === 1 ? 1 : 0) +
                              (p4 === 0 && p5 === 1 ? 1 : 0) +
                              (p5 === 0 && p6 === 1 ? 1 : 0) +
                              (p6 === 0 && p7 === 1 ? 1 : 0) +
                              (p7 === 0 && p8 === 1 ? 1 : 0) +
                              (p8 === 0 && p9 === 1 ? 1 : 0) +
                              (p9 === 0 && p2 === 1 ? 1 : 0);

                    if (A !== 1) continue;
                    if (p2 * p4 * p8 !== 0) continue;
                    if (p2 * p6 * p8 !== 0) continue;

                    toRemove2.push([x, y]);
                }
            }

            for (const [x, y] of toRemove2) {
                setPixel(skeleton, x, y, 0);
                changed = true;
            }
        }

        return skeleton;
    }

    /**
     * Trace skeleton paths to extract ordered stroke points
     */
    traceSkeletonPaths(skeleton) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const visited = new Uint8Array(width * height);
        const paths = [];

        const getPixel = (x, y) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return 0;
            return skeleton[y * width + x];
        };

        const isVisited = (x, y) => visited[y * width + x] === 1;
        const setVisited = (x, y) => { visited[y * width + x] = 1; };

        const getNeighbors = (x, y) => {
            const neighbors = [];
            const dirs = [
                [0, -1], [1, -1], [1, 0], [1, 1],
                [0, 1], [-1, 1], [-1, 0], [-1, -1]
            ];
            for (const [dx, dy] of dirs) {
                const nx = x + dx, ny = y + dy;
                if (getPixel(nx, ny) === 1 && !isVisited(nx, ny)) {
                    neighbors.push([nx, ny]);
                }
            }
            return neighbors;
        };

        // Find endpoints and junction points
        const findStartPoints = () => {
            const startPoints = [];
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (getPixel(x, y) === 1 && !isVisited(x, y)) {
                        const neighbors = getNeighbors(x, y);
                        // Prefer endpoints (1 neighbor) as start points
                        if (neighbors.length === 1 || neighbors.length >= 3) {
                            startPoints.unshift([x, y]);
                        } else {
                            startPoints.push([x, y]);
                        }
                    }
                }
            }
            return startPoints;
        };

        // Trace path from a start point
        const tracePath = (startX, startY) => {
            const path = [];
            let x = startX, y = startY;

            while (true) {
                if (isVisited(x, y)) break;
                setVisited(x, y);
                path.push({ x, y });

                const neighbors = getNeighbors(x, y);
                if (neighbors.length === 0) break;

                [x, y] = neighbors[0];
            }

            return path;
        };

        // Trace all paths
        let startPoints = findStartPoints();
        while (startPoints.length > 0) {
            const [startX, startY] = startPoints.shift();
            if (!isVisited(startX, startY)) {
                const path = tracePath(startX, startY);
                if (path.length > 3) {
                    paths.push(path);
                }
            }
            // Refresh start points
            startPoints = findStartPoints();
        }

        return paths;
    }

    /**
     * Process image and extract all features
     */
    async processImage(source) {
        await this.loadImage(source);

        // Preprocessing
        this.toGrayscale();
        const { binaryData, threshold } = this.binarize();

        // Find connected components
        const components = this.findConnectedComponents(binaryData);

        // Skeletonization for stroke path estimation
        const skeleton = this.skeletonize(binaryData);

        // Trace skeleton paths
        const skeletonPaths = this.traceSkeletonPaths(skeleton);

        this.processedData = {
            width: this.canvas.width,
            height: this.canvas.height,
            binaryData,
            threshold,
            components,
            skeleton,
            skeletonPaths,
            componentCount: components.length,
            pathCount: skeletonPaths.length
        };

        return this.processedData;
    }

    /**
     * Get processed canvas as data URL
     */
    getProcessedImage() {
        return this.canvas.toDataURL('image/png');
    }

    /**
     * Draw skeleton overlay for visualization
     */
    drawSkeletonOverlay() {
        if (!this.processedData) return;

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let i = 0; i < this.processedData.skeleton.length; i++) {
            if (this.processedData.skeleton[i] === 1) {
                const pixelIndex = i * 4;
                data[pixelIndex] = 255;     // R
                data[pixelIndex + 1] = 0;   // G
                data[pixelIndex + 2] = 0;   // B
            }
        }

        this.ctx.putImageData(imageData, 0, 0);
        return this.canvas.toDataURL('image/png');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageProcessor;
}