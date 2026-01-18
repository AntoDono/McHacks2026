from pymongo import MongoClient, DESCENDING
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB Atlas connection
MONGODB_URI = os.getenv('MONGODB_URI')
if not MONGODB_URI:
    raise ValueError("MONGODB_URI environment variable is not set. Please add it to your .env file")

# Initialize MongoDB client
client = MongoClient(MONGODB_URI)
db = client.get_database('tryon_db')  # Database name

# Collections
sessions_collection = db['tryon_sessions']
garments_collection = db['garment_images']
generated_images_collection = db['generated_images']

def initialize_db():
    """Initialize the database and create indexes"""
    try:
        # Create indexes for better query performance
        sessions_collection.create_index('timestamp', unique=True)
        sessions_collection.create_index([('created_at', DESCENDING)])
        
        garments_collection.create_index('session_timestamp')
        garments_collection.create_index([('session_timestamp', 1), ('order', 1)])
        
        generated_images_collection.create_index('session_timestamp')
        generated_images_collection.create_index([('session_timestamp', 1), ('view_index', 1)])
        
        print("✓ MongoDB Atlas connected successfully")
    except Exception as e:
        print(f"Error initializing MongoDB: {e}")
        raise

def save_tryon_session(timestamp, person_image_base64, garment_images_data, generated_images_data):
    """
    Save a complete try-on session to the database
    
    Args:
        timestamp: Unique timestamp identifier
        person_image_base64: Base64 encoded person image
        garment_images_data: List of dicts with {image, sku, url, title, price, metadata}
        generated_images_data: List of dicts with {image, is_main, view_index}
    
    Returns:
        Session document
    """
    try:
        # Create session document
        session_doc = {
            'timestamp': timestamp,
            'person_image': person_image_base64,
            'created_at': datetime.now()
        }
        sessions_collection.insert_one(session_doc)
        
        # Save garment images
        garment_docs = []
        for i, garment_data in enumerate(garment_images_data):
            garment_doc = {
                'session_timestamp': timestamp,
                'image': garment_data['image'],
                'order': i,
                'sku': garment_data.get('sku'),
                'url': garment_data.get('url'),
                'title': garment_data.get('title'),
                'price': garment_data.get('price'),
                'metadata': garment_data.get('metadata')
            }
            garment_docs.append(garment_doc)
        
        if garment_docs:
            garments_collection.insert_many(garment_docs)
        
        # Save generated images
        generated_docs = []
        for gen_data in generated_images_data:
            gen_doc = {
                'session_timestamp': timestamp,
                'image': gen_data['image'],
                'is_main': gen_data.get('is_main', False),
                'view_index': gen_data.get('view_index')
            }
            generated_docs.append(gen_doc)
        
        if generated_docs:
            generated_images_collection.insert_many(generated_docs)
        
        return session_doc
    except Exception as e:
        print(f"Error saving try-on session: {e}")
        raise

def get_tryon_session(timestamp):
    """
    Retrieve a try-on session with all related images
    
    Returns:
        Dict with session data including garments and generated images
    """
    try:
        session = sessions_collection.find_one({'timestamp': timestamp})
        
        if not session:
            return None
        
        # Get garment images
        garments = []
        garment_docs = garments_collection.find(
            {'session_timestamp': timestamp}
        ).sort('order', 1)
        
        for garment in garment_docs:
            garments.append({
                'image': garment['image'],
                'order': garment['order'],
                'sku': garment.get('sku'),
                'url': garment.get('url'),
                'title': garment.get('title'),
                'price': garment.get('price'),
                'metadata': garment.get('metadata')
            })
        
        # Get generated images
        generated_images = []
        generated_docs = generated_images_collection.find(
            {'session_timestamp': timestamp}
        ).sort('view_index', 1)
        
        for gen_img in generated_docs:
            generated_images.append({
                'image': gen_img['image'],
                'is_main': gen_img.get('is_main', False),
                'view_index': gen_img.get('view_index')
            })
        
        return {
            'timestamp': session['timestamp'],
            'person_image': session['person_image'],
            'created_at': session['created_at'].isoformat(),
            'garments': garments,
            'generated_images': generated_images
        }
    except Exception as e:
        print(f"Error retrieving try-on session: {e}")
        return None

def get_all_sessions(limit=50):
    """
    Get all try-on sessions, ordered by most recent first
    
    Returns:
        List of session dictionaries
    """
    try:
        sessions = []
        session_docs = sessions_collection.find().sort('created_at', DESCENDING).limit(limit)
        
        for session in session_docs:
            # Get main generated image
            main_image = None
            
            # Try to get main image
            main_gen = generated_images_collection.find_one({
                'session_timestamp': session['timestamp'],
                'is_main': True
            })
            
            if main_gen:
                main_image = main_gen['image']
            else:
                # Fallback to first generated image
                first_gen = generated_images_collection.find_one({
                    'session_timestamp': session['timestamp']
                })
                if first_gen:
                    main_image = first_gen['image']
            
            # Count garments and generated images
            garment_count = garments_collection.count_documents({
                'session_timestamp': session['timestamp']
            })
            generated_count = generated_images_collection.count_documents({
                'session_timestamp': session['timestamp']
            })
            
            sessions.append({
                'timestamp': session['timestamp'],
                'created_at': session['created_at'].isoformat(),
                'person_image': session['person_image'],
                'main_image': main_image,
                'garment_count': garment_count,
                'generated_count': generated_count
            })
        
        return sessions
    except Exception as e:
        print(f"Error retrieving sessions: {e}")
        return []

# Initialize database on import
initialize_db()
