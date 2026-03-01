/**
 * App Logic
 * Handles dashboard rendering and charts
 */

const App = {
    allReports: [],
    chartInstances: {},

    initDashboard: async (role) => {
        const mainBody = document.getElementById('main-body');

        // Show loading state briefly
        mainBody.innerHTML = '<div style="text-align:center; padding: 40px;"><p>Loading dashboard data...</p></div>';

        let isFirstLoad = true;
        let unsubscribe = null;

        unsubscribe = DB.listenToAllReports((fetchedReports) => {
            App.allReports = fetchedReports;

            if (isFirstLoad) {
                isFirstLoad = false;
                const reports = fetchedReports;
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
                            <div class="filter-bar" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                                <select id="filter-facility" class="filter-select"><option value="">Semua Fasiliti</option></select>
                                <select id="filter-unit" class="filter-select"><option value="">Semua Unit</option></select>
                                <select id="filter-detection" class="filter-select"><option value="">Semua Pengesanan</option></select>
                                <span style="font-size: 0.9rem; color: #64748b;">Dari:</span>
                                <input type="date" id="filter-date-start" class="filter-select">
                                <span style="font-size: 0.9rem; color: #64748b;">Hingga:</span>
                                <input type="date" id="filter-date-end" class="filter-select">
                                <button id="btn-reset-filters" class="btn btn-outline btn-sm" style="padding: 0.5rem 1rem;">Reset</button>
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

                // Populate Filters and Add Event Listeners
                App.populateFilters();
                App.setupFilterListeners();
            } else {
                // For sub-sequent real-time updates (like another user adding a report), 
                // quietly re-apply the current filters to re-render charts & tables!
                App.applyFilters();
            }
        });

        // Store unsubscribe if needed by UI to cleanup when leaving view
        App._dashboardUnsubscribe = unsubscribe;
    },

    populateFilters: () => {
        const facilities = new Set();
        const units = new Set();
        const detections = new Set();

        App.allReports.forEach(r => {
            if (r.facility) facilities.add(r.facility);
            if (r.setting) units.add(r.setting);
            if (r.detection) detections.add(r.detection);
        });

        const populateSelect = (id, items) => {
            const select = document.getElementById(id);
            if (!select) return;
            Array.from(items).sort().forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                // Friendly names for settings if possible
                if (item === 'ae') option.textContent = 'A&E';
                else if (item === 'outpatient') option.textContent = 'Outpatient';
                else if (item === 'pharmacy') option.textContent = 'Pharmacy';
                else option.textContent = item;
                select.appendChild(option);
            });
        };

        populateSelect('filter-facility', facilities);
        populateSelect('filter-unit', units);
        populateSelect('filter-detection', detections);
    },

    setupFilterListeners: () => {
        const filterElements = [
            'filter-facility', 'filter-unit', 'filter-detection',
            'filter-date-start', 'filter-date-end'
        ];

        filterElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', App.applyFilters);
            }
        });

        const resetBtn = document.getElementById('btn-reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                filterElements.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });
                App.applyFilters();
            });
        }
    },

    applyFilters: () => {
        const facility = document.getElementById('filter-facility').value;
        const unit = document.getElementById('filter-unit').value;
        const detection = document.getElementById('filter-detection').value;
        const dateStart = document.getElementById('filter-date-start').value;
        const dateEnd = document.getElementById('filter-date-end').value;

        const filteredReports = App.allReports.filter(r => {
            let match = true;
            if (facility && r.facility !== facility) match = false;
            if (unit && r.setting !== unit) match = false;
            if (detection && r.detection !== detection) match = false;

            if (dateStart || dateEnd) {
                const reportDate = new Date(r.date); // Assuming r.date is YYYY-MM-DD or parseable
                if (dateStart && new Date(dateStart) > reportDate) match = false;
                if (dateEnd) {
                    const end = new Date(dateEnd);
                    end.setHours(23, 59, 59, 999);
                    if (end < reportDate) match = false;
                }
            }
            return match;
        });

        // Update total cases count in DOM
        const totalCasesEl = document.querySelector('.total-cases .stat-value');
        if (totalCasesEl) {
            totalCasesEl.textContent = filteredReports.length;
        }

        // Re-render charts and tables
        const stats = App.calculateStats(filteredReports);

        // Update Frequency Table
        const tbodyFreq = document.querySelector('.chart-box .data-table tbody');
        if (tbodyFreq && tbodyFreq.parentElement.parentElement.previousElementSibling.textContent.includes('Kekerapan')) {
            tbodyFreq.innerHTML = App.renderFrequencyRows(stats.frequencyData);
        } else {
            // Fallback to find by query selector correctly
            const tables = document.querySelectorAll('.data-table');
            if (tables.length > 0) {
                tables[0].querySelector('tbody').innerHTML = App.renderFrequencyRows(stats.frequencyData);
            }
        }

        // Update General Table
        const tablesList = document.querySelectorAll('.data-table');
        if (tablesList.length > 1) {
            tablesList[1].querySelector('tbody').innerHTML = App.renderGeneralRows(filteredReports);
        }

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
                <td>${new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
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

        // Helper to destroy and replace chart instance
        const createOrUpdateChart = (id, type, data, options) => {
            const ctx = document.getElementById(id);
            if (!ctx) return;
            if (App.chartInstances[id]) {
                App.chartInstances[id].destroy();
            }
            App.chartInstances[id] = new Chart(ctx, { type, data, options });
        };

        // 1. Facility (Bar)
        const facilityData = getData(stats.facility);
        createOrUpdateChart('chartFacility', 'bar', {
            labels: facilityData.labels,
            datasets: [{
                label: 'Klinik Kesihatan',
                data: facilityData.data,
                backgroundColor: '#1976d2'
            }]
        }, { ...commonOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } });

        // 2. Unit (Donut)
        const unitData = getData(stats.unit);
        createOrUpdateChart('chartUnit', 'doughnut', {
            labels: unitData.labels,
            datasets: [{
                data: unitData.data,
                backgroundColor: ['#00bcd4', '#1976d2', '#e91e63']
            }]
        }, commonOptions);

        // 3. Clinic Errors
        const clinicErrData = getData(stats.clinicErrors);

        createOrUpdateChart('chartPrescriptionIncomplete', 'doughnut', {
            labels: clinicErrData.labels.slice(0, 5), // Top 5
            datasets: [{
                data: clinicErrData.data.slice(0, 5),
                backgroundColor: ['#1976d2', '#ff5722', '#7b1fa2', '#388e3c', '#c2185b']
            }]
        }, commonOptions);

        createOrUpdateChart('chartRegimen', 'doughnut', {
            labels: clinicErrData.labels.slice(5, 10),
            datasets: [{
                data: clinicErrData.data.slice(5, 10),
                backgroundColor: ['#ff5722', '#1976d2', '#e91e63', '#fbc02d', '#388e3c']
            }]
        }, commonOptions);

        createOrUpdateChart('chartPrescriptionInvalid', 'doughnut', {
            labels: clinicErrData.labels.slice(0, 3),
            datasets: [{
                data: clinicErrData.data.slice(0, 3),
                backgroundColor: ['#00bcd4', '#1976d2', '#e91e63']
            }]
        }, commonOptions);

        createOrUpdateChart('chartOthers', 'doughnut', {
            labels: ['Others'],
            datasets: [{
                data: [1],
                backgroundColor: ['#e91e63']
            }]
        }, commonOptions);


        // 4. Pharmacy Errors
        const pharmErrData = getData(stats.pharmacyErrors);
        createOrUpdateChart('chartDataEntry', 'bar', {
            labels: pharmErrData.labels,
            datasets: [{
                label: 'Count',
                data: pharmErrData.data,
                backgroundColor: ['#e91e63', '#1976d2', '#00bcd4']
            }]
        }, { ...commonOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } });

        createOrUpdateChart('chartLabelling', 'bar', {
            labels: pharmErrData.labels,
            datasets: [{ label: 'Count', data: pharmErrData.data, backgroundColor: '#00838f' }]
        }, { ...commonOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } });

        createOrUpdateChart('chartFilling', 'bar', {
            labels: pharmErrData.labels,
            datasets: [{ label: 'Count', data: pharmErrData.data, backgroundColor: '#1976d2' }]
        }, { ...commonOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } });


        // 5. Staff
        const staffData = getData(stats.staff);
        createOrUpdateChart('chartStaff', 'doughnut', {
            labels: staffData.labels,
            datasets: [{
                data: staffData.data,
                backgroundColor: ['#1976d2', '#ff9800', '#fbc02d', '#ff5722', '#e91e63']
            }]
        }, commonOptions);

        // 6. Outcome
        const outcomeData = getData(stats.outcome);
        createOrUpdateChart('chartOutcome', 'pie', {
            labels: outcomeData.labels,
            datasets: [{
                data: outcomeData.data,
                backgroundColor: ['#ff5722', '#4caf50', '#e91e63', '#1976d2']
            }]
        }, commonOptions);
    }
};
