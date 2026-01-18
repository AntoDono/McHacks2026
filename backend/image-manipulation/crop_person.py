"""
Selfie Cropper with Transparent Background

This script takes a selfie/photo of a person, removes the background,
and crops the image so the person fits nicely in the frame.

Requirements:
    pip install rembg pillow numpy

Usage:
    python selfie_crop.py input_image.jpg output_image.png
    python selfie_crop.py input_image.jpg output_image.png --padding 50
"""

import sys
from pathlib import Path

try:
    from rembg import remove
    from PIL import Image
    import numpy as np
except ImportError:
    print("Missing dependencies. Install with:")
    print("  pip install rembg pillow numpy")
    sys.exit(1)


def remove_background(input_path: str) -> Image.Image:
    """Remove background from image, returning RGBA image."""
    with open(input_path, "rb") as f:
        input_data = f.read()
    
    output_data = remove(input_data)
    
    from io import BytesIO
    return Image.open(BytesIO(output_data)).convert("RGBA")


def find_person_bounds(img: Image.Image) -> tuple[int, int, int, int]:
    """
    Find the bounding box of non-transparent pixels (the person).
    Returns (left, top, right, bottom).
    """
    # Convert to numpy array
    arr = np.array(img)
    
    # Get alpha channel
    alpha = arr[:, :, 3]
    
    # Find rows and columns with non-transparent pixels
    rows_with_content = np.any(alpha > 10, axis=1)
    cols_with_content = np.any(alpha > 10, axis=0)
    
    # Get bounds
    rows = np.where(rows_with_content)[0]
    cols = np.where(cols_with_content)[0]
    
    if len(rows) == 0 or len(cols) == 0:
        # No content found, return full image bounds
        return (0, 0, img.width, img.height)
    
    top, bottom = rows[0], rows[-1] + 1
    left, right = cols[0], cols[-1] + 1
    
    return (left, top, right, bottom)


def crop_to_person(img: Image.Image, padding: int = 20) -> Image.Image:
    """
    Crop image to fit the person with optional padding.
    
    Args:
        img: RGBA image with transparent background
        padding: Pixels of padding around the person
    
    Returns:
        Cropped RGBA image
    """
    left, top, right, bottom = find_person_bounds(img)
    
    # Add padding (but don't go outside image bounds)
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
) -> None:
    """
    Main function to process a selfie.
    
    Args:
        input_path: Path to input image
        output_path: Path for output PNG (must be PNG for transparency)
        padding: Pixels of padding around the person
        max_size: Optional max dimension (width or height) to resize to
    """
    print(f"Processing: {input_path}")
    
    # Step 1: Remove background
    print("  Removing background...")
    img = remove_background(input_path)
    print(f"  Background removed. Size: {img.size}")
    
    # Step 2: Crop to person
    print("  Cropping to fit person...")
    img = crop_to_person(img, padding=padding)
    print(f"  Cropped. New size: {img.size}")
    
    # Step 3: Optional resize
    if max_size:
        ratio = min(max_size / img.width, max_size / img.height)
        if ratio < 1:  # Only downscale
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            print(f"  Resized to: {img.size}")
    
    # Step 4: Save
    # Ensure output is PNG for transparency
    output_path = Path(output_path)
    if output_path.suffix.lower() != '.png':
        output_path = output_path.with_suffix('.png')
        print(f"  Note: Changed output to PNG for transparency support")
    
    img.save(output_path, "PNG")
    print(f"  Saved to: {output_path}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Remove background from selfie and crop to fit person"
    )
    parser.add_argument("input", help="Input image path")
    parser.add_argument("output", help="Output image path (will be PNG)")
    parser.add_argument(
        "--padding", "-p",
        type=int,
        default=20,
        help="Padding around person in pixels (default: 20)"
    )
    parser.add_argument(
        "--max-size", "-s",
        type=int,
        default=None,
        help="Maximum dimension (width or height) for output"
    )
    
    args = parser.parse_args()
    
    if not Path(args.input).exists():
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)
    
    print(f"Processing: {args.input}")
    process_selfie(
        args.input,
        args.output,
        padding=args.padding,
        max_size=args.max_size
    )


if __name__ == "__main__":
    main()