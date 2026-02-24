import csv
import json
import os
from datetime import datetime

# Input and Output paths
CSV_FILE_PATH = 'report_data_import.csv'
OUTPUT_JS_PATH = 'js/preload_reports.js'

def parse_date(date_str):
    # Try parsing date with multiple formats
    formats = [
        '%d/%m/%Y %H:%M:%S',
        '%d/%m/%Y %H:%M',
        '%d/%m/%Y',
        '%m/%d/%Y %H:%M:%S',
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).isoformat()
        except ValueError:
            continue
    return date_str # Return original if parse fails

def main():
    if not os.path.exists(CSV_FILE_PATH):
        print(f"Error: {CSV_FILE_PATH} not found.")
        return

    reports = []

    with open(CSV_FILE_PATH, mode='r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        
        for row in reader:
            # Extract basic info
            report = {
                'id': row.get('Timestamp', '') + row.get('Nama individu yang membuat kesilapan pengubatan', ''), # Simple unique ID key
                'date': parse_date(row.get('Tarikh dan Masa Kejadian', row.get('Timestamp', ''))),
                'facility': row.get('Fasiliti dimana kejadian kesilapan pengubatan berlaku', ''),
                'setting': row.get('Unit dimana kejadian kesilapan pengubatan berlaku', ''),
                'outcome': row.get('Kategori', ''),
                'staffCategory': row.get('Kategori individu yang membuat kesilapan', ''),
                'clinicErrors': [],
                'pharmacyErrors': []
            }

            # Map Clinic Errors
            clinic_cols = [
                'Preskripsi tidak lengkap',
                'Regimen tidak sesuai',
                'Preskripsi tidak sesuai',
                'Lain-lain'
            ]
            for col in clinic_cols:
                val = row.get(col, '').strip()
                if val:
                    # Some cells might be comma separated strings, split them
                    parts = [p.strip() for p in val.split(',') if p.strip()]
                    report['clinicErrors'].extend(parts)

            # Map Pharmacy Errors
            pharmacy_cols = [
                'Data Entry',
                'Labelling',
                'Filling'
            ]
            for col in pharmacy_cols:
                val = row.get(col, '').strip()
                if val:
                    parts = [p.strip() for p in val.split(',') if p.strip()]
                    report['pharmacyErrors'].extend(parts)
            
            reports.append(report)

    # Generate JS content
    js_content = f"""/**
 * Preloaded Report Data from CSV Import
 * Generated on: {datetime.now().isoformat()}
 */

const IMPORTED_REPORTS = {json.dumps(reports, indent=4)};

// Simplify initialization logic: overwrite existing data to ensure stats are fresh
try {{
    localStorage.setItem('medsafety_reports_db', JSON.stringify(IMPORTED_REPORTS));
    console.log('MedSafety Pro: Statistics data updated from local CSV import (' + IMPORTED_REPORTS.length + ' records).');
}} catch (e) {{
    console.error('MedSafety Pro: Failed to update local storage', e);
}}
"""

    with open(OUTPUT_JS_PATH, "w", encoding='utf-8') as js_file:
        js_file.write(js_content)
    
    print(f"Successfully processed {len(reports)} reports.")
    print(f"Generated {OUTPUT_JS_PATH}")

if __name__ == "__main__":
    main()
