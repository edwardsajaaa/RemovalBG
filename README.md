<div align="center">

# 🪄 RemoveBG26

**Hapus background foto secara otomatis — langsung di browser, tanpa server, tanpa API key.**

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![AI](https://img.shields.io/badge/AI%20Model-RMBG--1.4-8b5cf6?style=for-the-badge)

</div>

---

## ✨ Fitur Utama

### 🎨 Dual Mode Processing
RemoveBG26 mendukung **2 mode** pemrosesan background removal:

#### 1️⃣ **Mode Pilih Warna** (Color Picker)
Hapus background berdasarkan warna yang Anda pilih — cocok untuk gambar dengan background **solid color** (putih, biru, hijau, dll).

**Cara penggunaan:**
1. Upload foto
2. Klik tab **"Pilih Warna"**
3. **Klik pada area background** yang ingin dihapus (misal area putih) — warna akan terekam
4. Gunakan **slider Toleransi** (1-100) untuk mengatur lebar range warna yang dihapus
5. Gunakan **slider Kelembutan Tepi** (0-20) untuk menghaluskan pinggiran hasil
6. Klik **"Hapus Background"**

**Teknologi:**
- ✓ **CIE LAB Color Distance** — Akurasi warna yang perceptually-accurate, bukan sekedar RGB
- ✓ **Adaptive Edge Softening** — Gaussian blur otomatis di area tepi untuk hasil smooth & anti-aliased
- ✓ **Fast Processing** — Hasil instan, cocok untuk batch processing

**Kapan gunakan:**
- Background warna solid (putih, biru, hijau, dll)
- Ingin kontrol penuh atas area yang dihapus
- Perlu hasil super clean tanpa noise

#### 2️⃣ **Mode AI Otomatis** (RMBG-1.4)
Pendeteksian background cerdas menggunakan AI model RMBG-1.4 — bisa menangani background kompleks, gradien, atau blur.

**Cara penggunaan:**
1. Upload foto
2. Klik tab **"AI Otomatis"**
3. Klik **"Hapus Background"**
4. Tunggu proses (pertama kali: ~40 detik loading model, lalu instan untuk foto berikutnya)

**Teknologi:**
- ✓ **RMBG-1.4 Model** — State-of-the-art background removal AI
- ✓ **Optimized Post-Processing** — Sigmoid sharpening + hard thresholding untuk noise cleanup
- ✓ **Anti-aliased Edges** — Gaussian blur pada resolusi model sebelum upscale
- ✓ **Lossless Upscaling** — Resize mask menggunakan bilinear interpolation untuk smooth transitions

**Kapan gunakan:**
- Background kompleks (warna gradien, blur, tekstur)
- Foreground dengan detail halus (rambut, bulu, dll)
- Ingin hasil otomatis tanpa tuning parameter

---

### 🤖 AI Presisi Tinggi
- Menggunakan model [RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4) dari BriaAI via Transformers.js
- **Improved mask processing**: Post-processing dilakukan di resolusi model untuk speed, lalu di-resize ke resolusi asli

### 🖼️ Kualitas Lossless
- Gambar diproses di **resolusi native penuh** tanpa resize atau crop
- Output **PNG transparan tanpa kompresi**, pixel-perfect sama dengan original

### 📐 Dimensi Terjaga
- Ukuran gambar hasil **sama persis** dengan gambar asli, tidak ada cropping atau padding

### 🔒 100% Privasi
- Semua pemrosesan terjadi **di browser kamu**, foto tidak dikirim ke server manapun
- Bisa digunakan offline (setelah model terdownload)

### 💾 Smart Cache
- Model AI (~40MB) diunduh **sekali saja** lalu tersimpan di browser cache
- Proses selanjutnya **instan**, langsung bisa hapus background foto berikutnya

### 📱 Responsive Design
- Tampil sempurna di **desktop, tablet, mobile**
- Dark theme modern dengan UI/UX yang intuitif

### 🎯 Drag & Drop + Click
- Seret foto langsung ke area upload, atau klik untuk membuka file picker

---

## 🖥️ Preview

```
┌─────────────────────────────────────────────┐
│  🪄 RemoveBG26                              │
│  Hapus background foto dengan presisi tinggi │
├──────────────┬──────────────────────────────┤
│              │                              │
│   [ Upload ] │  ← Drag & Drop atau Klik    │
│              │                              │
├──────────────┴──────────────────────────────┤
│  Original  →→→  Hasil (transparan)          │
│  [🔄 Foto Baru]    [⬇️ Download PNG]        │
└─────────────────────────────────────────────┘
```

---

## 🚀 Cara Menjalankan

Tidak butuh instalasi apapun. Cukup jalankan server lokal:

### Menggunakan Python
```bash
python -m http.server 8080
```
Buka di browser: **http://localhost:8080**

### Menggunakan Node.js
```bash
npx serve .
```

### Menggunakan VS Code
Install ekstensi **Live Server**, klik kanan `index.html` → *Open with Live Server*

---

## 📁 Struktur Proyek

```
RemoveBG26/
├── index.html   # Halaman utama & struktur UI
├── style.css    # Styling dark-theme modern
├── app.js       # Logic AI + pipeline pemrosesan gambar
└── README.md
```

---

## ⚙️ Cara Kerja

### Pipeline Umum
```
File Upload
    │
    ▼
createImageBitmap(file)          ← Decode sekali, EXIF-aware, resolusi penuh
    │
    ▼
Canvas (width × height asli)     ← Sumber pixel tunggal
    │
    ├─────────────────├─────────────────┤
    │                 │                 │
 [Mode: Pilih Warna] │         [Mode: AI Otomatis]
    │                 │                 │
    ▼                 │                 ▼
 Klik Gambar ────────┤         RawImage dari canvas
    │                 │              │
 Ambil RGB Pixel     │         RMBG-1.4 AI Model
    │                 │              │
 CIE LAB Distance ───┤         Output mask 1024×1024
    │                 │              │
 Gaussian Blur ──────┤         Sigmoid sharpening
    │                 │              │
    └─────────────────┴─────────────────┘
                  │
                  ▼
    Resize mask ke (width × height asli)
                  │
                  ▼
    Tempel sebagai Alpha Channel
                  │
                  ▼
    PNG Lossless (resolusi penuh)
```

### Mode Pilih Warna (Color Picker)
```
1. User klik gambar original
   ▼
2. Ambil RGB pixel di koordinat click
   ▼
3. Convert RGB → CIE LAB color space
   ▼
4. Hitung ΔE (Delta E) antara target vs setiap pixel
   ▼
5. Jika ΔE ≤ toleransi → background (mask = 0)
   Jika ΔE ≥ toleransi + softRange → foreground (mask = 1)
   Else → interpolasi soft edge
   ▼
6. Gaussian blur dengan sigma = edgeSoftness parameter
   ▼
7. Apply sebagai alpha channel → PNG lossless
```

**Keunggulan:**
- ✓ CIE LAB lebih akurat untuk color distance (perceptually-uniform)
- ✓ Soft edge blending untuk tepi smooth tanpa artifacts
- ✓ Real-time slider adjustment sebelum proses

### Mode AI (RMBG-1.4)
```
1. Extract RGB channels dari canvas (3 channels)
   ▼
2. Create RawImage(data, width, height, 3)
   ▼
3. Processor: normalize + resize → 1024×1024
   ▼
4. Model inference → alpha_mask @ 1024×1024
   ▼
5. Post-processing:
   - Sigmoid(value, k=16) → sharpening
   - Threshold [0.05, 0.95] → hard cleanup
   - Gaussian blur → anti-aliasing
   ▼
6. Resize mask kembali ke original resolution (bilinear)
   ▼
7. Apply alpha → PNG lossless
```

**Improvements:**
- ✓ RGBA→RGB conversion fixed (sebelumnya 4-channel menyebabkan noise)
- ✓ Post-processing pada resolusi model dulu (cepat), baru resize
- ✓ Sigmoid sharpening + noise threshold untuk mask yang cleaner
- ✓ Gaussian blur sebelum upscale untuk smooth edges

---

## 🛠️ Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| **Model** | [RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4) + [Transformers.js](https://huggingface.co/docs/transformers.js) |
| **Color Processing** | CIE LAB color space, ΔE (Delta E) distance |
| **Edge Smoothing** | Separable Gaussian blur (optimized) |
| **Image Handling** | Canvas API, `createImageBitmap(with EXIF)` |
| **Output** | PNG lossless (WebP fallback) |

---

## 📊 Performa

| Aksi | Waktu |
|-----|-------|
| Upload & preview | Instant |
| Mode Pilih Warna | < 1 detik (untuk gambar 4000×3000px) |
| Mode AI (pertama kali) | ~40 detik (termasuk download model ~40MB) |
| Mode AI (cache hit) | 8-15 detik (tergantung ukuran gambar) |
| Model cache di browser | Permanen (sampai cache dihapus) |

---

## � Kapan Gunakan Mode Mana?

| Skenario | Mode | Alasan |
|----------|------|--------|
| Background solid color (putih, biru, hijau) | **Pilih Warna** | Hasil lebih clean, bisa fine-tune |
| Background kompleks / gradien | **AI Otomatis** | AI bisa deteksi tanpa info warna |
| Foto dengan detail halus (rambut, bulu) | **AI Otomatis** | AI lebih presisi untuk edge detection |
| Portrait dengan background blur | **AI Otomatis** | AI bisa membedakan blur background vs foreground |
| Product photo dengan background putih | **Pilih Warna** | Super cepat & clean |
| Dokumen scan dengan background warna | **Pilih Warna** | Toleransi bisa disesuaikan |
| Batch processing banyak foto sama | **Pilih Warna** | Lebih efisien & consistent |

---

## 🎯 Contoh Penggunaan

### Contoh 1: Hapus Background Putih (Mode Pilih Warna)
```
1. Upload foto product dengan background putih
2. Tab "Pilih Warna" (default)
3. Klik area putih → warna terekam
4. Tolerance: default 30 (adjust if needed)
5. Edge Softness: 3 untuk hasil smooth
6. Klik "Hapus Background"
7. Download PNG transparan → gunakan di e-commerce, design, dll
```

### Contoh 2: Hapus Background Kompleks (Mode AI)
```
1. Upload foto outdoor dengan background landscape
2. Klik tab "AI Otomatis"
3. Klik "Hapus Background"
4. Tunggu processing
5. Download PNG transparan
   (background landscape otomatis dihapus, subject tetap sharp & natural)
```

---

## ⚡ Tips & Tricks

### Mode Pilih Warna
- **Tolerance terlalu tinggi** → hapus bagian foreground yang seharusnya tetap → kurangi tolerance
- **Tolerance terlalu rendah** → background masih ada noise → naikkan tolerance
- **Edge kasar/tangkas** → naikkan "Kelembutan Tepi" slider
- **Untuk white/light background** → tolerance 20-40 biasanya optimal
- **Untuk dark background** → tolerance 30-50 biasanya optimal

### Mode AI
- **Pertama kali harus download model** → bersabar 30-40 detik, hanya sekali
- **Ingin hasil lebih sharp** → tunggu sampai selesai (post-processing otomatis)
- **GPU/CPU terasa panas** → itu normal, model Transformers.js di-run on CPU
- **Timeout di browser** → refresh dan coba lagi (biasanya browser idle timeout)

---

## 🔧 Development Setup

### Clone & Setup
```bash
git clone https://github.com/username/RemoveBG26.git
cd RemoveBG26
```

### Run Lokal (Python)
```bash
python -m http.server 8080
```
Akses: `http://localhost:8080`

### Run Lokal (Node.js)
```bash
npx serve .
```

### Development Tips
- Edit `app.js` untuk logic processing
- Edit `style.css` untuk UI/styling
- Edit `index.html` untuk struktur
- Buka DevTools (F12) untuk debug console

---

## 📝 Catatan Penting

- ✓ **Pertama kali**: browser mengunduh model AI (~40MB), stored in browser cache
- ✓ **Format support**: JPG, PNG, WEBP
- ✓ **Max file size**: 20MB
- ✓ **Output**: PNG 32-bit (RGBA) dengan transparency
- ✓ **Privacy**: 100% client-side, tidak ada data sent ke server
- ✓ **Offline**: bisa digunakan offline setelah model terdownload

---

## 🐛 Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Model tidak terdownload | Cek koneksi internet, biarkan page loading |
| Hasil blur/noise pada Mode Pilih Warna | Naikkan "Kelembutan Tepi" atau turunkan Tolerance |
| AI Mode timeout | Refresh page, coba photo yang lebih kecil |
| Hasil masih ada background sedikit | Mode Pilih Warna: naikkan Tolerance |
| File terlalu besar | Compress foto dulu, atau gunakan format WebP |

---

## 📄 Lisensi

MIT License — Bebas digunakan & dimodifikasi untuk keperluan apapun.

---

<div align="center">
  <h3>🎨 Remove Background. Instantly. In Your Browser.</h3>
  
  **Made with ❤️ · Privacy First · Browser-Native · No Dependencies**
  
  ⭐ Jika suka, jangan lupa kasih star!
</div>
