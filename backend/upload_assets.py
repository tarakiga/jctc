
import os
import sys
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Add app directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env vars
load_dotenv()

def upload_logo():
    print("Starting Logo Upload...")
    
    # Configuration
    LOGO_PATH = r"d:\work\Tar\Andy\JCTC\frontend\apps\web\public\logo.png"
    BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "jctc-files-production2")
    S3_KEY = "assets/email/logo.png"
    
    if not os.path.exists(LOGO_PATH):
        print(f"Error: Logo file not found at {LOGO_PATH}")
        return

    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.getenv("S3_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
        region_name=os.getenv("S3_REGION", "us-east-1")
    )
    
    try:
        print(f"Uploading to s3://{BUCKET_NAME}/{S3_KEY}...")
        
        # Determine ContentType
        content_type = "image/png"
        
        # Upload with public-read ACL (if allowed) or just standard upload
        # We try standard upload first
        s3_client.upload_file(
            LOGO_PATH, 
            BUCKET_NAME, 
            S3_KEY, 
            ExtraArgs={
                'ContentType': content_type,
                # 'ACL': 'public-read' # Often blocked by BlockPublicAccess
            }
        )
        
        print("Upload successful!")
        
        # Generate URL
        # Assuming standard S3 URL format
        region = os.getenv("S3_REGION", "us-east-1")
        url = f"https://{BUCKET_NAME}.s3.{region}.amazonaws.com/{S3_KEY}"
        
        print(f"\nLogo URL: {url}")
        print("Note: Ensure this S3 object is publicly accessible for email clients to render it.")
        
    except Exception as e:
        print(f"Upload failed: {str(e)}")

if __name__ == "__main__":
    upload_logo()
