/* ============================================================
   SI DAGO - LAPORAN DATA SENSOR PER DAERAH (REPORT LOGIC)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const filterPeriode = document.getElementById('filter-periode');
    const filterDaerah = document.getElementById('filter-daerah');
    const filterStatus = document.getElementById('filter-status');
    const searchInput = document.getElementById('search-input');
    const btnResetFilter = document.getElementById('btn-reset-filter');

    const statTotalEl = document.getElementById('stat-total');
    const statAmanEl = document.getElementById('stat-aman');
    const statWaspadaEl = document.getElementById('stat-waspada');
    const statBahayaEl = document.getElementById('stat-bahaya');
    const statAvgWaterEl = document.getElementById('stat-avg-water');

    const reportTbody = document.getElementById('report-tbody');
    const tableInfo = document.getElementById('table-info');
    const paginationControls = document.getElementById('pagination-controls');
    const perPageSelect = document.getElementById('per-page-select');

    const btnExportCsv = document.getElementById('btn-export-csv');
    const btnExportExcel = document.getElementById('btn-export-excel');
    const btnExportPdf = document.getElementById('btn-export-pdf');
    const btnExportCopy = document.getElementById('btn-export-copy');

    // Modal elements
    const detailModal = document.getElementById('detail-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // State Variables
    let rawReportData = [];
    let filteredData = [];
    let currentPage = 1;
    let itemsPerPage = parseInt(perPageSelect?.value || '10');
    let sortColumn = 'timestamp';
    let sortDirection = 'desc'; // 'asc' or 'desc'

    // Socket.io connection for live data updates
    const socket = typeof io !== 'undefined' ? io() : null;
    if (socket) {
        socket.on('sensor_update', (data) => {
            console.log('⚡ Socket update received on report page:', data);
            // Refresh data from API when new IoT record arrives
            fetchReportData();
        });
    }

    // Main Fetch Function
    async function fetchReportData() {
        try {
            reportTbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 2rem; color: #64748B;">
                        <i class="bx bx-loader-alt bx-spin" style="font-size: 1.8rem; vertical-align: middle;">
                        </i> Memuat data laporan per daerah...
                    </td>
                </tr>
            `;

            const params = new URLSearchParams({
                periode: filterPeriode.value,
                daerah: filterDaerah.value,
                status: filterStatus.value,
                search: searchInput.value.trim()
            });

            const response = await fetch(`/api/reports?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                rawReportData = result.data || [];
                updateStats(result.summary);
                applyFilterAndSort();
            } else {
                showError('Gagal memuat data laporan.');
            }
        } catch (err) {
            console.error('Error fetching report data:', err);
            showError('Terjadi kesalahan koneksi ke server.');
        }
    }

    // Update Summary Stats Cards
    function updateStats(summary) {
        if (!summary) return;
        if (statTotalEl) statTotalEl.textContent = summary.total || 0;
        if (statAmanEl) statAmanEl.textContent = summary.amanCount || 0;
        if (statWaspadaEl) statWaspadaEl.textContent = summary.waspadaCount || 0;
        if (statBahayaEl) statBahayaEl.textContent = summary.bahayaCount || 0;
        if (statAvgWaterEl) statAvgWaterEl.textContent = `${summary.avgWater || 0} cm`;
    }

    // Apply Sorting & Filtering on client array
    function applyFilterAndSort() {
        filteredData = [...rawReportData];

        // Sort data
        filteredData.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            if (sortColumn === 'timestamp') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        currentPage = 1;
        renderTable();
    }

    // Render Table Content & Pagination
    function renderTable() {
        if (filteredData.length === 0) {
            reportTbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 2.5rem; color: #64748B;">
                        <i class="bx bx-file-find" style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;"></i>
                        <strong>Tidak ada data laporan ditemukan.</strong><br>
                        Coba sesuaikan filter waktu, daerah, atau kata kunci pencarian.
                    </td>
                </tr>
            `;
            tableInfo.textContent = 'Menampilkan 0 dari 0 data';
            renderPagination(0);
            return;
        }

        const totalItems = filteredData.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

        const pageItems = filteredData.slice(startIndex, endIndex);

        let rowsHtml = '';
        pageItems.forEach((item, index) => {
            const rowNum = startIndex + index + 1;
            const dateObj = new Date(item.timestamp);
            const formattedDate = dateObj.toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
            const formattedTime = dateObj.toLocaleTimeString('id-ID', {
                hour: '2-digit', minute: '2-digit'
            });

            // Water level percentage bar (Max 20cm)
            const waterPct = Math.min(Math.round((item.tinggiAir / 20.0) * 100), 100);

            // Status Badge
            const statusClass = item.status || 'aman';
            const statusLabel = statusClass.toUpperCase();
            const statusIcon = statusClass === 'bahaya' ? 'bx-error-circle' : statusClass === 'waspada' ? 'bx-error' : 'bx-check-circle';

            // Trash status icon & badge
            const trashBadge = item.adaSampah 
                ? `<span style="display:inline-flex; align-items:center; gap:0.3rem; color: var(--merah-bahaya); font-weight:700; background: #FEF2F2; padding: 3px 10px; border-radius: 99px; font-size: 0.82rem; border: 1px solid #FECACA;"><i class="bx bx-trash"></i> Tersumbat</span>` 
                : `<span style="display:inline-flex; align-items:center; gap:0.3rem; color: var(--hijau-aman); font-weight:700; background: #ECFDF5; padding: 3px 10px; border-radius: 99px; font-size: 0.82rem; border: 1px solid #A7F3D0;"><i class="bx bx-check-double"></i> Bersih</span>`;

            rowsHtml += `
                <tr>
                    <td style="font-family: var(--font-number); font-weight:700; color:#64748B; text-align: center;">${rowNum}</td>
                    <td>
                        <div style="font-weight:800; color: var(--biru-bogor); font-size: 0.92rem;">${formattedDate}</div>
                        <div style="font-size:0.78rem; color:#64748B; font-weight: 600;"><i class="bx bx-time-five" style="vertical-align:-1px;"></i> ${formattedTime} WIB</div>
                    </td>
                    <td>
                        <div style="font-weight:800; color: var(--biru-bogor); font-size: 0.95rem;">${escapeHtml(item.daerah)}</div>
                        <div style="font-size:0.8rem; color:#475569; font-weight: 500;">${escapeHtml(item.lokasi)}</div>
                    </td>
                    <td>
                        <div class="water-mini-bar">
                            <span style="font-family: var(--font-number); font-weight:800; min-width: 52px; font-size: 1rem; color: var(--biru-bogor);">${item.tinggiAir.toFixed(1)} cm</span>
                            <div class="water-bar-track">
                                <div class="water-bar-fill ${statusClass}" style="width: ${waterPct}%;"></div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span style="font-size:0.85rem; font-weight:600; color: #1E293B; display: inline-flex; align-items: center; gap: 0.35rem;"><i class="bx bx-cloud-rain" style="color:#0284C7; font-size: 1.1rem;"></i> ${escapeHtml(item.kondisiHujan)}</span>
                    </td>
                    <td>${trashBadge}</td>
                    <td>
                        <span style="font-family: var(--font-number); font-weight:800; font-size:1.05rem; color: var(--biru-bogor);">${item.skorRisiko} <span style="font-size:0.75rem; color:#94A3B8;">/100</span></span>
                    </td>
                    <td>
                        <span class="badge-status ${statusClass}">
                            <i class="bx ${statusIcon}"></i> ${statusLabel}
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <button class="btn-detail" data-id="${item.id}" title="Lihat rincian telemetri">
                            <i class="bx bx-info-circle"></i> Detail
                        </button>
                    </td>
                </tr>
            `;
        });

        reportTbody.innerHTML = rowsHtml;
        tableInfo.textContent = `Menampilkan ${startIndex + 1} - ${endIndex} dari ${totalItems} data laporan`;

        renderPagination(totalPages);
        attachDetailEvents();
    }

    // Render Pagination Controls
    function renderPagination(totalPages) {
        if (!paginationControls) return;
        paginationControls.innerHTML = '';

        if (totalPages <= 1) return;

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '<i class="bx bx-chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
        paginationControls.appendChild(prevBtn);

        // Page Numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let p = startPage; p <= endPage; p++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${p === currentPage ? 'active' : ''}`;
            pageBtn.textContent = p;
            pageBtn.addEventListener('click', () => {
                currentPage = p;
                renderTable();
            });
            paginationControls.appendChild(pageBtn);
        }

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = '<i class="bx bx-chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });
        paginationControls.appendChild(nextBtn);
    }

    // Attach Event Listeners to Detail Buttons
    function attachDetailEvents() {
        document.querySelectorAll('.btn-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const item = filteredData.find(d => d.id === id);
                if (item) openModalDetail(item);
            });
        });
    }

    // Open Detail Modal
    function openModalDetail(item) {
        const modalBody = document.getElementById('modal-detail-body');
        if (!modalBody) return;

        const dateObj = new Date(item.timestamp);
        const fullDate = dateObj.toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const statusClass = item.status || 'aman';
        const statusLabel = statusClass.toUpperCase();

        modalBody.innerHTML = `
            <div style="text-align: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #E2E8F0;">
                <span class="badge-status ${statusClass}" style="font-size: 1rem; padding: 0.4rem 1.2rem; margin-bottom: 0.5rem;">
                    STATUS: ${statusLabel}
                </span>
                <h4 style="font-family: var(--font-heading); color: var(--biru-bogor); font-size: 1.3rem; margin-top: 0.5rem;">
                    ${escapeHtml(item.daerah)}
                </h4>
                <p style="color: #64748B; font-size: 0.9rem;"><i class="bx bx-map"></i> ${escapeHtml(item.lokasi)}</p>
            </div>

            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <span>Waktu Terdeteksi</span>
                    <strong>${fullDate} WIB</strong>
                </div>
                <div class="modal-info-item">
                    <span>Ketinggian Air</span>
                    <strong style="color: ${statusClass === 'bahaya' ? 'var(--merah-bahaya)' : statusClass === 'waspada' ? 'var(--kuning-waspada)' : 'var(--hijau-aman)'}">
                        ${item.tinggiAir.toFixed(1)} cm
                    </strong>
                </div>
                <div class="modal-info-item">
                    <span>Kondisi Cuaca</span>
                    <strong>${escapeHtml(item.kondisiHujan)}</strong>
                </div>
                <div class="modal-info-item">
                    <span>Penyumbatan Sampah</span>
                    <strong>${item.adaSampah ? '⚠️ Tersumbat Sampah' : '✅ Bersih / Lancar'}</strong>
                </div>
                <div class="modal-info-item">
                    <span>Skor Risiko Banjir</span>
                    <strong style="font-family: var(--font-number); font-size: 1.2rem;">${item.skorRisiko} / 100</strong>
                </div>
                <div class="modal-info-item">
                    <span>ID Telemetri</span>
                    <strong style="font-size: 0.85rem; font-family: monospace;">${item.id}</strong>
                </div>
            </div>

            <div style="background-color: #F8FAFC; border-left: 4px solid var(--biru-bogor); padding: 1rem; border-radius: 6px;">
                <h5 style="color: var(--biru-bogor); font-weight:700; margin-bottom: 0.3rem;">Rekomendasi Tindakan:</h5>
                <p style="font-size: 0.9rem; color: #334155; margin: 0;">
                    ${item.status === 'bahaya' 
                        ? '🚨 Tim Satgas siap siaga evakuasi. Warga bantaran rendah harap amankan barang berharga.' 
                        : item.status === 'waspada' 
                        ? '⚠️ Lakukan pembersihan saringan gorong-gorong dan pantau perkembangan cuaca.' 
                        : '✅ Kondisi drainase aman. Tetap jaga kebersihan selokan dari limbah sampah.'}
                </p>
            </div>
        `;

        detailModal.classList.add('active');
    }

    // Close Modal Event
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => detailModal.classList.remove('active'));
    }
    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) detailModal.classList.remove('active');
        });
    }

    // Export Functions
    // 1. Export CSV with UTF-8 BOM for Excel
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => {
            if (filteredData.length === 0) {
                alert('Tidak ada data untuk diekspor!');
                return;
            }

            let csvContent = '\uFEFFNo,ID Telemetri,Tanggal & Waktu,Kecamatan / Daerah,Lokasi Detail,Ketinggian Air (cm),Kondisi Hujan,Penyumbatan Sampah,Skor Risiko,Status\n';

            filteredData.forEach((item, index) => {
                const dateStr = new Date(item.timestamp).toLocaleString('id-ID');
                const row = [
                    index + 1,
                    `"${item.id}"`,
                    `"${dateStr}"`,
                    `"${item.daerah}"`,
                    `"${item.lokasi.replace(/"/g, '""')}"`,
                    item.tinggiAir,
                    `"${item.kondisiHujan}"`,
                    `"${item.adaSampah ? 'Tersumbat' : 'Lancar'}"`,
                    item.skorRisiko,
                    `"${item.status.toUpperCase()}"`
                ].join(',');
                csvContent += row + '\n';
            });

            downloadFile(csvContent, `Laporan_SI_DAGO_${filterPeriode.value}_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
        });
    }

    // 2. Export Excel (.xlsx formatted XML/CSV)
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', () => {
            if (filteredData.length === 0) {
                alert('Tidak ada data untuk diekspor!');
                return;
            }

            let excelHtml = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                    <meta charset="utf-8">
                    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Laporan SI DAGO</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
                    <style>
                        table { border-collapse: collapse; width: 100%; }
                        th { background-color: #0F2937; color: #FFFFFF; font-weight: bold; border: 1px solid #CBD5E1; padding: 8px; }
                        td { border: 1px solid #CBD5E1; padding: 6px; }
                        .aman { background-color: #D1FAE5; color: #047857; font-weight: bold; }
                        .waspada { background-color: #FEF3C7; color: #B45309; font-weight: bold; }
                        .bahaya { background-color: #FEE2E2; color: #B91C1C; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h2>LAPORAN PEMANTAUAN DRAINASE SI DAGO KOTA BOGOR</h2>
                    <p>Periode: ${filterPeriode.value.toUpperCase()} | Total Data: ${filteredData.length}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>ID Telemetri</th>
                                <th>Waktu & Tanggal</th>
                                <th>Kecamatan / Daerah</th>
                                <th>Lokasi Detail</th>
                                <th>Ketinggian Air (cm)</th>
                                <th>Kondisi Hujan</th>
                                <th>Status Sampah</th>
                                <th>Skor Risiko</th>
                                <th>Status Risiko</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            filteredData.forEach((item, index) => {
                const dateStr = new Date(item.timestamp).toLocaleString('id-ID');
                excelHtml += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.id}</td>
                        <td>${dateStr}</td>
                        <td>${escapeHtml(item.daerah)}</td>
                        <td>${escapeHtml(item.lokasi)}</td>
                        <td>${item.tinggiAir.toFixed(1)}</td>
                        <td>${escapeHtml(item.kondisiHujan)}</td>
                        <td>${item.adaSampah ? 'Tersumbat' : 'Bersih/Lancar'}</td>
                        <td>${item.skorRisiko}</td>
                        <td class="${item.status}">${item.status.toUpperCase()}</td>
                    </tr>
                `;
            });

            excelHtml += `
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            downloadFile(excelHtml, `Laporan_SI_DAGO_${filterPeriode.value}_${Date.now()}.xls`, 'application/vnd.ms-excel');
        });
    }

    // 3. Print / Export PDF
    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', () => {
            window.print();
        });
    }

    // 4. Copy to Clipboard
    if (btnExportCopy) {
        btnExportCopy.addEventListener('click', () => {
            if (filteredData.length === 0) return;
            let text = "LAPORAN SI DAGO KOTA BOGOR\n";
            text += "No | Waktu | Daerah | Ketinggian | Hujan | Sampah | Status\n";
            text += "--------------------------------------------------------\n";
            filteredData.forEach((item, index) => {
                const dateStr = new Date(item.timestamp).toLocaleString('id-ID');
                text += `${index + 1} | ${dateStr} | ${item.daerah} | ${item.tinggiAir}cm | ${item.kondisiHujan} | ${item.adaSampah ? 'Tersumbat' : 'Bersih'} | ${item.status.toUpperCase()}\n`;
            });

            navigator.clipboard.writeText(text).then(() => {
                alert('✓ Data laporan berhasil disalin ke clipboard!');
            }).catch(err => {
                console.error('Failed copy clipboard:', err);
            });
        });
    }

    // Download Helper
    function downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    // Filter Change Event Listeners
    if (filterPeriode) filterPeriode.addEventListener('change', fetchReportData);
    if (filterDaerah) filterDaerah.addEventListener('change', fetchReportData);
    if (filterStatus) filterStatus.addEventListener('change', fetchReportData);
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(fetchReportData, 300);
        });
    }

    if (btnResetFilter) {
        btnResetFilter.addEventListener('click', () => {
            filterPeriode.value = 'all';
            filterDaerah.value = 'all';
            filterStatus.value = 'all';
            searchInput.value = '';
            fetchReportData();
        });
    }

    if (perPageSelect) {
        perPageSelect.addEventListener('change', () => {
            itemsPerPage = parseInt(perPageSelect.value);
            currentPage = 1;
            renderTable();
        });
    }

    // Header Sort Handlers
    document.querySelectorAll('.report-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.getAttribute('data-sort');
            if (sortColumn === col) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = col;
                sortDirection = 'asc';
            }

            // Update Sort Icons
            document.querySelectorAll('.report-table th.sortable i').forEach(i => i.className = 'bx bx-sort');
            const icon = th.querySelector('i');
            if (icon) {
                icon.className = sortDirection === 'asc' ? 'bx bx-sort-up' : 'bx bx-sort-down';
            }

            applyFilterAndSort();
        });
    });

    // Helper: Escape HTML
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Helper: Show Error
    function showError(msg) {
        reportTbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 2rem; color: var(--merah-bahaya);">
                    <i class="bx bx-error" style="font-size: 2rem; vertical-align: middle;"></i> ${msg}
                </td>
            </tr>
        `;
    }

    // Initial Fetch
    fetchReportData();
});
