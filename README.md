# SI DAGO Dashboard & Local Server

Ini adalah website dashboard untuk memonitoring sistem peringatan dini banjir (SI DAGO). Sistem ini dibangun menggunakan HTML, CSS (Vanilla Glassmorphism Theme), Javascript, dan Node.js sebagai jembatan (API) agar bisa menerima data langsung dari IoT / ESP32 (di laptop teman kamu) dan menampilkannya secara realtime di dashboard ini.

## Persiapan & Instalasi

1. Pastikan di laptop kamu sudah terinstall **Node.js**.
2. Buka terminal (Command Prompt / VS Code Terminal) di dalam folder `hydrosense` ini.
3. (Tadi sudah otomatis diinstall) namun jika belum, ketik perintah ini untuk install library:
   ```bash
   npm install
   ```

## Cara Menjalankan

1. Jalankan server dari terminal:
   ```bash
   npm start
   ```
2. Server akan aktif di port 3000.
3. Buka browser di laptop kamu dan ketik alamat:
   **`http://localhost:3000`**

Di tahap ini, kamu akan melihat UI Website dengan status "Terhubung ke Server" namun data masih di angka 0.

## Cara Konfigurasi Agar "Nyambung" dengan Laptop Teman (IoT / ESP32)

Agar perangkat atau kode di laptop teman kamu bisa mengirimkan data debit dan ketinggian air ke dashboard kamu, ikuti langkah-langkah ini:

1. **Satu Jaringan WiFi**: Pastikan **laptop kamu** dan **laptop teman / ESP32-nya** terkoneksi ke WiFi atau Hotspot yang **sama**.
2. **Ketahui IP Laptop Kamu**: Alamat IP laptop kamu saat ini adalah **`10.174.79.217`** (berdasarkan WiFi yang terhubung).
3. **Konfigurasi di Laptop Teman**: 
   Minta teman kamu untuk mengubah kode pengiriman datanya (bisa di Python, Arduino IDE/ESP32, atau software lainnya) untuk melakukan **HTTP POST Request** ke alamat URL ini:
   
   ```text
   http://10.174.79.217:3000/api/data
   ```

4. **Format Data yang Harus Dikirim (JSON)**:
   Teman kamu harus mengirim data dengan format JSON yang memuat `tinggiAir` (ketinggian air dalam cm), `kondisiHujan` (misal: "Cerah", "Gerimis", "Hujan Lebat"), dan `adaSampah` (boolean `true` atau `false`). Contoh format body JSON:
   ```json
   {
       "tinggiAir": 45.5,
       "kondisiHujan": "Gerimis",
       "adaSampah": false
   }
   ```

### Contoh Kode ESP32 (Arduino C++) untuk Teman Kamu:
Jika teman kamu menggunakan ESP32, berikan referensi baris kode HTTP POST ini:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "NAMA_WIFI";
const char* password = "PASSWORD_WIFI";
const char* serverName = "http://10.174.79.217:3000/api/data";

// ... (setup wifi) ...

void sendData(float tinggi_air, String kondisi_hujan, bool ada_sampah) {
  if(WiFi.status() == WL_CONNECTED){
    HTTPClient http;
    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");

    // Membuat JSON dengan format yang benar
    String jsonData = "{\"tinggiAir\":" + String(tinggi_air) + 
                      ",\"kondisiHujan\":\"" + kondisi_hujan + "\"" + 
                      ",\"adaSampah\":" + (ada_sampah ? "true" : "false") + "}";
    
    // Kirim POST
    int httpResponseCode = http.POST(jsonData);
    
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    http.end();
  }
}
```

Begitu data dikirim, layar website di laptop kamu akan otomatis beranimasi dan angkanya berubah tanpa perlu di-refresh!
