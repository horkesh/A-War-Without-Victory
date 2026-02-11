import os
import sys
from PIL import Image

# Increase max image size for large maps
Image.MAX_IMAGE_PIXELS = None

MAPS_DIR = 'docs/knowledge/maps'
OUTPUT_DIR = 'tools/map_calibrator/maps'

def convert_maps():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    for filename in os.listdir(MAPS_DIR):
        if filename.lower().endswith(('.tif', '.tiff')):
            input_path = os.path.join(MAPS_DIR, filename)
            output_filename = os.path.splitext(filename)[0] + '.jpg'
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            
            if os.path.exists(output_path):
                print(f"Skipping {filename} (already exists)")
                continue
                
            print(f"Converting {filename}...")
            try:
                with Image.open(input_path) as img:
                    # Resize if too huge? Or let browser handle it?
                    # 170MB TIF is big. Browser might choke on full res.
                    # Let's resize to max dimension 4000px for calibration purposes.
                    # Wait, we need pixel precision for the *original* map?
                    # If we resize, coordinates change.
                    # We should probably serve tiles or just full res.
                    # 170MB image in browser is tough.
                    # Let's just convert to JPG with quality 80, keep size. 
                    # Browsers can handle 8k x 8k images usually.
                    
                    rgb_img = img.convert('RGB')
                    rgb_img.save(output_path, 'JPEG', quality=85)
                    print(f"Saved {output_path}")
            except Exception as e:
                print(f"Error converting {filename}: {e}")

if __name__ == "__main__":
    convert_maps()
