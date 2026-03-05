<div align="center">

# 🪄 RemoveBG26

**Hapus background foto secara otomatis — langsung di browser, tanpa server, tanpa API key.**

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![AI](https://img.shields.io/badge/AI%20Model-RMBG--1.4-8b5cf6?style=for-the-badge)

</div>

---

## ✨ Fitur

- 🤖 **AI Presisi Tinggi** — Menggunakan model [RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4) dari BriaAI via Transformers.js
- 🖼️ **Kualitas Lossless** — Gambar diproses di resolusi native penuh, output PNG transparan tanpa kompresi
- 📐 **Dimensi Terjaga** — Ukuran gambar hasil **sama persis** dengan gambar asli, tidak ada yang dipotong
- 🔒 **100% Privasi** — Semua pemrosesan terjadi di browser kamu, foto tidak dikirim ke server manapun
- 💾 **Cache Model** — Model AI (~40MB) diunduh sekali lalu tersimpan di browser, proses berikutnya instan
- 📱 **Responsive** — Tampil rapi di desktop maupun mobile
- 🎯 **Drag & Drop** — Seret foto langsung ke area upload atau klik untuk memilih file

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

```
File Upload
    │
    ▼
createImageBitmap(file)          ← Decode sekali, EXIF-aware, resolusi penuh
    │
    ▼
Canvas (width × height asli)     ← Sumber pixel tunggal
    │
    ├──► RawImage dari canvas ──► RMBG-1.4 AI ──► Alpha Mask (1024×1024)
    │                                                    │
    │                                                    ▼
    └──► Resize mask ke (width × height asli) ──► Tempel sebagai Alpha Channel
                                                         │
                                                         ▼
                                                  PNG Lossless (resolusi penuh)
```

1. **Decode** — File foto didecode dengan `createImageBitmap` (otomatis koreksi EXIF rotation)
2. **Canvas** — Digambar ke canvas sebagai sumber pixel tunggal
3. **AI Inference** — `RawImage` dibuat langsung dari pixel canvas → diproses AI RMBG-1.4
4. **Mask** — Output mask diresize kembali ke dimensi asli gambar
5. **Alpha** — Mask diterapkan sebagai channel alpha pada canvas original
6. **Export** — Canvas diexport sebagai PNG lossless tanpa kompresi apapun

---

## 🛠️ Tech Stack

| Teknologi | Keterangan |
|-----------|-----------|
| [Transformers.js](https://huggingface.co/docs/transformers.js) | Menjalankan model AI langsung di browser |
| [RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4) | Model background removal dari BriaAI |
| Canvas API | Pemrosesan pixel lossless |
| `createImageBitmap` | Decode gambar dengan koreksi EXIF otomatis |

---

## 📝 Catatan

- **Pertama kali digunakan**: browser mengunduh model AI (~40MB). Proses ini hanya terjadi sekali, model tersimpan di cache browser.
- **Format didukung**: JPG, PNG, WEBP — maks 20MB
- **Output**: PNG transparan dengan kualitas penuh

---

<div align="center">
  Made with ❤️ — Pemrosesan sepenuhnya di browser, privasi terjaga.
</div>
