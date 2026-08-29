# Location Link Platform

A consent-based location sharing platform. Create shareable links, and when visitors open them, they can optionally share their location with you — only with explicit browser permission.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, TypeScript, TailwindCSS, Leaflet |
| Backend | Python, FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL |
| Real-time | WebSockets |

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL

### Database

```bash
psql -U postgres -c "CREATE DATABASE location_platform;"
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### Environment Variables

Copy `.env.example` to `.env` and fill in your values.

## Project Structure

```
location-fetcher/
├── frontend/          # React + Vite + TypeScript
├── backend/           # FastAPI + SQLAlchemy
├── .env.example       # Environment template
└── IMPLEMENTATION.md  # Full specification
```
