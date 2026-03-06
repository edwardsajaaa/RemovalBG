<div align="center">

# RemoveBG26

**Automatic background removal for images — directly in your browser, no server, no API key required.**

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![AI](https://img.shields.io/badge/AI%20Model-RMBG--1.4-8b5cf6?style=for-the-badge)

</div>

---

## Overview

RemoveBG26 is a professional-grade background removal application that runs entirely in your web browser. It provides two distinct processing modes: manual color-based removal and automatic AI-powered detection. The application combines advanced image processing algorithms with state-of-the-art deep learning models to deliver high-quality results while maintaining complete data privacy.

---

## Core Features

### Dual Processing Modes

#### Mode 1: Color Picker (Manual Selection)
A precise color-based background removal tool designed for images with solid-color backgrounds.

**Workflow:**
1. Upload an image
2. Select the "Pilih Warna" (Color Picker) tab
3. Click on the background area to sample the color
4. Adjust "Tolerance" slider (1-100) to control color range sensitivity
5. Adjust "Kelembutan Tepi" slider (0-20) for border smoothing
6. Click "Hapus Background" to process

**Technical Implementation:**
- CIE LAB color space analysis for perceptually-accurate color distance calculation
- Delta E (Delta E) metrics to determine removal boundaries
- Separable Gaussian blur for anti-aliased edge processing
- Adaptive soft edge blending for seamless transitions

**Optimal Use Cases:**
- Product photography with white or uniform backgrounds
- Solid-color backdrop images
- Batch processing identical background colors
- Precise control over removal areas

#### Mode 2: AI Automatic (Deep Learning)
Advanced neural network-based background removal using RMBG-1.4 model.

**Workflow:**
1. Upload an image
2. Select the "AI Otomatis" tab
3. Click "Hapus Background"
4. Wait for processing (first run: approximately 40 seconds including model download, subsequent runs: 8-15 seconds)

**Technical Implementation:**
- RMBG-1.4 neural network architecture from BriaAI
- Transformers.js for in-browser model execution
- Multi-stage post-processing pipeline:
  - Sigmoid sharpening (k=16) for mask definition
  - Hard threshold cleanup (0.05-0.95) for noise reduction
  - Gaussian blur for anti-aliasing at model resolution
  - Bilinear upsampling to original dimensions

**Optimal Use Cases:**
- Complex backgrounds with gradients or textures
- Natural environments and landscapes
- Images with fine details (hair, fur, foliage)
- Blurred background scenarios
- Mixed foreground/background distinctions

---

## Technical Features

**Image Quality and Processing**
- Full native resolution processing without resizing or cropping
- Lossless PNG output with transparent alpha channel
- Exact dimension preservation (output matches input dimensions)
- EXIF rotation correction via createImageBitmap API

**Privacy and Performance**
- 100% client-side processing with no server communication
- Model caching in browser storage (approximately 40MB, download once)
- Offline operation after initial model download
- No data transmission or storage on external servers

**Browser Optimization**
- Responsive design for desktop, tablet, and mobile devices
- Modern dark-theme user interface with intuitive controls
- Drag-and-drop file upload capability
- Real-time progress indication

---

## Processing Pipeline

### Unified Architecture

```
Input Image File
    |
    v
createImageBitmap()              [EXIF-aware decoding at native resolution]
    |
    v
Canvas Conversion                [Single pixel source, format standardization]
    |
    +---- Mode: Color Picker ----+---- Mode: AI Automatic
    |                            |
    v                            v
Click Detection                  RawImage Extraction
    |                            |
    v                            v
RGB Pixel Sampling               RMBG-1.4 Inference
    |                            |
    v                            v
CIE LAB Conversion               1024x1024 Mask Output
    |                            |
    v                            v
Distance Calculation             Sigmoid Sharpening
    |                            |
    v                            v
Gaussian Blur                    Threshold Cleanup
    |                            |
    +------------- Unified Mask Processing ---+
                        |
                        v
        Resize to Original Dimensions
                        |
                        v
        Apply as Alpha Channel
                        |
                        v
        Export PNG Lossless
```

### Mode-Specific Details

**Color Picker Pipeline:**
```
1. Sample RGB pixel at click coordinates
2. Convert to CIE LAB color space
3. Calculate Delta E distance for all pixels
4. Build mask based on tolerance threshold:
   - Delta E within tolerance range = background (mask=0)
   - Delta E beyond tolerance+softRange = foreground (mask=1)
   - Intermediate values = soft interpolation
5. Apply Gaussian blur (sigma parameter = edge softness setting)
6. Render alpha channel to output canvas
7. Export as PNG with full transparency support
```

**AI Pipeline:**
```
1. Extract RGB channels (3-channel format)
2. Create RawImage tensor from canvas data
3. Preprocess: normalization, resize to 1024x1024
4. Run inference through RMBG-1.4 neural network
5. Post-process at model resolution:
   a. Sigmoid curve transformation (k=16)
   b. Hard threshold [0.05, 0.95]
   c. Gaussian blur (sigma=1.5)
6. Resize mask to original dimensions (bilinear interpolation)
7. Merge with original pixels (alpha channel application)
8. Export as PNG lossless
```

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Model Framework | Transformers.js | In-browser neural network execution |
| Background Removal | RMBG-1.4 | State-of-the-art AI detection model |
| Color Analysis | CIE LAB Color Space | Perceptually-accurate color distance |
| Image Processing | Canvas API | Pixel-level manipulation and rendering |
| Image Decoding | createImageBitmap | EXIF-aware image loading |
| Output Format | PNG 32-bit RGBA | Lossless transparency support |

---

## Performance Metrics

| Operation | Time | Notes |
|-----------|------|-------|
| Initial upload and preview | Instantaneous | In-memory image loading |
| Color Picker processing | Less than 1 second | 4000x3000 pixel reference image |
| AI Mode (first run) | Approximately 40 seconds | Includes model download (40MB) |
| AI Mode (subsequent runs) | 8-15 seconds | Depends on image resolution |
| Model persistence | Permanent | Browser cache until manually cleared |

---

## Usage Guidelines

### Mode Selection Matrix

| Scenario | Recommended Mode | Reasoning |
|----------|------------------|-----------|
| Solid color background (white, blue, green) | Color Picker | Direct color sampling, instantaneous result |
| Complex or gradient background | AI Automatic | Superior edge detection capability |
| Fine detail preservation (hair, fur) | AI Automatic | Specialized boundary recognition |
| Portrait with blurred background | AI Automatic | Distinction between background blur types |
| Product photography | Color Picker | Fast, clean, consistent results |
| Document scanning | Color Picker | Adjustable tolerance for variations |
| Batch processing similar images | Color Picker | Parameter reusability |

### Parameter Tuning

**Color Picker Mode:**

Tolerance Parameter:
- Too high (greater than 60): Removes foreground areas that should remain
- Too low (less than 20): Incomplete background removal with artifacts
- Optimal range: 20-50 (adjust per specific image context)

Edge Softness Parameter:
- 0: Maximum sharpness, visible edge definition
- 1-5: Balanced smoothing
- 10 and above: Soft, diffused edges
- Typical recommendation: 3

**AI Mode:**
- Parameters are automatic and require no user adjustment
- Processing time scales linearly with image resolution
- Results improve with higher input image quality

---

## Installation and Setup

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- For local development: Python 3.6 or higher, or Node.js 14 or higher
- Internet connection (required for first AI mode run only)

### Running Locally

**Option 1: Python HTTP Server**
```bash
cd RemoveBG26
python -m http.server 8080
```
Access: http://localhost:8080

**Option 2: Node.js HTTP Server**
```bash
cd RemoveBG26
npx serve .
```

**Option 3: VS Code Live Server**
1. Install "Live Server" extension from VS Code marketplace
2. Right-click on index.html file
3. Select "Open with Live Server"

---

## Project Structure

```
RemoveBG26/
├── index.html          Main HTML structure and UI markup
├── style.css           CSS styling, dark theme, responsive design
├── app.js              JavaScript logic, AI pipeline, image processing
├── README.md           Project documentation
└── .gitignore          Git configuration file
```

### File Descriptions

**index.html**
- DOM structure for upload interface
- Mode selector tabs (Color Picker and AI Automatic modes)
- Preview panels for input and output comparison
- Control sliders and parameter inputs
- Action buttons (Process, Download, New Image)

**style.css**
- Professional dark theme color scheme
- Responsive grid layout system
- Modal overlay styling
- Slider controls and button states
- Mobile-first responsive approach

**app.js**
- File upload event handling
- Canvas pixel manipulation and retrieval
- Color space conversions (RGB to CIE LAB and reverse)
- Gaussian blur algorithm implementation
- Model loading and neural network inference
- Mask post-processing and filtering
- Output file generation and export

---

## Development Guidelines

### Code Organization

The application follows a modular architecture pattern:

1. **State Management:** Global variables track current mode, picked color, canvas state
2. **Event Handlers:** Separated concerns for distinct UI interactions
3. **Processing Functions:** Dedicated functions for color removal versus AI removal
4. **Utility Functions:** Reusable algorithms including color conversions and blur

### Extending Functionality

To add new features to the application:

1. Mode expansion: Add new tab button in modeSelector HTML container, add corresponding switchMode() handler function
2. Parameter tuning: Add new slider element, integrate with processing function
3. Export formats: Modify final toBlob() call with different MIME type parameterization
4. Post-processing: Insert additional filter operations in pixel manipulation loops

### Performance Optimization

Current optimizations implemented:
- Neural network model caching in browser storage
- Post-processing performed at model resolution before upsampling
- RequestAnimationFrame for non-blocking UI rendering
- Separable Gaussian blur algorithm (O(n) complexity)

Potential improvements for future versions:
- WebWorker implementations for separate processing threads
- WebAssembly compilation for computationally intensive operations
- Multiple image format support (WebP, AVIF formats)
- GPU-accelerated processing via WebGL API

---

## Specifications

### Input Specifications
- Supported image formats: JPEG, PNG, WebP
- Maximum file size: 20 megabytes
- Resolution range: Up to 8000x8000 pixels
- Color profile: RGB or sRGB

### Output Specifications
- Format: PNG 32-bit RGBA
- Alpha channel: Full transparency support
- Resolution: Identical to input image
- Compression: None (lossless format)

### Browser Compatibility
- Chrome/Chromium: Version 90 and above
- Firefox: Version 88 and above
- Safari: Version 14 and above
- Microsoft Edge: Version 90 and above

---

## Known Limitations

1. Neural network model download (40MB) required on first AI mode use
2. Processing time scales linearly with input image dimensions
3. Very large images (exceeding 8000 pixels) may consume significant memory
4. Some functionality requires browser cache to remain enabled
5. Color Picker mode limited to solid-color background images

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Model download fails | Verify internet connection, retry after connection stabilization |
| Processing operation timeout | Reload page, attempt processing with smaller image |
| Incomplete color removal | Color Picker mode: increase tolerance parameter value |
| Rough or jagged edges in result | Color Picker mode: increase edge softness parameter value |
| AI mode processing very slow | Check available system resources, close other browser tabs |
| Memory exhaustion errors | Process smaller images, restart web browser |

---

## License

MIT License - Free for personal and commercial use with appropriate attribution.

---

## Credits

- Background Removal Model: RMBG-1.4 from BriaAI
- Framework: Transformers.js from Hugging Face
- Color Science: CIE LAB Color Space Standards

---

## Version History

**v1.1.0** (Current Release)
- Dual processing modes implementation
- Improved AI post-processing pipeline
- Enhanced user interface with mode selector
- Comprehensive technical documentation

**v1.0.0**
- Initial application release with AI-only processing mode

---

## Support

For technical issues, feature requests, or contributions, please visit the project repository or contact the development team.

---

<div align="center">

Professional Background Removal | In-Browser Processing | Privacy-First Architecture

Reliable image processing without data compromise.

</div>
