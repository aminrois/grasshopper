# Papan Skor Digital Robotik Grasshopper Competition

Sistem papan skor digital operasional dan real-time untuk mengelola pertandingan robotik Grasshopper Competition yang diikuti empat tim secara simultan.

Aplikasi ini mencakup dua antarmuka utama yang terhubung secara real-time melalui Socket.IO dan backend berbasis Node.js/Express:
1. **Judge/Operator Panel (`/` atau `/operator`)** — Panel kontrol terintegrasi bagi juri/operator untuk mengatur pertandingan, mengendalikan timer general, mencatat checkpoint masing-masing tim, melakukan pengesahan, dan berpindah antar-sesi secara cepat.
2. **Public Scoreboard (`/public`)** — Layar papan skor beresolusi tinggi (rasio 16:9 fullscreen) untuk proyektor/TV/monitor penonton yang menampilkan timer general, matriks waktu CP 1 s/d CP 4 (Finish) per tim, indikator tercepat (Mahkota Emas 👑), bendera finish 🏁, serta papan peringkat dinamis.

---

## Arsitektur & Tumpukan Teknologi

- **Backend:** Node.js, Express, TypeScript, Socket.IO.
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Canvas-Confetti.
- **Database:** PostgreSQL ready (dengan skema relasional lengkap di `backend/src/db/schema.sql`) dan otomatis fallback ke Node.js SQLite (`backend/data/grasshopper.db`) untuk kemudahan pengujian lokal tanpa konfigurasi awal.
- **Validasi:** Zod validator.
- **Testing:** Vitest (16/16 Unit & Integration Tests lulus).

---

## Struktur Folder Proyek

```
grashopper/
├── backend/
│   ├── data/                   # File database SQLite lokal (zero-config)
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/        # matchController, publicController
│   │   ├── db/                 # database.ts (dual driver PG & SQLite), schema.sql, seed.ts
│   │   ├── routes/             # matchRoutes, publicRoutes
│   │   ├── services/           # matchService, timerService, rankingService, auditService
│   │   ├── sockets/            # socketHandler (Socket.IO event & tick synchronization)
│   │   ├── types/              # TypeScript interfaces (Match, MatchTeam, Checkpoint, etc.)
│   │   └── server.ts           # Entry point Express + HTTP + Socket.IO server
│   ├── tests/                  # Unit & integration test suites
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Header, Sidebar, TimerGeneral, TeamCard, MatchQuickEdit,
│   │   │                       # AuditTimeline, GrasshopperLogo, Modals (Select, Edit, Confirm)
│   │   ├── hooks/              # useTimer (high-precision interpolation without drift)
│   │   ├── pages/              # OperatorPanel, PublicScoreboard, HistoryPage, SettingsPage
│   │   ├── services/           # api.ts (REST client), socket.ts (Socket.IO client)
│   │   ├── types/              # Frontend types definition
│   │   ├── App.tsx             # Main routing & layout controller
│   │   ├── main.tsx
│   │   └── index.css           # Tailwind directives & cyber theme stylings
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── README.md                   # Dokumentasi instalasi dan operasional lengkap
└── package.json                # Root scripts untuk dev & testing
```

---

## Fitur Utama yang Telah Diimplementasikan

### 1. Sinkronisasi Timer Monotonik Server
- Timer dihitung berdasarkan state server (`timer_start_time`, `accumulated_active_ms`, `total_pause_ms`).
- Tidak bergantung pada `setInterval` browser untuk akurasi mutlak.
- Refresh browser atau reconnect jaringan otomatis menyinkronkan waktu server tanpa lonjakan atau reset ke nol.
- Mendukung status: `READY`, `RUNNING`, `PAUSED`, `TIMEOUT`, `COMPLETED`, `VERIFIED`.
- Batas durasi maksimal dapat diatur (default `02:00.00`). Jika durasi habis saat berjalan, backend secara otomatis memicu timeout dan menandai tim yang belum selesai sebagai `Tidak Finish`.

### 2. Validasi & Urutan Checkpoint Ketat
- Lintasan memiliki 4 checkpoint: `CP 1`, `CP 2`, `CP 3`, dan `FINISH` (CP 4).
- Urutan mutlak: CP 2 tidak dapat dicatat sebelum CP 1, CP 3 sebelum CP 2, dan FINISH sebelum CP 3.
- Idempotensi: Pencegahan request ganda (double-click atau duplikasi jaringan) dengan database constraints.
- Waktu dicatat secara otomatis oleh backend saat tombol ditekan dalam presisi `MM:SS.cc`.

### 3. Mesin Penentuan Peringkat Otomatis (4 Tingkat Prioritas)
1. **Prioritas 1 (Status Finish):** Tim yang mencapai garis Finish berada di atas tim yang tidak Finish. Di antara sesama tim Finish, diurutkan berdasarkan waktu Finish tercepat.
2. **Prioritas 2 (Checkpoint Terjauh):** Tim yang tidak Finish diurutkan berdasarkan CP terjauh yang berhasil dilewati (CP 3 > CP 2 > CP 1 > Belum Mulai).
3. **Prioritas 3 (Waktu Pencapaian):** Jika dua tim mencapai CP terjauh yang sama, waktu tercepat mencapai CP tersebut yang lebih unggul.
4. **Tie-Break:** Jika status, CP terjauh, dan waktu pembanding identik, sistem memberikan peringkat sama dengan status `SERI`.
5. **Fastest Per Checkpoint:** Sistem secara independen menghitung tim tercepat di setiap kolom CP dan menyematkan ikon Mahkota Emas 👑 serta teks hijau di Public Scoreboard.

### 4. Pergantian Pertandingan Cepat (*Quick Match Switching*)
- Tombol **"Pertandingan Berikutnya >"** di Arena Kontrol memungkinkan perpindahan langsung ke sesi berikutnya (`GH-013` setelah `GH-012`) tanpa berpindah halaman.
- Snapshot tim dan catatan pertandingan lama tersimpan permanen dan terisolasi.
- Terdapat konfirmasi pengaman agar sesi yang sedang berjalan tidak sengaja terputus atau tertimpa.

### 5. Riwayat Pertandingan & Audit Log
- Arsip riwayat seluruh pertandingan di `/history`.
- Pencarian berdasarkan nomor pertandingan, nama sesi, atau nama tim.
- Filter babak (Penyisihan, Perempat Final, Semifinal, Final) dan filter status.
- Fitur **Ekspor CSV** dan **Cetak Hasil (Print)**.
- Audit trail mencatat setiap perubahan informasi, start, jeda, lanjut, pencatatan waktu, hingga pengesahan juri.

---

## Panduan Menjalankan Aplikasi

### Persyaratan Lingkungan
- **Node.js:** Versi 18+ (Direkomendasikan v20 atau v24)
- **NPM:** v9+

### Menjalankan Backend
1. Masuk ke direktori `backend`:
   ```bash
   cd backend
   ```
2. Jalankan mode pengembangan:
   ```bash
   npm run dev
   ```
   *Atau jalankan versi build:*
   ```bash
   npm run build
   npm start
   ```
   Backend akan berjalan di: `http://localhost:3001` (dengan database SQLite otomatis terinisialisasi dan di-seed dengan data demonstrasi GH-010, GH-011, dan GH-012).

### Menjalankan Frontend
1. Buka terminal baru dan masuk ke direktori `frontend`:
   ```bash
   cd frontend
   ```
2. Jalankan Vite development server:
   ```bash
   npm run dev
   ```
   Frontend akan berjalan di: `http://localhost:5173`

---

## URL Akses Aplikasi

- **Arena Kontrol Operator:** [http://localhost:5173/](http://localhost:5173/)
- **Layar Publik Papan Skor:** [http://localhost:5173/public](http://localhost:5173/public)
- **Riwayat Pertandingan:** [http://localhost:5173/history](http://localhost:5173/history)

---

## Menghubungkan ke PostgreSQL (Opsional)

Jika ingin menggunakan PostgreSQL alih-alih SQLite lokal:
1. Buat database di PostgreSQL, misal `grasshopper_db`.
2. Edit file `backend/.env` dan tentukan nilai `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/grasshopper_db
   ```
3. Skema tabel di `backend/src/db/schema.sql` akan otomatis diterapkan saat server pertama kali dijalankan.

---

## Menjalankan Pengujian Otomatis

Untuk menjalankan seluruh rangkaian pengujian unit dan integrasi:
```bash
cd backend
npm test
```
Seluruh 16 skenario pengujian akan dieksekusi melalui Vitest.

