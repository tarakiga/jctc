"""
Script to extract email templates from local database and output as SQL
"""
import os
import sys
import io

# Force UTF-8 output encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text

async def extract_templates():
    # Get database URL from environment
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("DATABASE_URL not found in environment")
        return
    
    # Create async engine
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Query all templates
        result = await session.execute(text("""
            SELECT template_key, subject, body_html, body_plain, variables, is_active 
            FROM email_templates 
            ORDER BY template_key
        """))
        templates = result.fetchall()
        
        print("-- Email Templates Export from Local Database")
        print("-- Generated SQL for production sync\n")
        
        for t in templates:
            template_key = t[0]
            subject = t[1].replace("'", "''") if t[1] else ''
            body_html = t[2].replace("'", "''") if t[2] else ''
            body_plain = t[3].replace("'", "''") if t[3] else ''
            variables = json.dumps(t[4]).replace("'", "''") if t[4] else '[]'
            is_active = 'true' if t[5] else 'false'
            
            print(f"-- Template: {template_key}")
            print(f"UPDATE email_templates SET")
            print(f"  subject = '{subject}',")
            print(f"  body_html = '{body_html}',")
            print(f"  body_plain = '{body_plain}',")
            print(f"  variables = '{variables}',")
            print(f"  is_active = {is_active}")
            print(f"WHERE template_key = '{template_key}';")
            print()
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(extract_templates())
