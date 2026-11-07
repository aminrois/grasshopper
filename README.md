# Papan Skor Digital Robotik Grasshopper Competition

Sistem papan skor digital operasional dan real-time untuk mengelola pertandingan robotik **Grasshopper Competition** yang diikuti oleh empat tim secara simultan dengan lintasan 4 checkpoint, integrasi timer presisi server, papan peringkat otomatis, shortcut keyboard untuk operator, klasemen turnamen bertingkat (32 Besar hingga Final), dan reset data terproteksi PIN.

---

## Daftar Isi
1. [Fitur Utama](#fitur-utama)
2. [Shortcut Keyboard Operator](#shortcut-keyboard-operator)
3. [Arsitektur & Tumpukan Teknologi](#arsitektur--tumpukan-teknologi)
4. [Struktur Folder Proyek](#struktur-folder-proyek)
5. [Panduan Instalasi di Komputer Lain](#panduan-instalasi-di-komputer-lain)
   - [Prasyarat Sistem](#1-prasyarat-sistem)
   - [Langkah 1: Clone Repository](#2-langkah-1-clone-repository)
   - [Langkah 2: Install Dependencies](#3-langkah-2-install-dependencies)
   - [Langkah 3: Konfigurasi Environment (Opsional)](#4-langkah-3-konfigurasi-environment-opsional)
   - [Langkah 4: Menjalankan Aplikasi](#5-langkah-4-menjalankan-aplikasi)
   - [Langkah 5: Akses di Browser](#6-langkah-5-akses-di-browser)
6. [Akses Jaringan LAN / WiFi (Multi-Device)](#akses-jaringan-lan--wifi-multi-device)
7. [Reset Pabrik & Data Baru (PIN 1234)](#reset-pabrik--data-baru-pin-1234)
8. [Pengujian Otomatis (Testing)](#pengujian-otomatis-testing)
9. [Build Production untuk Hari Pertandingan](#build-production-untuk-hari-pertandingan)

---

## Fitur Utama

### 1. Sinkronisasi Timer Monotonik Server
- Timer dihitung murni di sisi backend server (`timer_start_time`, `accumulated_active_ms`, `total_pause_ms`).
- Tidak bergantung pada timer internal browser, sehingga kebal terhadap lag atau drift.
- Refresh halaman browser atau koneksi terputus tidak akan mengganggu timer yang sedang berjalan.
- Mendukung status pertandingan: `READY`, `RUNNING`, `PAUSED`, `TIMEOUT`, `COMPLETED`, `VERIFIED`.
- Auto-timeout otomatis saat mencapai batas waktu maksimal (default 120 detik / 02:00.00).

### 2. Validasi & Urutan Checkpoint Ketat
- Lintasan memiliki 4 checkpoint bertahap: **CP 1**, **CP 2**, **CP 3**, dan **FINISH (CP 4)**.
- Backend memvalidasi urutan checkpoint secara ketat (CP 2 harus setelah CP 1, dst.).
- Dilengkapi proteksi tombol ganda (*debounce / idempotency*).

### 3. Shortcut Keyboard Cepat untuk Operator
Operator dapat mencatat dan membatalkan checkpoint dengan tombol keyboard tanpa perlu mengarahkan kursor mouse:
- **Pencatatan Checkpoint:**
  - 🔴 **Tim Merah:** Tekan `Z`
  - 🔵 **Tim Biru:** Tekan `V`
  - 🟢 **Tim Hijau:** Tekan `M`
  - 🟡 **Tim Kuning:** Tekan `/` (Slash)
- **Pembatalan Checkpoint Terakhir (*Undo/Cancel*):**
  - 🔴 **Batal Merah:** Tekan `Q`
  - 🔵 **Batal Biru:** Tekan `R`
  - 🟢 **Batal Hijau:** Tekan `U`
  - 🟡 **Batal Kuning:** Tekan `P`
- Dilengkapi indikator badge shortcut pada kartu tim, animasi kilas (*visual flash*), dan notifikasi konfirmasi.

### 4. Klasemen Tim Tercepat & Babak Turnamen
- Mendukung struktur kompetisi bertahap:
  - **Babak 32 Besar**
  - **Babak 16 Besar**
  - **Babak 8 Besar**
  - **Semifinal**
  - **Perebutan Juara 3 & 4**
  - **Final**
- Mesin klasemen menghitung ranking berdasarkan:
  1. *Status Finish* (Finish > Belum Finish)
  2. *Waktu Finish Tercepat*
  3. *Checkpoint Terjauh yang berhasil dilewati*
  4. *Waktu tercepat mencapai Checkpoint terjauh*
- Menampilkan status kualifikasi otomatis (Lolos ke 16 Besar, Top 8, Top 4, serta Juara 1 🥇, Juara 2 🥈, Juara 3 🥉, Juara 4 🎖️).
- **Halaman Klasemen (`/standings`):** Podium Top 4, tab filter per babak, pencarian tim/sekolah, ekspor CSV, dan cetak hasil.
- **Tampilan Publik Layar Penuh (`/public`):** Tombol switcher di header (`[🔴 SCOREBOARD]` / `[🏆 KLASEMEN]`) untuk kemudahan operator proyektor/TV.

### 5. Pergantian Pertandingan Cepat (*Quick Match Switching*)
- Tombol navigasi **"Pertandingan Berikutnya >"** dan **"< Sebelumnya"** di panel operator untuk berpindah pertandingan secara instan.
- Modal pemilih pertandingan lengkap dengan filter babak dan status.

### 6. Riwayat & Audit Log
- Arsip riwayat seluruh pertandingan di `/history`.
- Pencatatan log terperinci dari setiap aksi (start timer, pause, catat CP, pembatalan CP, hingga pengesahan juri).
- Fitur ekspor CSV dan cetak laporan resmi pertandingan.

### 7. Reset Pabrik (*Factory Reset*) Terproteksi PIN
- Tombol **"Reset Semua Data Pertandingan"** di menu Pengaturan (`/settings`).
- Dilindungi konfirmasi **PIN: `1234`** guna mencegah terhapusnya data secara tidak sengaja.
- Mengosongkan data dan menginisialisasi sesi baru `GH-001` (Babak 32 Besar - status READY).

---

## Shortcut Keyboard Operator

| Tim | Warna | Tombol Catat Checkpoint | Tombol Batalkan Checkpoint (Undo) |
|---|---|:---:|:---:|
| **Tim 1** | 🔴 Merah | <kbd>Z</kbd> | <kbd>Q</kbd> |
| **Tim 2** | 🔵 Biru | <kbd>V</kbd> | <kbd>R</kbd> |
| **Tim 3** | 🟢 Hijau | <kbd>M</kbd> | <kbd>U</kbd> |
| **Tim 4** | 🟡 Kuning | <kbd>/</kbd> | <kbd>P</kbd> |

> *Catatan: Tombol shortcut aktif secara otomatis saat berada di layar Arena Kontrol (`/operator` atau `/`) dan timer sedang berjalan (`RUNNING`). Shortcut dinonaktifkan otomatis saat pengguna sedang mengetik di form input atau modal.*

---

## Arsitektur & Tumpukan Teknologi

- **Backend:** Node.js (v18+ / v20+ / v22+), Express, TypeScript, Socket.IO.
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Canvas-Confetti.
- **Database:** 
  - **SQLite (Bawaan / Default):** Menggunakan driver `node:sqlite` bawaan Node.js tanpa perlu kompilasi dependensi native C++ (*zero-config*). File tersimpan di `backend/data/grasshopper.db`.
  - **PostgreSQL (Opsional):** Siap digunakan untuk lingkungan multi-server dengan mengonfigurasi variabel `DATABASE_URL` di `backend/.env`.
- **Testing:** Vitest (20/20 skenario Unit & Integration Tests lulus).

---

## Struktur Folder Proyek

```
grasshopper/
├── backend/
│   ├── data/                   # File database SQLite (dibuat otomatis)
│   ├── src/
│   │   ├── config/             # Konfigurasi aplikasi & database
│   │   ├── controllers/        # matchController, publicController
│   │   ├── db/                 # database.ts (dual driver PG & SQLite), schema.sql, seed.ts
│   │   ├── routes/             # matchRoutes, publicRoutes
│   │   ├── services/           # matchService, timerService, rankingService, standingsService, auditService
│   │   ├── sockets/            # socketHandler (Sinkronisasi timer & event real-time)
│   │   ├── types/              # TypeScript types & interfaces
│   │   └── server.ts           # Entry point Express & Socket.IO server
│   ├── tests/                  # Test suite (timer, ranking, standings, reset, integration)
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Header, Sidebar, TeamCard, TimerGeneral, MatchQuickEdit, Modals
│   │   ├── hooks/              # useTimer (interpolasi timer presisi tinggi tanpa drift)
│   │   ├── pages/              # OperatorPanel, PublicScoreboard, StandingsPage, HistoryPage, SettingsPage
│   │   ├── services/           # api.ts (REST client), socket.ts (Socket.IO client)
│   │   ├── types/              # Definisi interface frontend
│   │   ├── App.tsx             # Routing & navigasi aplikasi
│   │   ├── main.tsx            # Entry point React Vite
│   │   └── index.css           # Styling Tailwind CSS
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── package.json                # Script runner terpadu
└── README.md                   # Panduan dokumentasi lengkap
```

---

## Panduan Instalasi di Komputer Lain

Panduan ini berlaku untuk komputer bersistem operasi **Windows**, **macOS**, maupun **Linux**.

### 1. Prasyarat Sistem
Pastikan perangkat lunak berikut telah terpasang di komputer baru:
1. **Node.js**: Versi **18.x**, **20.x**, atau **22.x** (Direkomendasikan Node.js v20 LTS atau v22 LTS).
   - Unduh dari: [https://nodejs.org/](https://nodejs.org/)
   - Cek versi melalui terminal / command prompt:
     ```bash
     node -v
     npm -v
     ```
2. **Git**:
   - Unduh dari: [https://git-scm.com/](https://git-scm.com/)
   - Cek versi melalui terminal:
     ```bash
     git --version
     ```
3. **Web Browser Modern**: Google Chrome, Mozilla Firefox, Microsoft Edge, atau Safari.

---

### 2. Langkah 1: Clone Repository
Buka Terminal (Linux/macOS) atau Command Prompt / PowerShell (Windows), lalu clone repository:

```bash
git clone https://github.com/aminrois/grasshopper.git
cd grasshopper
```

---

### 3. Langkah 2: Install Dependencies
Jalankan perintah instalasi dependensi untuk backend dan frontend:

#### Opsi Otomatis (Dari direktori root):
```bash
npm run install:all
```

#### Opsi Manual (Jika ingin satu per satu):
1. Install backend:
   ```bash
   cd backend
   npm install
   ```
2. Install frontend:
   ```bash
   cd ../frontend
   npm install
   cd ..
   ```

---

### 4. Langkah 3: Konfigurasi Environment (Opsional)
Aplikasi sudah siap dijalankan langsung (*zero-config*) menggunakan database SQLite otomatis.

Jika ingin menyesuaikan konfigurasi, salin contoh file `.env`:
- **Di Windows (PowerShell):**
  ```powershell
  Copy-Item backend/.env.example backend/.env
  ```
- **Di Linux / macOS / Git Bash:**
  ```bash
  cp backend/.env.example backend/.env
  ```

*Isi default file `.env`:*
```env
PORT=3001
CORS_ORIGIN=http://localhost:5173
# DATABASE_URL=postgresql://user:password@localhost:5432/grasshopper_db (Kosongkan jika menggunakan SQLite bawaan)
```

---

### 5. Langkah 4: Menjalankan Aplikasi
Buka **dua jendela terminal** untuk menjalankan backend dan frontend secara bersamaan.

#### Terminal 1 (Menjalankan Backend):
```bash
cd backend
npm run dev
```
> Backend akan berjalan di: **`http://localhost:3001`**  
> Database SQLite (`backend/data/grasshopper.db`) akan diinisialisasi dan diisi dengan data awal turnamen secara otomatis.

#### Terminal 2 (Menjalankan Frontend):
```bash
cd frontend
npm run dev
```
> Frontend akan berjalan di: **`http://localhost:5173`**

---

### 6. Langkah 5: Akses di Browser
Buka browser pada komputer dan akses alamat berikut:

| Antarmuka | URL | Keterangan |
|---|---|---|
| **Arena Kontrol Operator** | [http://localhost:5173/](http://localhost:5173/) atau `/operator` | Panel kontrol timer, pencatatan checkpoint, verifikasi juri |
| **Papan Skor Publik** | [http://localhost:5173/public](http://localhost:5173/public) | Tampilan layar penuh 16:9 untuk proyektor/TV penonton |
| **Klasemen Tim Tercepat** | [http://localhost:5173/standings](http://localhost:5173/standings) | Leaderboard ranking tercepat babak 32, 16, 8, s/d Final |
| **Riwayat Pertandingan** | [http://localhost:5173/history](http://localhost:5173/history) | Rekap arsip hasil, cetak laporan, dan unduh CSV |
| **Pengaturan Sistem** | [http://localhost:5173/settings](http://localhost:5173/settings) | Konfigurasi durasi timer & Reset Semua Data Turnamen |

---

## Akses Jaringan LAN / WiFi (Multi-Device)

Untuk penggunaan hari pertandingan (misalnya: Operator menggunakan Laptop 1, Proyektor dihubungkan ke Laptop 2 / Smart TV, dan Juri memantau dari Tablet):

1. Pastikan seluruh perangkat terhubung pada **satu jaringan WiFi atau router LAN yang sama**.
2. Cari alamat IP lokal komputer server (komputer tempat backend dan frontend berjalan):
   - **Windows:** Buka CMD/PowerShell, ketik `ipconfig` (lihat bagian *IPv4 Address*, misal: `192.168.1.50`).
   - **Linux / macOS:** Buka Terminal, ketik `ip a` atau `ifconfig` (misal: `192.168.1.50`).
3. Jalankan frontend dengan mode expose host:
   ```bash
   cd frontend
   npm run dev -- --host
   ```
4. Perangkat lain di jaringan dapat mengakses melalui IP tersebut:
   - **Layar TV / Proyektor:** `http://192.168.1.50:5173/public`
   - **Layar Leaderboard:** `http://192.168.1.50:5173/standings`
   - **Operator:** `http://192.168.1.50:5173/`

---

## Reset Pabrik & Data Baru (PIN 1234)

Jika Anda ingin memulai turnamen baru dari awal:
1. Masuk ke menu **Pengaturan** di [http://localhost:5173/settings](http://localhost:5173/settings).
2. Gulir ke bagian **"Zona Berbahaya (Danger Zone)"**.
3. Klik tombol merah **"Reset Semua Data Pertandingan"**.
4. Masukkan **PIN Konfirmasi: `1234`**.
5. Klik **"Konfirmasi Reset"**.
6. Sistem akan:
   - Menghapus seluruh riwayat pertandingan, checkpoint, dan audit log lama.
   - Menginisialisasi sesi awal: **`GH-001` (Babak 32 Besar - Sesi 1)** dalam status `READY`.
   - Menyetel pertandingan aktif ke `GH-001`.

---

## Pengujian Otomatis (Testing)

Proyek ini dilengkapi pengujian unit dan integrasi komprehensif menggunakan **Vitest** untuk memvalidasi:
- Perhitungan dan drift timer server
- Validasi urutan checkpoint dan idempotensi
- Mesin klasemen ranking 4 prioritas
- Fitur pembatalan checkpoint (*undo*)
- Fitur reset turnamen dengan proteksi PIN 1234

Untuk menjalankan pengujian:
```bash
cd backend
npm test
```
*Hasil pengujian: 20/20 test suites lulus.*

---

## Build Production untuk Hari Pertandingan

Jika menginginkan performa maksimal dan stabilitas tanpa hot-reloading dev server saat hari kompetisi:

1. **Build Backend:**
   ```bash
   cd backend
   npm run build
   npm start
   ```

2. **Build Frontend:**
   ```bash
   cd frontend
   npm run build
   npm run preview -- --host --port 5173
   ```

---

## Lisensi & Kontributor
Dikembangkan untuk penyelenggaraan **Grasshopper Competition Robotic Tournament**.
Repository resmi: [https://github.com/aminrois/grasshopper](https://github.com/aminrois/grasshopper)
