from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

router = APIRouter()

class CaregiverDashboard(BaseModel):
    monitoring_status: bool
    burnout_score: str
    predicted_shift: str
    speech_trends: List[Dict[str, float]]
    memory_baseline: float
    critical_alerts_count: int

@router.get("/dashboard", response_model=CaregiverDashboard)
async def get_caregiver_dashboard(caregiver_id: str = "arthur"):
    """
    Retrieves the aggregate dashboard data for a caregiver.
    Includes burnout risk, predictive insights, and critical alert counts.
    """
    # Mock data for demonstration
    return CaregiverDashboard(
        monitoring_status=True,
        burnout_score="Med",
        predicted_shift="Predicted behavioral shift detected in the next 48 hours",
        speech_trends=[{"day": "Mon", "value": 82}, {"day": "Tue", "value": 85}, {"day": "Wed", "value": 80}],
        memory_baseline=94.2,
        critical_alerts_count=2
    )

@router.get("/alerts")
async def get_caregiver_alerts():
    """Retrieves all active alerts for the linked patients."""
    return {"alerts": []}
