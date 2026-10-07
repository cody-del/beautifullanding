#!/usr/bin/env python3
"""Export web-sized copies of client photographs without changing the originals."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'content/installation-photos.json').read_text())
source = ROOT / data['original_directory']
output = ROOT / 'dist/assets/installations'
output.mkdir(parents=True, exist_ok=True)
exports = []
for photo in data['photos']:
    original = source / photo['original']
    with Image.open(original) as opened:
        image = ImageOps.exif_transpose(opened).convert('RGB')
        for width in (640, photo['width']):
            height = round(image.height * width / image.width)
            resized = image.resize((width, height), Image.Resampling.LANCZOS)
            path = output / f"{photo['name']}-{width}.webp"
            # No EXIF, location metadata, retouching, or generated content is added.
            resized.save(path, 'WEBP', quality=82, method=6)
            exports.append({'file': str(path.relative_to(ROOT)), 'original': photo['original'],
                            'width': width, 'height': height, 'bytes': path.stat().st_size,
                            'original_sha256': hashlib.sha256(original.read_bytes()).hexdigest()})
(ROOT / 'content/installation-photo-exports.json').write_text(json.dumps(exports, indent=2) + '\n')
print(f'Prepared {len(exports)} responsive WebP assets from {len(data["photos"])} original photographs.')
