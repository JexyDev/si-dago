# 🏆 MATERI PRESENTASI LENGKAP SI DAGO (BOGOR INNOVATION AWARDS 2026)

---

## 📌 CARA MENGGUNAKAN PRESENTASI

1. **Presentasi Langsung di Browser (Rekomendasi Utama):**
   - Buka browser dan akses URL: **`http://localhost:3000/docs/presentasi.html`**
   - Tekan tombol **Panah Kanan (➡️)** atau **Panah Kiri (⬅️)** pada keyboard untuk berpindah slide.
   - Di bagian bawah layar terdapat **Catatan Presenter (Speaker Script)** untuk memandu kalimat yang harus diucapkan saat presentasi di hadapan juri.

2. **Ekspor ke Microsoft PowerPoint / Google Slides (.PPTX):**
   - Buka PowerPoint -> *New Presentation*.
   - Salin judul dan poin-poin dari dokumen materi di bawah ini ke slide PowerPoint Anda.

---

# 📑 STRUKTUR & NASKAH PRESENTASI (22 SLIDE SINKRON DETIL)

---

### **SLIDE 1: Title Slide (Pembuka Utama)**
- **Judul Slide:** SI DAGO: Sistem Cerdas Peringatan Dini Banjir Drainase Kota berbasis IoT
- **Sub-judul:** Integrasi Real-time IoT ESP32, Multi-Factor Scoring Algorithm, Node.js WebSocket Engine, dan Push Notification Telegram Instant 24 Jam.
- **Badge:** 🏆 BOGOR INNOVATION AWARDS 2026 • SMK WIKRAMA BOGOR
- **Poin Kunci:**
  1. *IoT Edge Sensing:* 3 Sensor Terintegrasi (Ultrasonik HC-SR04, Hujan YL-83, Sampah FC-51).
  2. *Realtime Sync Engine:* Server Node.js Express + WebSocket Socket.IO tanpa refresh browser.
  3. *Telegram Alert System:* Push notification langsung via Telegram Bot API dengan filter anti-spam.
- **🗣️ Naskah Presenter (Kalimat Ucap):**
  > *"Selamat pagi/siang Bapak/Ibu Dewan Juri Bogor Innovation Awards 2026. Kami dari SMK Wikrama Bogor bangga mempersembahkan SI DAGO — Sistem Deteksi Air Gorong-Gorong. SI DAGO adalah solusi mitigasi berbasis IoT dan web realtime yang dirancang khusus untuk memproteksi warga dari luapan selokan dan gorong-gorong tersumbat."*

---

### **SLIDE 2: Latar Belakang & Permasalahan**
- **Judul Slide:** Ancaman Banjir Lokal & Genangan Gorong-gorong Kota Bogor
- **Poin Masalah Utama:**
  - **Curah Hujan Tinggi:** Topografi Kota Bogor memicu genangan air mendadak dalam waktu 15–30 menit.
  - **Penyumbatan Sampah:** Gorong-gorong tersumbat sampah plastik/ranting tanpa diketahui warga.
  - **Alat Monitoring Mahal:** Stasiun hidrologi komersial berharga puluhan juta, sulit dijangkau level RT/RW.
  - **Keterlambatan Peringatan:** Informasi banjir sering terlambat sampai ke warga terdampak.
- **Poin Solusi SI DAGO:**
  - **Swadaya & Terjangkau:** Perangkat IoT hemat biaya (Biaya komponen Rp 349.000) untuk RT/RW.
  - **Trisensor Sensing:** Deteksi kombinasi ketinggian air + curah hujan + sampah penyumbat.
  - **Inklusif via Telegram:** Warga tidak perlu install aplikasi baru, cukup terima pesan Telegram.
- **🗣️ Naskah Presenter:**
  > *"Kota Bogor dikenal sebagai Kota Hujan. Masalah utama yang sering kita hadapi bukan hanya banjir kiriman sungai besar, tetapi luapan selokan lokal yang tersumbat sampah secara mendadak. Alat pemantau banjir komersial harganya puluhan juta. SI DAGO hadir sebagai solusi swadaya murah berbiaya Rp 349 ribu per unit yang bisa dipasang di setiap RT/RW."*

---

### **SLIDE 3: Arsitektur Global End-to-End**
- **Judul Slide:** Alur Data End-to-End SI DAGO (Hardware to Citizen)
- **Flow 4 Langkah:**
  1. **Langkah 1 (ESP32 IoT Node):** Membaca 3 sensor setiap 2 detik. Mengaplikasikan filter debounce anomaly di sisi edge.
  2. **Langkah 2 (REST API Ingestion):** Payload JSON dikirim via WiFi ke endpoint Express `/api/data`.
  3. **Langkah 3 (Engine & Scoring):** Server menghitung Skor Risiko (0-100) & mengevaluasi kriteria Bahaya 30 detik.
  4. **Langkah 4 (Broadcast & Push):** Socket.IO menyiarkan UI live. Telegram Bot API mengirim notifikasi darurat.
- **🗣️ Naskah Presenter:**
  > *"Bapak/Ibu Juri, berikut adalah alur kerja sinkron SI DAGO: Dimulai dari sensor di lapangan yang dibaca oleh ESP32, dikirim via REST API HTTP POST ke server Node.js, diolah menggunakan algoritma multi-faktor, lalu disiarkan secara detik itu juga ke website via WebSocket dan dikirim ke Telegram warga."*

---

### **SLIDE 4: Mikrokontroler ESP32**
- **Judul Slide:** Mikrokontroler ESP32: Otak Utama Edge Device
- **Spesifikasi Teknis:**
  - Dual-Core 32-bit Tensilica LX6 (240 MHz).
  - Built-in WiFi 802.11 b/g/n & Bluetooth 4.2 BLE.
  - 520 KB SRAM + 4MB External Flash.
- **Wiring & Pinout:**
  - Trigger HC-SR04 -> GPIO 5 | Echo -> GPIO 18
  - Rain Sensor YL-83 -> GPIO 34 (ADC)
  - Infrared FC-51 -> GPIO 19
- **🗣️ Naskah Presenter:**
  > *"Untuk hardware, kami menggunakan mikrokontroler ESP32. Pemilihan ESP32 didasari oleh kecepatan prosesor dual-core 240 MHz dan adanya modul WiFi terintegrasi sehingga perangkat dapat langsung terhubung ke jaringan tanpa perlu modul tambahan."*

---

### **SLIDE 5: Trisensor Detection System**
- **Judul Slide:** Trisensor Detection System
- **Rincian Sensor:**
  1. **HC-SR04 Ultrasonik:** Mengukur jarak ketinggian air selokan (0–20 cm) presisi hingga 0.3 cm.
  2. **YL-83 Rain Sensor:** Mendeteksi tetesan air hujan dengan pcb konduktif & komparator LM393.
  3. **FC-51 Infrared Obstacle:** Mendeteksi adanya sampah/daun penyumbat gorong-gorong.
- **🗣️ Naskah Presenter:**
  > *"Alat ini dibekali 3 sensor sekaligus: Ultrasonik HC-SR04 untuk mengukur tinggi air, YL-83 untuk memantau hujan, dan Infrared FC-51 untuk mendeteksi penumpukan sampah di gorong-gorong. Tiga variabel inilah yang menentukan tingkat bahaya banjir secara akurat."*

---

### **SLIDE 6: Filter Anomaly & Debounce Sisi ESP32**
- **Judul Slide:** Filter Anomaly & Debounce Sisi ESP32
- **Masalah:** Percikan air mendadak atau sampah lewat bisa memicu lonjakan bacaan palsu (*spike noise*).
- **Solusi Kode (C++):** ESP32 mengambil 5 sampel pembacaan ultrasonik cepat (delay 20ms), mengabaikan pembacaan di luar ambang wajar, lalu mengambil nilai rata-rata (*moving average*).
- **🗣️ Naskah Presenter:**
  > *"Di lapangan sering terjadi kecipratan air atau objek melintas yang membuat sensor salah baca. Karena itu, kami menanamkan algoritma debounce filtering di C++ ESP32 yang merata-ratakan 5 sampel pembacaan sehingga data yang dikirim ke server dijamin bersih dari noise."*

---

### **SLIDE 7: Konektivitas HTTP POST & Payload JSON**
- **Judul Slide:** Konektivitas HTTP POST & Skema Data JSON
- **Metode Komunikasi:** HTTP POST JSON via WiFi ke `http://[SERVER_IP]:3000/api/data`.
- **Payload Schema:**
  ```json
  {
    "tinggiAir": 12.5,
    "kondisiHujan": "Gerimis",
    "adaSampah": true,
    "daerah": "Bogor Timur",
    "lokasi": "SMK Wikrama"
  }
  ```
- **🗣️ Naskah Presenter:**
  > *"Data dari ESP32 dikemas dalam format baku JSON berisi tinggi air, kondisi hujan, dan status sampah. Format ini memudahkan interoperabilitas jika diintegrasikan dengan aplikasi Smart City Kota Bogor di masa depan."*

---

### **SLIDE 8: Node.js Express Server**
- **Judul Slide:** Node.js Express Server: Core Processing Unit
- **Fitur Utama:**
  - Non-blocking I/O event loop menangani banyak request simultan.
  - Auto Port Fallback: Jika port 3000 terpakai, otomatis berpindah ke port 3001.
  - Static file server menyajikan web dashboard.
- **🗣️ Naskah Presenter:**
  > *"Backend SI DAGO dibangun di atas Node.js dan Express.js. Server ini dilengkapi fitur Auto Port Fallback sehingga jika port 3000 sedang terpakai aplikasi lain, server otomatis menyesuaikan diri tanpa crash."*

---

### **SLIDE 9: Algoritma Skor Risiko Multi-Faktor (0–100)**
- **Judul Slide:** Algoritma Skor Risiko Multi-Faktor (0–100)
- **Rumus Akumulasi:**
  $$\text{Skor} = \text{Math.round}\left(\frac{\text{tinggiAir}}{20.0} \times 70\right) + (\text{adaSampah} ? 20 : 0) + (\text{kondisiHujan} \neq \text{'Cerah'} ? 10 : 0)$$
- **Kategori Status:**
  - 🟢 **0 – 44 (AMAN):** Selokan lancar.
  - 🟡 **45 – 75 (WASPADA):** Mulai ada genangan/hujan/sampah.
  - 🔴 **76 – 100 (BAHAYA):** Air meluap & berpotensi banjir lokal!
- **🗣️ Naskah Presenter:**
  > *"Server menghitung Skor Risiko dari 0 sampai 100 sesuai Proposal BIA 2026. Ketinggian air menyumbang maksimal 70 poin, penyumbatan sampah 20 poin, dan faktor hujan 10 poin. Hasil skor ini dikelompokkan menjadi status Aman, Waspada, atau Bahaya."*

---

### **SLIDE 10: Logika Persistensi 30 Detik & Anti-Spam Telegram**
- **Judul Slide:** Logika Persistensi 30 Detik & Anti-Spam Telegram
- **Fitur Persistensi 30 Detik:** Peringatan BAHAYA HANYA dikirim jika status BAHAYA bertahan berturut-turut selama **15 sampel data (30 detik)**. Jika dalam 30 detik air turun kembali, alert dibatalkan.
- **Cooldown 5 Menit:** Menghindari pengiriman pesan berulang yang mengganggu HP warga.
- **🗣️ Naskah Presenter:**
  > *"Ini adalah salah satu keunggulan terbesar SI DAGO. Agar tidak terjadi peringatan palsu, status BAHAYA wajib bertahan berturut-turut selama 30 detik (15 sampel pembacaan). Selain itu ada Cooldown 5 menit anti-spam agar HP warga tidak dibombardir notifikasi."*

---

### **SLIDE 11: Socket.IO WebSocket Engine**
- **Judul Slide:** Socket.IO WebSocket: Sinkronisasi Live Tanpa Refresh
- **Mekanisme:** Menggunakan protokol duplex WebSocket. Begitu data baru masuk ke API `/api/data`, server memancarkan event `sensor_update` ke seluruh klien web.
- **🗣️ Naskah Presenter:**
  > *"Dashboard SI DAGO menggunakan WebSocket Socket.IO. Artinya, begitu ketinggian air di selokan berubah 1 milimeter saja, tampilan angka dan grafik di layar laptop/HP warga langsung berubah detik itu juga tanpa perlu menekan tombol refresh."*

---

### **SLIDE 12: Telegram Bot API Dispatcher**
- **Judul Slide:** Telegram Bot API: Peringatan Dini Instan di HP Warga
- **Mengapa Telegram:** Gratis, ringan, hemat kuota, tidak perlu install aplikasi rumit tambahan.
- **Fitur Pesan Bot:**
  - Menyebutkan Lokasi Spesifik (misal: Drainase SMK Wikrama).
  - Pembacaan Tinggi Air & Kondisi Hujan.
  - Rekomendasi tindakan warga (Evakuasi / Gotong Royong).
- **🗣️ Naskah Presenter:**
  > *"Untuk pengiriman peringatan, kami memanfaatkan Telegram Bot API. Pesan peringatan yang dikirim memuat lokasi presisi, data tinggi air, dan himbauan langkah evakuasi sehingga warga bisa merespons dengan cepat."*

---

### **SLIDE 13: Desain UI/UX & Accessibility**
- **Judul Slide:** Desain UI/UX Web SI DAGO: Kontras Tinggi & Accessibility
- **Elemen Desain:**
  - Palet Warna Khas Bogor: Biru Navy (`#0F2937`), Emas (`#D97706`), Krem Latar.
  - Tipografi Modern: Outfit & Plus Jakarta Sans.
  - Desain Kontras Tinggi: Tulisan berukuran besar dan jelas untuk kemudahan lansia.
- **🗣️ Naskah Presenter:**
  > *"Tampilan website dirancang ramah pengguna dan ramah lansia. Kami menggunakan palet warna kontras tinggi dengan font berukuran besar agar status bencana mudah dibaca oleh siapapun dalam situasi darurat."*

---

### **SLIDE 14: Breakdown Halaman Beranda (`index.html`)**
- **Fitur Kunci:** Top Status Bar live, Hero Section BIA 2026, Live Sensor Metrics Bar (4 kartu indikator), dan 3 Key Feature Cards.
- **🗣️ Naskah Presenter:**
  > *"Halaman Beranda index.html dirancang sebagai pusat ringkasan. Di bagian paling atas terdapat bar status live, diikuti oleh 4 indikator utama yang langsung menampilkan angka pembacaan sensor terkini."*

---

### **SLIDE 15: Breakdown Dashboard Live (`pantau.html`)**
- **Fitur Kunci:** Grafik real-time Chart.js dengan garis ambang batas (Annotation Lines) WASPADA 10cm dan BAHAYA 15cm, gauge indikator, & tombol simulasi data.
- **🗣️ Naskah Presenter:**
  > *"Halaman Pantau Sekarang pantau.html memuat grafik tren ketinggian air interaktif berbasis Chart.js. Kami menambahkan garis merah putus-putus sebagai indikator batas bahaya sehingga tren kenaikan air dapat diprediksi dengan mudah."*

---

### **SLIDE 16: Breakdown Peta GIS (`peta.html`)**
- **Fitur Kunci:** Peta interaktif Leaflet.js dengan koordinat titik sensor Kota Bogor, marker kustom beranimasi pulse sesuai status warna.
- **🗣️ Naskah Presenter:**
  > *"Halaman Peta Selokan peta.html memanfaatkan pustaka Leaflet.js untuk memetakan lokasi fisik sensor di Kota Bogor. Marker pada peta akan menyala hijau, kuning, atau merah secara dinamis sesuai kondisi di lapangan."*

---

### **SLIDE 17: Breakdown Laporan Data (`laporan.html`)**
- **Fitur Kunci:** Tabel telemetri historis, filter periode (Harian, Mingguan, Bulanan, Tahunan), filter daerah/status, & fitur ekspor data CSV/Excel/PDF.
- **🗣️ Naskah Presenter:**
  > *"Halaman Laporan Data laporan.html berfungsi untuk transparansi dan analisis historis. Pengurus RT/RW atau dinas terkait dapat memfilter data dan mengunduh laporan dalam format Excel, CSV, atau PDF."*

---

### **SLIDE 18: Breakdown Halaman Pendukung (`notifikasi.html`, `cara-kerja.html`, `tentang.html`)**
- **Fitur Kunci:** Form pendaftaran Telegram 3 langkah di `notifikasi.html`, penjelasan edukasi fisik sensor di `cara-kerja.html`, & profil tim Wikrama di `tentang.html`.
- **🗣️ Naskah Presenter:**
  > *"Tiga halaman pendukung lainnya menyediakan panduan cara menghubungkan Telegram HP warga, edukasi prinsip kerja sains alat, serta profil tim pembuat dari SMK Wikrama Bogor."*

---

### **SLIDE 19: Rincian Biaya Perangkat IoT (Bill of Materials)**
- **Total Biaya Hardware:** **Rp 349.000**
  - ESP32 Development Board: Rp 75.000
  - Sensor Ultrasonik HC-SR04: Rp 25.000
  - Sensor Hujan YL-83: Rp 20.000
  - Sensor Infrared FC-51: Rp 15.000
  - Box Panel Waterproof & Cable: Rp 114.000
  - Power Supply Adapter 5V/2A: Rp 100.000
- **🗣️ Naskah Presenter:**
  > *"Bapak/Ibu Juri, total biaya pembuatan 1 unit perangkat IoT SI DAGO lengkap hanya Rp 349 ribu. Angka ini sangat ekonomis sehingga sangat layak untuk direplikasi secara massal di ratusan titik rawan banjir Kota Bogor."*

---

### **SLIDE 20: Dampak Sosial & Dukungan Bogor Smart City**
- **Manfaat:** Mitigasi risiko bencana banjir, meningkatkan kesadaran kebersihan gotong royong warga, dan mendukung arsitektur Bogor Smart City via API terbuka.
- **🗣️ Naskah Presenter:**
  > *"SI DAGO tidak hanya berdampak pada pencegahan banjir, tetapi juga membangun budaya gotong-royong warga untuk membersihkan sampah gorong-gorong sekaligus mendukung visi Bogor Smart City."*

---

### **SLIDE 21: Panduan Demonstrasi Langsung (Live Demo Playbook)**
- **Langkah Simulasi:**
  1. *Skenario Normal:* Air 3.0 cm -> UI Hijau AMAN.
  2. *Skenario Waspada:* Air 11.2 cm + Hujan -> UI Kuning WASPADA.
  3. *Skenario Bahaya:* Air 17.5 cm + Sampah -> UI Merah BAHAYA + Telegram mendenting!
- **🗣️ Naskah Presenter:**
  > *"Sekarang mari kita lakukan pembuktian langsung. Ketika data sensor kami ubah menjadi status BAHAYA, tampilan web akan seketika berkedip merah dan notifikasi Telegram langsung masuk di HP dalam waktu kurang dari 2 detik!"*

---

### **SLIDE 22: Penutup & Sesi Tanya Jawab (Q&A)**
- **Kalimat Penutup:** SI DAGO — "Sistem Deteksi Air Gorong-Gorong, Bogor Tangguh Bencana."
- **🗣️ Naskah Presenter:**
  > *"Sekian presentasi dari kami. SI DAGO siap menjadi solusi nyata pertahanan banjir Kota Bogor. Terima kasih atas perhatian Bapak/Ibu Dewan Juri, kami siap memasuki sesi tanya jawab."*
