import {
  AutoModel,
  AutoProcessor,
  env,
  RawImage,
  Tensor,
  type Processor,
} from "@xenova/transformers";

// ── Transformers.js config ──────────────────────────────────────────────────
env.allowLocalModels = false;
(env as Record<string, unknown>).useBrowserCache = true;

const MODEL_ID = "briaai/RMBG-1.4";
let model: Awaited<ReturnType<typeof AutoModel.from_pretrained>> | null = null;
let processor: Processor | null = null;

// ── DOM refs ────────────────────────────────────────────────────────────────
const dropZone = document.getElementById("dropZone") as HTMLDivElement;
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const uploadSection = document.getElementById("uploadSection") as HTMLElement;
const processSection = document.getElementById("processSection") as HTMLElement;
const originalImage = document.getElementById("originalImage") as HTMLImageElement;
const resultImage = document.getElementById("resultImage") as HTMLImageElement;
const processingOverlay = document.getElementById("processingOverlay") as HTMLDivElement;
const processingText = document.getElementById("processingText") as HTMLParagraphElement;
const progressFill = document.getElementById("progressFill") as HTMLDivElement;
const btnDownload = document.getElementById("btnDownload") as HTMLButtonElement;
const btnNewImage = document.getElementById("btnNewImage") as HTMLButtonElement;

let resultBlob: Blob | null = null;

// ── Upload event handlers ───────────────────────────────────────────────────
dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (e: DragEvent) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e: DragEvent) => {
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
type ProgressInfo = { status: string; loaded?: number; total?: number; progress?: number };

async function ensureModelLoaded(): Promise<void> {
  if (model && processor) return;

  setProgress("Memuat model AI (pertama kali ~40MB)...", 5);

  model = await AutoModel.from_pretrained(MODEL_ID, {
    config: { model_type: "custom" },
    progress_callback: (info: ProgressInfo) => {
      if (info.status === "progress" && info.total && info.total > 0 && info.loaded !== undefined) {
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

function setProgress(text: string, pct: number): void {
  processingText.textContent = text;
  progressFill.style.width = Math.min(pct, 100) + "%";
}

// ── Core: remove background ─────────────────────────────────────────────────
async function handleFile(file: File): Promise<void> {
  if (file.size > 20 * 1024 * 1024) {
    alert("Ukuran file terlalu besar. Maksimal 20MB.");
    return;
  }

  uploadSection.classList.add("hidden");
  processSection.classList.remove("hidden");

  // Show original preview
  const previewUrl = URL.createObjectURL(file);
  originalImage.src = previewUrl;

  // Reset result state
  resultImage.classList.add("hidden");
  processingOverlay.classList.remove("hidden");
  btnDownload.disabled = true;
  resultBlob = null;
  setProgress("Memuat model AI...", 0);

  // Separate blob URL used for processing (revoked in finally)
  const blobUrl = URL.createObjectURL(file);

  try {
    // 1. Load model (cached after first run)
    await ensureModelLoaded();

    // 2. Load image for inference
    setProgress("Memproses gambar...", 55);
    const rawImage = await RawImage.fromURL(blobUrl);

    // 3. Preprocess
    setProgress("Menjalankan AI...", 65);
    const { pixel_values } = (await processor!(rawImage)) as { pixel_values: unknown };

    // 4. Inference
    setProgress("Menghapus background...", 75);
    const { output } = (await model!({ input: pixel_values })) as { output: RawImage[] };

    // 5. Build alpha mask, resized back to original dimensions
    setProgress("Menerapkan mask...", 90);
    const rawTensor = output[0] as unknown as Tensor;
    const mask = await RawImage.fromTensor(rawTensor.mul(255).to("uint8")).resize(
      rawImage.width,
      rawImage.height
    );

    // 6. Decode original file into an ImageBitmap for lossless pixel access
    const bitmap = await createImageBitmap(file);

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    // Draw at native resolution — no resampling, no quality loss
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    // Apply mask as alpha channel
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;
    for (let i = 0; i < mask.data.length; i++) {
      data[4 * i + 3] = (mask.data as Uint8Array)[i];
    }
    ctx.putImageData(imageData, 0, 0);

    // 7. Export as lossless PNG (no quality parameter = full quality)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob returned null"))),
        "image/png"
      );
    });

    resultBlob = blob;
    resultImage.src = URL.createObjectURL(blob);
    resultImage.classList.remove("hidden");
    processingOverlay.classList.add("hidden");
    btnDownload.disabled = false;
    setProgress("Selesai!", 100);
  } catch (err: unknown) {
    console.error("Background removal failed:", err);
    setProgress("Gagal memproses. Silakan coba lagi.", 0);
    const spinner = processingOverlay.querySelector<HTMLDivElement>(".spinner");
    if (spinner) spinner.style.display = "none";
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

// ── Reset ───────────────────────────────────────────────────────────────────
function resetUI(): void {
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

  const spinner = processingOverlay.querySelector<HTMLDivElement>(".spinner");
  if (spinner) spinner.style.display = "";
}
