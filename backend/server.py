"""Flask server for virtual try-on and image processing."""

import os
import time
import base64
import sys
from pathlib import Path
from flask import Flask, request, jsonify, send_file
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

app = Flask(__name__)
CORS(app)

# Configuration
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


@app.route("/try-on", methods=["POST"])
def try_on():
    person_file = request.files["person"]
    garment_file = request.files["garment"]

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    person_path = UPLOAD_FOLDER / f"{timestamp}_person_{secure_filename(person_file.filename)}"
    garment_path = UPLOAD_FOLDER / f"{timestamp}_garment_{secure_filename(garment_file.filename)}"
    
    person_file.save(person_path)
    garment_file.save(garment_path)

    output_filename = f"{timestamp}_tryon.jpg"
    output_path = PROCESSED_FOLDER / output_filename

    print(f"Running virtual try-on: person={person_path}, garment={garment_path}")
    result_image = put_on(
        person=str(person_path),
        garment=str(garment_path),
        number_of_images=1,
        safety_filter_level="BLOCK_LOW_AND_ABOVE",
        output_mime_type="image/jpeg"
    )

    temp_output = PROCESSED_FOLDER / f"{timestamp}_temp_tryon.jpg"
    result_image.save(str(temp_output))
    time.sleep(0.1)
    
    # Crop the result image
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

    # Clean up
    person_path.unlink()
    garment_path.unlink()

    return jsonify({
        "success": True,
        "images": images_base64[1:],
        "image": images_base64[0] if images_base64 else None,
        "filename": output_filename
    })


@app.route("/processed/<filename>", methods=["GET"])
def get_processed_image(filename: str):
    file_path = PROCESSED_FOLDER / secure_filename(filename)
    return send_file(file_path, mimetype="image/png")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    print(f"Starting Flask server on port {port}")
    app.run(host="0.0.0.0", port=port, debug=True)
