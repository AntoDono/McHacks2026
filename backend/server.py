"""
Flask server for processing uploaded images.
Removes background and crops to person.
"""

import os
import time
import base64
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import tempfile
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import image processing functions
import sys
from pathlib import Path

# Add image-manipulation directory to path
image_manip_path = Path(__file__).parent / "image-manipulation"
sys.path.insert(0, str(image_manip_path))
from crop_person import process_selfie

# Import virtual try-on function
from put_on import put_on

# Import multi-view generator
from generate_views import generate_views

app = Flask(__name__)
CORS(app)  # Enable CORS for Chrome extension

# Configuration
BASE_DIR = Path(__file__).parent.resolve()
UPLOAD_FOLDER = BASE_DIR / "uploads"
PROCESSED_FOLDER = BASE_DIR / "processed"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

# Create folders if they don't exist
UPLOAD_FOLDER.mkdir(exist_ok=True)
PROCESSED_FOLDER.mkdir(exist_ok=True)


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "message": "Server is running"})


@app.route("/process-image", methods=["POST"])
def process_image():
    """
    Process uploaded image: remove background and crop to person.
    
    Expects:
    - multipart/form-data with 'image' file field
    
    Returns:
    - JSON with processed image as base64 or file path
    """
    try:
        # Check if file is present
        if "image" not in request.files:
            return jsonify({"error": "No image file provided"}), 400

        file = request.files["image"]

        # Check if file is selected
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        # Validate file
        if not allowed_file(file.filename):
            return (
                jsonify({"error": f"File type not allowed. Allowed: {ALLOWED_EXTENSIONS}"}),
                400,
            )

        # Check file size
        file.seek(0, os.SEEK_END)
        file_length = file.tell()
        file.seek(0)

        if file_length > MAX_FILE_SIZE:
            return jsonify({"error": f"File too large. Max size: {MAX_FILE_SIZE} bytes"}), 400

        # Save uploaded file temporarily
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = secure_filename(file.filename)
        input_path = UPLOAD_FOLDER / f"{timestamp}_{filename}"
        file.save(input_path)

        # Generate output filename
        output_filename = f"{timestamp}_processed.png"
        output_path = PROCESSED_FOLDER / output_filename

        # Process image
        print(f"Processing image: {input_path}")
        actual_output_path = process_selfie(
            str(input_path),
            str(output_path),
            padding=20,
            max_size=1000  # Max dimension 1000px
        )
        
        # Update output_path to actual path (in case extension changed)
        output_path = Path(actual_output_path)
        output_filename = output_path.name

        # Read processed image and convert to base64
        with open(output_path, "rb") as img_file:
            img_data = base64.b64encode(img_file.read()).decode("utf-8")

        # Clean up uploaded file (keep processed)
        input_path.unlink()

        return jsonify({
            "success": True,
            "image": f"data:image/png;base64,{img_data}",
            "filename": output_filename
        })

    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return jsonify({"error": f"Failed to process image: {str(e)}"}), 500


@app.route("/try-on", methods=["POST"])
def try_on():
    """
    Virtual try-on: generate image of person wearing garment.
    
    Expects:
    - multipart/form-data with 'person' and 'garment' file fields
    
    Returns:
    - JSON with generated try-on image as base64
    """
    try:
        # Check if both files are present
        if "person" not in request.files:
            return jsonify({"error": "No person image provided"}), 400
        
        if "garment" not in request.files:
            return jsonify({"error": "No garment image provided"}), 400

        person_file = request.files["person"]
        garment_file = request.files["garment"]

        # Check if files are selected
        if person_file.filename == "":
            return jsonify({"error": "No person file selected"}), 400
        
        if garment_file.filename == "":
            return jsonify({"error": "No garment file selected"}), 400

        # Validate files
        if not allowed_file(person_file.filename):
            return (
                jsonify({"error": f"Person image type not allowed. Allowed: {ALLOWED_EXTENSIONS}"}),
                400,
            )
        
        if not allowed_file(garment_file.filename):
            return (
                jsonify({"error": f"Garment image type not allowed. Allowed: {ALLOWED_EXTENSIONS}"}),
                400,
            )

        # Check file sizes
        for file in [person_file, garment_file]:
            file.seek(0, os.SEEK_END)
            file_length = file.tell()
            file.seek(0)
            
            if file_length > MAX_FILE_SIZE:
                return jsonify({"error": f"File too large. Max size: {MAX_FILE_SIZE} bytes"}), 400

        # Save uploaded files temporarily
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        person_filename = secure_filename(person_file.filename)
        garment_filename = secure_filename(garment_file.filename)
        
        person_path = UPLOAD_FOLDER / f"{timestamp}_person_{person_filename}"
        garment_path = UPLOAD_FOLDER / f"{timestamp}_garment_{garment_filename}"
        
        person_file.save(person_path)
        garment_file.save(garment_path)

        # Generate output filename
        output_filename = f"{timestamp}_tryon.jpg"
        output_path = PROCESSED_FOLDER / output_filename

        # Call virtual try-on
        print(f"Running virtual try-on: person={person_path}, garment={garment_path}")
        print(f"Output will be saved to: {output_path}")
        result_image = put_on(
            person=str(person_path),
            garment=str(garment_path),
            number_of_images=1,
            safety_filter_level="BLOCK_LOW_AND_ABOVE",
            output_mime_type="image/jpeg"
        )
        print(f"Virtual try-on completed, result image type: {type(result_image)}")

        # Save the result image temporarily
        temp_output = PROCESSED_FOLDER / f"{timestamp}_temp_tryon.jpg"
        print(f"Saving result image to: {temp_output}")
        result_image.save(str(temp_output))
        
        # Sync filesystem to ensure write is complete
        time.sleep(0.1)  # Small delay to ensure file is written
        
        # Ensure temp file exists before proceeding
        if not temp_output.exists():
            raise Exception(f"Failed to save temporary try-on result: {temp_output}")
        
        print(f"Temp file saved successfully, size: {temp_output.stat().st_size} bytes")
        
        # Crop the result image using crop_person
        print(f"Cropping result image: {temp_output}")
        try:
            actual_output_path = process_selfie(
                str(temp_output),
                str(output_path),
                padding=20,
                max_size=1000
            )
            # Update output_path to actual path (in case extension changed to PNG)
            output_path = Path(actual_output_path)
            output_filename = output_path.name
            
            # Check if cropping actually created the output file
            if output_path.exists():
                # Remove temp file only if output exists
                temp_output.unlink()
                print(f"Cropping successful. Output: {output_path}")
            else:
                # This shouldn't happen since process_selfie returns the path it created
                print(f"Warning: Unexpected state - using temp as output")
                temp_output.rename(output_path)
        except Exception as crop_error:
            print(f"Warning: Failed to crop result image: {crop_error}")
            # If cropping fails, use the original result (keep as JPEG)
            if temp_output.exists():
                temp_output.rename(output_path)
            else:
                raise Exception(f"Both cropping failed and temp file is missing: {temp_output}")
        
        # Verify output file exists before reading
        if not output_path.exists():
            raise Exception(f"Output file was not created: {output_path}")

        # Generate multiple views from the cropped try-on result
        print(f"Generating multiple views from: {output_path}")
        try:
            view_paths = generate_views(str(output_path))
            print(f"Generated {len(view_paths)} views: {view_paths}")
        except Exception as view_error:
            print(f"Warning: Failed to generate views: {view_error}")
            # Fallback to just the original image
            view_paths = [str(output_path)]

        # Read all images and convert to base64
        images_base64 = []
        for view_path in view_paths:
            if os.path.exists(view_path):
                with open(view_path, "rb") as img_file:
                    img_data = base64.b64encode(img_file.read()).decode("utf-8")
                # Determine MIME type based on file extension
                ext = Path(view_path).suffix.lower()
                mime_type = "image/png" if ext == ".png" else "image/jpeg"
                images_base64.append(f"data:{mime_type};base64,{img_data}")
        
        # Also include the original cropped image as the first one if not already included
        if str(output_path) not in view_paths:
            with open(output_path, "rb") as img_file:
                img_data = base64.b64encode(img_file.read()).decode("utf-8")
            mime_type = "image/png" if output_path.suffix.lower() == ".png" else "image/jpeg"
            images_base64.insert(0, f"data:{mime_type};base64,{img_data}")

        print(f"Total images to return: {len(images_base64)}")

        # Clean up uploaded files (keep result)
        person_path.unlink()
        garment_path.unlink()

        return jsonify({
            "success": True,
            "images": images_base64,
            "image": images_base64[0] if images_base64 else None,  # Keep backward compatibility
            "filename": output_filename
        })

    except Exception as e:
        print(f"Error in virtual try-on: {str(e)}")
        return jsonify({"error": f"Failed to generate try-on image: {str(e)}"}), 500


@app.route("/processed/<filename>", methods=["GET"])
def get_processed_image(filename: str):
    """Serve processed images."""
    file_path = PROCESSED_FOLDER / secure_filename(filename)
    if file_path.exists():
        return send_file(file_path, mimetype="image/png")
    return jsonify({"error": "File not found"}), 404


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    print("Starting Flask server...")
    print(f"Upload folder: {UPLOAD_FOLDER.absolute()}")
    print(f"Processed folder: {PROCESSED_FOLDER.absolute()}")
    print(f"Server running on port: {port}")
    app.run(host="0.0.0.0", port=port, debug=True)
