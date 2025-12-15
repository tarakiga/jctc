"""
Schema Sync Script - Compares SQLAlchemy models with PostgreSQL database
and generates ALTER TABLE statements for missing columns.
"""
import psycopg2
from psycopg2.extras import RealDictCursor
import importlib
import inspect
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

# Database connection
DB_URL = "postgresql://jctc_user:JctcDbSec2025!@jctc_db:5432/jctc_db"

# Map SQLAlchemy types to PostgreSQL types
TYPE_MAP = {
    'String': 'VARCHAR(255)',
    'Text': 'TEXT',
    'Integer': 'INTEGER',
    'Float': 'FLOAT',
    'Boolean': 'BOOLEAN',
    'DateTime': 'TIMESTAMP',
    'Date': 'DATE',
    'UUID': 'UUID',
    'JSON': 'JSONB',
    'JSONB': 'JSONB',
    'ARRAY': 'TEXT[]',
    'Enum': 'VARCHAR(50)',
    'LargeBinary': 'BYTEA',
}

def get_db_columns():
    """Get all columns from the database"""
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("""
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
    """)
    
    result = {}
    for row in cur.fetchall():
        table = row['table_name']
        if table not in result:
            result[table] = set()
        result[table].add(row['column_name'])
    
    cur.close()
    conn.close()
    return result

def get_model_columns():
    """Get all columns from SQLAlchemy models"""
    import sys
    sys.path.insert(0, '/app')
    
    from app.models.base import Base
    
    # Import all models to register them
    from app.models import case, evidence, party, user, reports, legal, prosecution
    from app.models import chain_of_custody, forensic, audit, task, notifications
    from app.models import lookup_value, ndpa_compliance, integrations, mobile
    from app.models import task_management
    
    result = {}
    for mapper in Base.registry.mappers:
        table = mapper.mapped_table
        table_name = table.name
        result[table_name] = {}
        for column in table.columns:
            col_type = str(column.type)
            # Simplify type
            for key in TYPE_MAP:
                if key.upper() in col_type.upper():
                    col_type = TYPE_MAP[key]
                    break
            result[table_name][column.name] = col_type
    
    return result

def generate_alter_statements():
    """Generate ALTER TABLE statements for missing columns"""
    db_columns = get_db_columns()
    model_columns = get_model_columns()
    
    alter_statements = []
    
    for table_name, columns in model_columns.items():
        if table_name not in db_columns:
            print(f"-- Table {table_name} does not exist in database!")
            continue
            
        db_cols = db_columns[table_name]
        
        for col_name, col_type in columns.items():
            if col_name not in db_cols:
                stmt = f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} {col_type};"
                alter_statements.append(stmt)
                print(stmt)
    
    return alter_statements

if __name__ == "__main__":
    print("-- Schema Sync: Missing Columns")
    print("-- Generated automatically")
    print()
    statements = generate_alter_statements()
    print()
    print(f"-- Total: {len(statements)} missing columns")
