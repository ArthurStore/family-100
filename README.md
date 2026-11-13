# FAMILY 100

Aplikasi web game kuis interaktif **FAMILY 100** yang dibangun dengan **React (Vite)**, **Tailwind CSS**, **Framer Motion** (animasi kartu flip 3D & transisi), dan **Canvas Confetti**. Aplikasi berjalan 100% secara lokal menggunakan `localStorage` (bank soal, pengaturan, progres game) dan `IndexedDB` (penyimpanan file audio custom `.mp3`/`.wav`).

---

## Fitur Utama

1. **Tampilan 1 Layar Penuh (Zero-Scroll)**
   - Dirancang pas 1 layar penuh di desktop/laptop/proyektor tanpa scroll (`h-screen overflow-hidden`) dengan split layout 2 kolom: papan soal & kartu survei di kiri (~60%) dan panel kontrol jawaban di kanan (~40%).
   - Kotak **Tim 1** dan **Tim 2** di scoreboard dapat diklik langsung untuk memilih atau memindahkan giliran tim aktif (ditandai highlight border menyala dan badge `GILIRAN MAIN`).

2. **Validasi Jawaban Strict Phrase Matching**
   - Jawaban harus cocok secara **utuh satu frasa** dengan teks jawaban utama atau salah satu `aliases` (pencocokan parsial 1 kata ditolak).
   - Normalisasi otomatis menghapus spasi dan karakter spesial (`replace(/[^a-z0-9]/g, '')`), sehingga `"Tanggung-jawab"` dan `"tanggung jawab"` sama-sama diterima.
   - Toleransi typo ringan (Levenshtein distance 1–2 karakter) hanya aktif jika panjang frasa input minimal 80% dari panjang kunci jawaban.

3. **Alur Face-Off, 3x SALAH, & Mode Steal**
   - **Lobby Awal**: Input nama Tim 1 & Tim 2 serta pilihan mulai dari babak **Face-Off** atau langsung memilih tim yang bermain.
   - **Babak Face-Off**: Tim yang menjawab peringkat #1 langsung berhak memilih **Main Sendiri** atau **Lempar ke Tim Lawan**.
   - **Sistem 3x SALAH**: Indikator `[X] [X] [X]` bertambah berurutan `1 -> 2 -> 3`. Saat mencapai 3x SALAH sebelum semua kartu terbuka, giliran otomatis berpindah ke **Mode Steal** untuk tim lawan (1 kesempatan merebut seluruh Pot Poin Ronde Ini).

4. **Clue Huruf Acak (Garis Bawah)**
   - Dapat diaktifkan/dimatikan lewat **Settings / Admin**.
   - Menampilkan tombol **Buka Clue** pada kartu tertutup untuk menyensor huruf secara acak menggunakan garis bawah `_` dengan spasi (contoh: `K _ N _ _ _ G`).

5. **Panel Admin / Settings & Audio Manager**
   - **CRUD Bank Soal**: Tambah, edit, hapus, ubah urutan soal, kelola jawaban, `aliases`, dan poin.
   - **Import / Export JSON**: Dilengkapi contoh format JSON dan tombol **Copy Contoh JSON**.
   - **Audio Manager (Web Audio API + IndexedDB)**:
     - **SFX**: Ding jawaban benar, buzzer SALAH, dan fanfare kemenangan bawaan + opsi upload `.mp3/.wav` custom.
     - **BGM**: 3 musik latar bawaan (*Upbeat Game Show Loop*, *Tense Thinking Music*, *Victory Celebration*) + opsi upload lagu custom `.mp3/.wav`, lengkap dengan slider volume BGM & SFX terpisah.

---

## Cara Instalasi & Menjalankan

Pastikan **Node.js** (disarankan v18+) sudah terpasang di komputer Anda.

1. Masuk ke folder proyek:
   ```bash
   cd "Family 100"
   ```
2. Install dependensi:
   ```bash
   npm install
   ```
3. Jalankan server lokal untuk bermain:
   ```bash
   npm run dev
   ```
4. Buka URL yang muncul di terminal (biasanya `http://localhost:5173`) melalui browser.
5. Untuk build produksi:
   ```bash
   npm run build
   ```

---

## Panduan Host / Operator

- **Memilih / Mengganti Tim Aktif**: Klik langsung **Kotak Tim 1** atau **Kotak Tim 2** pada baris scoreboard di atas.
- **Mengecek Jawaban Pemain**: Ketik frasa jawaban di kolom input pada panel kanan, lalu tekan **Enter** atau klik **Submit Jawaban**.
- **Pintasan Keyboard**:
  - `Enter`: Submit jawaban dari kolom ketik.
  - `X`: Menandai jawaban **SALAH [X]** (saat fokus tidak berada di dalam kolom ketik).
  - `1` – `8`: Membuka kartu jawaban nomor 1 sampai 8 secara manual.
- **Membuka Sisa Jawaban / Pindah Soal**: Gunakan tombol **Reveal Semua** untuk membuka sisa kartu yang belum terjawab, lalu klik **Lanjut Soal Berikutnya**.
- **Reset Permainan**: Buka **Settings / Admin -> Clue, Tim & Reset**, lalu pilih:
  - **Reset Skor & Mulai dari Soal 1**: Mengembalikan skor ke `0` tanpa menghapus bank soal dan file audio custom.
  - **Reset Total ke Lobby**: Mengembalikan permainan ke layar input nama tim awal.

---

## Aturan Main Singkat

1. **Face-Off**: Kedua tim bergantian menebak jawaban untuk memperebutkan hak main. Tim dengan peringkat survei lebih tinggi (atau langsung peringkat #1) berhak memilih **Main Sendiri** atau **Lempar ke Tim Lawan**.
2. **Giliran Bermain**: Tim aktif menebak sisa jawaban di papan. Setiap jawaban benar membuka kartu dan menambah **Pot Poin Ronde Ini**.
3. **3x SALAH & Mode Steal**: Jika tim bermain melakukan 3 kali kesalahan, tim lawan mendapat **1 kesempatan** di Mode Steal untuk merebut seluruh Pot Poin Ronde Ini. Jika benar, poin menjadi milik tim lawan; jika salah, poin tetap menjadi milik tim pertama.

---

## Contoh Format JSON Bank Soal

Gunakan format array JSON berikut saat melakukan **Import JSON** di menu **Settings / Admin**:

```json
[
  {
    "id": "soal-contoh-1",
    "question": "Contoh pertanyaan survei Family 100?",
    "answers": [
      {
        "id": "ans-1",
        "text": "Jawaban Peringkat 1",
        "points": 30,
        "aliases": [
          "jawaban peringkat 1",
          "jawaban nomor satu"
        ]
      },
      {
        "id": "ans-2",
        "text": "Jawaban Peringkat 2",
        "points": 25,
        "aliases": [
          "jawaban peringkat 2",
          "jawaban nomor dua"
        ]
      },
      {
        "id": "ans-3",
        "text": "Jawaban Peringkat 3",
        "points": 20,
        "aliases": [
          "jawaban peringkat 3"
        ]
      }
    ]
  }
]
```
