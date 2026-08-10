const express = require('express');
const http = require('http');
const https = require('https'); // Built-in, no extra dep needed
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// ============================================================
// KONFIGURASI TELEGRAM BOT
// ============================================================
const TELEGRAM_BOT_TOKEN = '8993013005:AAGsQP1UAy5W-_XUvUH5NQPh-Rlwa4UuqHw';
const TELEGRAM_CHAT_ID   = '7745145566';

/**
 * Kirim pesan ke Telegram menggunakan Bot API.
 * Menggunakan https bawaan Node.js — tidak butuh library tambahan.
 * @param {string} text - Teks pesan (mendukung Markdown)
 */
function kirimTelegram(text) {
    const body = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'Markdown'
    });

    const options = {
        hostname: 'api.telegram.org',
        path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const parsed = JSON.parse(data);
            if (parsed.ok) {
                console.log('✅ Telegram terkirim ke Chat ID:', TELEGRAM_CHAT_ID);
            } else {
                console.error('❌ Telegram gagal:', parsed.description);
            }
        });
    });

    req.on('error', (err) => {
        console.error('❌ Telegram request error:', err.message);
    });

    req.write(body);
    req.end();
}

/**
 * Susun dan kirim pesan peringatan Telegram berformat rapi.
 */
function kirimTelegramPeringatan(tinggiAir, kondisiHujan, adaSampah, status) {
    const statusEmoji = status === 'bahaya' ? '🔴' : '🟡';
    const statusText  = status === 'bahaya' ? 'BAHAYA' : 'WASPADA';
    const sampahText  = adaSampah ? '🗑️ *Tersumbat Sampah!*' : '✅ Lancar / Bersih';
    const himbauan    = status === 'bahaya'
        ? '🚨 Segera amankan barang berharga & evakuasi warga bantaran rendah!'
        : '⚠️ Pantau perkembangan. Bersihkan gorong-gorong jika ada tumpukan sampah.';

    const pesan = `${statusEmoji} *[SI DAGO] PERINGATAN ${statusText}*

📍 *Lokasi:* Selokan Pasar Mawar (Jl. Merdeka)
💧 *Ketinggian Air:* ${tinggiAir.toFixed(1)} cm
🌧️ *Kondisi Hujan:* ${kondisiHujan}
🗑️ *Gorong-gorong:* ${adaSampah ? 'Tersumbat Sampah!' : 'Lancar / Bersih'}

${himbauan}

_Pesan otomatis dari Server SI DAGO Kota Bogor • ${new Date().toLocaleTimeString('id-ID')} WIB_`;

    console.log(`📲 Mengirim peringatan Telegram: Status ${statusText}`);
    kirimTelegram(pesan);
}

// ============================================================
// VARIABEL KONTROL ANTI-SPAM NOTIFIKASI
// ============================================================
let lastNotifStatus   = "aman";
let lastNotifSentTime = 0;
const NOTIF_COOLDOWN  = 5 * 60 * 1000; // 5 menit cooldown antar notifikasi
// Skor Risiko 0 - 100 sesuai Proposal BIA 2026 (Gambar 2.1 Flowchart):
// 0 - 44   : AMAN
// 45 - 75  : WASPADA
// 76 - 100 : BAHAYA
function calculateRiskScore(tinggiAir, adaSampah, kondisiHujan) {
    let score = Math.round((tinggiAir / 20.0) * 70); // Ketinggian air (max 20cm) kontribusi max 70 poin
    if (adaSampah) score += 20;                     // Penyumbatan sampah (infrared FC-51) +20 poin
    if (kondisiHujan && kondisiHujan.toLowerCase() !== 'cerah') score += 10; // Hujan +10 poin
    return Math.min(Math.max(score, 0), 100);
}

function getStatus(tinggiAir, adaSampah, kondisiHujan) {
    const score = calculateRiskScore(tinggiAir, adaSampah, kondisiHujan);
    if (score >= 76) return "bahaya";
    if (score >= 45) return "waspada";
    return "aman";
}

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json());                              // Parse JSON body (misal: ESP32 ArduinoJson)
app.use(express.urlencoded({ extended: true }));      // Parse form-data body (misal: ESP32 HTTPClient tanpa JSON)
app.use(express.static(path.join(__dirname, '/')));   // Serve file statis (index.html, css, js)

// ============================================================
// STATE SENSOR TERAKHIR
// ============================================================
let currentData = {
    tinggiAir:    0,
    kondisiHujan: "Cerah",
    adaSampah:    false,
    timestamp:    new Date().toISOString()
};

// ============================================================
// API: TERIMA DATA DARI IoT (ESP32)
// POST /api/data
// Body (JSON atau form-data):
//   tinggiAir   — number (cm), wajib
//   kondisiHujan — string, opsional (default: "Cerah")
//   adaSampah   — boolean/string/number, opsional (default: false)
// ============================================================
app.post('/api/data', (req, res) => {
    console.log('--- 📡 Data Masuk dari IoT ---');
    console.log('Body:', req.body);

    const { tinggiAir, kondisiHujan, adaSampah } = req.body;

    if (tinggiAir === undefined || tinggiAir === null || tinggiAir === '') {
        console.log('❌ Format data salah: field tinggiAir tidak ditemukan.');
        return res.status(400).json({ success: false, message: "Field 'tinggiAir' wajib diisi." });
    }

    const parsedTinggi  = parseFloat(tinggiAir);
    const parsedHujan   = kondisiHujan || "Cerah";
    const parsedSampah  = adaSampah === true || adaSampah === "true" || adaSampah === 1 || adaSampah === "1";

    if (isNaN(parsedTinggi)) {
        console.log('❌ Format data salah: tinggiAir bukan angka.');
        return res.status(400).json({ success: false, message: "Field 'tinggiAir' harus berupa angka." });
    }

    // Simpan data terbaru
    currentData = {
        tinggiAir:    parsedTinggi,
        kondisiHujan: parsedHujan,
        adaSampah:    parsedSampah,
        timestamp:    new Date().toISOString()
    };

    // Broadcast ke semua dashboard yang terbuka via WebSocket
    io.emit('sensor_update', currentData);
    console.log(`✅ Data diproses & disiarkan: Air=${parsedTinggi}cm | Hujan=${parsedHujan} | Sampah=${parsedSampah}`);

    // Evaluasi status & kirim notifikasi Telegram jika perlu
    const currentStatus = getStatus(parsedTinggi, parsedSampah, parsedHujan);
    const timeNow = Date.now();

    if (currentStatus !== "aman") {
        // Kirim Telegram jika: status berubah LEBIH BURUK, atau cooldown sudah lewat
        const statusMemburuk = currentStatus !== lastNotifStatus;
        const cooldownLewat  = (timeNow - lastNotifSentTime) > NOTIF_COOLDOWN;

        if (statusMemburuk || cooldownLewat) {
            kirimTelegramPeringatan(parsedTinggi, parsedHujan, parsedSampah, currentStatus);
            lastNotifStatus   = currentStatus;
            lastNotifSentTime = timeNow;
        } else {
            console.log(`ℹ️ Notifikasi Telegram ditahan (cooldown: ${Math.round((NOTIF_COOLDOWN - (timeNow - lastNotifSentTime)) / 1000)}s lagi)`);
        }
    } else {
        // Reset agar notifikasi langsung terkirim saat bahaya berikutnya
        lastNotifStatus = "aman";
    }

    return res.status(200).json({
        success: true,
        status: currentStatus,
        message: "Data diterima, disiarkan ke dashboard, dan dievaluasi."
    });
});

// ============================================================
// API: CEK DATA SENSOR TERBARU (GET)
// GET /api/data — berguna untuk debug / ESP32 cek koneksi
// ============================================================
app.get('/api/data', (req, res) => {
    res.json(currentData);
});

// ============================================================
// API: TEST TELEGRAM MANUAL (GET)
// GET /api/test-telegram — klik di browser untuk tes notifikasi
// ============================================================
app.get('/api/test-telegram', (req, res) => {
    const level = req.query.level || 'waspada'; // ?level=bahaya atau ?level=waspada
    kirimTelegramPeringatan(
        level === 'bahaya' ? 17.5 : 11.2,
        'Hujan Lebat',
        level === 'bahaya',
        level
    );
    res.json({ success: true, message: `Test notifikasi Telegram (${level}) dikirim!` });
});

// ============================================================
// SOCKET.IO: HANDLE KONEKSI DASHBOARD
// ============================================================
io.on('connection', (socket) => {
    console.log('🖥️  Browser/Dashboard terhubung');
    // Kirim data sensor terakhir ke dashboard yang baru buka
    socket.emit('sensor_update', currentData);

    socket.on('disconnect', () => {
        console.log('🔌 Browser/Dashboard terputus');
    });
});

// ============================================================
// JALANKAN SERVER
// ============================================================
const PORT = process.env.PORT || 3000;

function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push({ name, address: iface.address });
            }
        }
    }
    return ips;
}

server.listen(PORT, '0.0.0.0', () => {
    const localIPs = getLocalIPs();
    console.log('=========================================');
    console.log(`🚀 SI DAGO Server berjalan di Port ${PORT}`);
    console.log('=========================================');
    console.log(`🌐 Dashboard: http://localhost:${PORT}`);
    console.log(`📲 Test Telegram: http://localhost:${PORT}/api/test-telegram`);
    console.log(`📲 Test Bahaya:   http://localhost:${PORT}/api/test-telegram?level=bahaya`);
    console.log('📡 URL API untuk ESP32 (POST /api/data):');
    if (localIPs.length === 0) {
        console.log(`   👉 http://localhost:${PORT}/api/data`);
    } else {
        localIPs.forEach(ip => {
            console.log(`   👉 (${ip.name}): http://${ip.address}:${PORT}/api/data`);
        });
    }
    console.log('(Pastikan ESP32 & laptop terhubung ke WiFi yang sama)');
    console.log('=========================================');
});
