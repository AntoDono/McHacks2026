from pymongo import MongoClient, DESCENDING
from datetime import datetime
import os
import io
import base64
from dotenv import load_dotenv
import torch
import open_clip
from PIL import Image
import numpy as np

load_dotenv()

# Initialize fashionSigLIP model for garment embeddings
print("Loading fashionSigLIP model...")
_clip_model, _, _preprocess_val = open_clip.create_model_and_transforms('hf-hub:Marqo/marqo-fashionSigLIP')
_clip_model.eval()

# Use GPU if available
_device = "cuda" if torch.cuda.is_available() else "cpu"
_clip_model = _clip_model.to(_device)
print(f"✓ fashionSigLIP model loaded on {_device}")

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

def generate_garment_embedding(image_base64):
    """
    Generate embedding for a garment image using fashionSigLIP
    
    Args:
        image_base64: Base64 encoded image string (with or without data URL prefix)
        
    Returns:
        List of floats representing the embedding vector
    """
    try:
        # Strip data URL prefix if present (e.g., "data:image/png;base64,")
        if isinstance(image_base64, str) and ',' in image_base64:
            # Check if it starts with data: prefix
            if image_base64.startswith('data:'):
                image_base64 = image_base64.split(',', 1)[1]
        
        # Decode base64 to image
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        # Preprocess and generate embedding
        image_tensor = _preprocess_val(image).unsqueeze(0).to(_device)
        
        with torch.no_grad():
            image_features = _clip_model.encode_image(image_tensor)
            # Normalize the embedding
            image_features /= image_features.norm(dim=-1, keepdim=True)
        
        # Convert to list for MongoDB storage
        embedding = image_features.cpu().numpy().flatten().tolist()
        return embedding
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None


def search_similar_garments(query_embedding, limit=10, min_similarity=0.5):
    """
    Search for similar garments using cosine similarity
    
    Args:
        query_embedding: Embedding vector to search with
        limit: Maximum number of results
        min_similarity: Minimum cosine similarity threshold
        
    Returns:
        List of similar garment documents with similarity scores
    """
    try:
        query_vec = np.array(query_embedding)
        query_vec = query_vec / np.linalg.norm(query_vec)
        
        results = []
        
        # Get all garments with embeddings
        garments = garments_collection.find({'embedding': {'$exists': True}})
        
        for garment in garments:
            garment_vec = np.array(garment['embedding'])
            # Cosine similarity (vectors are already normalized)
            similarity = float(np.dot(query_vec, garment_vec))
            
            if similarity >= min_similarity:
                results.append({
                    'garment': {
                        'image': garment['image'],
                        'sku': garment.get('sku'),
                        'url': garment.get('url'),
                        'title': garment.get('title'),
                        'price': garment.get('price'),
                        'metadata': garment.get('metadata'),
                        'session_timestamp': garment['session_timestamp']
                    },
                    'similarity': similarity
                })
        
        # Sort by similarity descending
        results.sort(key=lambda x: x['similarity'], reverse=True)
        return results[:limit]
    except Exception as e:
        print(f"Error searching similar garments: {e}")
        return []


def search_garments_by_text(text_query, limit=10, min_similarity=0.3):
    """
    Search for garments using text query
    
    Args:
        text_query: Text description to search for
        limit: Maximum number of results
        min_similarity: Minimum similarity threshold
        
    Returns:
        List of matching garment documents with similarity scores
    """
    try:
        tokenizer = open_clip.get_tokenizer('hf-hub:Marqo/marqo-fashionSigLIP')
        text = tokenizer([text_query]).to(_device)
        
        with torch.no_grad():
            text_features = _clip_model.encode_text(text)
            text_features /= text_features.norm(dim=-1, keepdim=True)
        
        text_embedding = text_features.cpu().numpy().flatten().tolist()
        return search_similar_garments(text_embedding, limit, min_similarity)
    except Exception as e:
        print(f"Error searching by text: {e}")
        return []


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
        
        # Save garment images with embeddings
        garment_docs = []
        for i, garment_data in enumerate(garment_images_data):
            # Generate embedding for the garment image
            embedding = generate_garment_embedding(garment_data['image'])
            
            garment_doc = {
                'session_timestamp': timestamp,
                'image': garment_data['image'],
                'order': i,
                'sku': garment_data.get('sku'),
                'url': garment_data.get('url'),
                'title': garment_data.get('title'),
                'price': garment_data.get('price'),
                'metadata': garment_data.get('metadata'),
                'embedding': embedding
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

def backfill_embeddings():
    """
    Generate embeddings for existing garments that don't have them
    
    Returns:
        Number of garments updated
    """
    try:
        # Find garments without embeddings
        garments = garments_collection.find({'embedding': {'$exists': False}})
        updated = 0
        
        for garment in garments:
            embedding = generate_garment_embedding(garment['image'])
            if embedding:
                garments_collection.update_one(
                    {'_id': garment['_id']},
                    {'$set': {'embedding': embedding}}
                )
                updated += 1
                print(f"Generated embedding for garment {garment['_id']}")
        
        print(f"✓ Backfilled embeddings for {updated} garments")
        return updated
    except Exception as e:
        print(f"Error backfilling embeddings: {e}")
        return 0


def get_garment_embedding(garment_id):
    """
    Get the embedding for a specific garment
    
    Args:
        garment_id: MongoDB ObjectId of the garment
        
    Returns:
        Embedding vector as list of floats, or None if not found
    """
    try:
        from bson import ObjectId
        garment = garments_collection.find_one({'_id': ObjectId(garment_id)})
        if garment and 'embedding' in garment:
            return garment['embedding']
        return None
    except Exception as e:
        print(f"Error getting garment embedding: {e}")
        return None


# Initialize database on import
initialize_db()
