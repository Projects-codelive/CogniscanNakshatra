from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid
import json
import asyncio

from app.services.speech_analyzer import speech_analyzer
from app.db.mongodb import get_database

router = APIRouter()


class ScoreLabel(str, Enum):
    OPTIMAL = "Optimal"
    GOOD = "Good"
    MODERATE_CONCERN = "Moderate Concern"
    HIGH_RISK = "High Risk"


class PauseSeverity(str, Enum):
    SHORT = "short"
    LONG = "long"
    CRITICAL = "critical"


class CognitiveStateType(str, Enum):
    RETRIEVAL_STRUGGLE = "retrieval_struggle"
    FLUENT_RECALL = "fluent_recall"
    REPETITION = "repetition"
    TOPIC_DRIFT = "topic_drift"
    COHERENCE_RECOVERY = "coherence_recovery"


class MetricStatus(str, Enum):
    NORMAL = "normal"
    WATCH = "watch"
    FLAG = "flag"


class RiskSeverity(str, Enum):
    NONE = "None"
    LOW = "Low"
    MODERATE = "Moderate"
    HIGH = "High"


class ClusteringPattern(str, Enum):
    DISTRIBUTED = "distributed"
    START_CLUSTERED = "start_clustered"
    MID_CLUSTERED = "mid_clustered"
    END_CLUSTERED = "end_clustered"


class PauseEvent(BaseModel):
    start_ms: int
    end_ms: int
    duration_ms: int
    severity: str
    word_after: str = ""
    confidence: float = 1.0


class CognitiveState(BaseModel):
    state_type: str
    start_time_ms: int
    end_time_ms: int
    confidence: float
    description: str
    phrase: str = ""
    timestamp: float = 0.0


class SpeechMetric(BaseModel):
    name: str
    value: float
    min_value: float
    max_value: float
    unit: str
    status: str
    display_label: str


class AnnotatedToken(BaseModel):
    word: str
    token_type: str
    pause_duration_ms: int = 0
    coherence_score: float = 1.0
    is_low_coherence: bool = False


class PauseClusteringAnalysis(BaseModel):
    total_pauses: int
    average_duration_ms: float
    longest_pause_ms: float
    longest_pause_word: str
    pause_to_speech_ratio: float
    clustering_pattern: str
    clinical_interpretation: str


class RiskFlag(BaseModel):
    name: str
    severity: str
    explanation: str
    recommendation: str


class ComparisonDelta(BaseModel):
    score_change: float = 0
    pause_change_ms: float = 0
    filler_change: float = 0
    has_previous_session: bool = False


class SpeechAnalysisResult(BaseModel):
    session_id: str
    patient_id: str
    timestamp: datetime
    transcript: str
    duration_ms: int
    word_count: int
    cognitive_fluency_score: float
    score_label: str
    score_interpretation: str
    pause_timeline: List[PauseEvent]
    cognitive_states: List[CognitiveState]
    speech_metrics: List[SpeechMetric]
    annotated_transcript: List[AnnotatedToken]
    pause_clustering: PauseClusteringAnalysis
    risk_flags: List[RiskFlag]
    comparison_delta: Optional[ComparisonDelta] = None


async def save_session_to_db(session_data: Dict[str, Any]):
    try:
        db = get_database()
        if db is not None:
            await db.speech_sessions.insert_one(session_data)
    except Exception as e:
        print(f"Failed to save session to DB: {e}")


async def get_previous_session(patient_id: str) -> Optional[Dict[str, Any]]:
    try:
        db = get_database()
        if db is not None:
            cursor = (
                db.speech_sessions.find({"patient_id": patient_id})
                .sort("timestamp", -1)
                .limit(1)
            )
            sessions = await cursor.to_list(length=1)
            return sessions[0] if sessions else None
    except Exception as e:
        print(f"Failed to fetch previous session: {e}")
    return None


@router.post("/analyze", response_model=SpeechAnalysisResult)
async def analyze_speech(
    patient_id: str = Form(...),
    transcript: str = Form(...),
    audio: UploadFile = File(...),
    prompt_text: str = Form(default=""),
    background_tasks: BackgroundTasks = None,
):
    session_id = str(uuid.uuid4())
    now = datetime.now()

    audio_bytes = await audio.read()
    audio_duration_ms = 60000

    try:
        audio_segment_info = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: __import__(
                "pydub", fromlist=["AudioSegment"]
            ).AudioSegment.from_file(
                __import__("io", fromlist=["BytesIO"]).BytesIO(audio_bytes)
            ),
        )
        audio_duration_ms = len(audio_segment_info) if audio_segment_info else 60000
    except Exception:
        pass

    analysis_result = await speech_analyzer.analyze(
        audio_bytes=audio_bytes,
        transcript=transcript,
        prompt_text=prompt_text,
        session_duration_ms=audio_duration_ms,
    )

    comparison_delta = ComparisonDelta(has_previous_session=False)

    previous_session = await get_previous_session(patient_id)

    if previous_session:
        prev_score = previous_session.get("cognitive_fluency_score", 0)
        curr_score = analysis_result["cognitive_fluency_score"]

        prev_avg_pause = previous_session.get("pause_clustering", {}).get(
            "average_duration_ms", 0
        )
        curr_avg_pause = analysis_result["pause_clustering"]["average_duration_ms"]

        prev_filler = sum(
            1
            for t in previous_session.get("annotated_transcript", [])
            if t.get("token_type") == "filler"
        )
        curr_filler = sum(
            1
            for t in analysis_result["annotated_transcript"]
            if t["token_type"] == "filler"
        )

        comparison_delta = ComparisonDelta(
            score_change=round(curr_score - prev_score, 1),
            pause_change_ms=round(curr_avg_pause - prev_avg_pause, 1),
            filler_change=curr_filler - prev_filler,
            has_previous_session=True,
        )

    result = SpeechAnalysisResult(
        session_id=session_id,
        patient_id=patient_id,
        timestamp=now,
        transcript=transcript,
        duration_ms=analysis_result["duration_ms"],
        word_count=analysis_result["word_count"],
        cognitive_fluency_score=analysis_result["cognitive_fluency_score"],
        score_label=analysis_result["score_label"],
        score_interpretation=analysis_result["score_interpretation"],
        pause_timeline=[PauseEvent(**p) for p in analysis_result["pause_timeline"]],
        cognitive_states=[
            CognitiveState(**s) for s in analysis_result["cognitive_states"]
        ],
        speech_metrics=[SpeechMetric(**m) for m in analysis_result["speech_metrics"]],
        annotated_transcript=[
            AnnotatedToken(**t) for t in analysis_result["annotated_transcript"]
        ],
        pause_clustering=PauseClusteringAnalysis(**analysis_result["pause_clustering"]),
        risk_flags=[RiskFlag(**f) for f in analysis_result["risk_flags"]],
        comparison_delta=comparison_delta
        if comparison_delta.has_previous_session
        else None,
    )

    if background_tasks:
        session_doc = result.model_dump()
        session_doc["timestamp"] = now
        background_tasks.add_task(save_session_to_db, session_doc)

    return result


@router.get("/history/{patient_id}", response_model=List[SpeechAnalysisResult])
async def get_speech_history(patient_id: str):
    try:
        db = get_database()
        if db is not None:
            cursor = (
                db.speech_sessions.find({"patient_id": patient_id})
                .sort("timestamp", -1)
                .limit(20)
            )
            sessions = await cursor.to_list(length=20)

            results = []
            for session in sessions:
                session["session_id"] = str(session.pop("_id"))
                results.append(SpeechAnalysisResult(**session))
            return results
    except Exception as e:
        print(f"Failed to fetch speech history: {e}")

    return []


@router.get("/session/{session_id}", response_model=SpeechAnalysisResult)
async def get_speech_session(session_id: str):
    try:
        db = get_database()
        if db is not None:
            from bson import ObjectId

            session = await db.speech_sessions.find_one({"_id": ObjectId(session_id)})
            if session:
                session["session_id"] = str(session.pop("_id"))
                return SpeechAnalysisResult(**session)
    except Exception as e:
        print(f"Failed to fetch session: {e}")

    raise HTTPException(status_code=404, detail="Session not found")
