#!/usr/bin/env python3
"""
Script to generate embeddings for all garment images in the database.
This will update any garments that don't have embeddings yet.
"""

import sys
import time
from db import backfill_embeddings, garments_collection

def main():
    print("=" * 60)
    print("Garment Embedding Generation Script")
    print("=" * 60)
    print()
    
    # Check how many garments need embeddings
    total_garments = garments_collection.count_documents({})
    garments_without_embeddings = garments_collection.count_documents({'embedding': {'$exists': False}})
    garments_with_embeddings = garments_collection.count_documents({'embedding': {'$exists': True}})
    
    print(f"Total garments in database: {total_garments}")
    print(f"Garments with embeddings: {garments_with_embeddings}")
    print(f"Garments without embeddings: {garments_without_embeddings}")
    print()
    
    if garments_without_embeddings == 0:
        print("✓ All garments already have embeddings!")
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
