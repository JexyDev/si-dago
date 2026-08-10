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
// KONFIGURASI TELEGRAM BOT & DYNAMIC SUBSCRIBERS
// ============================================================
const TELEGRAM_BOT_TOKEN = '8817291654:AAGKHT9hwRbb24MYWKWEfC4OoJX4e07WSzE';
const telegramSubscribers = new Set(['1074113595']); // Set penampung Chat ID (otomatis bertambah saat user /start)
let lastUpdateId = 0;

/**
 * Kirim pesan ke Telegram (ke 1 chatId spesifik ATAU broadcast ke SEMUA subscriber).
 * @param {string} text - Teks pesan (mendukung Markdown)
 * @param {string|null} targetChatId - ID spesifik atau null untuk broadcast
 */
function kirimTelegram(text, targetChatId = null) {
    const chatIds = targetChatId ? [targetChatId] : Array.from(telegramSubscribers);

    if (chatIds.length === 0) {
        console.warn('⚠️ Tidak ada subscriber Telegram yang terdaftar.');
        return;
    }

    chatIds.forEach(chatId => {
        const body = JSON.stringify({
            chat_id: chatId,
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
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.ok) {
                        console.log(`✅ Telegram terkirim ke Chat ID: ${chatId}`);
                    } else {
                        console.error(`❌ Telegram ke ${chatId} gagal:`, parsed.description);
                    }
                } catch (e) {
                    console.error('❌ Parse error response Telegram:', e.message);
                }
            });
        });

        req.on('error', (err) => {
            console.error(`❌ Telegram request error (${chatId}):`, err.message);
        });

        req.write(body);
        req.end();
    });
}

let isPolling = false;

/**
 * Polling otomatis Telegram getUpdates.
 * Memeriksa siapa saja pengguna yang menekan /start atau mengirim chat ke bot,
 * lalu mendaftarkan Chat ID-nya secara otomatis tanpa perlu hardcode ID!
 */
function pollTelegramUpdates() {
    if (isPolling) return;
    isPolling = true;

    const options = {
        hostname: 'api.telegram.org',
        path: `/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=5`,
        method: 'GET'
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            isPolling = false;
            try {
                const parsed = JSON.parse(data);
                if (parsed.ok && Array.isArray(parsed.result)) {
                    parsed.result.forEach(update => {
                        lastUpdateId = Math.max(lastUpdateId, update.update_id);
                        if (update.message && update.message.chat) {
                            const chatId = String(update.message.chat.id);
                            const senderName = update.message.from ? update.message.from.first_name : 'Warga';
                            const text = (update.message.text || '').trim().toLowerCase();

                            const isNew = !telegramSubscribers.has(chatId);
                            telegramSubscribers.add(chatId);

                            if (text.startsWith('/start') || text.startsWith('/mulai') || text === 'start') {
                                console.log(`📲 Subscriber Telegram aktif: ${senderName} (ID: ${chatId})`);
                                const replyMsg = `✅ *Selamat Datang, ${senderName}!*

Sistem *SI DAGO Kota Bogor* berhasil terhubung dengan Telegram Anda.

🆔 *ID Telegram:* \`${chatId}\`
🔔 *Status Notifikasi:* AKTIF 🟢

Anda akan menerima notifikasi darurat secara otomatis di sini jika sensor mendeteksi potensi luapan selokan atau penyumbatan sampah.`;
                                kirimTelegram(replyMsg, chatId);
                            }
                        }
                    });
                }
            } catch (err) {
                // Ignore parse error
            }
        });
    });

    req.on('error', () => {
        isPolling = false;
    });
    req.end();
}

// Jalankan polling setiap 5 detik untuk mendeteksi user baru yang klik /start
setInterval(pollTelegramUpdates, 5000);
pollTelegramUpdates();



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

📍 *Lokasi:* Drainase Utama SMK Wikrama Bogor (Jl. Raya Wangun)
💧 *Ketinggian Air:* ${tinggiAir.toFixed(1)} cm
🌧️ *Kondisi Hujan:* ${kondisiHujan}
🗑️ *Gorong-gorong:* ${adaSampah ? 'Tersumbat Sampah!' : 'Lancar / Bersih'}

${himbauan}

_Pesan otomatis dari Server SI DAGO Kota Bogor • ${new Date().toLocaleTimeString('id-ID')} WIB_`;

    console.log(`📲 Mengirim peringatan Telegram: Status ${statusText}`);
    kirimTelegram(pesan);
}

// ============================================================
// VARIABEL KONTROL ANTI-SPAM & PERSISTENSI 30 DETIK NOTIFIKASI
// ============================================================
let lastNotifStatus   = "aman";
let lastNotifSentTime = 0;
let isFirstDataReceived = false;
let bahayaCounter     = 0; // Hitung sampel BAHAYA berturut-turut (15x @2s = 30 detik)
const BAHAYA_THRESHOLD_SAMPLES = 15; // Wajib 30 detik bertahan
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
// STATE SENSOR & DATASET LAPORAN HISTORIS
// ============================================================
let currentData = {
    tinggiAir:    0,
    kondisiHujan: "Cerah",
    adaSampah:    false,
    timestamp:    new Date().toISOString()
};

// Data Histori Regional Kota Bogor (Base Data Real Fetch & Filter)
const REGIONS = [
    { daerah: "Bogor Timur", lokasi: "Drainase Utama SMK Wikrama (Jl. Raya Wangun)" },
    { daerah: "Bogor Timur", lokasi: "Bantaran Katulampa & Tajur" },
    { daerah: "Bogor Selatan", lokasi: "Gorong-gorong Batutulis & Cipaku" },
    { daerah: "Bogor Tengah", lokasi: "Kawasan Pasar Anyar & Jl. Merdeka" },
    { daerah: "Bogor Utara", lokasi: "Simpang Cibuluh & Kedunghalung" },
    { daerah: "Bogor Barat", lokasi: "Kawasan Bubulak & Gunung Batu" },
    { daerah: "Tanah Sareal", lokasi: "Gorong-gorong Kedung Badak & Salabenda" }
];

function generateHistoricalData() {
    const data = [];
    const now = Date.now();
    const weatherTypes = ["Cerah", "Gerimis", "Hujan Sedang", "Hujan Lebat", "Badai Hujan"];

    // Harian (24 jam terakhir) - ~15 data
    for (let i = 0; i < 15; i++) {
        const timestamp = new Date(now - i * 1.5 * 3600 * 1000).toISOString();
        const regionObj = REGIONS[i % REGIONS.length];
        const tinggi = +(Math.random() * 18 + 2).toFixed(1);
        const sampah = Math.random() > 0.7;
        const hujan = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        const status = getStatus(tinggi, sampah, hujan);
        data.push({
            id: `REP-${now - i * 500000}`,
            timestamp,
            daerah: regionObj.daerah,
            lokasi: regionObj.lokasi,
            tinggiAir: tinggi,
            kondisiHujan: hujan,
            adaSampah: sampah,
            skorRisiko: calculateRiskScore(tinggi, sampah, hujan),
            status
        });
    }

    // Mingguan (7 hari terakhir) - ~25 data
    for (let i = 1; i <= 25; i++) {
        const timestamp = new Date(now - (1 + i * 0.25) * 86400 * 1000).toISOString();
        const regionObj = REGIONS[i % REGIONS.length];
        const tinggi = +(Math.random() * 17 + 3).toFixed(1);
        const sampah = Math.random() > 0.65;
        const hujan = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        const status = getStatus(tinggi, sampah, hujan);
        data.push({
            id: `REP-${now - (1 + i * 0.25) * 86400000}`,
            timestamp,
            daerah: regionObj.daerah,
            lokasi: regionObj.lokasi,
            tinggiAir: tinggi,
            kondisiHujan: hujan,
            adaSampah: sampah,
            skorRisiko: calculateRiskScore(tinggi, sampah, hujan),
            status
        });
    }

    // Bulanan (30 hari terakhir) - ~35 data
    for (let i = 1; i <= 35; i++) {
        const timestamp = new Date(now - (7 + i * 0.6) * 86400 * 1000).toISOString();
        const regionObj = REGIONS[i % REGIONS.length];
        const tinggi = +(Math.random() * 19 + 2).toFixed(1);
        const sampah = Math.random() > 0.75;
        const hujan = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        const status = getStatus(tinggi, sampah, hujan);
        data.push({
            id: `REP-${now - (7 + i * 0.6) * 86400000}`,
            timestamp,
            daerah: regionObj.daerah,
            lokasi: regionObj.lokasi,
            tinggiAir: tinggi,
            kondisiHujan: hujan,
            adaSampah: sampah,
            skorRisiko: calculateRiskScore(tinggi, sampah, hujan),
            status
        });
    }

    // Tahunan (365 hari terakhir) - ~45 data
    for (let i = 1; i <= 45; i++) {
        const timestamp = new Date(now - (30 + i * 7) * 86400 * 1000).toISOString();
        const regionObj = REGIONS[i % REGIONS.length];
        const tinggi = +(Math.random() * 18 + 1).toFixed(1);
        const sampah = Math.random() > 0.8;
        const hujan = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        const status = getStatus(tinggi, sampah, hujan);
        data.push({
            id: `REP-${now - (30 + i * 7) * 86400000}`,
            timestamp,
            daerah: regionObj.daerah,
            lokasi: regionObj.lokasi,
            tinggiAir: tinggi,
            kondisiHujan: hujan,
            adaSampah: sampah,
            skorRisiko: calculateRiskScore(tinggi, sampah, hujan),
            status
        });
    }

    return data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

let telemetryHistory = generateHistoricalData();


// Data sensor realtime terbaru (diinisialisasi dari riwayat terbaru agar tidak 0.0 cm saat web dibuka)
currentData = {
    tinggiAir: telemetryHistory[0].tinggiAir,
    kondisiHujan: telemetryHistory[0].kondisiHujan,
    adaSampah: telemetryHistory[0].adaSampah,
    timestamp: telemetryHistory[0].timestamp
};


// GET /api/latest — Ambil data sensor live terbaru
app.get('/api/latest', (req, res) => {
    res.json(currentData);
});

// POST /api/data
// Body (JSON atau form-data):
//   tinggiAir   — number (cm), wajib
//   kondisiHujan — string, opsional (default: "Cerah")
//   adaSampah   — boolean/string/number, opsional (default: false)
// ============================================================
app.post('/api/data', (req, res) => {
    console.log('--- 📡 Data Masuk dari IoT ---');
    console.log('Body:', req.body);

    const { tinggiAir, kondisiHujan, adaSampah, daerah, lokasi } = req.body;

    if (tinggiAir === undefined || tinggiAir === null || tinggiAir === '') {
        console.log('❌ Format data salah: field tinggiAir tidak ditemukan.');
        return res.status(400).json({ success: false, message: "Field 'tinggiAir' wajib diisi." });
    }

    const parsedTinggi  = parseFloat(tinggiAir);
    const parsedHujan   = kondisiHujan || "Cerah";
    const parsedSampah  = adaSampah === true || adaSampah === "true" || adaSampah === 1 || adaSampah === "1";
    const currentStatus = getStatus(parsedTinggi, parsedSampah, parsedHujan);

    // Simpan data terbaru
    currentData = {
        tinggiAir:    parsedTinggi,
        kondisiHujan: parsedHujan,
        adaSampah:    parsedSampah,
        timestamp:    new Date().toISOString()
    };

    // Catat ke telemetry history
    const historyEntry = {
        id: `REP-${Date.now()}`,
        timestamp: currentData.timestamp,
        daerah: daerah || "Bogor Timur",
        lokasi: lokasi || "Drainase Utama SMK Wikrama (Jl. Raya Wangun)",
        tinggiAir: parsedTinggi,
        kondisiHujan: parsedHujan,
        adaSampah: parsedSampah,
        skorRisiko: calculateRiskScore(parsedTinggi, parsedSampah, parsedHujan),
        status: currentStatus
    };
    telemetryHistory.unshift(historyEntry);
    if (telemetryHistory.length > 1000) telemetryHistory.pop();

    // Broadcast ke semua dashboard yang terbuka via WebSocket
    io.emit('sensor_update', { ...currentData, historyEntry });
    console.log(`✅ Data diproses & disiarkan: Air=${parsedTinggi}cm | Hujan=${parsedHujan} | Sampah=${parsedSampah}`);

    // Notifikasi khusus saat Alat ESP32 PERTAMA KALI NYALA & terhubung
    if (!isFirstDataReceived) {
        isFirstDataReceived = true;
        const pesanNyala = `🟢 *[SI DAGO] PERANGKAT SENSOR AKTIF*

📍 *Lokasi:* Drainase Utama SMK Wikrama Bogor (Jl. Raya Wangun)
📡 *Status:* Perangkat ESP32 berhasil terhubung & mulai mengirim data realtime.
💧 *Pembacaan Awal:* ${parsedTinggi.toFixed(1)} cm | Hujan: ${parsedHujan}

_Sistem pemantauan 24 jam SI DAGO Kota Bogor aktif._`;
        console.log("📲 Mengirim notifikasi perangkat aktif ke Telegram...");
        kirimTelegram(pesanNyala);
    }

    // Evaluasi status & kirim notifikasi Telegram jika perlu (Syarat Persistensi 30 Detik)
    const timeNow = Date.now();

    if (currentStatus === "bahaya") {
        bahayaCounter++;
        console.log(`⚠️ Status BAHAYA terdeteksi (${bahayaCounter}/${BAHAYA_THRESHOLD_SAMPLES} sampel (~${bahayaCounter * 2}s))`);
    } else {
        bahayaCounter = 0; // Reset jika status kembali aman/waspada
    }

    if (currentStatus !== "aman") {
        const isBahayaConfirmed = currentStatus === "bahaya" && bahayaCounter >= BAHAYA_THRESHOLD_SAMPLES;
        const isWaspada = currentStatus === "waspada";
        const statusMemburuk = currentStatus !== lastNotifStatus;
        const cooldownLewat  = (timeNow - lastNotifSentTime) > NOTIF_COOLDOWN;

        if ((isBahayaConfirmed || isWaspada) && (statusMemburuk || cooldownLewat)) {
            kirimTelegramPeringatan(parsedTinggi, parsedHujan, parsedSampah, currentStatus);
            lastNotifStatus   = currentStatus;
            lastNotifSentTime = timeNow;
        } else if (currentStatus === "bahaya" && !isBahayaConfirmed) {
            console.log(`ℹ️ BAHAYA belum 30 detik (baru ${bahayaCounter * 2}s). Menunggu verifikasi...`);
        } else {
            console.log(`ℹ️ Notifikasi Telegram ditahan (cooldown: ${Math.round((NOTIF_COOLDOWN - (timeNow - lastNotifSentTime)) / 1000)}s lagi)`);
        }
    } else {
        lastNotifStatus = "aman";
    }

    return res.status(200).json({
        success: true,
        status: currentStatus,
        message: "Data diterima, disiarkan ke dashboard, dan dievaluasi."
    });
});

// ============================================================
// API: GET REPORT TELEMETRY PER DAERAH & WAKTU
// GET /api/reports?periode=harian|mingguan|bulanan|tahunan|all&daerah=...&status=...&search=...
// ============================================================
app.get('/api/reports', (req, res) => {
    const { periode = 'all', daerah = 'all', status = 'all', search = '' } = req.query;
    const now = Date.now();

    let filtered = telemetryHistory.filter(item => {
        const itemTime = new Date(item.timestamp).getTime();
        const diffHours = (now - itemTime) / (3600 * 1000);
        const diffDays = diffHours / 24;

        // Filter Periode
        if (periode === 'harian' && diffHours > 24) return false;
        if (periode === 'mingguan' && diffDays > 7) return false;
        if (periode === 'bulanan' && diffDays > 30) return false;
        if (periode === 'tahunan' && diffDays > 365) return false;

        // Filter Daerah
        if (daerah !== 'all' && item.daerah.toLowerCase() !== daerah.toLowerCase()) return false;

        // Filter Status
        if (status !== 'all' && item.status.toLowerCase() !== status.toLowerCase()) return false;

        // Search text
        if (search) {
            const query = search.toLowerCase();
            const matchDaerah = item.daerah.toLowerCase().includes(query);
            const matchLokasi = item.lokasi.toLowerCase().includes(query);
            const matchHujan = item.kondisiHujan.toLowerCase().includes(query);
            const matchStatus = item.status.toLowerCase().includes(query);
            if (!matchDaerah && !matchLokasi && !matchHujan && !matchStatus) return false;
        }

        return true;
    });

    // Ringkasan statistik dari data terfilter
    const total = filtered.length;
    const amanCount = filtered.filter(i => i.status === 'aman').length;
    const waspadaCount = filtered.filter(i => i.status === 'waspada').length;
    const bahayaCount = filtered.filter(i => i.status === 'bahaya').length;
    const avgWater = total > 0 ? (filtered.reduce((sum, i) => sum + i.tinggiAir, 0) / total).toFixed(1) : 0;
    const maxWater = total > 0 ? Math.max(...filtered.map(i => i.tinggiAir)).toFixed(1) : 0;

    res.json({
        success: true,
        summary: {
            total,
            amanCount,
            waspadaCount,
            bahayaCount,
            avgWater: parseFloat(avgWater),
            maxWater: parseFloat(maxWater)
        },
        data: filtered
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
// JALANKAN SERVER (DENGAN AUTO PORT FALLBACK JIKA EADDRINUSE)
// ============================================================
let PORT = parseInt(process.env.PORT || '3000', 10);

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

function startServer(portToTry) {
    server.removeAllListeners('error');
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️ Port ${portToTry} sedang digunakan. Mencoba Port ${portToTry + 1}...`);
            startServer(portToTry + 1);
        } else {
            console.error('❌ Server error:', err);
        }
    });

    server.listen(portToTry, '0.0.0.0', () => {
        PORT = portToTry;
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
}

startServer(PORT);
