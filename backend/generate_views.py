"""Generate multiple camera views of a person from a single image."""

from google import genai
from PIL import Image
import asyncio
import tempfile
import os
import uuid
from io import BytesIO

# ============================================================================
# CONFIGURATION: Choose generation method
# ============================================================================
USE_GUMLOOP = False  # Set to True to use Gumloop API instead of Gemini
# ============================================================================

try:
    from rembg import remove
except ImportError:
    remove = None

client = genai.Client()
_gumloop_client = None

prompts = {
    0: "Make this person face the front. Keep the background transparent or white.",
    45: "Rotate this person 45 degrees to face the front-right diagonal. Keep the background transparent or white.",
    90: "Make this person face the right side. Keep the background transparent or white.",
    135: "Rotate this person 135 degrees to face the back-right diagonal. Keep the background transparent or white.",
    180: "Make this person face the back. Keep the background transparent or white.",
    225: "Rotate this person 225 degrees to face the back-left diagonal. Keep the background transparent or white.",
    270: "Make this person face the left side. Keep the background transparent or white.",
}


def _remove_background(image: Image.Image) -> Image.Image:
    if remove is None:
        return image
    
    img_byte_arr = BytesIO()
    image.save(img_byte_arr, 'PNG')
    img_byte_arr.seek(0)
    
    output_data = remove(img_byte_arr.read())
    return Image.open(BytesIO(output_data)).convert("RGBA")


async def _generate_view(angle, prompt, image, output_dir):
    loop = asyncio.get_event_loop()
    
    def _generate():
        return client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt, image],
        )
    
    def _process_background(response):
        for part in response.parts:
            if part.inline_data is not None:
                generated_image = part.as_image()
                
                # Convert Google Image to PIL Image
                if hasattr(generated_image, '_pil_image'):
                    generated_image = generated_image._pil_image
                elif not isinstance(generated_image, Image.Image):
                    temp_buf = BytesIO()
                    generated_image.save(temp_buf)
                    temp_buf.seek(0)
                    generated_image = Image.open(temp_buf)
                
                if remove is not None:
                    print(f"  Removing background from {angle}° view...")
                    generated_image = _remove_background(generated_image)
                
                return generated_image
        return None
    
    response = await loop.run_in_executor(None, _generate)
    generated_image = await loop.run_in_executor(None, _process_background, response)
    
    if generated_image:
        filename = os.path.join(output_dir, f"{angle}.png")
        generated_image.save(filename, "PNG")
        return filename
    
    return None


async def _generate_all_views(image, output_dir):
    tasks = []
    for i, (angle, prompt) in enumerate(prompts.items()):
        async def delayed_generate(ang, prmt, img, outdir, delay):
            await asyncio.sleep(delay)
            return await _generate_view(ang, prmt, img, outdir)
        
        tasks.append(delayed_generate(angle, prompt, image, output_dir, i * 0.5))
    
    return await asyncio.gather(*tasks)


def _upload_to_cloudinary(image_path):
    """Upload image to Cloudinary and return URL"""
    try:
        import cloudinary
        import cloudinary.uploader
        
        # Cloudinary should be configured via CLOUDINARY_URL env variable
        result = cloudinary.uploader.upload(
            image_path,
            folder="gumloop_inputs",
            resource_type="image"
        )
        return result["secure_url"]
    except ImportError:
        raise ImportError("Cloudinary not available. Install with: pip install cloudinary")


def _generate_views_gumloop(image_path, output_dir):
    """Generate 7 views using Gumloop API"""
    global _gumloop_client
    
    try:
        from gumloop import GumloopClient
        import requests
    except ImportError:
        raise ImportError("Gumloop not available. Install with: pip install gumloop")
    
    # Initialize Gumloop client if not already done
    if _gumloop_client is None:
        _gumloop_client = GumloopClient(
            api_key=os.getenv("GUMLOOP_API_KEY"),
            user_id=os.getenv("GUMLOOP_USER_ID"),
        )
    
    # Upload image to Cloudinary to get a URL
    print(f"  Uploading to Cloudinary: {image_path}")
    image_url = _upload_to_cloudinary(image_path)
    print(f"  Cloudinary URL: {image_url}")
    
    # Run the Gumloop flow
    print("  Running Gumloop flow...")
    output = _gumloop_client.run_flow(
        flow_id=os.getenv("GUMLOOP_FLOW_ID"),
        inputs={"image": image_url}
    )
    
    # Download images in sorted order: 0, 45, 90, 135, 180, 225, 270
    angles = [0, 45, 90, 135, 180, 225, 270]
    downloaded_paths = []
    
    for angle in angles:
        key = f"image_{angle}"
        if key in output:
            url = output[key][0]  # Extract URL from list
            filepath = os.path.join(output_dir, f"{angle}.png")
            
            response = requests.get(url)
            with open(filepath, "wb") as f:
                f.write(response.content)
            
            downloaded_paths.append(filepath)
        else:
            downloaded_paths.append(None)
    
    return downloaded_paths


def generate_views(image_path):
    """
    Generate 7 camera views from a single image: [0°, 45°, 90°, 135°, 180°, 225°, 270°]
    
    Uses Gumloop if USE_GUMLOOP=True, otherwise uses Gemini.
    """
    temp_dir = os.path.join(tempfile.gettempdir(), f"multiview_{uuid.uuid4()}")
    os.makedirs(temp_dir, exist_ok=True)
    
    if USE_GUMLOOP:
        print("Using Gumloop API for generation...")
        results = _generate_views_gumloop(image_path, temp_dir)
    else:
        print("Using Gemini API for generation...")
        image = Image.open(image_path)
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        results = loop.run_until_complete(_generate_all_views(image, temp_dir))
        loop.close()
    
    return [path for path in results if path is not None]


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python generate_views.py <image_path>")
        method = "GUMLOOP" if USE_GUMLOOP else "GEMINI"
        print(f"Current method: {method} (USE_GUMLOOP={USE_GUMLOOP})")
        sys.exit(1)
    
    image_path = sys.argv[1]
    method = "GUMLOOP" if USE_GUMLOOP else "GEMINI"
    
    print("=" * 60)
    print(f"Multi-View Generator ({method})")
    print("=" * 60)
    print(f"\nGenerating 7 views from: {image_path}")
    print("-" * 60)
    
    results = generate_views(image_path)
    
    print("\nGenerated views:")
    for angle, path in zip(prompts.keys(), results):
        if path and os.path.exists(path):
            size = os.path.getsize(path) / 1024
            print(f"  {angle:>3}°: {path} ({size:.1f} KB)")
        else:
            print(f"  {angle:>3}°: FAILED")
    
    print("\n" + "=" * 60)
    print(f"✓ Complete - {len(results)}/7 successful")
    print("=" * 60)
