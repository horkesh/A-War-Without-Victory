import json
import os

SOURCE_FILE = r'../../data/source/settlements_initial_master.json'
OUTPUT_FILE = r'./lookup_sid_mun.json'

def main():
    if not os.path.exists(SOURCE_FILE):
        print(f"Error: Source file not found: {SOURCE_FILE}")
        return

    print(f"Loading {SOURCE_FILE}...")
    with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    sid_map = {}
    mun_names = {}

    settlements = data.get('settlements', [])
    print(f"Processing {len(settlements)} settlements...")

    for s in settlements:
        sid = s.get('sid')
        mid = s.get('mun1990_id')
        mname = s.get('mun1990_name')

        if sid and mid:
            sid_map[sid] = mid
            if mname:
                mun_names[mid] = mname

    output_data = {
        "sid_map": sid_map,
        "mun_names": mun_names
    }

    print(f"Writing lookup data to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False) # Minified by default

    print("Done.")

if __name__ == "__main__":
    main()
