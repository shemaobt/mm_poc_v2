from tf.app import use
import os
from pathlib import Path

# Configuration
BUCKET_NAME = "hebrew-analysis"

def download_from_gcs(bucket_name: str):
    """Download text-fabric data from GCS bucket"""
    try:
        from google.cloud import storage
    except ImportError:
        print("google-cloud-storage not installed.")
        return

    print(f"Checking GCS bucket: {bucket_name}")
    
    # Target directory - Default for TF
    tf_data_dir = Path("/root/text-fabric-data")
    
    print(f"Downloading data from gs://{bucket_name} to {tf_data_dir}...")
    tf_data_dir.mkdir(parents=True, exist_ok=True)
    
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blobs = bucket.list_blobs(prefix="text-fabric-data/")
    
    count = 0
    blob_list = list(blobs)
    total = len(blob_list)
    print(f"Found {total} files to download")

    for blob in blob_list:
        # Remove prefix 'text-fabric-data/' from extraction path
        rel_path = blob.name.replace("text-fabric-data/", "", 1)
        if not rel_path or rel_path.endswith("/"): 
            continue
            
        dest_path = tf_data_dir / rel_path
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        blob.download_to_filename(str(dest_path))
        count += 1
        if count % 50 == 0:
            print(f"Downloaded {count}/{total} files...")
    
    print(f"Successfully downloaded {count} files from GCS.")


print("Pre-loading text-fabric data from GCS...")
download_from_gcs(BUCKET_NAME)

# Verify load
print("Verifying data load with TF...")
try:
    # Use local data (don't download again)
    A = use('ETCBC/bhsa', silent=False)
    print("Data verification successful.")
except Exception as e:
    print(f"Data verification warning: {e}")
