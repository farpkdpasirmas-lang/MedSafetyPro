/**
 * Admin Service
 * Handles user management, report management, and system maintenance
 */

// Embedded staff data - automatically available
// Duplicate STAFF_DATA definition removed

const AdminService = {
    // ============= USER MANAGEMENT =============
    getAllUsers: async () => {
        return await DB.getAllUsers();
    },

    deleteUser: async (userId) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        await DB.deleteUser(userId);
        AdminApp.renderUserList();
    },

    // ============= REPORT MANAGEMENT =============
    getAllReports: async () => {
        try {
            return await DB.getAllReports();
        } catch (e) {
            console.error("Failed to load reports", e);
            return [];
        }
    },

    getReportById: async (id) => {
        const reports = await AdminService.getAllReports();
        return reports.find(r => r.id === id);
    },

    updateReport: async (id, data) => {
        // NOTE: DB.js doesn't have update/delete yet implies standard Firestore operations
        // For now, we'll try to use DB.saveReport (simulating set/merge) if applicable, 
        // OR we need to add update capability to DB.js. 
        // Given complexity, let's stick to LocalStorage for strictly Admin simulated edits 
        // UNLESS we update DB.js.
        // Let's UPDATE DB.js later if needed. For now, we will fetch, modify, and save back if it was localStorage.
        // If Firestore, we need real update logic.

        // Simulating update via overwrite for now (User asked for "Proceed for all", but I didn't verify DB update capability)
        // I'll leave this as TODO or basic implementation:

        if (db) {
            try {
                await db.collection(DB.COLLECTION_REPORTS).doc(id).update({ ...data, updatedAt: new Date().toISOString() });
                return true;
            } catch (e) {
                console.error(e);
                return false;
            }
        } else {
            const reports = JSON.parse(localStorage.getItem('medsafety_reports_db') || '[]');
            const index = reports.findIndex(r => r.id === id);
            if (index !== -1) {
                reports[index] = { ...reports[index], ...data, updatedAt: new Date().toISOString() };
                localStorage.setItem('medsafety_reports_db', JSON.stringify(reports));
                return true;
            }
            return false;
        }
    },

    deleteReport: async (id) => {
        if (!confirm('Are you sure you want to delete this report?')) return false;

        if (db) {
            try {
                await db.collection(DB.COLLECTION_REPORTS).doc(id).delete();
                AdminApp.renderReportList();
                AdminApp.renderDashboardStats();
                return true;
            } catch (e) {
                console.error(e);
                return false;
            }
        } else {
            const reports = JSON.parse(localStorage.getItem('medsafety_reports_db') || '[]');
            const newReports = reports.filter(r => r.id !== id);
            localStorage.setItem('medsafety_reports_db', JSON.stringify(newReports));
            AdminApp.renderReportList();
            AdminApp.renderDashboardStats();
            return true;
        }
    },

    bulkDeleteReports: async (ids) => {
        if (!confirm(`Are you sure you want to delete ${ids.length} report(s)?`)) return false;

        if (db) {
            // Firestore batch delete
            const batch = db.batch();
            ids.forEach(id => {
                const ref = db.collection(DB.COLLECTION_REPORTS).doc(id);
                batch.delete(ref);
            });
            await batch.commit();
            AdminApp.renderReportList();
            AdminApp.renderDashboardStats();
            return true;
        } else {
            const reports = JSON.parse(localStorage.getItem('medsafety_reports_db') || '[]');
            const newReports = reports.filter(r => !ids.includes(r.id));
            localStorage.setItem('medsafety_reports_db', JSON.stringify(newReports));
            AdminApp.renderReportList();
            AdminApp.renderDashboardStats();
            return true;
        }
    },

    searchReports: (query) => {
        const reports = AdminService.getAllReports();
        const lowerQuery = query.toLowerCase();

        return reports.filter(r =>
            r.facility?.toLowerCase().includes(lowerQuery) ||
            r.staffName?.toLowerCase().includes(lowerQuery) ||
            r.staffEmail?.toLowerCase().includes(lowerQuery) ||
            r.description?.toLowerCase().includes(lowerQuery)
        );
    },

    filterReports: (filters) => {
        let reports = AdminService.getAllReports();

        if (filters.facility && filters.facility !== 'all') {
            reports = reports.filter(r => r.facility === filters.facility);
        }

        if (filters.setting && filters.setting !== 'all') {
            reports = reports.filter(r => r.setting === filters.setting);
        }

        if (filters.dateFrom) {
            reports = reports.filter(r => new Date(r.date) >= new Date(filters.dateFrom));
        }

        if (filters.dateTo) {
            reports = reports.filter(r => new Date(r.date) <= new Date(filters.dateTo));
        }

        return reports;
    },

    // ============= DATA EXPORT =============
    exportReportsToCSV: () => {
        const reports = AdminService.getAllReports();

        if (reports.length === 0) {
            alert('No reports to export');
            return;
        }

        // CSV Headers
        const headers = ['ID', 'Date', 'Time', 'Facility', 'Setting', 'Error Types', 'Staff Name', 'Staff Email', 'Staff Category', 'Outcome', 'Description', 'Created At'];

        // CSV Rows
        const rows = reports.map(r => [
            r.id,
            r.date || '',
            r.time || '',
            r.facility || '',
            r.setting || '',
            (r.errorTypes || []).join('; '),
            r.staffName || '',
            r.staffEmail || '',
            r.staffCategory || '',
            r.outcome || '',
            (r.description || '').replace(/"/g, '""'),
            r.createdAt || ''
        ]);

        // Build CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `medsafety_reports_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    },

    exportReportsToJSON: () => {
        const reports = AdminService.getAllReports();

        if (reports.length === 0) {
            alert('No reports to export');
            return;
        }

        const jsonContent = JSON.stringify(reports, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `medsafety_reports_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    },

    // ============= BACKUP & RESTORE =============
    backupAllData: async () => {
        const backup = {
            users: await AdminService.getAllUsers(),
            reports: await AdminService.getAllReports(),
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        const jsonContent = JSON.stringify(backup, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `medsafety_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    },

    restoreFromBackup: (file) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);

                if (!backup.users || !backup.reports) {
                    alert('Invalid backup file format');
                    return;
                }

                if (!confirm('This will replace all current data. Are you sure?')) return;

                localStorage.setItem('medsafety_users_db', JSON.stringify(backup.users));
                localStorage.setItem('medsafety_reports_db', JSON.stringify(backup.reports));

                alert('Data restored successfully! Refreshing page...');
                window.location.reload();
            } catch (error) {
                alert('Error reading backup file: ' + error.message);
            }
        };

        reader.readAsText(file);
    },

    // ============= STATISTICS =============
    getSystemStats: async () => {
        const reports = await AdminService.getAllReports();
        const users = await AdminService.getAllUsers();

        // Facility breakdown
        const facilityStats = {};
        reports.forEach(r => {
            if (r.facility) {
                facilityStats[r.facility] = (facilityStats[r.facility] || 0) + 1;
            }
        });

        // Setting breakdown
        const settingStats = {};
        reports.forEach(r => {
            if (r.setting) {
                settingStats[r.setting] = (settingStats[r.setting] || 0) + 1;
            }
        });

        // Recent reports (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentReports = reports.filter(r => new Date(r.createdAt) >= sevenDaysAgo);

        return {
            totalReports: reports.length,
            totalUsers: users.length,
            recentReports: recentReports.length,
            facilityStats,
            settingStats,
            latestReport: reports.length > 0 ? reports[reports.length - 1] : null
        };
    },

    // ============= SYSTEM ACTIONS =============
    resetSystem: () => {
        if (!confirm('WARNING: This will delete ALL data including users and reports. Are you sure?')) return;

        localStorage.clear();
        alert('System reset successfully. You will be logged out.');
        window.location.href = '../login.html';
    },

    // ============= STAFF DATA MANAGEMENT =============
    downloadStaffTemplate: () => {
        const template = `facility,name,position,email,category
KK Bandar Pasir Mas,Dr. Ahmad bin Ali,Pakar,ahmad@moh.gov.my,Medical Specialist / FMS
KK Bandar Pasir Mas,Pn. Siti binti Hassan,Pegawai Perubatan,siti@moh.gov.my,Medical Officer (MO)
KK Bandar Pasir Mas,En. Mohd bin Ibrahim,Penolong Pegawai Perubatan,mohd@moh.gov.my,Assistant Medical Officer (MA)
KK Rantau Panjang,Dr. Fatimah binti Yusof,Pakar,fatimah@moh.gov.my,Medical Specialist / FMS`;

        const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'staff_data_template.csv';
        link.click();
    },

    exportCurrentStaffData: () => {
        // Load staff_data.js to get current data
        const staffDataScript = document.createElement('script');
        staffDataScript.src = '../js/staff_data.js';

        staffDataScript.onload = () => {
            if (typeof STAFF_DATA === 'undefined') {
                alert('Staff data not found');
                return;
            }

            // Convert STAFF_DATA object to CSV format
            const rows = ['facility,name,position,email,category'];

            for (const [facility, staffList] of Object.entries(STAFF_DATA)) {
                staffList.forEach(staff => {
                    const row = [
                        facility,
                        staff.name || '',
                        staff.position || '',
                        staff.email || '',
                        staff.category || ''
                    ].map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',');
                    rows.push(row);
                });
            }

            const csvContent = rows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `staff_data_export_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        };

        document.head.appendChild(staffDataScript);
    },

    importStaffData: (file) => {
        const reader = new FileReader();

        console.log('Reading CSV file:', file.name, file.size, file.type);

        reader.onload = (e) => {
            try {
                let csvContent = e.target.result;

                // Remove BOM if present (Excel export often adds this)
                if (csvContent.charCodeAt(0) === 0xFEFF) {
                    csvContent = csvContent.slice(1);
                }

                const lines = csvContent.split(/\r?\n/).filter(line => line.trim());

                if (lines.length < 2) {
                    AdminService.showImportStatus('error', 'CSV file is empty or invalid (less than 2 lines)');
                    return;
                }

                // Parse header using helper to handle quotes
                // Header might be: "facility","name",...
                const headerRaw = AdminService.parseCSVLine(lines[0]);
                const header = headerRaw.map(h => h.toLowerCase().trim().replace(/^"|"$/g, ''));

                console.log('Parsed Header:', header);

                const requiredColumns = ['facility', 'name', 'position', 'email', 'category'];

                // Validate header
                const missingColumns = requiredColumns.filter(col => !header.includes(col));
                if (missingColumns.length > 0) {
                    const msg = `Missing required columns: ${missingColumns.join(', ')}.<br>Found: ${header.join(', ')}`;
                    AdminService.showImportStatus('error', msg);
                    console.error(msg);
                    return;
                }

                // Get column indices
                const indices = {
                    facility: header.indexOf('facility'),
                    name: header.indexOf('name'),
                    position: header.indexOf('position'),
                    email: header.indexOf('email'),
                    category: header.indexOf('category')
                };

                // Parse data rows
                const newStaffData = {};
                let successCount = 0;
                let errors = [];

                for (let i = 1; i < lines.length; i++) {
                    try {
                        const line = lines[i].trim();
                        if (!line) continue;

                        const row = AdminService.parseCSVLine(line);

                        if (row.length < requiredColumns.length) {
                            // Only warn if it's significantly short, might be empty line artifact
                            if (row.length > 1) {
                                errors.push(`Line ${i + 1}: Insufficient columns (Expected ${requiredColumns.length}, got ${row.length})`);
                            }
                            continue;
                        }

                        const facility = row[indices.facility]?.trim();
                        const name = row[indices.name]?.trim();
                        const position = row[indices.position]?.trim();
                        const email = row[indices.email]?.trim();
                        const category = row[indices.category]?.trim();

                        if (!facility || !name) {
                            errors.push(`Line ${i + 1}: Missing facility or name`);
                            continue;
                        }

                        // Initialize facility array if needed
                        if (!newStaffData[facility]) {
                            newStaffData[facility] = [];
                        }

                        // Add staff member
                        newStaffData[facility].push({
                            name,
                            position,
                            email,
                            category
                        });

                        successCount++;
                    } catch (err) {
                        errors.push(`Line ${i + 1}: ${err.message}`);
                    }
                }

                if (successCount === 0) {
                    AdminService.showImportStatus('error', 'No valid staff data found in CSV');
                    return;
                }

                // Show preview and confirmation
                const facilityCount = Object.keys(newStaffData).length;
                const confirmMsg = `Parsed ${successCount} staff members across ${facilityCount} facilities.\n\n`;
                const warningMsg = errors.length > 0 ? `\nWarnings:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more` : ''}` : '';

                if (!confirm(confirmMsg + 'This will update staff_data.js in localStorage. Continue?' + warningMsg)) {
                    AdminService.showImportStatus('info', 'Import cancelled');
                    return;
                }

                // Generate new staff_data.js content
                const jsContent = `const STAFF_DATA = ${JSON.stringify(newStaffData, null, 4)};`;

                // Store in localStorage for the application to use
                localStorage.setItem('staff_data_override', JSON.stringify(newStaffData));

                // Update global STAFF_DATA for immediate use
                if (typeof window !== 'undefined') {
                    window.STAFF_DATA = newStaffData;
                }

                // Notify success
                AdminService.showImportStatus('success',
                    `✅ Successfully imported ${successCount} staff members!<br>` +
                    `📊 Facilities: ${facilityCount}<br>` +
                    (errors.length > 0 ? `⚠️ Warnings: ${errors.length}<br>` : '') +
                    '<br><strong>Note:</strong> The report form will now use the updated staff data. To make this permanent, you need to update the staff_data.js file manually or download it below.'
                );


                // Offer to download the new JS file
                setTimeout(() => {
                    if (confirm('Would you like to download the updated staff_data.js file?')) {
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = 'staff_data.js';
                        link.click();
                    }
                }, 1000);

                // Refresh staff list display
                if (typeof AdminApp !== 'undefined' && AdminApp.renderStaffList) {
                    AdminApp.renderStaffList();
                }

            } catch (error) {
                AdminService.showImportStatus('error', `Error parsing CSV: ${error.message}`);
                console.error(error);
            }
        };

        reader.onerror = () => {
            AdminService.showImportStatus('error', 'Failed to read file');
        };

        reader.readAsText(file);
    },

    parseCSVLine: (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current); // Add last field

        return result;
    },

    showImportStatus: (type, message) => {
        const statusDiv = document.getElementById('import-status');
        if (!statusDiv) return;

        const colors = {
            success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
            error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
            info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' }
        };

        const color = colors[type] || colors.info;

        statusDiv.style.display = 'block';
        statusDiv.style.background = color.bg;
        statusDiv.style.border = `2px solid ${color.border}`;
        statusDiv.style.color = color.text;
        statusDiv.innerHTML = message;

        // Auto-hide after 10 seconds for success/info
        if (type !== 'error') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 10000);
        }
    }

};
// ============= ADMIN APP UI =============
const AdminApp = {
    currentView: 'dashboard',
    selectedReports: new Set(),

    init: async () => {
        // Initial render
        await AdminApp.renderDashboardStats();
        await AdminApp.renderReportList();
        AdminApp.renderUserList();
        AdminApp.renderStaffList();

        AdminApp.setupEventListeners();
        AdminApp.updateBulkActions();

        // Handle initial navigation
        AdminApp.handleNavigation();

        // Listen for hash changes
        window.addEventListener('hashchange', () => AdminApp.handleNavigation());
    },

    handleNavigation: () => {
        const hash = window.location.hash || '#reports';
        const statsView = document.getElementById('view-stats');
        const reportsView = document.getElementById('view-reports');

        // Update sidebar links active state
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(link => {
            if (link.href.includes(hash)) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        if (hash === '#stats') {
            if (statsView) statsView.style.display = 'block';
            if (reportsView) reportsView.style.display = 'none';
        } else {
            // Default to reports view
            if (statsView) statsView.style.display = 'none';
            if (reportsView) reportsView.style.display = 'block';
        }
    },

    setupEventListeners: () => {
        // Search functionality
        const searchInput = document.getElementById('report-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const results = AdminService.searchReports(e.target.value);
                AdminApp.renderReportList(results);
            });
        }

        // Backup restore file input
        const restoreInput = document.getElementById('restore-file');
        if (restoreInput) {
            restoreInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    AdminService.restoreFromBackup(e.target.files[0]);
                }
            });
        }

        // Staff import file input
        const staffImportInput = document.getElementById('staff-import-file');
        if (staffImportInput) {
            staffImportInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    AdminService.importStaffData(e.target.files[0]);
                    e.target.value = ''; // Reset input
                }
            });
        }

        // Admin Auth Check
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                AuthService.logout();
            });
        }

        // Modal Close
        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = AdminApp.closeModal;
        }
        window.onclick = (event) => {
            const modal = document.getElementById('report-modal');
            if (event.target == modal) AdminApp.closeModal();
        };
    },

    renderDashboardStats: async () => {
        const statsContainer = document.getElementById('dashboard-stats');
        if (!statsContainer) return;

        // Fetch Real Data using AdminService logic
        const reports = await AdminService.getAllReports();
        const stats = AdminApp.calculateStats(reports);
        const users = await AdminService.getAllUsers();

        // Inject Full Dashboard Structure
        statsContainer.innerHTML = `
            <div class="dashboard-container" style="width: 100%;">
                <!-- Top Stats & Filters -->
                <div class="dashboard-header-row">
                    <div class="stat-box total-cases">
                        <div class="stat-label">Jumlah Kes</div>
                        <div class="stat-value">${reports.length}</div>
                    </div>
                </div>

                <div class="dashboard-header-row" style="margin-top: 1rem;">
                    <div class="stat-box">
                         <div class="stat-label">Total Users</div>
                         <div class="stat-value">${users.length}</div>
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

                <!-- SECTION 4: OUTCOME -->
                <div class="charts-row">
                    <div class="chart-box" style="flex: 1;">
                        <div class="section-header" style="margin: -1rem -1rem 1rem -1rem; border-radius: 4px 4px 0 0;">Kategori Error Outcome</div>
                        <div class="chart-wrapper">
                            <canvas id="chartOutcome"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize Charts with Real Data
        AdminApp.initCharts(stats);
    },

    calculateStats: (reports) => {
        const stats = {
            facility: {},
            unit: {},
            clinicErrors: {},
            pharmacyErrors: {},
            outcome: {},
            staff: {},
            frequencyData: []
        };

        reports.forEach(r => {
            stats.facility[r.facility] = (stats.facility[r.facility] || 0) + 1;
            stats.unit[r.setting] = (stats.unit[r.setting] || 0) + 1;
            stats.outcome[r.outcome] = (stats.outcome[r.outcome] || 0) + 1;
            stats.staff[r.staffCategory] = (stats.staff[r.staffCategory] || 0) + 1;

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

        return stats;
    },

    initCharts: (stats) => {
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } }
            }
        };

        const getData = (obj) => ({
            labels: Object.keys(obj),
            data: Object.values(obj)
        });

        // 1. Facility
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

        // 2. Unit
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

        // 3. Clinic Errors
        const clinicErrData = getData(stats.clinicErrors);
        const clinicCharts = [
            { id: 'chartPrescriptionIncomplete', slice: [0, 5] },
            { id: 'chartRegimen', slice: [5, 10] },
            { id: 'chartPrescriptionInvalid', slice: [0, 3] },
            { id: 'chartOthers', slice: [0, 1] } // Placeholder
        ];

        clinicCharts.forEach((chart, index) => {
            const el = document.getElementById(chart.id);
            if (el) {
                new Chart(el, {
                    type: 'doughnut',
                    data: {
                        labels: clinicErrData.labels.slice(...chart.slice),
                        datasets: [{
                            data: clinicErrData.data.slice(...chart.slice),
                            backgroundColor: ['#1976d2', '#ff5722', '#7b1fa2', '#388e3c', '#c2185b']
                        }]
                    },
                    options: commonOptions
                });
            }
        });

        // 4. Pharmacy Errors
        const pharmErrData = getData(stats.pharmacyErrors);
        const pharmCharts = ['chartDataEntry', 'chartLabelling', 'chartFilling'];
        pharmCharts.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                new Chart(el, {
                    type: 'bar',
                    data: {
                        labels: pharmErrData.labels,
                        datasets: [{ label: 'Count', data: pharmErrData.data, backgroundColor: '#1976d2' }]
                    },
                    options: { ...commonOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
                });
            }
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
    },

    renderReportList: async (reportsToRender = null) => {
        const tbody = document.getElementById('report-table-body');
        if (!tbody) return;

        let reports = reportsToRender;
        if (!reports) {
            reports = await AdminService.getAllReports();
        }

        // Sort by date desc
        reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (reports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem;">No reports found</td></tr>';
            return;
        }

        tbody.innerHTML = reports.map(r => `
            <tr>
                <td><input type="checkbox" class="report-checkbox" value="${r.id}" onchange="AdminApp.toggleSelectReport('${r.id}')"></td>
                <td>${Security.sanitize(r.facility)}</td>
                <td>${new Date(r.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                <td>${Security.sanitize(r.setting)}</td>
                <td>${Security.sanitize(r.reporterName)}</td>
                <td>${Security.sanitize(r.staffName)}</td>
                <td><span class="badge badge-${AdminApp.getOutcomeBadgeClass(r.outcome)}">${Security.sanitize(r.outcome)}</span></td>
                <td>
                    <button class="btn-sm btn-outline" onclick="AdminApp.viewReport('${r.id}')">View</button>
                    <button class="btn-sm btn-danger" onclick="AdminService.deleteReport('${r.id}')">Delete</button>
                </td>
            </tr>
         `).join('');
    },

    getOutcomeBadgeClass: (outcome) => {
        if (!outcome) return 'secondary';
        const lower = outcome.toLowerCase();
        if (lower.includes('no harm')) return 'warning';
        if (lower.includes('harm')) return 'danger';
        if (lower.includes('no error')) return 'success';
        return 'primary';
    },

    toggleSelectReport: (id) => {
        if (AdminApp.selectedReports.has(id)) {
            AdminApp.selectedReports.delete(id);
        } else {
            AdminApp.selectedReports.add(id);
        }
        AdminApp.updateBulkActions();
    },

    updateBulkActions: () => {
        const bulkActions = document.getElementById('bulk-actions');
        if (bulkActions) {
            bulkActions.style.display = AdminApp.selectedReports.size > 0 ? 'block' : 'none';
            const count = document.getElementById('selected-count');
            if (count) count.textContent = AdminApp.selectedReports.size;
        }
    },

    bulkDelete: () => {
        const ids = Array.from(AdminApp.selectedReports);
        // bulkDeleteReports is async
        AdminService.bulkDeleteReports(ids).then(success => {
            if (success) {
                AdminApp.selectedReports.clear();
                AdminApp.updateBulkActions();
            }
        });
    },

    viewReport: async (id) => {
        const report = await AdminService.getReportById(id);
        if (!report) return;

        const modal = document.getElementById('report-modal');
        const modalBody = document.getElementById('modal-body');

        if (!modal || !modalBody) return;

        modalBody.innerHTML = `
            <div style="display: grid; gap: 1rem;">
                <div><strong>Report ID:</strong> ${report.id}</div>
                <div><strong>Date:</strong> ${report.date || 'N/A'} ${report.time || ''}</div>
                <div><strong>Facility:</strong> ${Security.sanitize(report.facility) || 'N/A'}</div>
                <div><strong>Setting:</strong> ${Security.sanitize(report.setting) || 'N/A'}</div>
                <div><strong>Error Types:</strong> ${Security.sanitize((report.errorTypes || []).join(', ')) || 'N/A'}</div>
                <div><strong>Staff Name:</strong> ${Security.sanitize(report.staffName) || 'N/A'}</div>
                <div><strong>Staff Email:</strong> ${Security.sanitize(report.staffEmail) || 'N/A'}</div>
                <div><strong>Staff Category:</strong> ${Security.sanitize(report.staffCategory) || 'N/A'}</div>
                <div><strong>Outcome:</strong> ${Security.sanitize(report.outcome) || 'N/A'}</div>
                <div><strong>Description:</strong><br>${Security.sanitize(report.description) || 'N/A'}</div>
                <div><strong>Created:</strong> ${report.createdAt ? new Date(report.createdAt).toLocaleString() : 'N/A'}</div>
            </div>
        `;

        modal.style.display = 'flex';
    },

    closeModal: () => {
        const modal = document.getElementById('report-modal');
        if (modal) modal.style.display = 'none';
    },

    renderUserList: async () => {
        // Render Admins
        const adminTbody = document.getElementById('admin-table-body');
        const userTbody = document.getElementById('user-table-body');

        if (!adminTbody || !userTbody) return;

        const allUsers = await AdminService.getAllUsers();

        const admins = allUsers.filter(u => u.role === 'admin');
        const users = allUsers.filter(u => u.role !== 'admin');

        const renderRow = (user, isAdminTable) => `
            <tr>
                <td>
                    <div style="font-weight: 500; color: var(--color-text-main);">${user.fullname || 'Unknown'}</div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="status-badge status-${user.role === 'admin' ? 'admin' : 'reporter'}">
                        ${user.role ? user.role.toUpperCase() : 'USER'}
                    </span>
                </td>
                <td style="text-align: right;">
                    ${!isAdminTable ? `
                    <button onclick="AdminService.deleteUser('${user.id}')" class="btn-icon" title="Delete User" style="color: #ef4444;">
                        🗑️
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;

        // Render Admins
        if (admins.length === 0) {
            adminTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem;">No admins found</td></tr>';
        } else {
            adminTbody.innerHTML = admins.map(u => renderRow(u, true)).join('');
        }

        // Render Users
        if (users.length === 0) {
            userTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem;">No users/reporters found</td></tr>';
        } else {
            userTbody.innerHTML = users.map(u => renderRow(u, false)).join('');
        }
    },

    renderStaffList: () => {
        // Get staff data from localStorage or global STAFF_DATA
        let allStaff = null;
        const storedData = localStorage.getItem('staff_data_override');
        if (storedData) {
            try {
                allStaff = JSON.parse(storedData);
            } catch (e) {
                console.error('Error parsing staff data:', e);
            }
        }

        // Fallback to global STAFF_DATA if available
        if (!allStaff && typeof STAFF_DATA !== 'undefined') {
            allStaff = STAFF_DATA;
        }

        const tbody = document.getElementById('staff-table-body');
        const staffCountEl = document.getElementById('staff-count');
        const facilityFilter = document.getElementById('facility-filter');

        if (!tbody) return;

        // If no staff data, show empty state
        if (!allStaff || Object.keys(allStaff).length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">No staff data found. Please import staff data using CSV or Google Sheets sync.</td></tr>';
            if (staffCountEl) staffCountEl.textContent = '0 staff members';
            return;
        }

        // Flatten staff data for easier display
        const staffList = [];
        for (const [facility, staffArray] of Object.entries(allStaff)) {
            staffArray.forEach(staff => {
                staffList.push({
                    facility,
                    name: staff.name || '',
                    position: staff.position || '',
                    email: staff.email || '',
                    category: staff.category || ''
                });
            });
        }

        // Update staff count
        if (staffCountEl) {
            staffCountEl.textContent = `${staffList.length} staff member${staffList.length !== 1 ? 's' : ''}`;
        }

        // Update facility filter dropdown
        if (facilityFilter) {
            const facilities = [...new Set(staffList.map(s => s.facility))].sort();
            const currentValue = facilityFilter.value;
            facilityFilter.innerHTML = '<option value="all">All Facilities</option>' +
                facilities.map(f => `<option value="${Security.sanitize(f)}">${Security.sanitize(f)}</option>`).join('');
            if (facilities.includes(currentValue)) {
                facilityFilter.value = currentValue;
            }
        }

        // Apply search and filter
        const searchTerm = document.getElementById('staff-search')?.value.toLowerCase() || '';
        const selectedFacility = facilityFilter?.value || 'all';

        const filteredStaff = staffList.filter(staff => {
            const matchesSearch = !searchTerm ||
                staff.name.toLowerCase().includes(searchTerm) ||
                staff.email.toLowerCase().includes(searchTerm) ||
                staff.position.toLowerCase().includes(searchTerm);

            const matchesFacility = selectedFacility === 'all' || staff.facility === selectedFacility;

            return matchesSearch && matchesFacility;
        });

        // Render table
        if (filteredStaff.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">No staff found matching your search.</td></tr>';
            return;
        }

        tbody.innerHTML = filteredStaff.map(staff => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 0.75rem;">
                    <span style="padding: 0.25rem 0.5rem; background: #e0f2f1; color: var(--color-primary); border-radius: 4px; font-size: 0.75rem; font-weight: 500;">
                        ${Security.sanitize(staff.facility)}
                    </span>
                </td>
                <td style="padding: 0.75rem; font-weight: 500;">${Security.sanitize(staff.name)}</td>
                <td style="padding: 0.75rem; color: var(--color-text-muted);">${Security.sanitize(staff.position)}</td>
                <td style="padding: 0.75rem;">
                    ${staff.email ? `<a href="mailto:${Security.sanitize(staff.email)}" style="color: var(--color-primary); text-decoration: none;">${Security.sanitize(staff.email)}</a>` : '<span style="color: var(--color-text-muted);">-</span>'}
                </td>
                <td style="padding: 0.75rem; font-size: 0.875rem; color: var(--color-text-muted);">${Security.sanitize(staff.category) || '-'}</td>
            </tr>
        `).join('');
    },
};

// Expose to window object for global access
window.AdminApp = AdminApp;
window.AdminService = AdminService;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const user = AuthService.getCurrentUser();
    if (!user || user.role !== 'admin') {
        window.location.href = '../login.html';
        return;
    }

    // Initialize app
    AdminApp.init();
});
