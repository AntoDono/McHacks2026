from gumloop import GumloopClient
import os
import sys
import tempfile
import requests
import uuid
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()

# Get image path from command line or use default
if len(sys.argv) > 1:
    image_path = sys.argv[1]
    print(f"Uploading image to Cloudinary: {image_path}")
    
    # Upload to Cloudinary
    upload_result = cloudinary.uploader.upload(
        image_path,
        folder="gumloop_inputs",
        resource_type="image"
    )
    image_url = upload_result["secure_url"]
    print(f"Uploaded to: {image_url}")
else:
    # Use default URL
    # image_url = "https://img.freepik.com/free-photo/close-up-portrait-man-shirt-mockup_23-2149260894.jpg?semt=ais_hybrid&w=740&q=80&qqq=1"
    # print(f"Using default URL: {image_url}")
    pass

# Initialize the Gumloop client
client = GumloopClient(
    api_key=os.getenv("GUMLOOP_API_KEY"),
    user_id=os.getenv("GUMLOOP_USER_ID"),
)

# Run a flow and wait for outputs
print("Running Gumloop flow...")
output = client.run_flow(
    flow_id=os.getenv("GUMLOOP_FLOW_ID"),
    inputs={"image": image_url}
)

# Download the generated images
# Output format: {'image_0': [url], 'image_90': [url], 'image_180': [url], 'image_270': [url]}

# Create unique temp directory
temp_dir = os.path.join(tempfile.gettempdir(), f"gumloop_views_{uuid.uuid4()}")
os.makedirs(temp_dir, exist_ok=True)

print("\n" + "=" * 60)
print("Downloading generated views...")
print("-" * 60)

# Download in sorted order
angles = [0, 90, 180, 270]
downloaded_paths = []

for angle in angles:
    key = f"image_{angle}"
    if key in output:
        url = output[key][0]  # Extract URL from list
        filepath = os.path.join(temp_dir, f"{angle}.png")
        
        response = requests.get(url)
        with open(filepath, "wb") as f:
            f.write(response.content)
        
        file_size = os.path.getsize(filepath) / 1024
        print(f"  {angle:>3}°: {filepath} ({file_size:.1f} KB)")
        downloaded_paths.append(filepath)

print("\n" + "=" * 60)
print(f"✓ Complete - {len(downloaded_paths)}/4 images downloaded")
print(f"Output directory: {temp_dir}")
print("=" * 60)