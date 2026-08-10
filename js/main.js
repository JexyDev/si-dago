/* ============================================================
   SI DAGO REAL-TIME DASHBOARD LOGIC
   Handles Socket.io, Chart.js, Dynamic Metrics, and Event Logs
   ============================================================ */

// DOM Elements
const waterLevelEl = document.getElementById('water-level');
const waterBarEl = document.getElementById('water-bar');
const alertCardEl = document.getElementById('alert-card');
const liveCardBadge = document.getElementById('live-card-badge');
const statusTitleEl = document.getElementById('status-title');
const statusDescEl = document.getElementById('status-desc');
const connectionDot = document.getElementById('connection-dot');
const connectionText = document.getElementById('connection-text');
const sensorDot = document.getElementById('sensor-dot');
const sensorText = document.getElementById('sensor-text');
const rainStatusEl = document.getElementById('rain-status');
const trashStatusEl = document.getElementById('trash-status');
const liveRiskPct = document.getElementById('live-risk-pct');
const topStatusBar = document.getElementById('top-status-bar');
const topStatusText = document.getElementById('top-status-text');
const eventLogTbody = document.getElementById('event-log-tbody');

// Hero Home Page Elements (index.html)
const heroStatusBox = document.getElementById('hero-status-box');
const heroStatusText = document.getElementById('hero-status-text');
const heroWaterVal = document.getElementById('hero-water-val');
const heroRainVal = document.getElementById('hero-rain-val');
const heroTrashVal = document.getElementById('hero-trash-val');

// Stats Counters Elements
const statsAmanCount = document.getElementById('stats-aman-count');
const statsWaspadaCount = document.getElementById('stats-waspada-count');
const statsBahayaCount = document.getElementById('stats-bahaya-count');

// Threshold Bounds (Gorong-gorong Jl. Merdeka: Height = 20.0 cm based on Arduino config)
const WARNING_LEVEL = 10.0; // cm (50% of 20cm)
const DANGER_LEVEL = 16.0;  // cm (80% of 20cm)
const MAX_LEVEL = 20.0;     // cm

// Sensor Status online tracking
let lastDataTime = 0;
let currentStatusState = "aman"; // 'aman', 'waspada', 'bahaya'

// Offline jika tidak ada data lebih dari 20 detik (ESP32 kirim tiap ~30 detik)
setInterval(() => {
    const now = Date.now();
    if (lastDataTime === 0 || (now - lastDataTime > 20000)) {
        sensorDot.classList.remove('connected');
        sensorText.innerText = "Sensor: Offline";
    } else {
        sensorDot.classList.add('connected');
        sensorText.innerText = "Sensor: Online";
    }
}, 3000);

// Chart.js Setup
const ctx = document.getElementById('waterChart');
let waterChart = null;

if (ctx) {
    const chartCtx = ctx.getContext('2d');
    Chart.defaults.color = '#555555';
    Chart.defaults.font.family = "'Nunito', sans-serif";

    const gradient = chartCtx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(10, 79, 110, 0.4)');
    gradient.addColorStop(1, 'rgba(10, 79, 110, 0.0)');

    waterChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Ketinggian Air (cm)',
                data: [],
                borderColor: '#0A4F6E',
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#C8860A',
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 22,
                    ticks: {
                        stepSize: 2,
                        callback: (val) => val + ' cm'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: { display: false },
                // Garis ambang batas WASPADA (10cm) & BAHAYA (16cm)
                annotation: {
                    annotations: {
                        lineWaspada: {
                            type: 'line',
                            yMin: 10,
                            yMax: 10,
                            borderColor: '#D4860A',
                            borderWidth: 2,
                            borderDash: [6, 4],
                            label: {
                                display: true,
                                content: '⚠ Batas WASPADA (10 cm)',
                                position: 'start',
                                color: '#D4860A',
                                font: { size: 11, weight: 'bold' },
                                backgroundColor: 'rgba(255,255,255,0.85)',
                                padding: { x: 6, y: 3 }
                            }
                        },
                        lineBahaya: {
                            type: 'line',
                            yMin: 16,
                            yMax: 16,
                            borderColor: '#C0271B',
                            borderWidth: 2,
                            borderDash: [6, 4],
                            label: {
                                display: true,
                                content: '🔴 Batas BAHAYA (16 cm)',
                                position: 'start',
                                color: '#C0271B',
                                font: { size: 11, weight: 'bold' },
                                backgroundColor: 'rgba(255,255,255,0.85)',
                                padding: { x: 6, y: 3 }
                            }
                        }
                    }
                }
            }
        }
    });
}

// Log Event to UI Table
function appendEventLog(location, detail, trashState, statusType) {
    if (!eventLogTbody) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let badgeClass = "aman";
    let badgeText = "AMAN";
    let trashStyle = "color: var(--hijau-aman)";
    
    if (statusType === "waspada") {
        badgeClass = "waspada";
        badgeText = "WASPADA";
        trashStyle = "color: var(--kuning-waspada)";
    } else if (statusType === "bahaya") {
        badgeClass = "bahaya";
        badgeText = "BAHAYA";
        trashStyle = "color: var(--merah-bahaya)";
    }

    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="log-time">${timeStr}</td>
        <td>${location}</td>
        <td>${detail}</td>
        <td style="${trashStyle}">${trashState}</td>
        <td><span class="card-badge ${badgeClass}" style="font-size: 0.75rem; padding: 3px 8px;">${badgeText}</span></td>
    `;

    // Prepend to top of table
    eventLogTbody.insertBefore(row, eventLogTbody.firstChild);

    // Keep max 15 rows
    if (eventLogTbody.children.length > 15) {
        eventLogTbody.removeChild(eventLogTbody.lastChild);
    }
}

// Calculate Risk Score (0 - 100) per Proposal BIA 2026 (Gambar 2.1)
function calculateRisk(tinggiAir, adaSampah, kondisiHujan) {
    let score = Math.round((tinggiAir / MAX_LEVEL) * 70); // Ketinggian air (max 20cm) kontribusi max 70%
    if (adaSampah) score += 20;                           // Penyumbatan sampah (infrared FC-51) +20%
    if (kondisiHujan && kondisiHujan.toLowerCase() !== 'cerah') score += 10; // Hujan +10%
    return Math.min(Math.max(score, 0), 100);
}

// Update UI on Data Received
function updateUI(tinggiAir, kondisiHujan, adaSampah) {
    lastDataTime = Date.now();

    // 1. Update Water Level Number
    if (waterLevelEl) {
        waterLevelEl.innerText = tinggiAir.toFixed(1);
    }

    // 2. Calculate and Display Risk
    const riskScore = calculateRisk(tinggiAir, adaSampah, kondisiHujan);
    if (liveRiskPct) {
        liveRiskPct.innerText = riskScore + "%";
    }

    // 3. Update Progress Bar
    if (waterBarEl) {
        waterBarEl.style.width = Math.min(riskScore, 100) + '%';
        
        // Remove old classes
        waterBarEl.className = "custom-progress-bar";
        if (riskScore >= 76) {
            waterBarEl.classList.add("progress-bahaya");
        } else if (riskScore >= 45) {
            waterBarEl.classList.add("progress-waspada");
        } else {
            waterBarEl.classList.add("progress-safe");
        }
    }

    // 4. Update Hujan Status
    if (rainStatusEl) {
        rainStatusEl.innerText = kondisiHujan;
    }

    // 5. Update Sampah Status
    let trashText = "Lancar / Bersih";
    if (adaSampah) {
        trashText = "Tersumbat Sampah!";
        trashStatusEl.style.color = "var(--merah-bahaya)";
    } else {
        trashStatusEl.style.color = "var(--hijau-aman)";
    }
    if (trashStatusEl) {
        trashStatusEl.innerText = trashText;
    }

    // 6. State Determination and Styling (Proposal BIA 2026: 0-44 Aman, 45-75 Waspada, 76-100 Bahaya)
    let prevStatus = currentStatusState;
    let newStatus = "aman";

    if (riskScore >= 76) {
        newStatus = "bahaya";
    } else if (riskScore >= 45) {
        newStatus = "waspada";
    }

    currentStatusState = newStatus;

    // Update Hero elements on index.html if present
    if (heroWaterVal) heroWaterVal.innerText = tinggiAir.toFixed(1) + " cm";
    if (heroRainVal) heroRainVal.innerText = kondisiHujan;
    if (heroTrashVal) {
        heroTrashVal.innerText = trashText;
        heroTrashVal.style.color = adaSampah ? "var(--merah-bahaya)" : "var(--hijau-aman)";
    }
    if (heroStatusBox && heroStatusText) {
        heroStatusBox.className = "hero-status-box " + (newStatus === "bahaya" ? "status-bahaya" : newStatus === "waspada" ? "status-waspada" : "status-aman");
        heroStatusText.innerText = newStatus === "bahaya" ? "🔴 BAHAYA" : newStatus === "waspada" ? "🟡 WASPADA" : "🟢 AMAN";
    }

    // Apply main styles based on status
    if (alertCardEl && liveCardBadge && statusTitleEl && statusDescEl) {
        // Reset classes
        alertCardEl.className = "sensor-card";
        liveCardBadge.className = "card-badge";

        if (newStatus === "bahaya") {
            alertCardEl.classList.add("bahaya");
            liveCardBadge.classList.add("bahaya");
            liveCardBadge.innerText = "🔴 BAHAYA";
            statusTitleEl.innerText = "BAHAYA LUAPAN";
            statusTitleEl.style.color = "var(--merah-bahaya)";
            statusDescEl.innerText = "Ketinggian kritis! Aliran tersumbat atau meluap, waspada!";
        } else if (newStatus === "waspada") {
            alertCardEl.classList.add("waspada");
            liveCardBadge.classList.add("waspada");
            liveCardBadge.innerText = "🟡 WASPADA";
            statusTitleEl.innerText = "Waspada";
            statusTitleEl.style.color = "var(--kuning-waspada)";
            statusDescEl.innerText = "Air meningkat atau gorong-gorong tersumbat.";
        } else {
            alertCardEl.classList.add("aman");
            liveCardBadge.classList.add("aman");
            liveCardBadge.innerText = "🟢 AMAN";
            statusTitleEl.innerText = "Aman";
            statusTitleEl.style.color = "var(--hijau-aman)";
            statusDescEl.innerText = "Ketinggian normal. Aliran air lancar.";
        }
    }

    // 7. Update Page-Level Top Bar Banner
    if (topStatusBar && topStatusText) {
        topStatusBar.className = "top-status-bar";
        if (newStatus === "bahaya") {
            topStatusBar.classList.add("status-bahaya");
            topStatusText.innerText = "BAHAYA";
        } else if (newStatus === "waspada") {
            topStatusBar.classList.add("status-waspada");
            topStatusText.innerText = "WASPADA";
        } else {
            topStatusBar.classList.add("status-aman");
            topStatusText.innerText = "AMAN";
        }
    }

    // 8. Update Counter Statistics in Dashboard
    if (statsAmanCount && statsWaspadaCount && statsBahayaCount) {
        if (newStatus === "bahaya") {
            statsAmanCount.innerText = "10";
            statsWaspadaCount.innerText = "1";
            statsBahayaCount.innerText = "1";
        } else if (newStatus === "waspada") {
            statsAmanCount.innerText = "10";
            statsWaspadaCount.innerText = "2";
            statsBahayaCount.innerText = "0";
        } else {
            statsAmanCount.innerText = "11";
            statsWaspadaCount.innerText = "1";
            statsBahayaCount.innerText = "0";
        }
    }

    // 9. Append Event Log on SIGNIFICANT status change
    if (prevStatus !== newStatus || Math.floor(tinggiAir) % 3 === 0) {
        const detailStr = `Air: ${tinggiAir.toFixed(1)} cm | Hujan: ${kondisiHujan}`;
        appendEventLog("Selokan Pasar Mawar", detailStr, trashText, newStatus);
    }

    // 10. Update Chart Data
    if (waterChart) {
        const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        // Max 15 points
        if (waterChart.data.labels.length > 15) {
            waterChart.data.labels.shift();
            waterChart.data.datasets[0].data.shift();
        }

        waterChart.data.labels.push(timeNow);
        waterChart.data.datasets[0].data.push(tinggiAir);
        waterChart.update();
    }
}

// Websocket Connection
function connectSiDago() {
    const socket = io();

    socket.on('connect', () => {
        if (connectionDot) connectionDot.classList.add('connected');
        if (connectionText) connectionText.innerText = "Server Terhubung";
    });

    socket.on('disconnect', () => {
        if (connectionDot) connectionDot.classList.remove('connected');
        if (connectionText) connectionText.innerText = "Koneksi Terputus";
    });

    socket.on('sensor_update', (data) => {
        updateUI(data.tinggiAir, data.kondisiHujan, data.adaSampah);
    });
}

// Sidebar Filter Handling
function setupFilters() {
    const filterKecamatan = document.getElementById('filter-kecamatan');
    const filterStatus = document.getElementById('filter-status');

    if (!filterKecamatan || !filterStatus) return;

    function applyFilter() {
        const selectedKec = filterKecamatan.value;
        const selectedStat = filterStatus.value;
        const cards = document.querySelectorAll('.dashboard-content-area .sensor-card');

        cards.forEach(card => {
            const cardKec = card.getAttribute('data-kecamatan') || 'tengah';
            let cardStat = 'aman';
            if (card.classList.contains('waspada')) cardStat = 'waspada';
            if (card.classList.contains('bahaya')) cardStat = 'bahaya';

            const matchKec = (selectedKec === 'semua' || cardKec === selectedKec);
            const matchStat = (selectedStat === 'semua' || cardStat === selectedStat);

            card.style.display = (matchKec && matchStat) ? '' : 'none';
        });
    }

    filterKecamatan.addEventListener('change', applyFilter);
    filterStatus.addEventListener('change', applyFilter);
}

// Start connection on load
window.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil data sensor terbaru dari server agar beranda langsung menampilkan data real
    fetch('/api/latest')
        .then(res => res.json())
        .then(data => {
            if (data && typeof data.tinggiAir === 'number') {
                updateUI(data.tinggiAir, data.kondisiHujan || "Cerah", !!data.adaSampah);
            }
        })
        .catch(() => {
            updateUI(0, "CERAH", false);
        });

    // 2. Hubungkan ke WebSocket untuk memperbarui data secara realtime
    connectSiDago();
    setupFilters();
});

