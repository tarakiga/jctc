#!/usr/bin/env python3
"""
Simple test script to verify the FastAPI app loads correctly
"""
try:
    from app.main import app
    print("✅ FastAPI app created successfully!")
    
    print("\n📋 Available routes:")
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            methods = getattr(route, 'methods', [])
            print(f"  {', '.join(methods)} {route.path}")
    
    print(f"\n🔧 App title: {app.title}")
    print(f"🔧 App version: {app.version}")
    print(f"🔧 Debug mode: {app.debug}")
    
    print("\n🚀 App is ready to run!")
    print("   Start with: python run.py")
    print("   Or: uvicorn app.main:app --reload")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Error loading app: {e}")
    import traceback
    traceback.print_exc()