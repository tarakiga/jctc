# Testing the JCTC Management System Backend

This guide provides multiple ways to test the JCTC Management System backend API.

## 🚀 Quick Start Testing

### 1. Basic Application Test
```powershell
# Test if the app loads correctly
python test_app.py

# Test basic endpoints without database
python test_basic.py

# Test server with HTTP requests
python test_server.py
```

### 2. Start the Development Server
```powershell
# Method 1: Using the startup script
python run.py

# Method 2: Using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📋 Testing Methods

### Method 1: Interactive API Documentation (Recommended)

1. **Start the server:**
   ```powershell
   python run.py
   ```

2. **Access the interactive docs:**
   - Open your browser and go to: http://localhost:8000/docs
   - This provides a complete interactive API testing interface

3. **Test without authentication:**
   - Try the `/health` endpoint (should return 200)
   - Try any protected endpoint (should return 403 "Not authenticated")

### Method 2: Manual HTTP Testing

#### Using PowerShell with Invoke-RestMethod:

```powershell
# Test health endpoint
Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get

# Test root endpoint  
Invoke-RestMethod -Uri "http://localhost:8000/" -Method Get

# Test protected endpoint (should fail with 403)
try {
    Invoke-RestMethod -Uri "http://localhost:8000/api/v1/cases/" -Method Get
} catch {
    Write-Host "Expected error: $($_.Exception.Message)"
}
```

#### Using curl (if available):

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test authentication endpoint (will fail without database)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'
```

### Method 3: Python Testing Scripts

We've provided several test scripts:

```powershell
# Basic functionality test
python test_basic.py

# Server endpoint testing
python test_server.py

# Application loading test
python test_app.py
```

### Method 4: Using pytest (Advanced)

For more comprehensive testing, you can create pytest tests:

```python
# test_api.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "Welcome to JCTC Management System" in response.json()["message"]

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_protected_endpoint_requires_auth():
    response = client.get("/api/v1/users/")
    assert response.status_code == 403
```

Run with:
```powershell
pytest test_api.py -v
```

## 🗄️ Testing With Database

### Setting up PostgreSQL for Testing

1. **Install PostgreSQL** (if not already installed)

2. **Create database and user:**
   ```sql
   CREATE DATABASE jctc_db;
   CREATE USER jctc_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE jctc_db TO jctc_user;
   ```

3. **Update your .env file:**
   ```
   DATABASE_URL=postgresql+asyncpg://jctc_user:your_password@localhost:5432/jctc_db
   ```

4. **Set up database schema:**
   ```powershell
   alembic init alembic
   alembic revision --autogenerate -m "Initial migration"
   alembic upgrade head
   ```

5. **Create an admin user:**
   ```python
   # create_admin_user.py
   import asyncio
   from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
   from app.models.user import User, UserRole
   from app.utils.auth import get_password_hash
   from app.config.settings import settings

   async def create_admin():
       engine = create_async_engine(settings.database_url)
       async with AsyncSession(engine) as session:
           admin_user = User(
               email="admin@jctc.gov.ng",
               full_name="System Administrator",
               role=UserRole.ADMIN,
               org_unit="JCTC HQ",
               is_active=True,
               hashed_password=get_password_hash("admin123")
           )
           session.add(admin_user)
           await session.commit()
           print("Admin user created!")

   asyncio.run(create_admin())
   ```

### Testing Authentication Flow

1. **Start the server:**
   ```powershell
   python run.py
   ```

2. **Login via API docs:**
   - Go to http://localhost:8000/docs
   - Find `/api/v1/auth/login` endpoint
   - Click "Try it out"
   - Use credentials:
     ```json
     {
       "email": "admin@jctc.gov.ng",
       "password": "admin123"
     }
     ```
   - Copy the `access_token` from the response

3. **Authenticate in docs:**
   - Click the "Authorize" button in the docs
   - Enter: `Bearer YOUR_ACCESS_TOKEN`
   - Now you can test protected endpoints!

### Full Integration Testing

With database and authentication set up:

```python
# test_integration.py
import requests
import json

base_url = "http://localhost:8000"

# 1. Login
login_response = requests.post(f"{base_url}/api/v1/auth/login", json={
    "email": "admin@jctc.gov.ng",
    "password": "admin123"
})
token = login_response.json()["access_token"]

# 2. Set up headers
headers = {"Authorization": f"Bearer {token}"}

# 3. Test protected endpoints
user_response = requests.get(f"{base_url}/api/v1/auth/me", headers=headers)
print("Current user:", user_response.json())

# 4. Create a user
new_user_data = {
    "email": "investigator@jctc.gov.ng",
    "full_name": "Test Investigator",
    "role": "INVESTIGATOR",
    "password": "testpass123"
}
create_user_response = requests.post(f"{base_url}/api/v1/users/", 
                                   json=new_user_data, headers=headers)
print("Created user:", create_user_response.status_code)

# 5. List users
users_response = requests.get(f"{base_url}/api/v1/users/", headers=headers)
print("Users count:", len(users_response.json()))
```

## 📊 Expected Test Results

### Without Database:
- ✅ Basic endpoints (/, /health, /docs) return 200
- ✅ Protected endpoints return 403 "Not authenticated"
- ❌ Authentication endpoints return 500 (database error)

### With Database:
- ✅ All basic endpoints return 200
- ✅ Authentication works with valid credentials
- ✅ Protected endpoints work with valid token
- ✅ RBAC enforced (different permissions per role)

## 🐛 Troubleshooting

### Common Issues:

1. **"Module not found" errors:**
   ```powershell
   # Make sure virtual environment is activated
   venv\Scripts\activate
   # Install dependencies
   uv pip install -r requirements.txt
   ```

2. **"Address already in use" error:**
   ```powershell
   # Find process using port 8000
   netstat -ano | findstr :8000
   # Kill the process (replace PID with actual process ID)
   taskkill /PID <PID> /F
   ```

3. **Database connection errors:**
   - Check PostgreSQL is running
   - Verify credentials in .env file
   - Check firewall settings

4. **Token/Authentication errors:**
   - Verify SECRET_KEY is set in .env
   - Check token hasn't expired (30 minutes default)
   - Ensure user exists and is active

## 🎯 Testing Checklist

- [ ] Basic app loads without errors
- [ ] Server starts on port 8000
- [ ] Health endpoint returns 200
- [ ] API documentation accessible at /docs
- [ ] Protected endpoints return 403 without auth
- [ ] Database connection works (if DB setup)
- [ ] Authentication flow works (if DB setup)
- [ ] Protected endpoints work with valid token
- [ ] Role-based permissions enforced

## 🚀 Next Steps

1. **Complete Database Setup** - Set up PostgreSQL for full functionality
2. **Create Test Data** - Add case types, users, and sample cases
3. **Test User Workflows** - Test complete case management workflows
4. **Performance Testing** - Test with larger datasets
5. **Security Testing** - Verify all security measures work correctly

## 📞 Getting Help

If you encounter issues:
1. Check the server logs in the terminal
2. Verify your .env file configuration
3. Check the interactive API docs at /docs
4. Review the handoff.md documentation