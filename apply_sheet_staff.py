import csv
import json
import os
import re

def process_google_sheet_csv():
    csv_file_path = os.path.join(os.getcwd(), 'staff_data_import.csv')
    js_file_path = os.path.join(os.getcwd(), 'js', 'staff_data.js')

    # Load existing JS file
    with open(js_file_path, 'r', encoding='utf-8') as f:
        js_content = f.read()

    # Extract the JSON part from the JS file
    json_match = re.search(r'const STAFF_DATA = ({.*?});', js_content, re.DOTALL)
    if not json_match:
        print("Failed to parse existing staff_data.js")
        return

    staff_data = json.loads(json_match.group(1))

    # Read CSV
    # Since the csv is downloaded from the URL directly, let's grab it via a local request or file
    # I'll just hardcode the CSV content we just scraped for simplicity and robustness
    csv_text = """BIL.,NAMA,GRED,NO. TEEFON,EMEL
PKD PASIR MAS,,,,
1,Rohaya binti Hussin ,UF14,017-9059260,rohaya.hussin@moh.gov.my
1.KKB PASIR MAS,,,,
1,Sha'erah bt Mohd Yusoff ,UF14,017-9366281,shaerah_my@moh.gov.my
2,Nor Azra binti Shoksi,UF14,013-6443937,norazra@moh.gov.my
3,Nurul Khairiyah binti Wanik,UF12,014-3130976,nurulkhairiyah17@gmail.com
4,Siti Fatimah Binti Yaakub,UF14,018-7746469,ctfatimah.y@moh.gov.my
5,Nurul Bazliah binti Ahmad,UF12,0111-6338130,n.bazliah@moh.gov.my
6,Nurul Iffah binti Badrul Aini,UF9,013-7639722,iffahbadrul@gmail.com
7,Ahmad Wafeeq Mirrza bin Yusoff,UF9,011-36927525,wafeeqmirrza@moh.gov.my
8,Muhammad Amru Haiman Bin Mat Rofi,UF9,017-9195409,amruhaiman01@gmail.com
9,Nik Mohd Nazri Bin Nik Omar ,U6 (tbk1) ,013-8863969,nikmohdnazrinikomar@gmail.com
10,Siti Rabi'atul' Adawiyah bt. Mohd. Rahim,U5,012-6173462,rabiatulm.rahim@gmail.com
11,Anuar Bin Md Salim,U5,011-59587684,anuar.mdsalim1983@gmail.com
12,Siti Nor Syafika Binti Mat Ripin,U5,011-60792327,sitinorsyafikaaa@gmail.com
"2.KK MERANTI, PASIR MAS",,,,
1,Muhaini binti Abd Hadi   ,UF13,013-9224797,muhaini_abd@moh.gov.my
2,Mohd Aminuddin bin Mohamed Rajib,UF12,019-3638321,mohdaminuddin@moh.gov.my
3,Nur Syaqira Amira binti Samsuki,UF12,017-4530127,myrasamsuki@yahoo.com
4,Noor Fazihan Binti Mohamed ,UF9,018-9069510,dfazzmohamed@gmail.com
5,Nabilah binti Ismail,UF14,60179080390,nabilah.i@moh.gov.my
6,Wan Muhamad Azman bin Wan Mohamad,UF13,0136385095,wmazman@moh.gov.my
7,Azlan bin Yusoh,U6(TBK),60142950337,azlanyusoh891129@gmail.com
8,Norlina Binti Abdul,U6(TBK1),178593810,norlina.abdul@moh.gov.my
9,Nasnura binti Nati,U6(KUP),012-9859172,nasnura.nati@gmail.com
10,Mohamad Yuzaimin bin Usoff,N1,0148146363,yuzaimin@moh.gov.my
11,Che Eshah binti Husin,N2,013-9077430,cheeshah@moh.gov.my
12,Kartina bt Muhamad,N2,01118667149,kartinamuhamad@moh.gov.my
13,Norhasliza binti Zaini,H1,0133897533,syasyaoren@gmail.com
"3.KK CHEKOK, PASIR MAS",,,,
1,Fatin Laili binti Ahmad Bahri,UF14,013-9830507,fatinlaili.ab@moh.gov.my
2,Muhamad Idham bin Ahamed,UF13,019-4712623,muhamadidham@moh.gov.my
3,Tan Mai Sing,U5,017-9332975,singmay400@yahoo.com
4,Mohd Nazri bin Muhammad ,U6 (KUP),019-9515621,nazri16041976@gmail.com
"4.KK GUAL PERIOK, PASIR MAS",,,,
1,Nurul Asnida Binti Ibrahim,UF9,014-5363878,nurulasnidaibrahim@moh.gov.my
2,Suzila binti Ab hamid,U6 (KUP),017-9033837,suzilaabhamid74@gmail.com
"5.KK TO' UBAN, PASIR MAS",,,,
1,Mohamad Fahmi bin Hashim,UF14,012-9390953,once9903@gmail.com
2,Izzaty binti Abdullah,UF13,014-8232231,izzatyabdullah@moh.gov.my
3,Muhamad Tarmizi Bin Ab Hamid,UF9,013-5221319,tarmizi.abhamid97@gmail.com
4,Norazlina binti Ibrahim,U6(KUP),011-25456735,norazlina1911@gmail.com
5,Zawiah binti Ismail,U6(KUP),013-9331546,zawiahaza@gmail.com
"6.KK TENDONG, PASIR MAS",,,,
1,Lim Ee Laine,UF14,012-9081066,limeelaine66@gmail.com 
2,Nur Nadila Alia Binti Hamzah,UF13,013-9632819,nadila@moh.gov.my
3,Nurul Ezzati Arifin,UF13,011-29297255,nurulezzati@moh.gov.my
4,Izzati Salihah Binti Ahmad Johari,UF9,011-10911244,izzzati1214@gmail.com
5,Intan Amaliya binti Ibrahim,UF9,011-14895488,intanamaliya98@gmail.com
6,Suneeta bt Sohaimi ,U6(KUP),010-7877416,suneetasohaimi87@gmail.com
7,Norazilah Binti Adnan,U5,019-3135002,azilah_ahze@yahoo.com
8,Muhd Khairul  'Anam Bin Hazan Maghdum,U6 (KUP),011-55162451,temilaboy@gmail.com
"7.KK RANTAU PANJANG, PASIR MAS",,,,
1,Nurul Hasikin binti Mohd Taib ,UF13,019-3686759,hasikin.mtaib@moh.gov.my
2,Nor Liyana Izzati binti Hamil,UF9,018-9587739,norliyanaizzatihamil@moh.gov.my
3,Nadzirah bt Anuar,UF9,010-5604001,nazirahanuar@moh.gov.my
4,Muhammad Haniff Bin Ramli,UF9,019-2854760,muhdhaniff_93@yahoo.com
5,Azma Nurhani binti Ahmad,UF9,011-19928742,azmanurhani@moh.gov.my
6,Faizatul Adida bt Mohamad Riduan ,U6,016-9216485,faizatuladida@moh.gov.my 
6,Mohd Khairul Rahimi Bin Mohd Yatim,U6,013-6888359,petedoherty78@gmail.com
7,Siti Ayunie bt Fauzi,U6 (TBK),019-9809793,einuya_unie@yahoo.com
8,Norsyahidah Binti Mohd Zawawi,U5,018-2119495,norsyahidah.zawawi@moh.gov.my
9,Rosilawati Binti Jusoh,U5,011-26618019,rosilawatijusoh97@gmail.com
"8.KK KANGKONG, PASIR MAS",,,,
1,Wan Hazni binti Tuan Aziz,UF14,019-9316020,wanhazni@moh.gov.my
2,Nik Ezmiza binti Nik Abd. Rahim,UF14,013-9371010,ezmiza@moh.gov.my
3,Siti Masuri Karimi Binti Mohd Azlan,UF9,011-11472093,sitimasurikarimi@moh.gov.my
4,Siti Khalijah bt Mohamed ,U6(KUP) ,019-9418553,ctkhalijah72@gmail.com"""

    current_facility = None
    
    facility_map = {
        "PKD PASIR MAS": "PKD Pasir Mas",
        "1.KKB PASIR MAS": "KK Bandar Pasir Mas",
        "2.KK MERANTI, PASIR MAS": "KK Meranti",
        "3.KK CHEKOK, PASIR MAS": "KK Chetok",
        "4.KK GUAL PERIOK, PASIR MAS": "KK Gual Periok",
        "5.KK TO' UBAN, PASIR MAS": "KK To' Uban",
        "6.KK TENDONG, PASIR MAS": "KK Tendong",
        "7.KK RANTAU PANJANG, PASIR MAS": "KK Rantau Panjang",
        "8.KK KANGKONG, PASIR MAS": "KK Kangkong",
        # Some fallback mappings just in case
        "KK MERANTI": "KK Meranti",
        "KK GUAL PERIOK": "KK Gual Periok",
        "KK TO' UBAN": "KK To' Uban"
    }

    import io
    reader = csv.reader(io.StringIO(csv_text))
    header = next(reader)
    
    for row in reader:
        if not row:
            continue
        col1 = row[0].strip()
        col2 = row[1].strip() if len(row) > 1 else ""
        
        # If the row only has a facility name (or facility name in col 0 and empty in name)
        # OR if col2 is empty, it's a facility header
        if col1 and not col2:
            raw_facility = col1.strip('"')
            current_facility = facility_map.get(raw_facility, raw_facility.title())
            if current_facility not in staff_data:
                staff_data[current_facility] = []
            continue
            
        if col1 == 'BIL.' or not col2:
            continue # header row or empty
            
        # Parse staff row
        name = row[1].strip()
        position = row[2].strip()
        phone = row[3].strip()
        email = row[4].strip()
        
        if position.startswith("UF"):
            category = "Pharmacist (PF)"
        elif position.startswith("U"):
            category = "Pharmacy Assistant (PPF)"
        else:
            category = "Support Staff"
            
        # Deduplication check
        existing = next((s for s in staff_data[current_facility] if s['name'].lower() == name.lower()), None)
        if not existing:
            staff_data[current_facility].append({
                "name": name,
                "position": position,
                "email": email,
                "category": category
            })
            
    # Write back
    new_js_content = f"const STAFF_DATA = {json.dumps(staff_data, indent=4, ensure_ascii=False)};\n"
    with open(js_file_path, 'w', encoding='utf-8') as f:
        f.write(new_js_content)
        
    print("Done. Appended CSV payload to staff_data.js")

if __name__ == '__main__':
    process_google_sheet_csv()
