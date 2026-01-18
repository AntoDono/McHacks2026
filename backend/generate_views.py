"""Generate multiple camera views of a person from a single image."""

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
    remove = None

client = genai.Client()

prompts = {
    0: "Make this person face the front. Keep the background transparent or white.",
    90: "Make this person face the left side. Keep the background transparent or white.",
    180: "Make this person face the back. Keep the background transparent or white.",
    270: "Make this person face the right side. Keep the background transparent or white.",
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


def generate_views(image_path):
    """Generate 4 camera views from a single image: [0°, 90°, 180°, 270°]"""
    image = Image.open(image_path)
    
    temp_dir = os.path.join(tempfile.gettempdir(), f"multiview_{uuid.uuid4()}")
    os.makedirs(temp_dir, exist_ok=True)
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    results = loop.run_until_complete(_generate_all_views(image, temp_dir))
    loop.close()
    
    return [path for path in results if path is not None]


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python generate_views.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    print(f"Generating 4 views from: {image_path}")
    
    image = Image.open(image_path)
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    results = loop.run_until_complete(_generate_all_views(image, "."))
    loop.close()
    
    for angle, path in zip(prompts.keys(), results):
        if path and os.path.exists(path):
            print(f"  {angle:>3}°: {path}")
        else:
            print(f"  {angle:>3}°: FAILED")
