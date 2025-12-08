# JCTC Management System

Joint Case Team on Cybercrimes (JCTC) Management System - A comprehensive case management platform for cybercrime investigations.

## 🏗️ Project Structure

This project is organized into separate directories for backend and frontend development:

```
JCTC/
├── 📁 backend/                    # FastAPI Backend Application (Production Ready)
│   ├── 📁 app/                   # Main application code
│   ├── 📁 scripts/              # Migration and Seeding scripts
│   │   ├── init_prod.sh         # One-click production initialization
│   │   ├── seed_lookup_values.py # Dictionary seeder
│   │   └── create_super_admin.py # Admin provisioner
│   ├── requirements.txt         # Python dependencies
│   ├── .env.production          # Production environment
│   └── run.py                   # Application entry point
├── 📁 frontend/                  # Next.js Frontend Application (Production Ready)
│   ├── 📁 apps/
│   │   └── 📁 web/              # Main web application
│   │       ├── 📁 app/          # Next.js App Router pages
│   │       ├── 📁 components/   # React components
│   │       └── package.json     # Frontend dependencies
├── 📁 docs/                     # Project documentation
├── docker-compose.prod.yml      # Production deployment (Lightsail)
├── Dockerfile                   # Docker configuration
└── README.md                    # This file
```

## 🚀 Quick Start (Local Development)

### Full Stack Launch

1. **Terminal 1 - Start Backend:**
   ```bash
   cd backend
   uv pip install -r requirements.txt
   cp .env.example .env
   python run.py
   ```
   Backend: http://localhost:8000 | Docs: http://localhost:8000/docs

2. **Terminal 2 - Start Frontend:**
   ```bash
   cd frontend/apps/web
   npm install
   npm run dev
   ```
   Frontend: http://localhost:3000

## ☁️ Production Deployment (AWS Lightsail)

The system is configured for deployment on AWS Lightsail using Docker Compose.

### 1. Deployment Plan
Refer to the local **Deployment Plan** artifact for detailed instructions.

### 2. Quick Deployment Command
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Initialization (First Run Only)
Execute the helper script to run migrations, seed data, and create the admin user:
```bash
docker-compose -f docker-compose.prod.yml exec app /bin/bash /app/scripts/init_prod.sh
```

## 🚦 System Status

**Backend Status:** ✅ **100% Production Ready**
- **API:** Fully implemented and tested.
- **Database:** Schema aligned with frontend forms (Guardian/Safeguarding fields added).
- **Scripts:** automated migrations and seeding.

**Frontend Status:** ✅ **100% Build Success**
- **Build:** `npm run build` passes with zero errors.
- **Type Safety:** All strict TypeScript errors resolved.
- **Components:** Forms fully aligned with Backend schemas.

## 🔑 Default Credentials (Production)

Configured via `.env.production`.
- **Admin**: `admin@jctc.ng`
- **Domain**: `jctc.ng` / `api.jctc.ng`

## 🛡️ Security Features
- **Role-Based Access Control** (7 roles)
- **Audit Logging** & Compliance Tracking
- **Secure Password Hashing** (Bcrypt)
- **JWT Authentication**

## 📄 License
This project is developed for the Joint Case Team on Cybercrimes (JCTC) of Nigeria.
