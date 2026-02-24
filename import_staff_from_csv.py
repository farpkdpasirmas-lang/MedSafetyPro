import csv
import json
import os

def import_staff_data(csv_file_path, js_file_path):
    """
    Reads staff data from a CSV file and updates the staff_data.js file.
    """
    if not os.path.exists(csv_file_path):
        print(f"Error: CSV file not found at {csv_file_path}")
        return

    staff_data = {}

    try:
        with open(csv_file_path, mode='r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            # Normalize headers (strip whitespace)
            reader.fieldnames = [field.strip() for field in reader.fieldnames]
            
            for row in reader:
                facility = row['facility'].strip()
                name = row['name'].strip()
                position = row['position'].strip()
                email = row['email'].strip()
                category = row['category'].strip()

                if facility not in staff_data:
                    staff_data[facility] = []

                staff_data[facility].append({
                    "name": name,
                    "position": position,
                    "email": email,
                    "category": category
                })

        # Generate JS content
        js_content = f"const STAFF_DATA = {json.dumps(staff_data, indent=4)};\n"

        with open(js_file_path, mode='w', encoding='utf-8') as jsfile:
            jsfile.write(js_content)

        print(f"Successfully updated {js_file_path}")
        print(f"Total facilities: {len(staff_data)}")
        total_staff = sum(len(staff) for staff in staff_data.values())
        print(f"Total staff members: {total_staff}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    current_dir = os.getcwd()
    csv_path = os.path.join(current_dir, "staff_data_import.csv")
    js_path = os.path.join(current_dir, "js", "staff_data.js")
    
    print(f"Reading from: {csv_path}")
    print(f"Writing to: {js_path}")
    
    import_staff_data(csv_path, js_path)
