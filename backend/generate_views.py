from google import genai
from PIL import Image
import asyncio
import tempfile
import os

client = genai.Client()

prompts = {
    0: "Make this person face the front",
    90: "Make this person face the left side",
    180: "Make this person face the back",
    270: "Make this person face the right side",
}


async def _generate_view(angle, prompt, image, output_dir):
    """Generate a single view"""
    loop = asyncio.get_event_loop()
    
    def _generate():
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt, image],
        )
        return response
    
    try:
        response = await loop.run_in_executor(None, _generate)
        
        for part in response.parts:
            if part.inline_data is not None:
                generated_image = part.as_image()
                filename = os.path.join(output_dir, f"{angle}.png")
                generated_image.save(filename)
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
        dict: Dictionary with keys 0, 90, 180, 270 mapping to temp file paths
        
    Example:
        >>> paths = generate_views("input.png")
        >>> print(paths[0])    # Front view
        >>> print(paths[90])   # Left side
        >>> print(paths[180])  # Back view
        >>> print(paths[270])  # Right side
    """
    # Load image
    image = Image.open(image_path)
    
    # Create temp directory
    temp_dir = tempfile.mkdtemp(prefix="multiview_")
    
    # Generate all views
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    results = loop.run_until_complete(_generate_all_views(image, temp_dir))
    loop.close()
    
    # Map results to angles
    result_dict = {}
    for angle, path in zip(prompts.keys(), results):
        result_dict[angle] = path
    
    return result_dict


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
    for angle, path in zip(prompts.keys(), results):
        if path and os.path.exists(path):
            size = os.path.getsize(path) / 1024
            print(f"  {angle:>3}°: {path} ({size:.1f} KB)")
            successful += 1
        else:
            print(f"  {angle:>3}°: FAILED")
    
    print("\n" + "=" * 60)
    print(f"✓ Complete - {successful}/4 successful")
    print("=" * 60)
