import { AutoModel, AutoProcessor, env, RawImage } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

// ── Transformers.js config ──────────────────────────────────────────────────
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = "briaai/RMBG-1.4";
let model = null;
let processor = null;

// ── State ───────────────────────────────────────────────────────────────────
let currentMode = "color";
let pickedColor = null;
let srcCanvas = null;
let srcCtx = null;
let origW = 0;
let origH = 0;
let resultBlob = null;
let currentFileURL = null;

// ── DOM refs ────────────────────────────────────────────────────────────────
const dropZone          = document.getElementById("dropZone");
const fileInput         = document.getElementById("fileInput");
const uploadSection     = document.getElementById("uploadSection");
const processSection    = document.getElementById("processSection");
const originalImage     = document.getElementById("originalImage");
const resultImage       = document.getElementById("resultImage");
const processingOverlay = document.getElementById("processingOverlay");
const processingText    = document.getElementById("processingText");
const progressFill      = document.getElementById("progressFill");
const btnDownload       = document.getElementById("btnDownload");
const btnNewImage       = document.getElementById("btnNewImage");
const btnProcess        = document.getElementById("btnProcess");
const tabColor          = document.getElementById("tabColor");
const tabAI             = document.getElementById("tabAI");
const colorControls     = document.getElementById("colorControls");
const colorSwatch       = document.getElementById("colorSwatch");
const colorHint         = document.getElementById("colorHint");
const toleranceSlider   = document.getElementById("toleranceSlider");
const toleranceValue    = document.getElementById("toleranceValue");
const edgeSlider        = document.getElementById("edgeSlider");
const edgeValue         = document.getElementById("edgeValue");

// ── Upload event handlers ───────────────────────────────────────────────────
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer?.files[0];
  if (file?.type.startsWith("image/")) handleFile(file);
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) handleFile(file);
});

// ── Mode tabs ───────────────────────────────────────────────────────────────
tabColor.addEventListener("click", () => switchMode("color"));
tabAI.addEventListener("click", () => switchMode("ai"));

function switchMode(mode) {
  currentMode = mode;
  tabColor.classList.toggle("active", mode === "color");
  tabAI.classList.toggle("active", mode === "ai");
  colorControls.classList.toggle("hidden", mode !== "color");
  originalImage.classList.toggle("pickable", mode === "color");

  // Reset result panel
  resultImage.classList.add("hidden");
  processingOverlay.classList.remove("hidden");
  const spinner = processingOverlay.querySelector(".spinner");
  if (spinner) spinner.style.display = "none";
  processingText.textContent = mode === "color"
    ? "Pilih warna lalu klik Hapus Background"
    : "Klik Hapus Background untuk memulai";
  progressFill.style.width = "0%";
  btnDownload.disabled = true;
  resultBlob = null;

  // Update process button state
  if (mode === "ai") {
    btnProcess.disabled = false;
  } else {
    btnProcess.disabled = !pickedColor;
  }
}

// ── Color picker on original image ──────────────────────────────────────────
originalImage.addEventListener("click", (e) => {
  if (currentMode !== "color" || !srcCtx) return;

  const rect = originalImage.getBoundingClientRect();
  const imgAspect = origW / origH;
  const boxAspect = rect.width / rect.height;
  let renderW, renderH, offsetX, offsetY;

  if (imgAspect > boxAspect) {
    renderW = rect.width;
    renderH = rect.width / imgAspect;
    offsetX = 0;
    offsetY = (rect.height - renderH) / 2;
  } else {
    renderH = rect.height;
    renderW = rect.height * imgAspect;
    offsetX = (rect.width - renderW) / 2;
    offsetY = 0;
  }

  const localX = e.clientX - rect.left - offsetX;
  const localY = e.clientY - rect.top - offsetY;
  if (localX < 0 || localY < 0 || localX > renderW || localY > renderH) return;

  const x = Math.min(Math.floor((localX / renderW) * origW), origW - 1);
  const y = Math.min(Math.floor((localY / renderH) * origH), origH - 1);

  const pixel = srcCtx.getImageData(x, y, 1, 1).data;
  pickedColor = [pixel[0], pixel[1], pixel[2]];

  colorSwatch.style.backgroundColor = `rgb(${pickedColor[0]},${pickedColor[1]},${pickedColor[2]})`;
  colorSwatch.classList.add("picked");
  colorHint.textContent = `Warna: RGB(${pickedColor.join(", ")})`;
  btnProcess.disabled = false;
});

// ── Sliders ─────────────────────────────────────────────────────────────────
toleranceSlider.addEventListener("input", () => {
  toleranceValue.textContent = toleranceSlider.value;
});
edgeSlider.addEventListener("input", () => {
  edgeValue.textContent = edgeSlider.value;
});

// ── Action buttons ──────────────────────────────────────────────────────────
btnProcess.addEventListener("click", () => {
  if (currentMode === "color") {
    processColorRemoval();
  } else {
    processAIRemoval();
  }
});

btnNewImage.addEventListener("click", resetUI);

btnDownload.addEventListener("click", () => {
  if (!resultBlob) return;
  const url = URL.createObjectURL(resultBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "removed-bg.png";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// ── Handle uploaded file ────────────────────────────────────────────────────
async function handleFile(file) {
  if (file.size > 20 * 1024 * 1024) {
    alert("Ukuran file terlalu besar. Maksimal 20MB.");
    return;
  }

  pickedColor = null;
  colorSwatch.classList.remove("picked");
  colorSwatch.style.backgroundColor = "";
  colorHint.textContent = "Klik pada gambar original untuk memilih warna background";

  uploadSection.classList.add("hidden");
  processSection.classList.remove("hidden");

  if (currentFileURL) URL.revokeObjectURL(currentFileURL);
  currentFileURL = URL.createObjectURL(file);
  originalImage.src = currentFileURL;

  // Prepare source canvas for pixel reading
  const bitmap = await createImageBitmap(file);
  origW = bitmap.width;
  origH = bitmap.height;
  srcCanvas = document.createElement("canvas");
  srcCanvas.width = origW;
  srcCanvas.height = origH;
  srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
  srcCtx.drawImage(bitmap, 0, 0);
  bitmap.close();

  switchMode("color");
}

// ══════════════════════════════════════════════════════════════════════════════
// ██  COLOR-BASED REMOVAL
// ══════════════════════════════════════════════════════════════════════════════
function processColorRemoval() {
  if (!pickedColor || !srcCtx) return;

  resultImage.classList.add("hidden");
  processingOverlay.classList.remove("hidden");
  const spinner = processingOverlay.querySelector(".spinner");
  if (spinner) spinner.style.display = "";
  setProgress("Menghapus warna background...", 10);
  btnProcess.disabled = true;

  // Yield to UI before heavy computation
  requestAnimationFrame(() => setTimeout(_doColorRemoval, 30));
}

function _doColorRemoval() {
  try {
    const tolerance = parseInt(toleranceSlider.value);
    const edgeSoft  = parseInt(edgeSlider.value);

    const targetLab = rgbToLab(pickedColor[0], pickedColor[1], pickedColor[2]);
    const imageData = srcCtx.getImageData(0, 0, origW, origH);
    const px = imageData.data;
    const total = origW * origH;

    // Build mask: 0 = remove (background), 1 = keep (foreground)
    setProgress("Menghitung jarak warna...", 30);
    const mask = new Float32Array(total);
    const softRange = Math.max(edgeSoft * 3, 1);

    for (let i = 0; i < total; i++) {
      const lab = rgbToLab(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
      const dist = deltaE(targetLab, lab);

      if (dist <= tolerance) {
        mask[i] = 0;
      } else if (dist >= tolerance + softRange) {
        mask[i] = 1;
      } else {
        mask[i] = (dist - tolerance) / softRange;
      }
    }

    // Smooth edges with gaussian blur
    setProgress("Menghaluskan tepi...", 65);
    const smoothed = edgeSoft > 0 ? gaussianBlur(mask, origW, origH, edgeSoft) : mask;

    // Build output
    setProgress("Menerapkan mask...", 85);
    const outCanvas = document.createElement("canvas");
    outCanvas.width = origW;
    outCanvas.height = origH;
    const outCtx = outCanvas.getContext("2d");
    const outData = outCtx.createImageData(origW, origH);
    const out = outData.data;

    for (let i = 0; i < total; i++) {
      out[i * 4]     = px[i * 4];
      out[i * 4 + 1] = px[i * 4 + 1];
      out[i * 4 + 2] = px[i * 4 + 2];
      out[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, smoothed[i])) * 255);
    }

    outCtx.putImageData(outData, 0, 0);

    outCanvas.toBlob((blob) => {
      if (!blob) { setProgress("Gagal memproses.", 0); return; }
      resultBlob = blob;
      resultImage.src = URL.createObjectURL(blob);
      resultImage.classList.remove("hidden");
      processingOverlay.classList.add("hidden");
      btnDownload.disabled = false;
      btnProcess.disabled = false;
      setProgress("Selesai!", 100);
    }, "image/png");
  } catch (err) {
    console.error("Color removal failed:", err);
    setProgress("Gagal memproses.", 0);
    btnProcess.disabled = false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ██  AI-BASED REMOVAL
// ══════════════════════════════════════════════════════════════════════════════
async function processAIRemoval() {
  resultImage.classList.add("hidden");
  processingOverlay.classList.remove("hidden");
  const spinner = processingOverlay.querySelector(".spinner");
  if (spinner) spinner.style.display = "";
  btnProcess.disabled = true;
  btnDownload.disabled = true;
  resultBlob = null;
  setProgress("Memuat model AI...", 0);

  try {
    await ensureModelLoaded();

    setProgress("Memproses gambar...", 55);

    // Convert RGBA → RGB (3-channel) for the model
    const rgbaData = srcCtx.getImageData(0, 0, origW, origH).data;
    const rgbData = new Uint8ClampedArray(origW * origH * 3);
    for (let i = 0; i < origW * origH; i++) {
      rgbData[i * 3]     = rgbaData[i * 4];
      rgbData[i * 3 + 1] = rgbaData[i * 4 + 1];
      rgbData[i * 3 + 2] = rgbaData[i * 4 + 2];
    }
    const rawImage = new RawImage(rgbData, origW, origH, 3);

    setProgress("Menjalankan AI...", 65);
    const { pixel_values } = await processor(rawImage);

    setProgress("Menghapus background...", 75);
    const { output } = await model({ input: pixel_values });

    // Get mask at model output resolution (typically 1024×1024)
    setProgress("Membersihkan mask...", 85);
    const smallMaskImg = await RawImage.fromTensor(output[0].mul(255).to("uint8"));
    const sw = smallMaskImg.width;
    const sh = smallMaskImg.height;
    const smallData = smallMaskImg.data;

    // Post-process at model resolution (fast)
    const floatMask = new Float32Array(sw * sh);
    for (let i = 0; i < sw * sh; i++) {
      const v = smallData[i] / 255;
      // Sigmoid sharpening: push ambiguous values to 0 or 1
      floatMask[i] = 1 / (1 + Math.exp(-16 * (v - 0.5)));
    }

    // Hard threshold to clean up noise, keep soft edges
    for (let i = 0; i < sw * sh; i++) {
      if (floatMask[i] < 0.05) floatMask[i] = 0;
      if (floatMask[i] > 0.95) floatMask[i] = 1;
    }

    // Gaussian blur at model resolution for anti-aliased edges
    const smoothed = gaussianBlur(floatMask, sw, sh, 1.5);

    // Convert back to uint8 RawImage
    const cleanData = new Uint8ClampedArray(sw * sh);
    for (let i = 0; i < sw * sh; i++) {
      cleanData[i] = Math.round(Math.max(0, Math.min(1, smoothed[i])) * 255);
    }

    // Resize cleaned mask to original dimensions (bilinear = smooth)
    setProgress("Menerapkan ke gambar...", 92);
    const cleanMaskImg = new RawImage(cleanData, sw, sh, 1);
    const finalMask = await cleanMaskImg.resize(origW, origH);

    // Apply alpha
    const imageData = srcCtx.getImageData(0, 0, origW, origH);
    const px = imageData.data;
    const maskPx = finalMask.data;
    for (let i = 0; i < origW * origH; i++) {
      px[i * 4 + 3] = maskPx[i];
    }

    const outCanvas = document.createElement("canvas");
    outCanvas.width = origW;
    outCanvas.height = origH;
    const outCtx = outCanvas.getContext("2d");
    outCtx.putImageData(imageData, 0, 0);

    const blob = await new Promise((resolve, reject) => {
      outCanvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
        "image/png"
      );
    });

    resultBlob = blob;
    resultImage.src = URL.createObjectURL(blob);
    resultImage.classList.remove("hidden");
    processingOverlay.classList.add("hidden");
    btnDownload.disabled = false;
    btnProcess.disabled = false;
    setProgress("Selesai!", 100);
  } catch (err) {
    console.error("AI removal failed:", err);
    setProgress("Gagal memproses. Silakan coba lagi.", 0);
    const spinner = processingOverlay.querySelector(".spinner");
    if (spinner) spinner.style.display = "none";
    btnProcess.disabled = false;
  }
}

// ── Model loader (lazy + cached) ────────────────────────────────────────────
async function ensureModelLoaded() {
  if (model && processor) return;

  setProgress("Memuat model AI (pertama kali ~40MB)...", 5);

  model = await AutoModel.from_pretrained(MODEL_ID, {
    config: { model_type: "custom" },
    progress_callback: (info) => {
      if (info.status === "progress" && info.total > 0) {
        const pct = 5 + Math.round((info.loaded / info.total) * 45);
        setProgress(`Mengunduh model AI... ${Math.round(info.progress ?? 0)}%`, pct);
      }
    },
  });

  processor = await AutoProcessor.from_pretrained(MODEL_ID, {
    config: {
      do_normalize: true,
      do_pad: false,
      do_rescale: true,
      do_resize: true,
      image_mean: [0.5, 0.5, 0.5],
      feature_extractor_type: "ImageFeatureExtractor",
      image_std: [1, 1, 1],
      resample: 2,
      rescale_factor: 0.00392156862745098,
      size: { width: 1024, height: 1024 },
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ██  UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function setProgress(text, pct) {
  processingText.textContent = text;
  progressFill.style.width = Math.min(pct, 100) + "%";
}

// ── CIE LAB color distance ──────────────────────────────────────────────────
function rgbToLab(r, g, b) {
  let rr = r / 255, gg = g / 255, bb = b / 255;
  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;

  let x = (rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375) / 0.95047;
  let y =  rr * 0.2126729 + gg * 0.7151522 + bb * 0.0721750;
  let z = (rr * 0.0193339 + gg * 0.1191920 + bb * 0.9503041) / 1.08883;

  x = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116;

  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function deltaE(lab1, lab2) {
  return Math.sqrt(
    (lab1[0] - lab2[0]) ** 2 +
    (lab1[1] - lab2[1]) ** 2 +
    (lab1[2] - lab2[2]) ** 2
  );
}

// ── Separable Gaussian blur on Float32Array ─────────────────────────────────
function gaussianBlur(mask, w, h, sigma) {
  const ks = Math.ceil(sigma * 3) * 2 + 1;
  const half = Math.floor(ks / 2);

  const kernel = new Float32Array(ks);
  let sum = 0;
  for (let i = 0; i < ks; i++) {
    const d = i - half;
    kernel[i] = Math.exp(-(d * d) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < ks; i++) kernel[i] /= sum;

  // Horizontal pass
  const temp = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = 0;
      for (let k = -half; k <= half; k++) {
        const sx = Math.min(Math.max(x + k, 0), w - 1);
        val += mask[y * w + sx] * kernel[k + half];
      }
      temp[y * w + x] = val;
    }
  }

  // Vertical pass
  const out = new Float32Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let val = 0;
      for (let k = -half; k <= half; k++) {
        const sy = Math.min(Math.max(y + k, 0), h - 1);
        val += temp[sy * w + x] * kernel[k + half];
      }
      out[y * w + x] = val;
    }
  }
  return out;
}

// ── Reset ───────────────────────────────────────────────────────────────────
function resetUI() {
  uploadSection.classList.remove("hidden");
  processSection.classList.add("hidden");
  originalImage.src = "";
  resultImage.src = "";
  resultImage.classList.add("hidden");
  processingOverlay.classList.remove("hidden");
  btnDownload.disabled = true;
  btnProcess.disabled = true;
  resultBlob = null;
  pickedColor = null;
  srcCanvas = null;
  srcCtx = null;
  if (currentFileURL) { URL.revokeObjectURL(currentFileURL); currentFileURL = null; }
  fileInput.value = "";
  colorSwatch.classList.remove("picked");
  colorSwatch.style.backgroundColor = "";
  colorHint.textContent = "Klik pada gambar original untuk memilih warna background";
  setProgress("", 0);

  const spinner = processingOverlay.querySelector(".spinner");
  if (spinner) spinner.style.display = "";
}
