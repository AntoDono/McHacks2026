"""
Virtual Try-On function using Google Vertex AI.
Implements put_on(person, garment) to generate images of a person wearing a garment.
"""

import os
from pathlib import Path
from typing import Union
from dotenv import load_dotenv
from google import genai
from google.genai.types import (
    Image,
    ProductImage,
    RecontextImageConfig,
    RecontextImageSource,
)

# Load environment variables
load_dotenv()

# Model name for Virtual Try-On
VIRTUAL_TRY_ON_MODEL = "virtual-try-on-preview-08-04"

# Initialize client (lazy initialization)
_client = None


def _get_client():
    """Get or create the Google Gen AI client."""
    global _client
    if _client is None:
        PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
        LOCATION = os.getenv("GOOGLE_CLOUD_REGION", "us-central1")
        
        if not PROJECT_ID:
            raise ValueError(
                "GOOGLE_CLOUD_PROJECT environment variable is not set. "
                "Please set it in your .env file or environment."
            )
        
        # Check if credentials are available
        creds_file = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if creds_file and not os.path.exists(creds_file):
            raise FileNotFoundError(
                f"GOOGLE_APPLICATION_CREDENTIALS points to non-existent file: {creds_file}"
            )
        
        try:
            _client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)
        except Exception as e:
            raise RuntimeError(
                f"Failed to create Google Gen AI client: {e}\n"
                "Make sure you have set up authentication. See SETUP_AUTHENTICATION.md for details."
            )
    return _client


def put_on(
    person: Union[str, Path, Image],
    garment: Union[str, Path, Image],
    number_of_images: int = 1,
    safety_filter_level: str = "BLOCK_LOW_AND_ABOVE",
    output_mime_type: str = "image/jpeg",
) -> Image:
    """
    Generate an image of a person wearing a garment using Virtual Try-On.
    
    Args:
        person: Path to person image file (str or Path) or Image object
        garment: Path to garment image file (str or Path) or Image object
        number_of_images: Number of images to generate (1-4, default: 1)
        safety_filter_level: Safety filter level. Options:
            - "BLOCK_LOW_AND_ABOVE" (default)
            - "BLOCK_MEDIUM_AND_ABOVE"
            - "BLOCK_ONLY_HIGH"
            - "BLOCK_NONE"
        output_mime_type: Output image MIME type (default: "image/jpeg")
    
    Returns:
        Image: The generated image object
    
    Raises:
        ValueError: If required environment variables are not set
        FileNotFoundError: If person or garment file paths don't exist
        Exception: If the API call fails
    
    Example:
        >>> result_image = put_on("person.jpg", "shirt.jpg")
        >>> result_image.save("result.jpg")
    """
    # Validate number_of_images
    if not (1 <= number_of_images <= 4):
        raise ValueError("number_of_images must be between 1 and 4")
    
    # Get client
    client = _get_client()
    
    # Convert person to Image object if it's a file path
    if isinstance(person, (str, Path)):
        person_path = Path(person)
        if not person_path.exists():
            raise FileNotFoundError(f"Person image not found: {person_path}")
        person_image = Image.from_file(location=str(person_path))
    elif isinstance(person, Image):
        person_image = person
    else:
        raise TypeError(f"person must be a file path (str/Path) or Image object, got {type(person)}")
    
    # Convert garment to Image object if it's a file path
    if isinstance(garment, (str, Path)):
        garment_path = Path(garment)
        if not garment_path.exists():
            raise FileNotFoundError(f"Garment image not found: {garment_path}")
        garment_image = Image.from_file(location=str(garment_path))
    elif isinstance(garment, Image):
        garment_image = garment
    else:
        raise TypeError(f"garment must be a file path (str/Path) or Image object, got {type(garment)}")
    
    # Make the API call
    response = client.models.recontext_image(
        model=VIRTUAL_TRY_ON_MODEL,
        source=RecontextImageSource(
            person_image=person_image,
            product_images=[
                ProductImage(product_image=garment_image)
            ],
        ),
        config=RecontextImageConfig(
            output_mime_type=output_mime_type,
            number_of_images=number_of_images,
            safety_filter_level=safety_filter_level,
        ),
    )
    
    # Return the first generated image
    if not response.generated_images:
        raise Exception("No images were generated")
    
    return response.generated_images[0].image
