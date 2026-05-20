from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import engine
from app import models
from app.routers import auth, encounters, websocket
from app.routers import patients, prescriptions, pdf_export, drug_interactions
from app.routers import reminders, diagnosis, labs, referrals, usage
from app.config import settings

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ClinicalScribe AI",
    description="AI-powered clinical documentation — speech to structured SOAP notes in real time.",
    version="3.0.0",
)

ALLOWED_ORIGINS = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    try:
        response = await call_next(request)
    except Exception as exc:
        raise exc
    response.headers["X-Content-Type-Options"]            = "nosniff"
    response.headers["X-Frame-Options"]                   = "DENY"
    response.headers["X-XSS-Protection"]                  = "1; mode=block"
    response.headers["Referrer-Policy"]                   = "strict-origin-when-cross-origin"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    response.headers["Permissions-Policy"]                = "camera=(), microphone=(), geolocation=()"
    try:
        del response.headers["server"]
    except Exception:
        pass
    return response


@app.exception_handler(429)
async def rate_limit_handler(request: Request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": getattr(exc, "detail", "Too many requests.")},
        headers={k: v for k, v in (getattr(exc, "headers", None) or {}).items()},
    )


app.include_router(auth.router)
app.include_router(encounters.router)
app.include_router(websocket.router)
app.include_router(patients.router)
app.include_router(prescriptions.router)
app.include_router(pdf_export.router)
app.include_router(drug_interactions.router)
app.include_router(reminders.router)
app.include_router(diagnosis.router)
app.include_router(labs.router)
app.include_router(referrals.router)
app.include_router(usage.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "3.0.0"}
