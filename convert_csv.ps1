$ErrorActionPreference = "Stop"

try {
    Write-Host "Reading CSV..."
    $data = Import-Csv "report_data_import.csv"
    
    Write-Host "Converting to JSON..."
    $json = $data | ConvertTo-Json -Depth 4 -Compress
    
    # Escape single quotes in JSON to avoid JS string issues if we were formatting differently, 
    # but here we are just concatenating "const x = " + json, so it is fine.
    
    $jsPrefix = "const RAW_CSV_DATA = "
    $jsSuffix = ";"
    
    $jsLogic = @"

// Parsing Logic
try {
    if (typeof RAW_CSV_DATA !== 'undefined' && Array.isArray(RAW_CSV_DATA)) {
        const reports = RAW_CSV_DATA.map((row, index) => {
            const get = (k) => {
                // Try exact match first, then partial if needed? No, exact is safer.
                return row[k] || '';
            };
            const list = (k) => {
                const val = row[k];
                if (!val) return [];
                return val.split(',').map(s => s.trim()).filter(Boolean);
            };

            // Combine Clinic Error Columns
            const clinicErrors = [
                ...list('Preskripsi tidak lengkap'),
                ...list('Regimen tidak sesuai'),
                ...list('Preskripsi tidak sesuai'),
                ...list('Lain-lain')
            ];

            // Combine Pharmacy Error Columns
            const pharmacyErrors = [
                ...list('Data Entry'),
                ...list('Labelling'),
                ...list('Filling')
            ];

            // Date parsing (basic)
            let rawDateStr = get('Tarikh dan Masa Kejadian') || get('Timestamp');
            let dateStr = rawDateStr;
            
            // If dateStr is in DD/MM/YYYY HH:mm:ss format, convert to ISO 8601 YYYY-MM-DDTHH:mm:ss
            if (rawDateStr) {
                const parts = rawDateStr.split(' ');
                if (parts.length > 0) {
                    const dateParts = parts[0].split('/');
                    if (dateParts.length === 3) {
                        const day = dateParts[0].padStart(2, '0');
                        const month = dateParts[1].padStart(2, '0');
                        const year = dateParts[2];
                        const timePart = parts[1] || '00:00:00';
                        dateStr = `${year}-${month}-${day}T${timePart}`;
                    }
                }
            }

            return {
                id: 'csv_' + index,
                date: dateStr,
                facility: get('Fasiliti dimana kejadian kesilapan pengubatan berlaku'),
                setting: get('Unit dimana kejadian kesilapan pengubatan berlaku'),
                detection: get('Pengesanan Kesilapan'),
                outcome: get('Kategori'), // e.g. Kategori B
                staffCategory: get('Kategori individu yang membuat kesilapan'),
                clinicErrors: clinicErrors,
                pharmacyErrors: pharmacyErrors,
                // Add any other fields if necessary
                timestamp: get('Timestamp')
            };
        });

        // Filter out empty rows if any
        const validReports = reports.filter(r => r.facility);

        if (validReports.length > 0) {
            localStorage.setItem('medsafety_reports_db', JSON.stringify(validReports));
            console.log('MedSafety Pro: Successfully preloaded ' + validReports.length + ' reports from CSV.');
        } else {
            console.warn('MedSafety Pro: CSV data was empty or invalid.');
        }
    }
} catch (e) {
    console.error('MedSafety Pro: Error processing CSV data', e);
}
"@

    $finalContent = $jsPrefix + $json + $jsSuffix + "`n" + $jsLogic
    
    Write-Host "Writing to js/preload_reports.js..."
    Set-Content "js/preload_reports.js" $finalContent -Encoding UTF8
    
    Write-Host "Done."
}
catch {
    Write-Error $_
    exit 1
}
