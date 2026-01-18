from peewee import *
from datetime import datetime
import os

# Database setup
DB_PATH = os.path.join(os.path.dirname(__file__), 'tryon.db')
db = SqliteDatabase(DB_PATH)

class BaseModel(Model):
    class Meta:
        database = db

class TryOnSession(BaseModel):
    """Stores a virtual try-on session"""
    timestamp = CharField(unique=True)
    person_image = TextField()  # Base64 encoded
    created_at = DateTimeField(default=datetime.now)
    
    class Meta:
        table_name = 'tryon_sessions'

class GarmentImage(BaseModel):
    """Stores garment images used in a try-on session"""
    session = ForeignKeyField(TryOnSession, backref='garments')
    image = TextField()  # Base64 encoded
    order = IntegerField()  # Order in which garment was applied
    sku = CharField(null=True)
    url = CharField(null=True)
    title = CharField(null=True)
    price = CharField(null=True)
    metadata = TextField(null=True)  # JSON string for additional metadata
    
    class Meta:
        table_name = 'garment_images'

class GeneratedImage(BaseModel):
    """Stores generated output images from try-on"""
    session = ForeignKeyField(TryOnSession, backref='generated_images')
    image = TextField()  # Base64 encoded
    is_main = BooleanField(default=False)  # True for the main output, False for views
    view_index = IntegerField(null=True)  # Index for view images
    
    class Meta:
        table_name = 'generated_images'

def initialize_db():
    """Initialize the database and create tables"""
    db.connect()
    db.create_tables([TryOnSession, GarmentImage, GeneratedImage], safe=True)
    db.close()

def save_tryon_session(timestamp, person_image_base64, garment_images_data, generated_images_data):
    """
    Save a complete try-on session to the database
    
    Args:
        timestamp: Unique timestamp identifier
        person_image_base64: Base64 encoded person image
        garment_images_data: List of dicts with {image, sku, url, title, price, metadata}
        generated_images_data: List of dicts with {image, is_main, view_index}
    
    Returns:
        TryOnSession object
    """
    with db.atomic():
        # Create session
        session = TryOnSession.create(
            timestamp=timestamp,
            person_image=person_image_base64
        )
        
        # Save garment images
        for i, garment_data in enumerate(garment_images_data):
            GarmentImage.create(
                session=session,
                image=garment_data['image'],
                order=i,
                sku=garment_data.get('sku'),
                url=garment_data.get('url'),
                title=garment_data.get('title'),
                price=garment_data.get('price'),
                metadata=garment_data.get('metadata')
            )
        
        # Save generated images
        for gen_data in generated_images_data:
            GeneratedImage.create(
                session=session,
                image=gen_data['image'],
                is_main=gen_data.get('is_main', False),
                view_index=gen_data.get('view_index')
            )
        
        return session

def get_tryon_session(timestamp):
    """
    Retrieve a try-on session with all related images
    
    Returns:
        Dict with session data including garments and generated images
    """
    try:
        session = TryOnSession.get(TryOnSession.timestamp == timestamp)
        
        garments = []
        for garment in session.garments.order_by(GarmentImage.order):
            garments.append({
                'image': garment.image,
                'order': garment.order,
                'sku': garment.sku,
                'url': garment.url,
                'title': garment.title,
                'price': garment.price,
                'metadata': garment.metadata
            })
        
        generated_images = []
        for gen_img in session.generated_images.order_by(GeneratedImage.view_index):
            generated_images.append({
                'image': gen_img.image,
                'is_main': gen_img.is_main,
                'view_index': gen_img.view_index
            })
        
        return {
            'timestamp': session.timestamp,
            'person_image': session.person_image,
            'created_at': session.created_at.isoformat(),
            'garments': garments,
            'generated_images': generated_images
        }
    except TryOnSession.DoesNotExist:
        return None

def get_all_sessions(limit=50):
    """
    Get all try-on sessions, ordered by most recent first
    
    Returns:
        List of session dictionaries
    """
    sessions = []
    for session in TryOnSession.select().order_by(TryOnSession.created_at.desc()).limit(limit):
        # Get main generated image
        main_image = None
        try:
            main_gen = session.generated_images.where(GeneratedImage.is_main == True).get()
            main_image = main_gen.image
        except GeneratedImage.DoesNotExist:
            # Fallback to first generated image
            try:
                main_gen = session.generated_images.get()
                main_image = main_gen.image
            except GeneratedImage.DoesNotExist:
                pass
        
        sessions.append({
            'timestamp': session.timestamp,
            'created_at': session.created_at.isoformat(),
            'person_image': session.person_image,
            'main_image': main_image,
            'garment_count': session.garments.count(),
            'generated_count': session.generated_images.count()
        })
    
    return sessions

# Initialize database on import
initialize_db()
