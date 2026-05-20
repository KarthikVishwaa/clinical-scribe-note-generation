# ClinicalScribe AI

An end-to-end AI-powered clinical documentation system. Doctors record patient encounters through the browser microphone — the system transcribes the audio in real time using OpenAI Whisper, structures it into a SOAP note with GPT-4o-mini, and extracts clinical entities with Claude Haiku. The entire pipeline runs over a persistent WebSocket connection and completes in under 60 seconds.

**Live demo →** https://clinical-note-generation.vercel.app

---

## Features

| Feature | Description |
|---|---|
| Real-time transcription | Browser audio → WebSocket → OpenAI Whisper → transcript panel |
| SOAP note generation | Full Subjective / Objective / Assessment / Plan from the transcript |
| Medical entity extraction | Diagnoses, drugs, dosages linked to ICD-10 + SNOMED CT codes |
| Prescription generator | Structured prescription PDF from the SOAP Plan section |
| Drug interaction checker | Cross-references medications against the FDA openFDA API |
| Differential diagnosis | Ranked differentials with confidence scores and red flags |
| Lab result interpreter | Paste raw labs, receive clinical interpretation |
| Referral letter generator | Specialist referral letters from encounter context |
| Follow-up reminders | AI-generated patient follow-up tasks with priority and due dates |
| PDF export | Download the SOAP note as a formatted PDF |
| Multi-language | 10 languages including Tamil, Hindi, Arabic, Spanish |
| Patient management | Full CRUD patient records with MRN, allergies, medications, history |
| Usage dashboard | Per-user AI cost tracking with daily and monthly budget caps |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, CSS Modules |
| Backend | Python 3.11, FastAPI, WebSockets |
| Database | SQLite via SQLAlchemy ORM |
| Speech-to-Text | OpenAI Whisper API |
| SOAP Generation | OpenAI GPT-4o-mini |
| Entity Extraction | Anthropic Claude Haiku |
| Drug Interactions | FDA openFDA API (free, no key needed) |
| PDF Generation | ReportLab |
| Auth | JWT (python-jose) + bcrypt |

---

## Project Structure

```
.
├── client/                        # React 18 frontend (Vite)
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   │   ├── AudioRecorder.jsx  # Mic capture + waveform visualiser
│   │   │   ├── SOAPNoteEditor.jsx # Editable SOAP note panel
│   │   │   ├── TranscriptPanel.jsx
│   │   │   ├── EntityPanel.jsx    # Medical entity display
│   │   │   ├── FeatureToolbar.jsx # AI feature buttons
│   │   │   ├── Navbar.jsx
│   │   │   ├── PrescriptionModal.jsx
│   │   │   ├── DrugInteractionModal.jsx
│   │   │   ├── DiffDiagnosisModal.jsx
│   │   │   ├── LabInterpreterModal.jsx
│   │   │   ├── ReferralModal.jsx
│   │   │   └── ReminderModal.jsx
│   │   ├── pages/
│   │   │   ├── Landing.jsx        # Public landing page
│   │   │   ├── HowItWorks.jsx     # Technical deep-dive page
│   │   │   ├── Auth.jsx           # Login + Register
│   │   │   ├── Dashboard.jsx      # Encounter list + create
│   │   │   ├── Encounter.jsx      # Main recording + output page
│   │   │   ├── History.jsx        # Searchable encounter history
│   │   │   ├── Patients.jsx       # Patient management
│   │   │   └── UsageDashboard.jsx # API cost monitor
│   │   ├── services/
│   │   │   ├── api.js             # Axios client + all API functions
│   │   │   └── websocket.js       # WebSocket factory
│   │   ├── App.jsx                # Routes
│   │   ├── main.jsx
│   │   └── index.css              # Global CSS variables + resets
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json                # SPA rewrite rule for Vercel
│   └── .env.production            # Set VITE_API_URL here before deploying
│
└── server/                        # FastAPI backend
    ├── app/
    │   ├── routers/
    │   │   ├── auth.py            # POST /api/auth/register|login, GET /me
    │   │   ├── encounters.py      # CRUD + transcribe + SOAP + entities
    │   │   ├── websocket.py       # WS /ws/encounter/{id}
    │   │   ├── patients.py        # Patient CRUD
    │   │   ├── prescriptions.py   # Prescription generate + PDF
    │   │   ├── drug_interactions.py
    │   │   ├── diagnosis.py       # Differential diagnosis
    │   │   ├── labs.py            # Lab interpretation
    │   │   ├── referrals.py       # Referral letters
    │   │   ├── reminders.py       # Follow-up reminders
    │   │   ├── pdf_export.py      # SOAP note PDF
    │   │   └── usage.py           # Cost stats + budget settings
    │   ├── services/
    │   │   ├── whisper_service.py # Whisper API call
    │   │   ├── gpt_service.py     # GPT-4o-mini SOAP generation
    │   │   ├── claude_service.py  # Claude Haiku entity extraction
    │   │   ├── diagnosis_service.py
    │   │   ├── lab_service.py
    │   │   ├── prescription_service.py
    │   │   ├── referral_service.py
    │   │   ├── drug_interaction_service.py
    │   │   ├── pdf_service.py
    │   │   └── usage_tracker.py   # Cost logging + budget enforcement
    │   ├── models.py              # SQLAlchemy ORM models
    │   ├── schemas.py             # Pydantic request/response schemas
    │   ├── auth.py                # JWT encode/decode + password hashing
    │   ├── rate_limiter.py        # Sliding-window rate limiter
    │   ├── config.py              # Pydantic settings (reads .env)
    │   └── database.py            # SQLAlchemy engine + session
    ├── main.py                    # App factory, CORS, middleware, routers
    ├── requirements.txt
    ├── runtime.txt                # python-3.11.9
    ├── Procfile                   # Railway start command
    └── railway.json               # Railway deployment config
```

---

## Local Setup

### Prerequisites

- **Python 3.11** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **OpenAI API key** — [platform.openai.com](https://platform.openai.com/api-keys)
- **Anthropic API key** — [console.anthropic.com](https://console.anthropic.com/)

---

### 1. Clone the repo

```bash
git clone https://github.com/KarthikVishwaa/clinicalscribe-ai.git
cd clinicalscribe-ai
```

---

### 2. Backend setup

```bash
cd server
```

**Create and activate a virtual environment:**

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac / Linux
python -m venv venv
source venv/bin/activate
```

**Install dependencies:**

```bash
pip install -r requirements.txt
```

**Create the `.env` file:**

```bash
# Windows
copy NUL .env

# Mac / Linux
touch .env
```

Open `server/.env` and add:

```env
SECRET_KEY=replace-this-with-a-long-random-string
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=http://localhost:5173
```

> To generate a strong `SECRET_KEY`, run:
> ```bash
> python -c "import secrets; print(secrets.token_hex(32))"
> ```

**Start the backend:**

```bash
uvicorn main:app --reload --port 8000
```

The server starts at `http://localhost:8000`.
SQLite database file (`clinical_notes.db`) is created automatically on first run.

Verify it works:

```
GET http://localhost:8000/health
→ {"status": "ok", "version": "3.0.0"}
```

The interactive API docs are at `http://localhost:8000/docs`.

---

### 3. Frontend setup

Open a **new terminal** (keep the backend running):

```bash
cd client
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

The Vite dev server proxies `/api` and `/ws` to `http://localhost:8000` automatically — no extra config needed locally.

---

### Quick-start summary

```
Terminal 1                        Terminal 2
──────────────────────────────    ──────────────────────────────
cd server                         cd client
source venv/bin/activate          npm install
uvicorn main:app --reload         npm run dev
  → http://localhost:8000           → http://localhost:5173
```

---

## Environment Variables

### Backend (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | Random string used to sign JWTs. Use at least 32 characters. |
| `OPENAI_API_KEY` | Yes | OpenAI API key for Whisper (transcription) and GPT-4o-mini (SOAP notes). |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude Haiku (entity extraction, AI features). |
| `FRONTEND_URL` | Yes (prod) | Your deployed frontend URL e.g. `https://yourapp.vercel.app`. Used for CORS. |
| `DATABASE_URL` | No | Defaults to `sqlite:///./clinical_notes.db`. Override for PostgreSQL in production. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | JWT expiry in minutes. Default: `480` (8 hours). |

### Frontend (`client/.env.production`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes (prod) | Full URL of the deployed backend e.g. `https://yourapp.railway.app`. Leave blank for local dev. |

---

## API Reference

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{email, password, full_name?}` | Create account, returns JWT |
| POST | `/api/auth/login` | `{email, password}` | Sign in, returns JWT |
| GET | `/api/auth/me` | — | Current user info |
| PATCH | `/api/auth/me` | `{full_name?, specialty?, ...}` | Update profile |

### Encounters

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/encounters` | Create encounter |
| GET | `/api/encounters` | List all encounters for current user |
| GET | `/api/encounters/{id}` | Get full encounter with transcripts, SOAP, entities |
| PATCH | `/api/encounters/{id}` | Update patient name, language, status |
| POST | `/api/encounters/{id}/transcribe` | Upload audio file → Whisper transcription |
| POST | `/api/encounters/{id}/generate-soap` | Run GPT-4o-mini → SOAP note |
| PATCH | `/api/encounters/{id}/soap` | Save edited SOAP note |
| POST | `/api/encounters/{id}/extract-entities` | Run Claude Haiku → medical entities |
| GET | `/api/encounters/{id}/export-pdf` | Download SOAP note as PDF |

### Patients

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/patients` | Create patient record |
| GET | `/api/patients?search=` | List / search patients |
| GET | `/api/patients/{id}` | Get patient detail |
| PATCH | `/api/patients/{id}` | Update patient |
| DELETE | `/api/patients/{id}` | Delete patient |
| GET | `/api/patients/{id}/encounters` | All encounters for a patient |

### AI Features

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/encounters/{id}/prescription` | Generate prescription from SOAP |
| GET | `/api/encounters/{id}/prescription` | Get saved prescription |
| GET | `/api/encounters/{id}/prescription/pdf` | Download prescription PDF |
| POST | `/api/drugs/interactions` | Check drug interactions (FDA) |
| POST | `/api/ai/differential-diagnosis` | Ranked differential diagnoses |
| POST | `/api/ai/lab-interpretation` | Interpret lab results |
| POST | `/api/encounters/{id}/referral` | Generate referral letter |
| POST | `/api/encounters/{id}/reminders` | Generate follow-up reminders |
| GET | `/api/reminders` | All pending reminders for current user |

### Usage / Billing

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/usage/stats` | Daily + monthly cost summary |
| GET | `/api/usage/history` | Paginated API call log |
| PATCH | `/api/usage/budget` | Set daily/monthly spend limits |

### WebSocket

```
ws://localhost:8000/ws/encounter/{encounter_id}?token=<jwt>
```

**Client → Server messages:**

```json
{ "command": "transcribe", "language": "en", "file_ext": ".webm" }
{ "command": "ping" }
```

Binary frames are raw audio chunks (sent every 3 seconds by the browser MediaRecorder).

**Server → Client messages:**

```json
{ "type": "connected" }
{ "type": "status",     "message": "Transcribing audio..." }
{ "type": "transcript", "text": "...", "transcript_id": 1 }
{ "type": "soap_note",  "subjective": "...", "objective": "...", "assessment": "...", "plan": "..." }
{ "type": "entities",   "entities": [...] }
{ "type": "complete" }
{ "type": "error",      "message": "..." }
```

---

## Demo Limits

This project is deployed as a showcase. The following limits are enforced to keep API costs controlled:

| Limit | Value |
|---|---|
| Encounters per user | 2 |
| AI calls per user per hour | 10 |
| Auth attempts per IP per minute | 5 |
| Daily AI spend per user | $1.00 |
| Monthly AI spend per user | $5.00 |
| Max registered accounts | 200 |

To remove these limits for your own deployment, edit `server/app/routers/encounters.py` (`DEMO_ENCOUNTER_LIMIT`) and `server/app/rate_limiter.py`.

---

## Deployment

### Backend → Railway (free tier)

1. Push your repo to GitHub.
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Set **Root Directory** to `server`.
4. Add environment variables in the Railway dashboard:

   | Variable | Value |
   |---|---|
   | `SECRET_KEY` | Output of `python -c "import secrets; print(secrets.token_hex(32))"` |
   | `OPENAI_API_KEY` | Your OpenAI key |
   | `ANTHROPIC_API_KEY` | Your Anthropic key |
   | `FRONTEND_URL` | Your Vercel URL (add after step below) |

5. Railway reads `runtime.txt` (Python 3.11) and `Procfile` automatically.
6. After deploy, go to **Settings → Networking → Generate Domain** to get your public URL.
7. Test: `https://your-app.railway.app/health` should return `{"status":"ok"}`.

### Frontend → Vercel (free tier)

1. Open `client/.env.production` and set:
   ```
   VITE_API_URL=https://your-app.railway.app
   ```
2. Commit and push.
3. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo.
4. Set **Root Directory** to `client`.
5. Add environment variable `VITE_API_URL = https://your-app.railway.app`.
6. Deploy — Vercel auto-detects Vite.
7. Copy the Vercel URL and paste it as `FRONTEND_URL` in Railway, then redeploy the backend.

---

## Developer

**Karthik R** (He/Him)
MERN Stack Developer · React.js · Node.js · Express · MongoDB · Frontend & Backend Developer

I am actively looking for a **Full Stack MERN Developer** role — full-time or contract.

- LinkedIn: [linkedin.com/in/karthivisva](https://www.linkedin.com/in/karthivisva/)
- GitHub: [github.com/KarthikVishwaa](https://github.com/KarthikVishwaa)

---

## License

This project is open source. Use it freely — personal projects, portfolios, learning, or as a base for your own clinical tool.
