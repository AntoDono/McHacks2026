"""
Flask server for processing uploaded images.
Removes background and crops to person.
"""

import os
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import tempfile
from datetime import datetime

# Import image processing functions
import sys
from pathlib import Path

# Add image-manipulation directory to path
image_manip_path = Path(__file__).parent / "image-manipulation"
sys.path.insert(0, str(image_manip_path))
from crop_person import process_selfie

app = Flask(__name__)
CORS(app)  # Enable CORS for Chrome extension

# Configuration
UPLOAD_FOLDER = Path("uploads")
PROCESSED_FOLDER = Path("processed")
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
        process_selfie(
            str(input_path),
            str(output_path),
            padding=20,
            max_size=1000  # Max dimension 1000px
        )

        # Read processed image and convert to base64
        import base64
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


@app.route("/processed/<filename>", methods=["GET"])
def get_processed_image(filename: str):
    """Serve processed images."""
    file_path = PROCESSED_FOLDER / secure_filename(filename)
    if file_path.exists():
        return send_file(file_path, mimetype="image/png")
    return jsonify({"error": "File not found"}), 404


if __name__ == "__main__":
    print("Starting Flask server...")
    print(f"Upload folder: {UPLOAD_FOLDER.absolute()}")
    print(f"Processed folder: {PROCESSED_FOLDER.absolute()}")
    app.run(host="0.0.0.0", port=8080, debug=True)
