from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()

class PatientDashboard(BaseModel):
    name: str
    cognitive_index: float
    engagement_stability: float
    recall_speed: float
    last_scan_date: datetime
    weekly_trend: List[float]

@router.get("/dashboard", response_model=PatientDashboard)
async def get_patient_dashboard(patient_id: str = "eleanor"):
    """
    Retrieves the aggregate dashboard data for a specific patient.
    Includes cognitive index, recall speed, and wellness metrics.
    """
    # Mock data for demonstration
    return PatientDashboard(
        name="Eleanor Miller",
        cognitive_index=88.5,
        engagement_stability=91.0,
        recall_speed=1.8,
        last_scan_date=datetime.now(),
        weekly_trend=[65, 58, 72, 85, 78, 92, 88]
    )

@router.get("/history")
async def get_patient_history():
    """Retrieves full longitudinal history log for the patient."""
    return {"history": []}
