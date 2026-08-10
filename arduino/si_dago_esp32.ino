// ============================================================
// SISTEM MONITORING GORONG-GORONG (SI DAGO) - ANTI ANOMALI
// ESP32 Arduino IDE
// Sinkron dengan server.js versi 3-sensor BAHAYA SEJATI
// ============================================================

#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid       = "realme 8i";
const char* password   = "123456789";
const char* serverName = "http://10.99.35.105:3000/api/data";

const int trigPin = 5;
const int echoPin = 18;
const int rainPin = 34;
const int irPin   = 15;

const float tinggiGorong = 20.0; // cm — kapasitas gorong-gorong

// ============================================================
// KALIBRASI RAINDROP
// Langkah:
// 1. Jalankan sensor dalam kondisi KERING
// 2. Lihat nilai "RAW RAIN" di Serial Monitor
// 3. Set BATAS_KERING sedikit di BAWAH nilai kering itu
//    Contoh: kering terbaca ~3100 → set BATAS_KERING = 2900
//
// Selaraskan dengan server.js: kondisiHujan "Hujan Lebat"
// adalah trigger BAHAYA SEJATI (bersama air >= 15cm + sampah).
// ============================================================
const int BATAS_KERING = 3500; // <-- sesuaikan setelah lihat nilai raw
const int BATAS_SEDANG = 2500; // <-- sesuaikan juga kalau perlu

// ============================================================
// DEBOUNCE SAMPAH IR (berbasis jumlah deteksi berturut-turut)
// Wajib terdeteksi SAMPAH_THRESHOLD_COUNT kali berturut-turut
// sebelum dianggap benar-benar tersumbat.
// @2 detik/loop: 15x = ~30 detik, konsisten dengan server.
// ============================================================
const int SAMPAH_THRESHOLD_COUNT = 15;
int  irDetectCount    = 0;
bool adaSampahFiltered = false;

// ============================================================
// MOVING AVERAGE ULTRASONIK (5 sampel per pembacaan)
// Menghilangkan outlier pantulan dari benda lewat/pantulan semu.
// ============================================================
float readUltrasonicSmooth() {
  float total  = 0;
  int   samples = 5;
  for (int i = 0; i < samples; i++) {
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    // Timeout 30ms = jarak max ~51cm (cukup untuk gorong-gorong 20cm)
    long dur = pulseIn(echoPin, HIGH, 30000);
    if (dur == 0) dur = (long)(tinggiGorong / 0.01715); // fallback: anggap penuh
    total += (dur * 0.0343) / 2.0;
    delay(20);
  }
  return total / samples;
}

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(rainPin, INPUT);
  pinMode(irPin,   INPUT);

  Serial.begin(9600);
  Serial.println("\n=== SI DAGO ESP32 AKTIF ===");
  Serial.printf("BAHAYA SEJATI Server: Air >= 15cm + Hujan Lebat + Sampah\n");
  Serial.printf("Cooldown notif server: 30 detik (percobaan)\n\n");

  WiFi.begin(ssid, password);
  Serial.print("Menghubungkan WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
}

void loop() {
  // ----------------------------------------------------------
  // 1. KETINGGIAN AIR (Moving Average Ultrasonik 5 Sampel)
  // ----------------------------------------------------------
  float jarakSensor    = readUltrasonicSmooth();
  float ketinggianAir  = tinggiGorong - jarakSensor;
  if (ketinggianAir < 0)            ketinggianAir = 0;
  if (ketinggianAir > tinggiGorong) ketinggianAir = tinggiGorong;

  // ----------------------------------------------------------
  // 2. SAMPAH IR FC-51 (Debounce Count 15x berturut-turut)
  // LOW = objek terdeteksi (sensor aktif saat ada hambatan)
  // ----------------------------------------------------------
  bool rawIR = (digitalRead(irPin) == LOW);
  if (rawIR) {
    irDetectCount++;
    if (irDetectCount >= SAMPAH_THRESHOLD_COUNT) {
      adaSampahFiltered = true;
      irDetectCount     = SAMPAH_THRESHOLD_COUNT; // clamp
    }
  } else {
    irDetectCount     = 0;
    adaSampahFiltered = false;
  }

  // ----------------------------------------------------------
  // 3. KONDISI HUJAN (Raindrop Analog)
  // Server isBahayaSejati() mengenali: "Hujan Lebat" dan "Badai Hujan"
  // Pastikan string match persis (case-insensitive di server)
  // ----------------------------------------------------------
  int    rainAnalog   = analogRead(rainPin);
  String kondisiHujan = (rainAnalog >= BATAS_KERING) ? "Cerah"        :
                        (rainAnalog >= BATAS_SEDANG)  ? "Hujan Sedang" : "Hujan Lebat";

  // DEBUG: hapus atau wrap #ifdef DEBUG setelah kalibrasi selesai
  Serial.printf("RAW RAIN: %d -> %s\n", rainAnalog, kondisiHujan.c_str());

  // ----------------------------------------------------------
  // 4. DEBUG RINGKAS KE SERIAL
  // ----------------------------------------------------------
  Serial.printf("Air: %.1fcm | Hujan: %s | Sampah: %s (count:%d/%d)\n",
                ketinggianAir,
                kondisiHujan.c_str(),
                adaSampahFiltered ? "YA" : "TIDAK",
                irDetectCount,
                SAMPAH_THRESHOLD_COUNT);

  // Peringatan lokal jika mendekati BAHAYA SEJATI
  if (ketinggianAir >= 15.0 && adaSampahFiltered) {
    Serial.println(">>> MENDEKATI BAHAYA SEJATI -- tunggu Hujan Lebat untuk trigger server!");
  }

  // ----------------------------------------------------------
  // 5. KIRIM JSON KE SERVER
  // Server yang menentukan status & kapan notif Telegram dikirim.
  // ----------------------------------------------------------
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.setTimeout(2000);
    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"tinggiAir\":"     + String(ketinggianAir, 1) +
                     ",\"kondisiHujan\":\"" + kondisiHujan +
                     "\",\"adaSampah\":"   + (adaSampahFiltered ? "true" : "false") + "}";

    int httpCode = http.POST(payload);
    if (httpCode > 0) {
      Serial.printf("[HTTP %d] Data terkirim ke server.\n", httpCode);
    } else {
      Serial.printf("[HTTP ERR] Gagal kirim: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  } else {
    Serial.println("[WiFi] Koneksi terputus, mencoba reconnect...");
    WiFi.reconnect();
  }

  delay(2000); // Interval kirim 2 detik (15 loop = 30 detik = threshold BAHAYA server)
}
