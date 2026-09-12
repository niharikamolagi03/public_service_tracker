# 🏛️ Public Service Tracker

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

Submit Grievance
↓
Pending
↓
Under Review
↓
Resolved
↓
Closed

OR

Rejected
↓
Closed

OR

Escalated
↓
Under Review

## 🖥️ Application Pages

### Public Pages

- Landing Page
- Login
- Registration

### Citizen Pages

- Dashboard
- Submit Grievance
- Track Grievance
- Followed Grievances
- Profile

### Administrator Pages

- Admin Dashboard
- Analytics

## 🏗️ Project Structure

public_service_tracker/
├── backend/
│   ├── manage.py
│   └── ...
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
│   │   ├── services/
│   │   │   └── api.js
│   │   └── ...
│   ├── tailwind.config.js
│   ├── package.json
│   └── ...
├── .gitignore
└── README.md

## 🧰 Technologies Used

### Frontend

- React.js
- JavaScript
- Tailwind CSS
- HTML5
- CSS3

### Backend

- Python
- Django
- Django REST Framework

### Tools

- Git
- GitHub
- VS Code

## ⚙️ Getting Started

### 1. Clone the Repository

git clone https://github.com/niharikamolagi03/public_service_tracker.git
cd public_service_tracker

### 2. Backend Setup

cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver

The backend will run at:

http://127.0.0.1:8000/

### 3. Frontend Setup

Open another terminal and run:

cd frontend
npm install
npm start

The frontend will run at:

http://localhost:3000/

## 🔗 Frontend–Backend Communication

The React frontend communicates with the Django backend through API requests.

API-related functionality is organized in:

frontend/src/services/api.js

## 🔐 Authentication

The application includes authentication flows for:

- User registration
- User login
- User-specific dashboards
- Administrator access

## 📋 Grievance Statuses

| Status | Description |
|---|---|
| 🟡 Pending | Grievance is awaiting action |
| 🔵 Under Review | Grievance is being reviewed |
| 🟠 Escalated | Grievance has been escalated |
| 🔴 Rejected | Grievance has been rejected |
| 🟢 Resolved | Grievance has been resolved |
| ⚫ Closed | Grievance process has been completed |

## 🎯 Project Objectives

- Digitize public grievance reporting
- Simplify grievance tracking for citizens
- Improve transparency in grievance progress
- Centralize grievance management
- Help administrators monitor public service issues
- Provide analytics for better decision-making

## 🔮 Future Enhancements

- Real-time notifications
- Email and SMS notifications
- Location-based grievance tracking
- Interactive maps
- File and image attachments
- Advanced role-based permissions
- Real-time status updates
- Government department integration
- Mobile application
- Advanced analytics and reporting
