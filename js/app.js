/**
 * App Logic
 * Handles dashboard rendering and charts
 */

const App = {
    initDashboard: async (role) => {
        const mainBody = document.getElementById('main-body');

        // 1. Fetch Real Data
        let reports = [];
        try {
            reports = await DB.getAllReports();
        } catch (e) {
            console.error('Error fetching reports:', e);
            if (typeof UI !== 'undefined') UI.showToast('Failed to load reports', 'error');
        }

        const stats = App.calculateStats(reports);

        // Dashboard HTML Structure matching the image
        mainBody.innerHTML = `
            <div class="dashboard-container">
                <!-- Top Stats & Filters -->
                <div class="dashboard-header-row">
                    <div class="stat-box total-cases">
                        <div class="stat-label">Jumlah Kes</div>
                        <div class="stat-value">${reports.length}</div>
                    </div>
                    <div class="filter-bar">
                        <select class="filter-select"><option>Fasiliti dimana...</option></select>
                        <select class="filter-select"><option>Unit</option></select>
                        <select class="filter-select"><option>Pengesanan</option></select>
                        <button class="date-range-btn">Select date range</button>
                    </div>
                </div>

                <!-- SECTION 1: FASILITI DAN UNIT -->
                <div class="dashboard-section">
                    <div class="section-header">FASILITI DAN UNIT</div>
                    <div class="charts-row">
                        <div class="chart-box">
                            <h4 class="chart-title">Fasiliti</h4>
                            <div class="chart-wrapper">
                                <canvas id="chartFacility"></canvas>
                            </div>
                        </div>
                        <div class="chart-box">
                            <h4 class="chart-title">Unit</h4>
                            <div class="chart-wrapper">
                                <canvas id="chartUnit"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECTION 2: KESILAPAN PENGUBATAN DI KECEMASAN / OPD -->
                <div class="dashboard-section">
                    <div class="section-header">KESILAPAN PENGUBATAN DI KECEMASAN / OPD</div>
                    <div class="charts-grid-2x2">
                        <div class="chart-box">
                            <h4 class="chart-title">Preskripsi Tidak Lengkap</h4>
                            <div class="chart-wrapper">
                                <canvas id="chartPrescriptionIncomplete"></canvas>
                            </div>
                        </div>
                        <div class="chart-box">
                            <h4 class="chart-title">Regimen Tidak Sesuai</h4>
                            <div class="chart-wrapper">
                                <canvas id="chartRegimen"></canvas>
                            </div>
                        </div>
                        <div class="chart-box">
                            <h4 class="chart-title">Preskripsi Tidak Sesuai</h4>
                            <div class="chart-wrapper">
                                <canvas id="chartPrescriptionInvalid"></canvas>
                            </div>
                        </div>
                        <div class="chart-box">
                            <h4 class="chart-title">Lain-lain</h4>
                            <div class="chart-wrapper">
                                <canvas id="chartOthers"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECTION 3: KESILAPAN PENGUBATAN DI FARMASI -->
                <div class="dashboard-section">
                    <div class="section-header">KESILAPAN PENGUBATAN DI FARMASI</div>
                    <div class="charts-grid-2x2">
                        <div class="chart-box">
                            <h4 class="chart-title">Data Entry</h4>
                            <div class="chart-wrapper">
                                <canvas id="chartDataEntry"></canvas>
                            </div>
                        </div>
                        <div class="chart-box">
                            <h4 class="chart-title">Labelling</h4>
                            <div class="chart-wrapper">
                                <canvas id="chartLabelling"></canvas>
                            </div>
                        </div>
                        <div class="chart-box">
                            <h4 class="chart-title">Filling</h4>
                            <div class="chart-wrapper">
                                <canvas id="chartFilling"></canvas>
                            </div>
                        </div>
                        <div class="chart-box">
                            <h4 class="chart-title">Kategori Staff</h4>
                            <div class="chart-wrapper">
                                <canvas id="chartStaff"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECTION 4: OUTCOME & TABLES -->
                <div class="charts-row">
                    <div class="chart-box" style="flex: 1;">
                        <div class="section-header" style="margin: -1rem -1rem 1rem -1rem; border-radius: 4px 4px 0 0;">Kategori Error Outcome</div>
                        <div class="chart-wrapper">
                            <canvas id="chartOutcome"></canvas>
                        </div>
                    </div>
                    <div class="chart-box" style="flex: 1;">
                        <div class="section-header" style="margin: -1rem -1rem 1rem -1rem; border-radius: 4px 4px 0 0;">Kekerapan</div>
                        <div class="table-wrapper">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>No.</th>
                                        <th>Fasiliti</th>
                                        <th>Unit</th>
                                        <th>Kategori</th>
                                        <th>Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${App.renderFrequencyRows(stats.frequencyData)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- SECTION 5: JADUAL AM -->
                <div class="dashboard-section">
                    <div class="section-header">Jadual Am</div>
                    <div class="table-wrapper">
                        <table class="data-table full-width">
                            <thead>
                                <tr>
                                    <th>Fasiliti</th>
                                    <th>Tarikh</th>
                                    <th>Kategori</th>
                                    <th>Setting</th>
                                    <th>Error Type</th>
                                    <th>Staff</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${App.renderGeneralRows(reports)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Initialize Charts with Real Data
        App.initCharts(stats);
    },

    calculateStats: (reports) => {
        const stats = {
            facility: {},
            unit: {},
            clinicErrors: {}, // Aggregate all clinic errors
            pharmacyErrors: {}, // Aggregate all pharmacy errors
            outcome: {},
            staff: {},
            frequencyData: [] // For the frequency table
        };

        // Initialize counters
        reports.forEach(r => {
            // Facility
            stats.facility[r.facility] = (stats.facility[r.facility] || 0) + 1;

            // Unit (Setting)
            stats.unit[r.setting] = (stats.unit[r.setting] || 0) + 1;

            // Outcome
            stats.outcome[r.outcome] = (stats.outcome[r.outcome] || 0) + 1;

            // Staff
            stats.staff[r.staffCategory] = (stats.staff[r.staffCategory] || 0) + 1;

            // Errors
            if (r.clinicErrors) {
                r.clinicErrors.forEach(err => {
                    stats.clinicErrors[err] = (stats.clinicErrors[err] || 0) + 1;
                });
            }
            if (r.pharmacyErrors) {
                r.pharmacyErrors.forEach(err => {
                    stats.pharmacyErrors[err] = (stats.pharmacyErrors[err] || 0) + 1;
                });
            }
        });

        // Generate Frequency Data (Group by Facility + Unit + Outcome)
        const freqMap = {};
        reports.forEach(r => {
            const key = `${r.facility}|${r.setting}|${r.outcome}`;
            if (!freqMap[key]) {
                freqMap[key] = { facility: r.facility, unit: r.setting, cat: r.outcome, count: 0 };
            }
            freqMap[key].count++;
        });
        stats.frequencyData = Object.values(freqMap).sort((a, b) => b.count - a.count).slice(0, 10); // Top 10

        return stats;
    },

    renderFrequencyRows: (data) => {
        if (data.length === 0) return '<tr><td colspan="5" style="text-align:center">No data available</td></tr>';
        return data.map((row, i) => `
            <tr>
                <td>${i + 1}.</td>
                <td>${Security.sanitize(row.facility)}</td>
                <td>${Security.sanitize(row.unit)}</td>
                <td>${Security.sanitize(row.cat)}</td>
                <td>${row.count}</td>
            </tr>
        `).join('');
    },

    renderGeneralRows: (reports) => {
        if (reports.length === 0) return '<tr><td colspan="6" style="text-align:center">No reports found</td></tr>';
        // Show last 10 reports
        return reports.slice(-10).reverse().map(r => `
            <tr>
                <td>${Security.sanitize(r.facility)}</td>
                <td>${new Date(r.date).toLocaleDateString()}</td>
                <td>${Security.sanitize(r.outcome)}</td>
                <td>${Security.sanitize(r.setting)}</td>
                <td>${Security.sanitize([...(r.pharmacyErrors || []), ...(r.clinicErrors || [])].join(', ') || '-')}</td>
                <td>${Security.sanitize(r.staffCategory)}</td>
            </tr>
        `).join('');
    },

    initCharts: (stats) => {
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } }
            }
        };

        // Helper to extract labels and data
        const getData = (obj) => ({
            labels: Object.keys(obj),
            data: Object.values(obj)
        });

        // 1. Facility (Bar)
        const facilityData = getData(stats.facility);
        new Chart(document.getElementById('chartFacility'), {
            type: 'bar',
            data: {
                labels: facilityData.labels,
                datasets: [{
                    label: 'Klinik Kesihatan',
                    data: facilityData.data,
                    backgroundColor: '#1976d2'
                }]
            },
            options: { ...commonOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });

        // 2. Unit (Donut)
        const unitData = getData(stats.unit);
        new Chart(document.getElementById('chartUnit'), {
            type: 'doughnut',
            data: {
                labels: unitData.labels,
                datasets: [{
                    data: unitData.data,
                    backgroundColor: ['#00bcd4', '#1976d2', '#e91e63']
                }]
            },
            options: commonOptions
        });

        // 3. Clinic Errors (Split into categories loosely based on names for demo, or just aggregate)
        // For this demo, we'll visualize the top clinic errors in the first chart and others as placeholders
        // In a real app, we'd need precise mapping of error strings to these specific charts
        const clinicErrData = getData(stats.clinicErrors);

        new Chart(document.getElementById('chartPrescriptionIncomplete'), {
            type: 'doughnut',
            data: {
                labels: clinicErrData.labels.slice(0, 5), // Top 5
                datasets: [{
                    data: clinicErrData.data.slice(0, 5),
                    backgroundColor: ['#1976d2', '#ff5722', '#7b1fa2', '#388e3c', '#c2185b']
                }]
            },
            options: commonOptions
        });

        // Placeholders for other clinic charts (using same data for demo visual completeness)
        new Chart(document.getElementById('chartRegimen'), {
            type: 'doughnut',
            data: {
                labels: clinicErrData.labels.slice(5, 10),
                datasets: [{
                    data: clinicErrData.data.slice(5, 10),
                    backgroundColor: ['#ff5722', '#1976d2', '#e91e63', '#fbc02d', '#388e3c']
                }]
            },
            options: commonOptions
        });
        new Chart(document.getElementById('chartPrescriptionInvalid'), {
            type: 'doughnut',
            data: {
                labels: clinicErrData.labels.slice(0, 3),
                datasets: [{
                    data: clinicErrData.data.slice(0, 3),
                    backgroundColor: ['#00bcd4', '#1976d2', '#e91e63']
                }]
            },
            options: commonOptions
        });
        new Chart(document.getElementById('chartOthers'), {
            type: 'doughnut',
            data: {
                labels: ['Others'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e91e63']
                }]
            },
            options: commonOptions
        });


        // 4. Pharmacy Errors
        const pharmErrData = getData(stats.pharmacyErrors);
        new Chart(document.getElementById('chartDataEntry'), {
            type: 'bar',
            data: {
                labels: pharmErrData.labels,
                datasets: [{
                    label: 'Count',
                    data: pharmErrData.data,
                    backgroundColor: ['#e91e63', '#1976d2', '#00bcd4']
                }]
            },
            options: { ...commonOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });

        // Placeholders for other pharmacy charts
        new Chart(document.getElementById('chartLabelling'), {
            type: 'bar',
            data: {
                labels: pharmErrData.labels,
                datasets: [{ label: 'Count', data: pharmErrData.data, backgroundColor: '#00838f' }]
            },
            options: { ...commonOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
        new Chart(document.getElementById('chartFilling'), {
            type: 'bar',
            data: {
                labels: pharmErrData.labels,
                datasets: [{ label: 'Count', data: pharmErrData.data, backgroundColor: '#1976d2' }]
            },
            options: { ...commonOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });


        // 5. Staff
        const staffData = getData(stats.staff);
        new Chart(document.getElementById('chartStaff'), {
            type: 'doughnut',
            data: {
                labels: staffData.labels,
                datasets: [{
                    data: staffData.data,
                    backgroundColor: ['#1976d2', '#ff9800', '#fbc02d', '#ff5722', '#e91e63']
                }]
            },
            options: commonOptions
        });

        // 6. Outcome
        const outcomeData = getData(stats.outcome);
        new Chart(document.getElementById('chartOutcome'), {
            type: 'pie',
            data: {
                labels: outcomeData.labels,
                datasets: [{
                    data: outcomeData.data,
                    backgroundColor: ['#ff5722', '#4caf50', '#e91e63', '#1976d2']
                }]
            },
            options: commonOptions
        });
    }
};
