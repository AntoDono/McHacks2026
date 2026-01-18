"""Flask server for virtual try-on and image processing."""

import os
import time
import base64
import sys
import json
import requests
from pathlib import Path
from flask import Flask, request, jsonify, send_file, Response, stream_with_context
from flask_cors import CORS
from werkzeug.utils import secure_filename
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Add image-manipulation directory to path
image_manip_path = Path(__file__).parent / "image-manipulation"
sys.path.insert(0, str(image_manip_path))
from crop_person import process_selfie
from put_on import put_on
from generate_views import generate_views

# Import database functions
from db import save_tryon_session, get_tryon_session, get_all_sessions

app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500 MB max request size
BASE_DIR = Path(__file__).parent.resolve()
UPLOAD_FOLDER = BASE_DIR / "uploads"
PROCESSED_FOLDER = BASE_DIR / "processed"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

UPLOAD_FOLDER.mkdir(exist_ok=True)
PROCESSED_FOLDER.mkdir(exist_ok=True)


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/process-image", methods=["POST"])
def process_image():
    file = request.files["image"]
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = secure_filename(file.filename)
    input_path = UPLOAD_FOLDER / f"{timestamp}_{filename}"
    file.save(input_path)

    output_filename = f"{timestamp}_processed.png"
    output_path = PROCESSED_FOLDER / output_filename

    print(f"Processing image: {input_path}")
    actual_output_path = process_selfie(
        str(input_path),
        str(output_path),
        padding=20,
        max_size=1000
    )
    
    output_path = Path(actual_output_path)
    output_filename = output_path.name

    with open(output_path, "rb") as img_file:
        img_data = base64.b64encode(img_file.read()).decode("utf-8")

    input_path.unlink()

    return jsonify({
        "success": True,
        "image": f"data:image/png;base64,{img_data}",
        "filename": output_filename
    })


def download_image_from_url(url, save_path):
    """Download an image from URL and save to path"""
    # Add browser-like headers to avoid getting blocked
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': url.rsplit('/', 1)[0] + '/',  # Use the base URL as referer
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'same-origin',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    }
    
    response = requests.get(url, headers=headers, timeout=30, allow_redirects=True)
    response.raise_for_status()
    with open(save_path, 'wb') as f:
        f.write(response.content)
    return save_path

@app.route("/try-on", methods=["POST"])
def try_on():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    files_to_cleanup = []  # Track all downloaded files for cleanup
    
    # Handle person image - can be file upload or URL
    person_path = None
    if "person" in request.files and request.files["person"].filename:
        # File upload
        person_file = request.files["person"]
        person_path = UPLOAD_FOLDER / f"{timestamp}_person_{secure_filename(person_file.filename)}"
        person_file.save(person_path)
    elif "person_url" in request.form:
        # URL download
        person_url = request.form["person_url"]
        # Determine extension from URL or default to jpg
        ext = ".jpg"
        if "." in person_url.split("/")[-1]:
            ext = "." + person_url.split(".")[-1].split("?")[0]
        person_path = UPLOAD_FOLDER / f"{timestamp}_person_downloaded{ext}"
        try:
            download_image_from_url(person_url, person_path)
            files_to_cleanup.append(person_path)
        except Exception as e:
            return jsonify({"error": f"Failed to download person image: {str(e)}"}), 400
    else:
        return jsonify({"error": "No person image provided (file or URL)"}), 400
    
    # Handle garment images - can be file uploads, garments_data (url+base64), or URLs
    garment_paths = []
    
    # First, try file uploads
    garment_files = request.files.getlist("garment")
    if garment_files and garment_files[0].filename:
        for i, garment_file in enumerate(garment_files):
            garment_path = UPLOAD_FOLDER / f"{timestamp}_garment_{i}_{secure_filename(garment_file.filename)}"
            garment_file.save(garment_path)
            garment_paths.append(garment_path)
    
    # Then, try garments_data (url + base64) - NEW HYBRID APPROACH
    if "garments_data" in request.form and not garment_paths:
        try:
            garments_data = json.loads(request.form["garments_data"])
            for i, garment_data in enumerate(garments_data):
                garment_url = garment_data.get("url")
                garment_base64 = garment_data.get("base64")
                
                # Try base64 first (browser already downloaded it)
                if garment_base64:
                    try:
                        # Remove data URL prefix if present
                        if garment_base64.startswith("data:"):
                            garment_base64 = garment_base64.split(",", 1)[1]
                        
                        # Decode base64 and save
                        img_data = base64.b64decode(garment_base64)
                        garment_path = UPLOAD_FOLDER / f"{timestamp}_garment_{i}_from_browser.jpg"
                        with open(garment_path, "wb") as f:
                            f.write(img_data)
                        garment_paths.append(garment_path)
                        files_to_cleanup.append(garment_path)
                        print(f"✓ Saved garment {i} from base64")
                        continue
                    except Exception as e:
                        print(f"Warning: Failed to decode base64 for garment {i}: {str(e)}")
                
                # Fall back to URL download if base64 failed or not available
                if garment_url:
                    try:
                        ext = ".jpg"
                        if "." in garment_url.split("/")[-1]:
                            ext = "." + garment_url.split(".")[-1].split("?")[0]
                        garment_path = UPLOAD_FOLDER / f"{timestamp}_garment_{i}_from_url{ext}"
                        download_image_from_url(garment_url, garment_path)
                        garment_paths.append(garment_path)
                        files_to_cleanup.append(garment_path)
                        print(f"✓ Downloaded garment {i} from URL")
                    except Exception as e:
                        print(f"Warning: Failed to download garment {i} from URL: {str(e)}")
        except json.JSONDecodeError as e:
            print(f"Warning: Failed to parse garments_data: {str(e)}")
    
    # Legacy: Try URL list only (backwards compatibility)
    if "garment_urls" in request.form and not garment_paths:
        try:
            garment_urls = json.loads(request.form["garment_urls"])
            for i, garment_url in enumerate(garment_urls):
                # Determine extension from URL or default to jpg
                ext = ".jpg"
                if "." in garment_url.split("/")[-1]:
                    ext = "." + garment_url.split(".")[-1].split("?")[0]
                garment_path = UPLOAD_FOLDER / f"{timestamp}_garment_url_{len(garment_paths) + i}_downloaded{ext}"
                try:
                    download_image_from_url(garment_url, garment_path)
                    garment_paths.append(garment_path)
                    files_to_cleanup.append(garment_path)
                except Exception as e:
                    print(f"Warning: Failed to download garment {i}: {str(e)}")
        except json.JSONDecodeError:
            pass
    
    if not garment_paths:
        return jsonify({"error": "No garment images provided (files, URLs, or base64)"}), 400
    
    # Get optional metadata for garments (sent as JSON string)
    garments_metadata = []
    if 'garments_metadata' in request.form:
        try:
            garments_metadata = json.loads(request.form['garments_metadata'])
        except json.JSONDecodeError:
            garments_metadata = []
    
    # Read person image as base64 for database
    with open(person_path, "rb") as img_file:
        person_image_base64 = base64.b64encode(img_file.read()).decode("utf-8")
    person_mime = f"image/{person_path.suffix.lower().replace('.', '')}"
    person_image_data_url = f"data:{person_mime};base64,{person_image_base64}"
    
    # Prepare garment metadata for database
    garment_images_data = []
    for i, garment_path in enumerate(garment_paths):
        # Read garment image as base64 for database
        with open(garment_path, "rb") as img_file:
            garment_image_base64 = base64.b64encode(img_file.read()).decode("utf-8")
        garment_mime = f"image/{garment_path.suffix.lower().replace('.', '')}"
        garment_image_data_url = f"data:{garment_mime};base64,{garment_image_base64}"
        
        # Get metadata for this garment if available
        metadata = garments_metadata[i] if i < len(garments_metadata) else {}
        garment_images_data.append({
            'image': garment_image_data_url,
            'sku': metadata.get('sku'),
            'url': metadata.get('url'),
            'title': metadata.get('title'),
            'price': metadata.get('price'),
            'metadata': json.dumps(metadata) if metadata else None
        })
    
    # Start with person image as output
    output = str(person_path)
    temp_files_to_cleanup = []
    
    # Iteratively apply each garment
    for i, garment_path in enumerate(garment_paths):
        print(f"Running virtual try-on iteration {i+1}/{len(garment_paths)}: person={output}, garment={garment_path}")
        result_image = put_on(
            person=output,
            garment=str(garment_path),
            number_of_images=1,
            safety_filter_level="BLOCK_LOW_AND_ABOVE",
            output_mime_type="image/jpeg"
        )
        
        # Save intermediate result
        temp_output = PROCESSED_FOLDER / f"{timestamp}_temp_iter_{i}.jpg"
        result_image.save(str(temp_output))
        time.sleep(0.1)
        
        # Update output to the new result for next iteration
        # If this isn't the last iteration, save it as a temp file
        if i < len(garment_paths) - 1:
            temp_files_to_cleanup.append(temp_output)
            output = str(temp_output)
        else:
            # Last iteration - this is our final output
            output_filename = f"{timestamp}_tryon.jpg"
            output_path = PROCESSED_FOLDER / output_filename
            actual_output_path = process_selfie(str(temp_output), str(output_path), padding=20, max_size=1000)
            output_path = Path(actual_output_path)
            output_filename = output_path.name
            temp_output.unlink()

    # Generate multiple views
    print(f"Generating multiple views from: {output_path}")
    view_paths = generate_views(str(output_path))
    print(f"Generated {len(view_paths)} views")

    # Crop each view
    cropped_view_paths = []
    for i, view_path in enumerate(view_paths):
        if os.path.exists(view_path):
            view_file = Path(view_path)
            cropped_view_path = view_file.parent / f"{timestamp}_view_{i}_cropped{view_file.suffix}"
            
            actual_cropped_path = process_selfie(str(view_path), str(cropped_view_path), padding=20, max_size=1000)
            cropped_view_paths.append(actual_cropped_path)
            Path(view_path).unlink()
    
    # Convert to base64
    images_base64 = []
    for view_path in cropped_view_paths:
        with open(view_path, "rb") as img_file:
            img_data = base64.b64encode(img_file.read()).decode("utf-8")
        ext = Path(view_path).suffix.lower()
        mime_type = "image/png" if ext == ".png" else "image/jpeg"
        images_base64.append(f"data:{mime_type};base64,{img_data}")
    
    # Include original cropped image as first one
    if str(output_path) not in cropped_view_paths:
        with open(output_path, "rb") as img_file:
            img_data = base64.b64encode(img_file.read()).decode("utf-8")
        mime_type = "image/png" if output_path.suffix.lower() == ".png" else "image/jpeg"
        images_base64.insert(0, f"data:{mime_type};base64,{img_data}")

    # Prepare generated images data for database
    generated_images_data = []
    for i, img_base64 in enumerate(images_base64):
        generated_images_data.append({
            'image': img_base64,
            'is_main': i == 0,
            'view_index': i
        })
    
    # Save to database
    try:
        save_tryon_session(
            timestamp=timestamp,
            person_image_base64=person_image_data_url,
            garment_images_data=garment_images_data,
            generated_images_data=generated_images_data
        )
        print(f"Saved try-on session to database: {timestamp}")
    except Exception as e:
        print(f"Error saving to database: {e}")

    # Clean up
    if person_path and person_path.exists():
        person_path.unlink()
    for garment_path in garment_paths:
        if garment_path.exists():
            garment_path.unlink()
    for temp_file in temp_files_to_cleanup:
        if temp_file.exists():
            temp_file.unlink()
    # Clean up downloaded files
    for downloaded_file in files_to_cleanup:
        if downloaded_file.exists():
            downloaded_file.unlink()

    if len(images_base64) > 1:
        valid_images = images_base64[1:]
    else:
        valid_images = images_base64

    return jsonify({
        "success": True,
        "images": valid_images,
        "image": images_base64[0] if images_base64 else None,
        "filename": output_filename,
        "timestamp": timestamp
    })


@app.route("/try-on-stream", methods=["POST"])
def try_on_stream():
    """SSE version of try-on endpoint with progress updates"""
    def generate():
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            files_to_cleanup = []
            
            yield f"data: {json.dumps({'type': 'status', 'message': '👋 Starting your virtual try-on...', 'progress': 0})}\n\n"
            
            # Handle person image
            person_path = None
            if "person" in request.files and request.files["person"].filename:
                person_file = request.files["person"]
                person_path = UPLOAD_FOLDER / f"{timestamp}_person_{secure_filename(person_file.filename)}"
                person_file.save(person_path)
            elif "person_url" in request.form:
                person_url = request.form["person_url"]
                ext = ".jpg"
                if "." in person_url.split("/")[-1]:
                    ext = "." + person_url.split(".")[-1].split("?")[0]
                person_path = UPLOAD_FOLDER / f"{timestamp}_person_downloaded{ext}"
                try:
                    download_image_from_url(person_url, person_path)
                    files_to_cleanup.append(person_path)
                except Exception as e:
                    yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to download person image: {str(e)}'})}\n\n"
                    return
            else:
                yield f"data: {json.dumps({'type': 'error', 'message': 'No person image provided'})}\n\n"
                return
            
            yield f"data: {json.dumps({'type': 'status', 'message': '📸 Got your photo!', 'progress': 5})}\n\n"
            
            # Handle garment images
            garment_paths = []
            garment_files = request.files.getlist("garment")
            
            if garment_files and garment_files[0].filename:
                for i, garment_file in enumerate(garment_files):
                    garment_path = UPLOAD_FOLDER / f"{timestamp}_garment_{i}_{secure_filename(garment_file.filename)}"
                    garment_file.save(garment_path)
                    garment_paths.append(garment_path)
            
            # Try garments_data (url + base64)
            if "garments_data" in request.form and not garment_paths:
                try:
                    garments_data = json.loads(request.form["garments_data"])
                    yield f"data: {json.dumps({'type': 'status', 'message': f'🛍️ Found {len(garments_data)} garments!', 'progress': 10})}\n\n"
                    
                    for i, garment_data in enumerate(garments_data):
                        garment_url = garment_data.get("url")
                        garment_base64 = garment_data.get("base64")
                        
                        if garment_base64:
                            try:
                                if garment_base64.startswith("data:"):
                                    garment_base64 = garment_base64.split(",", 1)[1]
                                img_data = base64.b64decode(garment_base64)
                                garment_path = UPLOAD_FOLDER / f"{timestamp}_garment_{i}_from_browser.jpg"
                                with open(garment_path, "wb") as f:
                                    f.write(img_data)
                                garment_paths.append(garment_path)
                                files_to_cleanup.append(garment_path)
                                continue
                            except Exception as e:
                                print(f"Warning: Failed to decode base64 for garment {i}: {str(e)}")
                        
                        if garment_url:
                            try:
                                ext = ".jpg"
                                if "." in garment_url.split("/")[-1]:
                                    ext = "." + garment_url.split(".")[-1].split("?")[0]
                                garment_path = UPLOAD_FOLDER / f"{timestamp}_garment_{i}_from_url{ext}"
                                download_image_from_url(garment_url, garment_path)
                                garment_paths.append(garment_path)
                                files_to_cleanup.append(garment_path)
                            except Exception as e:
                                print(f"Warning: Failed to download garment {i} from URL: {str(e)}")
                except json.JSONDecodeError as e:
                    print(f"Warning: Failed to parse garments_data: {str(e)}")
            
            if not garment_paths:
                yield f"data: {json.dumps({'type': 'error', 'message': 'No garment images provided'})}\n\n"
                return
            
            # Get metadata
            garments_metadata = []
            if 'garments_metadata' in request.form:
                try:
                    garments_metadata = json.loads(request.form['garments_metadata'])
                except json.JSONDecodeError:
                    garments_metadata = []
            
            # Read person image for database
            with open(person_path, "rb") as img_file:
                person_image_base64 = base64.b64encode(img_file.read()).decode("utf-8")
            person_mime = f"image/{person_path.suffix.lower().replace('.', '')}"
            person_image_data_url = f"data:{person_mime};base64,{person_image_base64}"
            
            # Prepare garment metadata
            garment_images_data = []
            for i, garment_path in enumerate(garment_paths):
                with open(garment_path, "rb") as img_file:
                    garment_image_base64 = base64.b64encode(img_file.read()).decode("utf-8")
                garment_mime = f"image/{garment_path.suffix.lower().replace('.', '')}"
                garment_image_data_url = f"data:{garment_mime};base64,{garment_image_base64}"
                metadata = garments_metadata[i] if i < len(garments_metadata) else {}
                garment_images_data.append({
                    'image': garment_image_data_url,
                    'sku': metadata.get('sku'),
                    'url': metadata.get('url'),
                    'title': metadata.get('title'),
                    'price': metadata.get('price'),
                    'metadata': json.dumps(metadata) if metadata else None
                })
            
            # Fun emoji options for garments
            garment_emojis = ["🎽", "👕", "👔", "🧥", "👗", "🥼", "🧣", "👘", "🥻", "👚"]
            ordinal_words = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"]
            
            # Iteratively apply each garment
            output = str(person_path)
            temp_files_to_cleanup = []
            
            for i, garment_path in enumerate(garment_paths):
                # Progress calculation: 15% to 70% during garment application
                progress = 15 + int((i / len(garment_paths)) * 55)
                
                # Generate fun message dynamically
                emoji = garment_emojis[i % len(garment_emojis)]
                if i < len(ordinal_words):
                    ordinal = ordinal_words[i]
                    action = "Putting on" if i == 0 else ("Adding" if i < 2 else "Layering")
                    message = f"{emoji} {action} the {ordinal} piece..."
                else:
                    message = f"{emoji} Adding piece {i+1}..."
                
                yield f"data: {json.dumps({'type': 'status', 'message': message, 'progress': progress, 'garment': i+1, 'total': len(garment_paths)})}\n\n"
                
                result_image = put_on(
                    person=output,
                    garment=str(garment_path),
                    number_of_images=1,
                    safety_filter_level="BLOCK_LOW_AND_ABOVE",
                    output_mime_type="image/jpeg"
                )
                
                temp_output = PROCESSED_FOLDER / f"{timestamp}_temp_iter_{i}.jpg"
                result_image.save(str(temp_output))
                time.sleep(0.1)
                
                if i < len(garment_paths) - 1:
                    temp_files_to_cleanup.append(temp_output)
                    output = str(temp_output)
                else:
                    output_filename = f"{timestamp}_tryon.jpg"
                    output_path = PROCESSED_FOLDER / output_filename
                    actual_output_path = process_selfie(str(temp_output), str(output_path), padding=20, max_size=1000)
                    output_path = Path(actual_output_path)
                    output_filename = output_path.name
                    temp_output.unlink()
            
            yield f"data: {json.dumps({'type': 'status', 'message': '📸 Taking your photos...', 'progress': 75})}\n\n"
            
            # Generate multiple views
            view_paths = generate_views(str(output_path))
            
            yield f"data: {json.dumps({'type': 'status', 'message': '🔄 Spinning you around...', 'progress': 85})}\n\n"
            
            # Crop each view
            cropped_view_paths = []
            for i, view_path in enumerate(view_paths):
                if os.path.exists(view_path):
                    view_file = Path(view_path)
                    cropped_view_path = view_file.parent / f"{timestamp}_view_{i}_cropped{view_file.suffix}"
                    actual_cropped_path = process_selfie(str(view_path), str(cropped_view_path), padding=20, max_size=1000)
                    cropped_view_paths.append(actual_cropped_path)
                    Path(view_path).unlink()
            
            yield f"data: {json.dumps({'type': 'status', 'message': '✨ Polishing your photos...', 'progress': 95})}\n\n"
            
            # Convert to base64
            images_base64 = []
            for view_path in cropped_view_paths:
                with open(view_path, "rb") as img_file:
                    img_data = base64.b64encode(img_file.read()).decode("utf-8")
                ext = Path(view_path).suffix.lower()
                mime_type = "image/png" if ext == ".png" else "image/jpeg"
                images_base64.append(f"data:{mime_type};base64,{img_data}")
            
            # Include original cropped image
            if str(output_path) not in cropped_view_paths:
                with open(output_path, "rb") as img_file:
                    img_data = base64.b64encode(img_file.read()).decode("utf-8")
                mime_type = "image/png" if output_path.suffix.lower() == ".png" else "image/jpeg"
                images_base64.insert(0, f"data:{mime_type};base64,{img_data}")
            
            # Prepare generated images data
            generated_images_data = []
            for i, img_base64 in enumerate(images_base64):
                generated_images_data.append({
                    'image': img_base64,
                    'is_main': i == 0,
                    'view_index': i
                })
            
            # Save to database
            try:
                save_tryon_session(
                    timestamp=timestamp,
                    person_image_base64=person_image_data_url,
                    garment_images_data=garment_images_data,
                    generated_images_data=generated_images_data
                )
            except Exception as e:
                print(f"Error saving to database: {e}")
            
            # Clean up
            if person_path and person_path.exists():
                person_path.unlink()
            for garment_path in garment_paths:
                if garment_path.exists():
                    garment_path.unlink()
            for temp_file in temp_files_to_cleanup:
                if temp_file.exists():
                    temp_file.unlink()
            for downloaded_file in files_to_cleanup:
                if downloaded_file.exists():
                    downloaded_file.unlink()
            
            # Store images temporarily for retrieval
            # We don't send images via SSE due to size - frontend will fetch them
            if len(images_base64) > 1:
                valid_images = images_base64[1:]
            else:
                valid_images = images_base64
            
            # Store in a temporary cache (you could use Redis, but for now use a simple dict)
            if not hasattr(app, '_tryon_cache'):
                app._tryon_cache = {}
            app._tryon_cache[timestamp] = {
                'images': valid_images,
                'image': images_base64[0] if images_base64 else None,
                'filename': output_filename
            }
            
            # Send completion event with timestamp only (no images to avoid huge payload)
            yield f"data: {json.dumps({'type': 'complete', 'message': '🎉 All done! Looking great!', 'progress': 100, 'timestamp': timestamp, 'filename': output_filename})}\n\n"
            
        except Exception as e:
            print(f"Error in try-on stream: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': f'Error: {str(e)}'})}\n\n"
    
    return Response(stream_with_context(generate()), mimetype='text/event-stream')


@app.route("/try-on-result/<timestamp>", methods=["GET"])
def get_tryon_result(timestamp: str):
    """Get the try-on result images by timestamp"""
    if not hasattr(app, '_tryon_cache'):
        return jsonify({"error": "No results found"}), 404
    
    result = app._tryon_cache.get(timestamp)
    if not result:
        return jsonify({"error": "Result not found or expired"}), 404
    
    # Clean up after retrieval
    del app._tryon_cache[timestamp]
    
    return jsonify({
        "success": True,
        "images": result['images'],
        "image": result['image'],
        "filename": result['filename']
    })


@app.route("/processed/<filename>", methods=["GET"])
def get_processed_image(filename: str):
    file_path = PROCESSED_FOLDER / secure_filename(filename)
    return send_file(file_path, mimetype="image/png")


@app.route("/sessions", methods=["GET"])
def get_sessions():
    """Get all try-on sessions"""
    try:
        limit = request.args.get('limit', 50, type=int)
        sessions = get_all_sessions(limit=limit)
        return jsonify({
            "success": True,
            "sessions": sessions
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/sessions/<timestamp>", methods=["GET"])
def get_session(timestamp: str):
    """Get a specific try-on session with all details"""
    try:
        session = get_tryon_session(timestamp)
        if session:
            return jsonify({
                "success": True,
                "session": session
            })
        else:
            return jsonify({
                "success": False,
                "error": "Session not found"
            }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    print(f"Starting Flask server on port {port}")
    app.run(host="0.0.0.0", port=port, debug=True)
