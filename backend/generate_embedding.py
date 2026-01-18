#!/usr/bin/env python3
"""
Script to generate embeddings for all garment images in the database.
This will update any garments that don't have embeddings yet.
Also handles deduplication of garments by URL.
"""

import sys
import time
from db import backfill_embeddings, garments_collection


def remove_duplicate_garments():
    """
    Find and remove duplicate garments based on URL.
    Keeps the first occurrence (oldest) and removes duplicates.
    
    Returns:
        Number of duplicates removed
    """
    print("Checking for duplicate garments by URL...")
    
    # Find all unique URLs and their counts
    pipeline = [
        {'$match': {'url': {'$exists': True, '$ne': None}}},
        {'$group': {
            '_id': '$url',
            'count': {'$sum': 1},
            'ids': {'$push': '$_id'},
            'first_id': {'$first': '$_id'}
        }},
        {'$match': {'count': {'$gt': 1}}}
    ]
    
    duplicates = list(garments_collection.aggregate(pipeline))
    
    if not duplicates:
        print("✓ No duplicate garments found")
        return 0
    
    total_removed = 0
    for dup in duplicates:
        url = dup['_id']
        ids_to_remove = [id for id in dup['ids'] if id != dup['first_id']]
        
        if ids_to_remove:
            result = garments_collection.delete_many({'_id': {'$in': ids_to_remove}})
            total_removed += result.deleted_count
            print(f"  Removed {result.deleted_count} duplicate(s) for: {url[:60]}...")
    
    print(f"✓ Removed {total_removed} duplicate garments")
    return total_removed


def main():
    print("=" * 60)
    print("Garment Embedding Generation Script")
    print("=" * 60)
    print()
    
    # Step 1: Remove duplicates first
    duplicates_removed = remove_duplicate_garments()
    print()
    
    # Step 2: Check how many garments need embeddings
    total_garments = garments_collection.count_documents({})
    garments_without_embeddings = garments_collection.count_documents({'embedding': {'$exists': False}})
    garments_with_embeddings = garments_collection.count_documents({'embedding': {'$exists': True}})
    
    print(f"Total garments in database: {total_garments}")
    print(f"Garments with embeddings: {garments_with_embeddings}")
    print(f"Garments without embeddings: {garments_without_embeddings}")
    print()
    
    if garments_without_embeddings == 0:
        print("✓ All garments already have embeddings!")
        if duplicates_removed > 0:
            print(f"📊 Cleaned up {duplicates_removed} duplicates")
        return 0
    
    print(f"Starting embedding generation for {garments_without_embeddings} garments...")
    print("-" * 60)
    
    start_time = time.time()
    
    try:
        updated_count = backfill_embeddings()
        
        elapsed_time = time.time() - start_time
        
        print()
        print("=" * 60)
        print(f"✓ Successfully generated embeddings for {updated_count} garments")
        if duplicates_removed > 0:
            print(f"🧹 Cleaned up {duplicates_removed} duplicate garments")
        print(f"⏱ Time elapsed: {elapsed_time:.2f} seconds")
        
        if updated_count > 0:
            avg_time = elapsed_time / updated_count
            print(f"📊 Average time per garment: {avg_time:.2f} seconds")
        
        print("=" * 60)
        
        return 0
        
    except KeyboardInterrupt:
        print("\n\n⚠ Process interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
