const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// ============================================================
// KONFIGURASI EMAIL (NODEMAILER)
// ============================================================
// Anda dapat memasukkan email/password SMTP asli Anda di sini jika ingin mengirim ke email nyata.
// Secara default, sistem ini otomatis membuat akun tes Ethereal gratis jika belum dikonfigurasi.
let transporter;
const RECIPIENT_EMAIL = 'warga.bogor@example.com'; // Ganti dengan email warga/tujuan

nodemailer.createTestAccount().then(account => {
    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: account.user,
            pass: account.pass
        }
    });
    console.log(`✉️ Nodemailer Ethereal SMTP akun otomatis dibuat:`);
    console.log(`   👉 User: ${account.user}`);
    console.log(`   👉 Pass: ${account.pass}`);
    console.log(`   👉 Anda dapat mengganti ini dengan SMTP Gmail/pribadi Anda di server.js.`);
}).catch(err => {
    console.error('❌ Gagal membuat SMTP Ethereal otomatis, menggunakan fallback placeholder:', err.message);
    transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: 'placeholder', pass: 'placeholder' }
    });
});

// Variabel kontrol pencegahan spam email
let lastEmailStatus = "aman";
let lastEmailSentTime = 0;
const EMAIL_COOLDOWN = 5 * 60 * 1000; // 5 menit cooldown
const WARNING_LEVEL = 10.0;
const DANGER_LEVEL = 16.0;

function getStatus(tinggiAir, adaSampah) {
    if (tinggiAir >= DANGER_LEVEL || (adaSampah && tinggiAir >= WARNING_LEVEL)) {
        return "bahaya";
    } else if (tinggiAir >= WARNING_LEVEL || adaSampah) {
        return "waspada";
    }
    return "aman";
}

function kirimEmailPeringatan(tinggiAir, kondisiHujan, adaSampah, status) {
    if (!transporter) {
        console.log("❌ Pengiriman email dibatalkan: SMTP server belum siap.");
        return;
    }

    const statusText = status.toUpperCase();
    const sampahText = adaSampah ? "Tersumbat Sampah!" : "Lancar / Bersih";
    
    console.log(`✉️ Memulai pengiriman email peringatan: Status ${statusText}`);
    
    const mailOptions = {
        from: '"SI DAGO Bogor" <noreply.sidago@bogorkota.go.id>',
        to: RECIPIENT_EMAIL,
        subject: `⚠️ [SI DAGO] PERINGATAN ${statusText}: Kondisi Selokan Kritis`,
        html: `
            <div style="font-family: Arial, sans-serif; border: 2px solid #C0271B; border-radius: 8px; padding: 20px; max-width: 600px; margin: auto;">
                <h2 style="color: #C0271B; text-align: center; margin-top: 0;">⚠️ STATUS PERINGATAN: ${statusText}</h2>
                <hr style="border: 1px solid #eee;">
                <p>Sistem <b>SI DAGO (Pantau Selokan Cekatan Kota Bogor)</b> mendeteksi tingkat kerawanan tinggi air selokan yang memerlukan perhatian:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="background-color: #f9f9f9;">
                        <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Titik Lokasi</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">Selokan Pasar Mawar (Jl. Merdeka)</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Ketinggian Air</td>
                        <td style="padding: 10px; border: 1px solid #ddd; color: #C0271B; font-weight: bold;">${tinggiAir.toFixed(1)} cm</td>
                    </tr>
                    <tr style="background-color: #f9f9f9;">
                        <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Kondisi Hujan</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${kondisiHujan}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Penyumbatan Sampah</td>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${sampahText}</td>
                    </tr>
                </table>
                <p style="background-color: #fff3cd; padding: 15px; border-radius: 4px; border-left: 5px solid #ffc107; font-size: 0.9em; line-height: 1.4;">
                    <b>Himbauan:</b> Segera bersihkan gorong-gorong dari sampah penyumbat aliran air, dan amankan barang berharga ke tempat yang lebih tinggi jika air terus meningkat.
                </p>
                <hr style="border: 1px solid #eee;">
                <p style="font-size: 0.8em; color: #777; text-align: center; margin-bottom: 0;">
                    Pesan ini dikirimkan otomatis oleh Server SI DAGO Kota Bogor.<br>
                    Untuk konfigurasi penerima/SMTP, silakan hubungi tim pelajar PPLG.
                </p>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('❌ Gagal mengirim email peringatan:', error.message);
        } else {
            console.log('✉️ Email peringatan terkirim:', info.messageId);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log('🔗 Preview Email (Ethereal):', previewUrl);
            }
        }
    });
}

// Middleware
app.use(cors());
app.use(express.json()); // Untuk parse JSON body
app.use(express.static(path.join(__dirname, '/'))); // Serve file statis (index.html, css, js)

// Variabel untuk menyimpan data terakhir
let currentData = {
    tinggiAir: 0,
    kondisiHujan: "Cerah",
    adaSampah: false,
    timestamp: new Date().toISOString()
};

// API Endpoint untuk menerima data dari IoT (Laptop teman / ESP32)
app.post('/api/data', (req, res) => {
    console.log('--- Data Masuk dari IoT ---');
    console.log('Body:', req.body);
    
    const { tinggiAir, kondisiHujan, adaSampah } = req.body;

    if (tinggiAir !== undefined) {
        currentData = {
            tinggiAir: parseFloat(tinggiAir),
            kondisiHujan: kondisiHujan || "Cerah",
            adaSampah: adaSampah === true || adaSampah === "true" || adaSampah === 1,
            timestamp: new Date().toISOString()
        };

        // Broadcast data baru ke semua client web yang terhubung
        io.emit('sensor_update', currentData);
        console.log('✅ Data berhasil diproses dan dikirim ke dashboard');

        // Logika Pengecekan Transaksi Status & Cooldown Email
        const parsedTinggi = parseFloat(tinggiAir);
        const parsedSampah = adaSampah === true || adaSampah === "true" || adaSampah === 1;
        const currentStatus = getStatus(parsedTinggi, parsedSampah);
        const timeNow = Date.now();

        if (currentStatus !== "aman") {
            // Kirim email jika:
            // 1. Status memburuk / berbeda dibanding status email terakhir (misal dari AMAN ke WASPADA, atau WASPADA ke BAHAYA)
            // 2. ATAU sudah melewati waktu cooldown (anti-spam) agar tidak kirim email setiap 30 detik data sensor masuk
            if (currentStatus !== lastEmailStatus || (timeNow - lastEmailSentTime > EMAIL_COOLDOWN)) {
                kirimEmailPeringatan(parsedTinggi, kondisiHujan || "Cerah", parsedSampah, currentStatus);
                lastEmailStatus = currentStatus;
                lastEmailSentTime = timeNow;
            }
        } else {
            // Jika kembali AMAN, reset status email agar jika ada bahaya lagi langsung terkirim seketika
            lastEmailStatus = "aman";
        }

        res.status(200).json({ success: true, message: "Data received, broadcasted and evaluated for email alert" });
    } else {
        console.log('❌ Format data salah. Field tinggiAir tidak ditemukan.');
        res.status(400).json({ success: false, message: "Invalid data format. Need tinggiAir." });
    }
});

// API Endpoint untuk ngecek data terakhir secara manual (GET)
app.get('/api/data', (req, res) => {
    res.json(currentData);
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Sebuah browser web terhubung (Dashboard)');
    
    // Kirim data terakhir saat pertama kali connect
    socket.emit('sensor_update', currentData);

    socket.on('disconnect', () => {
        console.log('Browser web terputus');
    });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
const os = require('os');

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

server.listen(PORT, '0.0.0.0', () => { // 0.0.0.0 agar bisa diakses dari laptop/device lain di jaringan yang sama
    const localIPs = getLocalIPs();
    console.log(`=========================================`);
    console.log(`🚀 SI DAGO Server berjalan di Port ${PORT}`);
    console.log(`=========================================`);
    console.log(`🌐 Buka Dashboard di browser: http://localhost:${PORT}`);
    console.log(`📡 URL API untuk IoT (POST):`);
    if (localIPs.length === 0) {
        console.log(`   👉 http://localhost:${PORT}/api/data`);
    } else {
        localIPs.forEach(ip => {
            console.log(`   👉 (${ip.name}): http://${ip.address}:${PORT}/api/data`);
        });
    }
    console.log(`(Pastikan laptop kamu dan teman kamu terhubung ke WiFi/Jaringan yang sama)`);
    console.log(`=========================================`);
});
