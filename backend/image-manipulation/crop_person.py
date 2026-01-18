"""Remove background and crop images to fit the person."""

import sys
from pathlib import Path
from rembg import remove
from PIL import Image
import numpy as np


def remove_background(input_path: str) -> Image.Image:
    from io import BytesIO
    with open(input_path, "rb") as f:
        output_data = remove(f.read())
    return Image.open(BytesIO(output_data)).convert("RGBA")


def find_person_bounds(img: Image.Image) -> tuple[int, int, int, int]:
    """Find bounding box of non-transparent pixels: (left, top, right, bottom)."""
    arr = np.array(img)
    alpha = arr[:, :, 3]
    
    rows_with_content = np.any(alpha > 10, axis=1)
    cols_with_content = np.any(alpha > 10, axis=0)
    
    rows = np.where(rows_with_content)[0]
    cols = np.where(cols_with_content)[0]
    
    if len(rows) == 0 or len(cols) == 0:
        return (0, 0, img.width, img.height)
    
    return (cols[0], rows[0], cols[-1] + 1, rows[-1] + 1)


def crop_to_person(img: Image.Image, padding: int = 20) -> Image.Image:
    """Crop image to fit the person with padding."""
    left, top, right, bottom = find_person_bounds(img)
    
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(img.width, right + padding)
    bottom = min(img.height, bottom + padding)
    
    return img.crop((left, top, right, bottom))


def process_selfie(
    input_path: str,
    output_path: str,
    padding: int = 20,
    max_size: int | None = None
) -> str:
    """Process image: remove background, crop to person, optional resize."""
    print(f"Processing: {input_path}")
    
    img = remove_background(input_path)
    print(f"  Background removed. Size: {img.size}")
    
    img = crop_to_person(img, padding=padding)
    print(f"  Cropped to: {img.size}")
    
    if max_size:
        ratio = min(max_size / img.width, max_size / img.height)
        if ratio < 1:
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            print(f"  Resized to: {img.size}")
    
    output_path = Path(output_path)
    if output_path.suffix.lower() != '.png':
        output_path = output_path.with_suffix('.png')
    
    img.save(output_path, "PNG")
    print(f"  Saved to: {output_path}")
    
    return str(output_path)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Remove background and crop to person")
    parser.add_argument("input", help="Input image path")
    parser.add_argument("output", help="Output image path (will be PNG)")
    parser.add_argument("--padding", "-p", type=int, default=20, help="Padding in pixels")
    parser.add_argument("--max-size", "-s", type=int, default=None, help="Max dimension")
    
    args = parser.parse_args()
    process_selfie(args.input, args.output, padding=args.padding, max_size=args.max_size)


if __name__ == "__main__":
    main()