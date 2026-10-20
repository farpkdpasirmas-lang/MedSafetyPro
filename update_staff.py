import io
import json
import csv
import re
import urllib.request
import zipfile
import xml.etree.ElementTree as ET

SHEET_URL = "https://docs.google.com/spreadsheets/d/1Nb4q100uTb-6MvLqHOA1Z-mc_lW2aaAksFA5R2qzNHA/export?format=xlsx"

SHEET_MAPPING = {
    'KKBPM': 'KK Bandar Pasir Mas',
    'KKRP': 'KK Rantau Panjang',
    'KKM': 'KK Meranti',
    'KKT': 'KK Tendong',
    'KK Kangkong': 'KK Kangkong',
    'KKTU': "KK To' Uban",
    'KKC': 'KK Chekok',
    'KKSK': 'KK Sungai Keladi',
    'KKGP': 'KK Gual Periok',
    'KK Kasar': 'KK Kasar',
    'KKPK': 'KK Pangkal Kala',
    'KKCH': 'KK Cherang Hangus',
    'KKBP': 'KK Baroh Pial'
}

CATEGORY_MAPPING = {
    'Pakar': 'Medical Specialist / FMS',
    'Pegawai Perubatan': 'Medical Officer (MO)',
    'Pegawai Pergigian': 'Medical Officer (MO)',
    'Penolong Pegawai Perubatan': 'Assistant Medical Officer (MA)',
    'Pegawai Farmasi': 'Pharmacist (PF)',
    'Penolong Pegawai Farmasi': 'Assistant Pharmacist (PPF)',
    'Ketua Jururawat': 'Nurse',
    'Penyelia Jururawat': 'Nurse',
    'Jururawat Kesihatan': 'Nurse',
    'Jururawat Masyarakat': 'Nurse'
}

SECTION_HEADERS = {
    'PEGAWAI PERUBATAN',
    'PENOLONG PEGAWAI PERUBATAN',
    'PEGAWAI FARMASI',
    'PENOLONG PEGAWAI FARMASI',
    'JURURAWAT'
}

def col_idx(cell_ref):
    letters = re.match(r'([A-Z]+)', cell_ref).group(1)
    idx = 0
    for char in letters:
        idx = idx * 26 + (ord(char) - ord('A') + 1)
    return idx - 1

def fetch_and_update_staff():
    print(f"Downloading latest spreadsheet from Google Sheets...")
    req = urllib.request.Request(SHEET_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        content = response.read()

    zf = zipfile.ZipFile(io.BytesIO(content))

    shared_strings = []
    if 'xl/sharedStrings.xml' in zf.namelist():
        sst_root = ET.fromstring(zf.read('xl/sharedStrings.xml'))
        for si in sst_root.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
            texts = [t.text or '' for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')]
            shared_strings.append(''.join(texts))

    rels_root = ET.fromstring(zf.read('xl/_rels/workbook.xml.rels'))
    ns_rel = 'http://schemas.openxmlformats.org/package/2006/relationships'
    rid_to_target = {rel.attrib['Id']: rel.attrib['Target'] for rel in rels_root.findall(f'{{{ns_rel}}}Relationship')}

    wb_root = ET.fromstring(zf.read('xl/workbook.xml'))
    ns_main = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    sheets = wb_root.findall(f'.//{{{ns_main}}}sheet')

    staff_data = {}
    csv_rows = []

    for sheet in sheets:
        sheet_name = sheet.attrib['name']
        rid = sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
        target = rid_to_target[rid]
        sheet_path = 'xl/' + target if not target.startswith('xl/') else target
        sheet_root = ET.fromstring(zf.read(sheet_path))
        
        facility = SHEET_MAPPING.get(sheet_name)
        if not facility:
            continue
            
        staff_data[facility] = []
        rows = sheet_root.findall(f'.//{{{ns_main}}}row')
        
        for r in rows:
            cells = r.findall(f'{{{ns_main}}}c')
            row_dict = {}
            for c in cells:
                ref = c.attrib.get('r', '')
                col = col_idx(ref) if ref else 0
                v = c.find(f'{{{ns_main}}}v')
                val = v.text if v is not None else ''
                t = c.attrib.get('t')
                if t == 's' and val.isdigit():
                    val = shared_strings[int(val)]
                row_dict[col] = val.strip() if isinstance(val, str) else str(val).strip()
                
            c0 = row_dict.get(0, '')
            c1 = row_dict.get(1, '')
            c2 = row_dict.get(2, '')
            
            if not c0:
                continue
            if c0.upper() in SECTION_HEADERS:
                continue
            if 'NAMA PENUH' in c0.upper() or c0.startswith('Nama Penuh'):
                continue
                
            position = c1.strip()
            category = CATEGORY_MAPPING.get(position, 'Others')
            email = c2.strip()
            name = c0.strip().upper()
            
            staff_member = {
                "name": name,
                "position": position,
                "email": email,
                "category": category
            }
            
            staff_data[facility].append(staff_member)
            csv_rows.append({
                "facility": facility,
                "name": name,
                "position": position,
                "email": email,
                "category": category
            })

    total_staff = sum(len(v) for v in staff_data.values())
    print(f"Extracted {len(staff_data)} facilities with a total of {total_staff} staff members.")

    # Write js/staff_data.js
    js_content = f"const STAFF_DATA = {json.dumps(staff_data, indent=4, ensure_ascii=False)};\n"
    with open('js/staff_data.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    print("Updated js/staff_data.js")

    # Write staff_data_import.csv
    with open('staff_data_import.csv', 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['facility', 'name', 'position', 'email', 'category'])
        writer.writeheader()
        writer.writerows(csv_rows)
    print("Updated staff_data_import.csv")

if __name__ == '__main__':
    fetch_and_update_staff()
