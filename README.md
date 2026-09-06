# 🧠 Smart Attendance Intelligence Platform

A modern AI-powered attendance management platform designed to automate employee attendance using **Face Recognition, GPS Location, Geofencing, Real-Time Monitoring, Analytics, and Intelligent Reporting**.

The platform combines a modern React frontend with a FastAPI backend, PostgreSQL/PostGIS database, and AI-based biometric recognition to provide a secure and intelligent attendance solution.

---

## 🚀 Live Platform

🌐 **Frontend:**
https://smart-intelligence-attenda-git-e59143-amahaiskar-2181s-projects.vercel.app/

⚙️ **Backend API:**
https://smart-intelligence-attendance-platform-production.up.railway.app/

📚 **API Documentation:**
`/docs`

---

## ✨ Key Features

### 🔐 Authentication & Security

* Secure user authentication
* Login and registration
* Forgot password functionality
* Password reset
* Protected routes
* Session management
* Google authentication support
* Force logout functionality

### 👥 Employee Management

* Add employees
* Edit employee information
* Delete employees
* Employee search
* Employee status management
* Employee profile management
* Attendance history

### 🤖 AI Face Recognition

* AI-powered face detection
* Employee face recognition
* Biometric attendance verification
* Real-time camera integration
* Recognition-based attendance marking
* Secure identity verification

### 📍 GPS & Location Attendance

* GPS-based attendance
* Location verification
* Geofencing
* PostGIS spatial queries
* Distance-based attendance validation
* Location management
* Latitude and longitude tracking

### 📊 Analytics Dashboard

* Attendance statistics
* Workforce analytics
* Attendance trends
* Present/absent analysis
* Real-time statistics
* Data visualization
* Performance insights

### ⚡ Live Operations

* Real-time attendance monitoring
* Live employee activity
* Attendance status monitoring
* Operational dashboard
* System status monitoring

### 📄 Reports

* Attendance reports
* Employee attendance data
* Reporting dashboard
* Data export support
* CSV-based data processing

### 🗺️ Location Management

* Create attendance locations
* Manage locations
* GPS coordinates
* Geofence configuration
* Location-based validation

### 🔍 Audit Logs

* System activity tracking
* Administrative actions
* Attendance activity
* Security monitoring
* Historical activity records

### ⚙️ Platform Settings

* Organization settings
* System configuration
* Attendance configuration
* Administrative settings

### 📱 Responsive Design

The platform is designed to work across:

* Desktop
* Laptop
* Tablet
* Mobile browsers

The mobile interface includes a collapsible navigation sidebar and responsive dashboards.

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────────┐
                    │       Web Browser       │
                    │ React + TypeScript      │
                    └────────────┬────────────┘
                                 │
                                 │ REST API
                                 ▼
                    ┌─────────────────────────┐
                    │       FastAPI           │
                    │      Backend API        │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │ Face         │ │ Attendance   │ │ Location /   │
        │ Recognition  │ │ Services     │ │ Geofencing   │
        └──────────────┘ └──────────────┘ └──────────────┘
                │                │                │
                └────────────────┼────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │ PostgreSQL + PostGIS    │
                    │ Database                │
                    └─────────────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

* React
* TypeScript
* Vite
* React Router
* Lucide React
* CSS
* Responsive UI

## Backend

* Python
* FastAPI
* Uvicorn
* SQLAlchemy
* Pydantic
* Python-dotenv

## Database

* PostgreSQL
* PostGIS
* Spatial queries
* Geographic coordinates

## AI / Computer Vision

* InsightFace
* ONNX Runtime
* OpenCV
* Face Recognition
* Computer Vision

## Deployment

* Vercel — Frontend
* Railway — Backend
* PostgreSQL/PostGIS — Database

---

# 📁 Project Structure

```text
Smart-attendance-intelligence/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── database/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── test_db.py
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── main.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── docs/
├── iot/
├── ml/
├── storage/
├── .gitignore
└── README.md
```

---

# ⚙️ Installation

## 1. Clone the Repository

```bash
git clone https://github.com/atuljain7717/Smart-Intelligence-Attendance-Platform.git
```

```bash
cd Smart-Intelligence-Attendance-Platform
```

---

# 🐍 Backend Setup

Go to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## 🔑 Environment Variables

Create a `.env` file inside the backend directory.

Example:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/smart_attendance

SECRET_KEY=your_secret_key

FRONTEND_URL=http://localhost:5173
```

Do not commit your `.env` file to GitHub.

---

# ▶️ Run Backend

From the project root:

```powershell
python -m uvicorn backend.app.main:app --reload
```

Or from the `backend` directory:

```powershell
python -m uvicorn app.main:app --reload
```

Backend will run at:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

---

# ⚛️ Frontend Setup

Open another terminal.

Go to:

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

Run the development server:

```powershell
npm run dev
```

Frontend will normally run at:

```text
http://localhost:5173
```

---

# 🗄️ Database

The project uses:

**PostgreSQL + PostGIS**

PostGIS enables geographic and spatial operations required for location-based attendance.

Example functionality:

```text
Employee GPS
     │
     ▼
Latitude + Longitude
     │
     ▼
PostGIS Distance Calculation
     │
     ▼
Geofence Validation
     │
     ├── Inside → Attendance Accepted
     │
     └── Outside → Attendance Rejected
```

---

# 🤖 Face Recognition Workflow

```text
Camera
   │
   ▼
Face Detection
   │
   ▼
Face Embedding
   │
   ▼
Employee Matching
   │
   ▼
Identity Verification
   │
   ▼
Attendance Validation
   │
   ▼
Attendance Recorded
```

---

# 📍 Location Attendance Workflow

```text
Employee
   │
   ▼
GPS Coordinates
   │
   ▼
Location Validation
   │
   ▼
Geofence / Distance Check
   │
   ├── Valid Location
   │       │
   │       ▼
   │   Attendance Marked
   │
   └── Invalid Location
           │
           ▼
      Attendance Rejected
```

---

# 🔌 API

The backend provides REST APIs for:

* Authentication
* Employees
* Attendance
* Locations
* Face Recognition
* Analytics
* Reports
* Audit Logs
* Settings
* Health monitoring

Interactive API documentation is available through FastAPI Swagger:

```text
http://127.0.0.1:8000/docs
```

---

# 📈 Future Enhancements

Planned improvements include:

* Advanced AI attendance prediction
* Employee attendance anomaly detection
* AI-powered attendance insights
* Advanced notification system
* Email notifications
* More detailed analytics
* Mobile application
* Improved biometric security
* Automated report scheduling
* Advanced role-based access control

---

# 🎯 Project Objectives

The primary objectives of the platform are:

1. Automate employee attendance.
2. Reduce manual attendance work.
3. Prevent attendance fraud.
4. Verify employee identity using AI.
5. Validate attendance using geographical location.
6. Provide real-time operational monitoring.
7. Generate useful attendance analytics.
8. Maintain secure audit records.
9. Provide a modern responsive user interface.
10. Build a scalable attendance management architecture.

---

# 🔒 Security

Security considerations include:

* Protected API routes
* Authentication
* Password protection
* Environment variables
* Database validation
* Location validation
* Biometric verification
* Audit logging
* CORS configuration
* Protected frontend routes

Sensitive credentials should always be stored in environment variables and never committed to GitHub.

---

# 🌐 Deployment

### Frontend

Deployed using:

**Vercel**

### Backend

Deployed using:

**Railway**

### Database

Powered by:

**PostgreSQL + PostGIS**

---

## 📸 Screenshots

### 🔐 Login

![Login Page](docs/screenshots/Login.png)

### 📊 Dashboard

![Dashboard](docs/screenshots/dashboard.png)

### 👥 Employee Management

![Employees](docs/screenshots/Employees.png)

### 📋 Attendance

![Attendance](docs/screenshots/Attendance.png)

### ⚡ Live Operations

![Live Operations](docs/screenshots/Liveoperation.png)

### 📍 Live Location

![Live Location](docs/screenshots/Livelocation.png)

### 🤖 Face Recognition

![Face Recognition](docs/screenshots/Facerecognition.png)

### 📈 Analytics

![Analytics](docs/screenshots/Analytics.png)

### 📄 Reports

![Reports](docs/screenshots/Reports.png)

### 🗺️ Locations

![Locations](docs/screenshots/Locations.png)

### 🔍 Audit Logs

![Audit Logs](docs/screenshots/Auditlogs.png)

### ⚙️ Settings

![Settings](docs/screenshots/Settings.png)

---

# 👨‍💻 Developer

**Atul Mahaiskar**

B.Tech Student | Software Developer | AI & Full-Stack Development

Areas of interest:

* Full-Stack Development
* Artificial Intelligence
* Machine Learning
* Computer Vision
* Backend Development
* Database Systems
* Cybersecurity

---

# ⭐ Support

If you find this project useful, consider giving the repository a ⭐ on GitHub.

---

# 📄 License

This project is developed for educational and project purposes.

© 2026 Smart Attendance Intelligence Platform
