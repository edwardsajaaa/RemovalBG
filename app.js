import { AutoModel, AutoProcessor, env, RawImage } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

// ── Transformers.js config ──────────────────────────────────────────────────
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = "briaai/RMBG-1.4";
let model = null;
let processor = null;

// ── DOM refs ────────────────────────────────────────────────────────────────
const dropZone       = document.getElementById("dropZone");
const fileInput      = document.getElementById("fileInput");
const uploadSection  = document.getElementById("uploadSection");
const processSection = document.getElementById("processSection");
const originalImage  = document.getElementById("originalImage");
const resultImage    = document.getElementById("resultImage");
const processingOverlay = document.getElementById("processingOverlay");
const processingText    = document.getElementById("processingText");
const progressFill      = document.getElementById("progressFill");
const btnDownload    = document.getElementById("btnDownload");
const btnNewImage    = document.getElementById("btnNewImage");

let resultBlob = null;

// ── Upload event handlers ───────────────────────────────────────────────────
// dropZone is a <label for="fileInput">, so click opens file picker natively.

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

// ── Action buttons ──────────────────────────────────────────────────────────
btnNewImage.addEventListener("click", resetUI);

btnDownload.addEventListener("click", () => {
  if (!resultBlob) return;
  const url = URL.createObjectURL(resultBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "removed-bg.png";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
});

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

function setProgress(text, pct) {
  processingText.textContent = text;
  progressFill.style.width = Math.min(pct, 100) + "%";
}

// ── Core: remove background ─────────────────────────────────────────────────
async function handleFile(file) {
  if (file.size > 20 * 1024 * 1024) {
    alert("Ukuran file terlalu besar. Maksimal 20MB.");
    return;
  }

  uploadSection.classList.add("hidden");
  processSection.classList.remove("hidden");

  const previewUrl = URL.createObjectURL(file);
  originalImage.src = previewUrl;

  resultImage.classList.add("hidden");
  processingOverlay.classList.remove("hidden");
  btnDownload.disabled = true;
  resultBlob = null;
  setProgress("Memuat model AI...", 0);

  try {
    // 1. Load model (cached after first run)
    await ensureModelLoaded();

    // 2. Decode file to bitmap — createImageBitmap auto-applies EXIF orientation
    //    so we get the exact pixels the user sees, at full native resolution.
    setProgress("Memproses gambar...", 55);
    const bitmap = await createImageBitmap(file);
    const origW = bitmap.width;
    const origH = bitmap.height;

    // 3. Draw onto an offscreen canvas — this is the single source of truth for pixels.
    const srcCanvas = document.createElement("canvas");
    srcCanvas.width  = origW;
    srcCanvas.height = origH;
    const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
    srcCtx.drawImage(bitmap, 0, 0);
    bitmap.close();

    // 4. Build a RawImage directly from the canvas pixels so the AI sees the
    //    same oriented, full-resolution image — no separate decode, no mismatch.
    const srcPixels = srcCtx.getImageData(0, 0, origW, origH);
    const rawImage  = new RawImage(srcPixels.data, origW, origH, 4);

    // 5. Preprocess → inference
    setProgress("Menjalankan AI...", 65);
    const { pixel_values } = await processor(rawImage);

    setProgress("Menghapus background...", 75);
    const { output } = await model({ input: pixel_values });

    // 6. Resize mask back to EXACTLY the original canvas dimensions.
    //    Because rawImage was built from the canvas, origW/origH are guaranteed
    //    to match — no EXIF dimension flip risk.
    setProgress("Menerapkan mask...", 90);
    const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8"))
      .resize(origW, origH);

    // 7. Apply mask as alpha channel on top of the original pixels.
    //    We re-use srcCanvas so we don't re-decode anything.
    const imageData = srcCtx.getImageData(0, 0, origW, origH);
    const pixels    = imageData.data;
    const maskData  = mask.data;
    const total     = origW * origH;
    for (let i = 0; i < total; i++) {
      pixels[4 * i + 3] = maskData[i];
    }
    srcCtx.putImageData(imageData, 0, 0);

    // 8. Export as lossless PNG — no quality param means maximum quality,
    //    full resolution, nothing cropped.
    const blob = await new Promise((resolve, reject) => {
      srcCanvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
        "image/png"
      );
    });

    resultBlob = blob;
    resultImage.src = URL.createObjectURL(blob);
    resultImage.classList.remove("hidden");
    processingOverlay.classList.add("hidden");
    btnDownload.disabled = false;
    setProgress("Selesai!", 100);
  } catch (err) {
    console.error("Background removal failed:", err);
    setProgress("Gagal memproses. Silakan coba lagi.", 0);
    const spinner = processingOverlay.querySelector(".spinner");
    if (spinner) spinner.style.display = "none";
  }
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
  resultBlob = null;
  fileInput.value = "";
  setProgress("Menghapus background...", 0);

  const spinner = processingOverlay.querySelector(".spinner");
  if (spinner) spinner.style.display = "";
}
