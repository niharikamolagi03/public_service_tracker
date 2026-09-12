# Public Service Tracking System

A modern, AI-powered platform for tracking government services in real-time.

## Features

- Real-time application tracking
- QR code based tracking
- AI-powered delay prediction
- Multi-language support
- Digital document upload & verification
- Analytics dashboard for officials
- Citizen feedback system

## Quick Start

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver