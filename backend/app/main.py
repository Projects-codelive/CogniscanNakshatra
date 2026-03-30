from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.api import auth, patient, caregiver, speech, facial, alerts, risk
import uvicorn

app = FastAPI(title="CogniScan AI API", version="1.0.0")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(patient.router, prefix="/api/patient", tags=["Patient"])
app.include_router(caregiver.router, prefix="/api/caregiver", tags=["Caregiver"])
app.include_router(speech.router, prefix="/api/speech", tags=["Speech Analysis"])
app.include_router(facial.router, prefix="/api/facial", tags=["Facial Biometrics"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(risk.router, prefix="/api/risk", tags=["Risk Engine"])

@app.get("/")
async def root():
    return {"message": "CogniScan AI API is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
