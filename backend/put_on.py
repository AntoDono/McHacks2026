"""Virtual Try-On using Google Vertex AI."""

import os
from pathlib import Path
from typing import Union
from dotenv import load_dotenv
from google import genai
from google.genai.types import Image, ProductImage, RecontextImageConfig, RecontextImageSource

load_dotenv()

VIRTUAL_TRY_ON_MODEL = "virtual-try-on-preview-08-04"
_client = None


def _get_client():
    global _client
    if _client is None:
        PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
        LOCATION = os.getenv("GOOGLE_CLOUD_REGION", "us-central1")
        _client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)
    return _client


def put_on(
    person: Union[str, Path, Image],
    garment: Union[str, Path, Image],
    number_of_images: int = 1,
    safety_filter_level: str = "BLOCK_LOW_AND_ABOVE",
    output_mime_type: str = "image/jpeg",
    person_generation: str = "ALLOW_ALL",
) -> Image:
    """Generate an image of a person wearing a garment."""
    client = _get_client()
    
    person_image = Image.from_file(location=str(person)) if isinstance(person, (str, Path)) else person
    garment_image = Image.from_file(location=str(garment)) if isinstance(garment, (str, Path)) else garment
    
    response = client.models.recontext_image(
        model=VIRTUAL_TRY_ON_MODEL,
        source=RecontextImageSource(
            person_image=person_image,
            product_images=[ProductImage(product_image=garment_image)],
        ),
        config=RecontextImageConfig(
            output_mime_type=output_mime_type,
            number_of_images=number_of_images,
            safety_filter_level=safety_filter_level,
            person_generation=person_generation,
        ),
    )
    
    return response.generated_images[0].image
