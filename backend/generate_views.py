from google import genai
from PIL import Image
import asyncio
import tempfile
import os
import uuid
from io import BytesIO

try:
    from rembg import remove
except ImportError:
    print("Warning: rembg not available. Generated views will keep their backgrounds.")
    remove = None

client = genai.Client()

prompts = {
    0: "Make this person face the front. Keep the background transparent or white.",
    90: "Make this person face the left side. Keep the background transparent or white.",
    180: "Make this person face the back. Keep the background transparent or white.",
    270: "Make this person face the right side. Keep the background transparent or white.",
}


def _remove_background(image: Image.Image) -> Image.Image:
    """Remove background from image using rembg"""
    if remove is None:
        return image
    
    # Convert PIL Image to bytes
    img_byte_arr = BytesIO()
    image.save(img_byte_arr, 'PNG')
    img_byte_arr.seek(0)
    input_data = img_byte_arr.read()
    
    # Remove background
    output_data = remove(input_data)
    
    # Convert back to PIL Image
    return Image.open(BytesIO(output_data)).convert("RGBA")


async def _generate_view(angle, prompt, image, output_dir):
    """Generate a single view"""
    loop = asyncio.get_event_loop()
    
    def _generate():
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt, image],
        )
        return response
    
    def _process_background(response):
        # This will run in thread pool
        for part in response.parts:
            if part.inline_data is not None:
                generated_image = part.as_image()
                
                # Convert Google Image to PIL Image
                # Google genai Image objects need to be converted to PIL Images
                if hasattr(generated_image, '_pil_image'):
                    # If it has a _pil_image attribute, use it
                    generated_image = generated_image._pil_image
                elif not isinstance(generated_image, Image.Image):
                    # Otherwise convert via bytes
                    temp_buf = BytesIO()
                    # Google Image.save() doesn't take format argument
                    generated_image.save(temp_buf)
                    temp_buf.seek(0)
                    generated_image = Image.open(temp_buf)
                
                # Remove background if rembg is available
                if remove is not None:
                    print(f"  Removing background from {angle}° view...")
                    generated_image = _remove_background(generated_image)
                
                return generated_image
        return None
    
    try:
        response = await loop.run_in_executor(None, _generate)
        generated_image = await loop.run_in_executor(None, _process_background, response)
        
        if generated_image:
            filename = os.path.join(output_dir, f"{angle}.png")
            generated_image.save(filename, "PNG")
            return filename
        
        return None
        
    except Exception as e:
        print(f"Error generating {angle}°: {e}")
        return None


async def _generate_all_views(image, output_dir):
    """Generate all 4 views asynchronously"""
    tasks = []
    for i, (angle, prompt) in enumerate(prompts.items()):
        async def delayed_generate(ang, prmt, img, outdir, delay):
            await asyncio.sleep(delay)
            return await _generate_view(ang, prmt, img, outdir)
        
        tasks.append(delayed_generate(angle, prompt, image, output_dir, i * 0.5))
    
    results = await asyncio.gather(*tasks)
    return results


def generate_views(image_path):
    """
    Generate 4 camera views from a single image.
    
    Args:
        image_path (str): Path to the input image
        
    Returns:
        list: Array of 4 file paths in order [0°, 90°, 180°, 270°]
        
    Example:
        >>> paths = generate_views("input.png")
        >>> print(paths[0])  # Front view (0°)
        >>> print(paths[1])  # Left side (90°)
        >>> print(paths[2])  # Back view (180°)
        >>> print(paths[3])  # Right side (270°)
    """
    # Load image
    image = Image.open(image_path)
    
    # Create temp directory with UUID
    temp_base = tempfile.gettempdir()
    unique_id = str(uuid.uuid4())
    temp_dir = os.path.join(temp_base, f"multiview_{unique_id}")
    os.makedirs(temp_dir, exist_ok=True)
    
    # Generate all views
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    results = loop.run_until_complete(_generate_all_views(image, temp_dir))
    loop.close()
    
    # Return as array (filter out None values, but keep order)
    return [path for path in results if path is not None]


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python generate_views.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    print("=" * 60)
    print("Multi-View Generator")
    print("=" * 60)
    print(f"\nGenerating 4 views from: {image_path}")
    
    # Load image
    image = Image.open(image_path)
    
    # Generate in current directory
    print("\nGenerating 4 views asynchronously...")
    print("-" * 60)
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    results = loop.run_until_complete(_generate_all_views(image, "."))
    loop.close()
    
    # Display results
    print("\nGenerated views:")
    successful = 0
    angles = list(prompts.keys())
    for i, (angle, path) in enumerate(zip(angles, results)):
        if path and os.path.exists(path):
            size = os.path.getsize(path) / 1024
            print(f"  {angle:>3}°: {path} ({size:.1f} KB)")
            successful += 1
        else:
            print(f"  {angle:>3}°: FAILED")
    
    print("\n" + "=" * 60)
    print(f"✓ Complete - {successful}/4 successful")
    print("=" * 60)
