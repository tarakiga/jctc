#!/usr/bin/env python3
"""Test S3 connectivity"""
import os
os.environ.setdefault('S3_ENABLED', 'true')
os.environ.setdefault('S3_ACCESS_KEY', 'AKIATOWURMTI42PFT26O')
os.environ.setdefault('S3_SECRET_KEY', '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')
os.environ.setdefault('S3_REGION', 'eu-west-2')
os.environ.setdefault('S3_BUCKET_NAME', 'jctc-files-production2')

import boto3

print("Testing S3 connectivity...")
print(f"Bucket: {os.environ.get('S3_BUCKET_NAME')}")
print(f"Region: {os.environ.get('S3_REGION')}")

client = boto3.client(
    's3',
    aws_access_key_id=os.environ.get('S3_ACCESS_KEY'),
    aws_secret_access_key=os.environ.get('S3_SECRET_KEY'),
    region_name=os.environ.get('S3_REGION')
)

# List buckets
response = client.list_buckets()
print(f"Buckets: {[b['Name'] for b in response['Buckets']]}")

# Upload test file
test_content = b"Hello from JCTC S3 Test!"
client.put_object(
    Bucket=os.environ.get('S3_BUCKET_NAME'),
    Key='test/connectivity_test.txt',
    Body=test_content
)
print("Test file uploaded successfully!")

# Read it back
response = client.get_object(
    Bucket=os.environ.get('S3_BUCKET_NAME'),
    Key='test/connectivity_test.txt'
)
content = response['Body'].read()
print(f"Read back: {content.decode()}")

print("S3 connectivity test PASSED!")
