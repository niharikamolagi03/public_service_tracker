🏛️ Public Service Tracker

A full-stack web application for submitting, managing, and tracking public service grievances through a centralized digital platform.

## 🎥 Project Demo

▶️ **[Watch the Project Demo](YOUR_DEMO_LINK_HERE)**

## ✨ Features

### 👤 Citizen

- User registration and login
- Submit public grievances
- Track submitted grievances
- View grievance status and details
- Follow important grievances
- View followed grievances
- Manage user profile
- View grievance history

### 🛠️ Administrator

- Admin dashboard
- View and manage grievances
- Update grievance status
- Monitor grievance progress
- Review grievance details
- View grievance statistics and analytics

### 📊 Analytics

- Total grievances
- Pending grievances
- Resolved grievances
- Rejected grievances
- Escalated grievances
- Category-wise grievance information
- Overall grievance trends

## 🔄 Grievance Workflow

```text
Submit Grievance
       ↓
     Pending
       ↓
   Under Review
       ↓
 ┌─────┼─────────┐
 ↓     ↓         ↓
Resolved  Rejected  Escalated
   ↓
 Closed

## Application Pages
Public Pages
Landing Page
Login
Registration
Citizen Pages
Dashboard
Submit Grievance
Track Grievance
Followed Grievances
Profile
Admin Pages
Admin Dashboard
Analytics
🏗️ Project Structure
public_service_tracker/
│
├── backend/
│   ├── manage.py
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AdminDashboard.js
│   │   │   ├── Analytics.js
│   │   │   ├── Dashboard.js
│   │   │   ├── FollowedGrievances.js
│   │   │   ├── Landing.js
│   │   │   ├── Login.js
│   │   │   ├── Profile.js
│   │   │   ├── Register.js
│   │   │   ├── SubmitGrievance.js
│   │   │   └── TrackGrievance.js
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   └── ...
│   │
│   ├── tailwind.config.js
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md
🧰 Technologies Used

Frontend

React.js
JavaScript
Tailwind CSS
HTML5
CSS3

Backend

Python
Django
Django REST Framework

Tools

Git
GitHub
VS Code
⚙️ Getting Started
Clone the Repository
git clone https://github.com/niharikamolagi03/public_service_tracker.git
cd public_service_tracker
Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver

Backend:

http://127.0.0.1:8000/
Frontend

Open another terminal:

cd frontend
npm install
npm start

Frontend:

http://localhost:3000/
🔗 Frontend–Backend Communication

The React frontend communicates with the Django backend through API requests. API-related functionality is organized in:

frontend/src/services/api.js
🎯 Project Objectives
Digitize public grievance reporting
Simplify grievance tracking for citizens
Improve transparency in grievance progress
Centralize grievance management
Help administrators monitor public service issues
Provide analytics for better decision-making
🔮 Future Enhancements
Real-time notifications
Email/SMS notifications
Location-based grievance tracking
Interactive maps
File and image attachments
Advanced role-based permissions
Real-time status updates
Government department integration
Mobile application
Advanced analytics and reporting
