# 📘 DOKUMENTASI MASTER PROJEK SI DAGO (FLOW, FITUR & ARSITEKTUR LENGKAP)

Dokumen ini berisi rangkuman komprehensif seluruh alur kerja (*flow*), arsitektur teknis, logika algoritma, penjelasan fitur halaman web, serta poin-poin penjelas untuk presentasi secara umum (bebas dari format slide).

---

## 1. RINGKASAN EXECUTIVE (EXECUTIVE SUMMARY)

**SI DAGO (Sistem Monitoring Selokan Cekatan Kota Bogor)** adalah sistem peringatan dini (*early warning system*) bencana banjir berbasis IoT (*Internet of Things*) dan Web Realtime. Sistem ini dikembangkan oleh pelajar PPLG SMK Wikrama Bogor untuk mengikuti ajang **Bogor Innovation Awards 2026**.

Sistem ini memantau kondisi selokan/drainase secara **24 jam non-stop** dengan mendeteksi 3 parameter fisik:
1. **Ketinggian Air** (cm) via Sensor Ultrasonik HC-SR04.
2. **Kondisi Hujan** (Cerah/Gerimis/Hujan Lebat) via Sensor YL-83.
3. **Penyumbatan Sampah** di mulut gorong-gorong via Sensor Infrared FC-51.

---

## 2. ARSITEKTUR & FLOW DATA END-TO-END (ALUR SISTEM SINKRON)

Seluruh komponen dalam sistem SI DAGO bekerja secara terintegrasi dan real-time tanpa *delay* manual. Berikut adalah alur pergerakan data dari lapangan hingga ke layar warga:

```
[ HARDWARE SENSOR ]
 ├─ HC-SR04 (Tinggi Air)
 ├─ YL-83 (Sensor Hujan)
 └─ FC-51 (Infrared Sampah)
        │ (Setiap 2-5 Detik + Debounce Filtering)
        ▼
[ ESP32 MIKROKONTROLER ]
        │ (Kirim HTTP POST Request JSON via WiFi)
        ▼
[ BACKEND NODE.JS EXPRESS SERVER ] ── (Port 3000 / Auto-Fallback)
        ├─ 1. Hitung Skor Risiko (0 - 100) & Tentukan Status (Aman/Waspada/Bahaya)
        ├─ 2. Evaluasi Persistensi 30 Detik (15 Sampel Berturut-turut)
        ├─ 3. Simpan ke Telemetry History (Database In-Memory)
        │
        ├─────────────────────────────────────────┐
        ▼                                         ▼
[ SOCKET.IO WEBSOCKET ENGINE ]        [ TELEGRAM BOT API DISPATCHER ]
        │                                         │
        │ (Broadcast Event 'sensor_update')       │ (Kirim Push Notification Instant)
        ▼                                         ▼
[ DASHBOARD FRONTEND WEB ]             [ HP WARGA & KELURAHAN ]
 ├─ Beranda (index.html)                └─ Notifikasi Telegram Darurat
 ├─ Pantau Live (pantau.html)
 ├─ Peta GIS (peta.html)
 └─ Laporan Data (laporan.html)
```

### Tahapan Detail Alur Data:
1. **Sensing & Edge Processing (ESP32):** Perangkat IoT membaca ketiga sensor, melakukan penyaringan nilai ekstrem (*moving average*), lalu membentuk struktur data JSON.
2. **Ingestion via REST API (Node.js):** Data dikirim melalui koneksi WiFi menggunakan protokol HTTP POST ke endpoint `/api/data`.
3. **Akumulasi Scoring & Filtering (Server):** Server menghitung skor risiko dari 0 hingga 100. Jika kondisi masuk kategori **BAHAYA**, server menjalankan verifikasi ketahanan status selama 30 detik (15 sampel pembacaan berturut-turut).
4. **Broadcasting Realtime (Socket.IO):** Server memancarkan data terbaru ke seluruh browser yang sedang membuka web SI DAGO tanpa perlu me-refresh halaman.
5. **Dispatching Telegram (Push Notification):** Jika kriteria verifikasi terpenuhi, server memanggil API Telegram untuk mengirim pesan peringatan darurat ke HP warga.

---

## 3. SUBSISTEM HARDWARE & SENSOR IOT (ESP32)

### Perangkat Utama & Wiring:
- **Mikrokontroler:** ESP32 Tensilica LX6 Dual-Core 240 MHz (WiFi & Bluetooth bawaan).
- **Sensor Ultrasonik HC-SR04:**
  - Pin: `Trigger -> GPIO 5`, `Echo -> GPIO 18`.
  - Fungsi: Mengukur jarak dari sensor ke permukaan air (resolusi hingga 0.3 cm).
- **Sensor Hujan YL-83:**
  - Pin: `Analog Output -> GPIO 34 (ADC)`.
  - Fungsi: Mendeteksi tetesan air hujan di area drainase.
- **Sensor Infrared FC-51:**
  - Pin: `Digital Output -> GPIO 19`.
  - Fungsi: Mendeteksi adanya objek tumpukan sampah/daun yang menyumbat saluran.

### Anomaly Debounce Filter (Sisi ESP32):
Untuk mencegah *false alarm* akibat kecipratan air mendadak atau daun melintas singkat, ESP32 mengambil 5 kali sampel pembacaan ultrasonik secara cepat, mengabaikan angka pembacaan di luar batas wajar (0–100 cm), lalu mengirimkan nilai rata-ratanya ke server.

---

## 4. SUBSISTEM SERVER BACKEND & ALGORITMA

### Express.js & Auto Port Fallback:
Server berjalan di Node.js menggunakan kerangka kerja Express. Server dilengkapi fitur **Auto Port Fallback** (mencoba Port 3000, jika terpakai akan otomatis mencoba Port 3001, 3002, dst.) sehingga aman dari kegagalan *port collision*.

### Algoritma Skor Risiko Multi-Faktor (0 - 100):
Server menghitung Skor Risiko berdasarkan kombinasi 3 parameter sesuai ketentuan Proposal BIA 2026:

$$\text{Skor} = \text{Math.round}\left(\frac{\text{tinggiAir}}{20.0} \times 70\right) + (\text{adaSampah} ? 20 : 0) + (\text{kondisiHujan} \neq \text{'Cerah'} ? 10 : 0)$$

- **Ketinggian Air (Max 70 poin):** Nilai air 0–20 cm dikonversikan secara proporsional.
- **Penyumbatan Sampah (20 poin):** Ditambahkan jika sensor IR memvalidasi adanya tumpukan sampah.
- **Kondisi Hujan (10 poin):** Ditambahkan jika cuaca sedang gerimis atau hujan.

### Pengelompokan Status Bencana:
- 🟢 **0 – 44 (AMAN):** Ketinggian air normal, aliran selokan lancar.
- 🟡 **45 – 75 (WASPADA):** Terdapat kenaikan air / hujan / sampah yang memicu perhatian.
- 🔴 **76 – 100 (BAHAYA):** Air berada di tingkat kritis dan berpotensi meluap.

### Logika Persistensi 30 Detik & Cooldown Anti-Spam:
- **Verifikasi 30 Detik (15 Sampel):** Status **BAHAYA** dari sensor wajib bertahan berturut-turut selama 15 kali pembacaan (setiap 2 detik = 30 detik total) sebelum pesan Telegram dikirim. Jika di detik ke-10 air mendadak turun, hitungan di-reset. Hal ini menjamin 100% bebas dari peringatan palsu.
- **Cooldown 5 Menit:** Setelah pesan Telegram terkirim, sistem menahan notifikasi berikutnya selama 5 menit agar HP warga tidak terganggu banjir spam pesan.

---

## 5. PENJELASAN FITUR TIAP HALAMAN WEB

Sistem web SI DAGO terdiri dari 7 halaman interaktif dengan fungsi yang saling melengkapi:

### A. Halaman Beranda (`index.html`)
- **Top Status Bar:** Banner indikator status keamanan selokan Kota Bogor yang selalu melayang di posisi atas layar.
- **Hero Status Pill:** Tampilan status utama (AMAN / WASPADA / BAHAYA) berukuran besar dan dinamis.
- **Live Sensor Metrics Bar:** 4 kartu ringkas yang menampilkan pembacaan live (Tinggi Air, Hujan, Status Gorong-Gorong, dan Status Server WebSocket).
- **3 Key Features:** Penjelasan visual keunggulan alat (Trisensor presisi, Notifikasi Telegram, dan Biaya Swadaya Rp 349rb).

### B. Dashboard Pantau Live (`pantau.html`)
- **Grafik Interaktif Realtime (Chart.js):** Menampilkan pergerakan tren tinggi air secara real-time. Dilengkapi **Annotation Line** batas ambang batas WASPADA (10 cm) dan BAHAYA (15 cm).
- **Gauge Digital:** Menampilkan indikator angka meteran air dan status sensor dalam format visual kontras tinggi.
- **Panel Simulasi Data (Testing Control):** Tombol simulasi untuk menguji respon sistem (Simulasi Aman, Waspada, dan Bahaya) saat demonstrasi tanpa hardware.

### C. Peta GIS Selokan (`peta.html`)
- **Peta Interaktif Leaflet.js:** Menampilkan peta wilayah Kota Bogor beserta lokasi koordinat presisi titik sensor (misalnya: Drainase SMK Wikrama Jl. Raya Wangun).
- **Marker Pulse Dynamic:** Penanda pada peta dapat berkedip (*pulse*) sesuai warna status (Hijau = Aman, Kuning = Waspada, Merah = Bahaya).
- **Popup Detail:** Menampilkan rincian pembacaan air saat marker lokasi diklik.

### D. Laporan & Telemetri Historis (`laporan.html`)
- **Tabel Data Interaktif:** Menampilkan histori pencatatan data selokan per daerah di Kota Bogor.
- **Multi-Filtering System:** Filter berdasarkan periode waktu (Harian 24j, Mingguan 7h, Bulanan 30h, Tahunan 365h), filter kecamatan, dan filter status.
- **Fitur Ekspor Multi-Format:** Memungkinkan pengguna mengunduh data laporan ke dalam file **CSV, Excel (.xlsx), atau PDF**.

### E. Dapatkan Notifikasi Telegram (`notifikasi.html`)
- **Panduan 3 Langkah:** Langkah intuitif bagi warga untuk menghubungkan akun Telegram ke Bot `@SiDagoBogorOfficialBot`.
- **Tombol Uji Notifikasi:** Fitur untuk menguji pengiriman pesan Telegram secara langsung dari browser.

### F. Cara Kerja System (`cara-kerja.html`)
- Halaman edukasi publik yang menjelaskan prinsip kerja fisik sensor, pengolahan server, dan algoritma risiko menggunakan bahasa awam yang ramah warga dan lansia.

### G. Tentang Kami (`tentang.html`)
- Profil tim pengembang dari pelajar PPLG SMK Wikrama Bogor, latar belakang proyek, serta visi kontribusi untuk Bogor Smart City.

---

## 6. RINCIAN BIAYA PERANGKAT (BILL OF MATERIALS)

Untuk membuktikan keunggulan sebagai teknologi tepat guna yang terjangkau bagi tingkat RT/RW, berikut adalah rincian biaya komponen (*hardware BoM*):

| No | Komponen Hardware | Fungsi & Kegunaan | Estimasi Biaya |
| :---: | :--- | :--- | :---: |
| 1 | ESP32 Development Board | Mikrokontroler Utama & Modul WiFi | Rp 75.000 |
| 2 | Sensor Ultrasonik HC-SR04 | Mengukur Ketinggian Air | Rp 25.000 |
| 3 | Modul Sensor Hujan YL-83 | Mendeteksi Intensitas Hujan | Rp 20.000 |
| 4 | Modul Sensor Infrared FC-51 | Mendeteksi Penyumbatan Sampah | Rp 15.000 |
| 5 | Box Panel Outdoor Waterproof & Cable | Pelindung Cuaca & Pengkabelan | Rp 114.000 |
| 6 | Power Supply Adapter 5V/2A | Catu Daya Listrik Perangkat | Rp 100.000 |
| **TOTAL** | **Kebutuhan Biaya Per Unit** | **Siap Diterapkan di RT/RW** | **Rp 349.000** |

---

## 7. POIN-POIN NARASI UTAMA UNTUK PRESENTASI (MASTER TALKING POINTS)

Saat mempresentasikan projek ini di hadapan audiens atau penguji, fokuskan narasi pada 4 pilar berikut:

1. **Masalah Nyata Kota Bogor:** *"Banjir di Bogor sering kali terjadi di tingkat lokal akibat gorong-gorong yang tersumbat sampah plastik secara mendadak saat hujan deras."*
2. **Solusi Swadaya & Murah (Rp 349rb):** *"Alat pemantau banjir pemerintah harganya puluhan juta. SI DAGO dibuat swadaya seharga Rp 349 ribu per unit sehingga setiap kelurahan atau RT/RW sanggup membelinya."*
3. **Keandalan Algoritma Anti-Spam:** *"SI DAGO tidak akan memicu alarm palsu. Kami menerapkan algoritma skor risiko 0-100 dan verifikasi persistensi 30 detik sebelum pesan Telegram terkirim."*
4. **Pentingnya Notifikasi Telegram:** *"Warga tidak perlu repot men-download aplikasi baru. Begitu air selokan naik ke tingkat bahaya, pesan Telegram akan langsung mendenting di HP warga untuk instruksi evakuasi."*
