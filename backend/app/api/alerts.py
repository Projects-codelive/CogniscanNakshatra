from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()

class Alert(BaseModel):
    id: str
    patient_id: str
    timestamp: datetime
    type: str
    severity: str
    message: str
    acknowledged: bool

@router.get("/", response_model=List[Alert])
async def get_alerts():
    """Retrieves all clinical alerts for monitored patients."""
    # Mock alerts
    return [
        Alert(
            id="1",
            patient_id="eleanor",
            timestamp=datetime.now(),
            type="medication",
            severity="critical",
            message="Medication Shift Detected: Morning dosage taken 4 hours early.",
            acknowledged=False
        ),
        Alert(
            id="2",
            patient_id="eleanor",
            timestamp=datetime.now(),
            type="sleep",
            severity="moderate",
            message="Sleep Disruption: 3 movement events detected.",
            acknowledged=False
        )
    ]

@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    """Marks an alert as acknowledged by the caregiver."""
    return {"message": f"Alert {alert_id} acknowledged"}
