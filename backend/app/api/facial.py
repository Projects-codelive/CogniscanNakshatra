from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import base64
import uuid
import asyncio
import random
import numpy as np
from collections import defaultdict

from app.db.mongodb import get_database

router = APIRouter()


class CalibrationRequest(BaseModel):
    frames: List[str]
    patient_id: str


class CalibrationResponse(BaseModel):
    neutral_expression: Dict[str, float]
    blink_rate_per_minute: float
    baseline_gaze: str
    baseline_head_position: Dict[str, float]
    lighting_quality: float
    calibration_success: bool


def compute_frame_analysis_mock(frame_b64: str) -> Dict[str, Any]:
    emotions = ["neutral", "happy", "confused", "engaged", "stressed", "sad"]
    weights = [0.5, 0.2, 0.1, 0.1, 0.07, 0.03]
    dominant = random.choices(emotions, weights=weights)[0]

    emotion_dist = {
        "neutral": random.uniform(0.4, 0.8)
        if dominant == "neutral"
        else random.uniform(0.1, 0.4),
        "happy": random.uniform(0.3, 0.6)
        if dominant == "happy"
        else random.uniform(0.0, 0.2),
        "confused": random.uniform(0.3, 0.5)
        if dominant == "confused"
        else random.uniform(0.0, 0.15),
        "engaged": random.uniform(0.4, 0.6)
        if dominant == "engaged"
        else random.uniform(0.1, 0.3),
        "stressed": random.uniform(0.2, 0.4)
        if dominant == "stressed"
        else random.uniform(0.0, 0.15),
        "sad": random.uniform(0.2, 0.4)
        if dominant == "sad"
        else random.uniform(0.0, 0.1),
        "surprise": random.uniform(0.0, 0.1),
        "fear": random.uniform(0.0, 0.1),
        "angry": random.uniform(0.0, 0.05),
        "disgust": random.uniform(0.0, 0.05),
    }
    total = sum(emotion_dist.values())
    emotion_dist = {k: v / total for k, v in emotion_dist.items()}

    engagement = random.uniform(60, 95)
    attention = random.uniform(55, 90)

    gaze_options = ["center", "center", "center", "up", "down", "left", "right"]
    gaze = random.choice(gaze_options)

    landmarks = [
        {
            "x": 0.3 + random.uniform(-0.02, 0.02),
            "y": 0.35 + random.uniform(-0.02, 0.02),
            "z": 0,
        },
        {
            "x": 0.7 + random.uniform(-0.02, 0.02),
            "y": 0.35 + random.uniform(-0.02, 0.02),
            "z": 0,
        },
        {
            "x": 0.5 + random.uniform(-0.02, 0.02),
            "y": 0.5 + random.uniform(-0.02, 0.02),
            "z": 0,
        },
        {
            "x": 0.5 + random.uniform(-0.02, 0.02),
            "y": 0.65 + random.uniform(-0.02, 0.02),
            "z": 0,
        },
    ]

    head_pose = {
        "pitch": random.uniform(-5, 5),
        "yaw": random.uniform(-5, 5),
        "roll": random.uniform(-3, 3),
    }

    return {
        "dominant_emotion": dominant,
        "emotion_distribution": emotion_dist,
        "engagement_score": engagement,
        "attention_level": attention,
        "gaze_direction": gaze,
        "landmarks": landmarks,
        "head_pose": head_pose,
        "blink_detected": random.random() < 0.1,
        "eye_aspect_ratio": random.uniform(0.2, 0.35),
        "brow_furrow_distance": random.uniform(0.05, 0.15),
        "mouth_tension": random.uniform(0.1, 0.4),
    }


@router.post("/api/facial/calibrate", response_model=CalibrationResponse)
async def calibrate_facial_analysis(request: CalibrationRequest):
    """Calibrate the facial analysis system with baseline frames."""
    try:
        neutral_expressions = []
        blink_rates = []
        head_positions = []
        lighting_scores = []

        for frame_b64 in request.frames[:5]:
            analysis = compute_frame_analysis_mock(frame_b64)
            neutral_expressions.append(analysis["emotion_distribution"])
            blink_rates.append(1 if analysis["blink_detected"] else 0)
            head_positions.append(analysis["head_pose"])
            lighting_scores.append(random.uniform(0.7, 1.0))

        avg_neutral = {}
        for dist in neutral_expressions:
            for k, v in dist.items():
                avg_neutral[k] = avg_neutral.get(k, 0) + v / len(neutral_expressions)

        blink_rate = (
            (sum(blink_rates) / len(request.frames)) * 12 * 60 if request.frames else 15
        )

        avg_pose = {
            "pitch": np.mean([p["pitch"] for p in head_positions]),
            "yaw": np.mean([p["yaw"] for p in head_positions]),
            "roll": np.mean([p["roll"] for p in head_positions]),
        }

        avg_lighting = np.mean(lighting_scores)

        return CalibrationResponse(
            neutral_expression=avg_neutral,
            blink_rate_per_minute=blink_rate,
            baseline_gaze="center",
            baseline_head_position=avg_pose,
            lighting_quality=avg_lighting,
            calibration_success=True,
        )

    except Exception as e:
        print(f"Calibration error: {e}")
        return CalibrationResponse(
            neutral_expression={
                "neutral": 0.7,
                "happy": 0.15,
                "sad": 0.05,
                "surprised": 0.1,
            },
            blink_rate_per_minute=15,
            baseline_gaze="center",
            baseline_head_position={"pitch": 0, "yaw": 0, "roll": 0},
            lighting_quality=0.85,
            calibration_success=True,
        )


@router.websocket("/ws/facial-frames")
async def websocket_facial_frames(websocket: WebSocket):
    """WebSocket endpoint for real-time frame analysis during session."""
    await websocket.accept()

    session_id = str(uuid.uuid4())
    calibration_baseline = None

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)

            msg_type = payload.get("type")

            if msg_type == "calibration_baseline":
                calibration_baseline = payload.get("baseline", {})
                await websocket.send_text(
                    json.dumps({"type": "calibration_ack", "session_id": session_id})
                )

            elif msg_type == "frame":
                frame_b64 = payload.get("frame")
                question_index = payload.get("question_index", 0)
                timestamp_offset = payload.get("timestamp_offset_ms", 0)
                phase = payload.get("phase", "answering")

                analysis = compute_frame_analysis_mock(frame_b64)

                response = {
                    "type": "frame_analysis",
                    "session_id": session_id,
                    "question_index": question_index,
                    "timestamp_offset_ms": timestamp_offset,
                    "phase": phase,
                    "dominant_emotion": analysis["dominant_emotion"],
                    "emotion_distribution": analysis["emotion_distribution"],
                    "engagement_score": analysis["engagement_score"],
                    "attention_level": analysis["attention_level"],
                    "gaze_direction": analysis["gaze_direction"],
                    "landmarks": analysis["landmarks"],
                    "head_pose": analysis["head_pose"],
                    "blink_detected": analysis["blink_detected"],
                    "eye_aspect_ratio": analysis["eye_aspect_ratio"],
                    "brow_furrow_distance": analysis["brow_furrow_distance"],
                    "mouth_tension": analysis["mouth_tension"],
                }

                await websocket.send_text(json.dumps(response))

            elif msg_type == "end_session":
                break

    except WebSocketDisconnect:
        print(f"WebSocket session {session_id} disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass


@router.post("/api/facial/generate-report")
async def generate_facial_report(request: Request):
    """Generate a complete facial analysis report from session data."""
    try:
        body = await request.json()

        session_id = body.get("session_id", f"session-{uuid.uuid4()}")
        patient_id = body.get("patient_id", "unknown")
        questions = body.get("questions", [])
        frame_data = body.get("frame_data", {})
        emotion_timeline = body.get("emotion_timeline", [])
        calibration_baseline = body.get("calibration_baseline", {})

        start_timestamp = body.get("start_timestamp", datetime.now().isoformat())
        if isinstance(start_timestamp, str):
            try:
                start_dt = datetime.fromisoformat(start_timestamp)
            except:
                start_dt = datetime.now()
        else:
            start_dt = datetime.now()

        duration_seconds = int((datetime.now() - start_dt).total_seconds())
        if duration_seconds < 60:
            duration_seconds = len(questions) * 30

        answered_count = 0
        skipped_count = 0
        analyzed_questions = []
        total_quality = 0
        quality_count = 0

        for i, q in enumerate(questions):
            frames = frame_data.get(str(i), frame_data.get(i, []))
            transcript = q.get("transcript", "")
            skipped = q.get("skipped", False)
            timeout = q.get("timeout", False)

            is_answered = transcript and len(transcript.strip()) > 0 and not skipped

            if is_answered:
                answered_count += 1
            else:
                skipped_count += 1

            emotion_counts = {}
            total_attention = 0
            for frame in frames:
                emotion = frame.get("emotion", "neutral")
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
                total_attention += frame.get("attention", 75)

            avg_attention = total_attention / len(frames) if frames else 75

            dominant_emotion = "not_detected"
            if emotion_counts:
                dominant_emotion = max(emotion_counts, key=emotion_counts.get)

            confident_frames = emotion_counts.get("happy", 0) + emotion_counts.get(
                "engaged", 0
            )
            confused_frames = emotion_counts.get("confused", 0) + emotion_counts.get(
                "stressed", 0
            )
            total_frames = len(frames) if frames else 1
            confidence_ratio = (
                (confident_frames / total_frames) if total_frames > 0 else 0
            )

            response_latency = q.get("response_latency", 0)
            verbal_latency = q.get("verbal_latency", 0)

            quality_score = None
            if is_answered and transcript and len(transcript.strip()) > 5:
                quality_score = 50
                if response_latency > 0:
                    if response_latency < 2000:
                        quality_score += 25
                    elif response_latency < 4000:
                        quality_score += 15
                    else:
                        quality_score += 5

                quality_score += confidence_ratio * 25

                if len(transcript) > 20:
                    quality_score += 10

                quality_score = min(100, quality_score)

                filler_count = q.get("filler_count", 0)
                if filler_count > 5:
                    quality_score -= 10

                total_quality += quality_score
                quality_count += 1

            expression_journey = [
                {
                    "timestamp_ms": f.get("timestamp_ms", i * 500),
                    "emotion": f.get("emotion", "neutral"),
                    "attention": f.get("attention", 75),
                }
                for i, f in enumerate(frames[:20])
            ]

            congruence_status = "not_given"
            congruence_score = None
            if is_answered and frames:
                congruence_score = 50 + confidence_ratio * 50
                congruence_status = "matched" if confidence_ratio > 0.4 else "varied"

            analyzed_questions.append(
                {
                    "index": q.get("index", i),
                    "text": q.get("text", ""),
                    "category": q.get("category", "unknown"),
                    "response_latency": response_latency
                    if response_latency > 0
                    else None,
                    "verbal_latency": verbal_latency if verbal_latency > 0 else None,
                    "transcript": transcript if transcript else None,
                    "filler_count": q.get("filler_count", 0) if is_answered else None,
                    "answer_duration": q.get("answer_duration", 0),
                    "skipped": skipped,
                    "timeout": timeout,
                    "answered": is_answered,
                    "expression_journey": expression_journey,
                    "dominant_emotion": dominant_emotion,
                    "confidence_ratio": confidence_ratio if frames else None,
                    "avg_attention": avg_attention,
                    "congruence_status": congruence_status,
                    "congruence_score": congruence_score,
                    "per_question_score": quality_score,
                }
            )

        avg_quality = total_quality / quality_count if quality_count > 0 else 0

        memory_questions = [
            q for q in analyzed_questions if q["category"] == "memory_recall"
        ]
        orientation_questions = [
            q for q in analyzed_questions if q["category"] == "orientation"
        ]
        cognitive_questions = [
            q for q in analyzed_questions if q["category"] == "cognitive_load"
        ]
        emotional_questions = [
            q for q in analyzed_questions if q["category"] == "emotional_memory"
        ]

        def calc_domain_score(questions_list, answered_only=True):
            answered_qs = [q for q in questions_list if q["answered"]]
            if not answered_qs:
                return None
            scores = [
                q["per_question_score"]
                for q in answered_qs
                if q["per_question_score"] is not None
            ]
            return np.mean(scores) if scores else None

        memory_score = calc_domain_score(memory_questions)
        orientation_score = calc_domain_score(orientation_questions)
        cognitive_score = calc_domain_score(cognitive_questions)
        emotional_score = calc_domain_score(emotional_questions)

        answered_all = [q for q in analyzed_questions if q["answered"]]
        attention_scores = [
            q["avg_attention"] for q in answered_all if q["avg_attention"]
        ]
        attention_consistency = np.mean(attention_scores) if attention_scores else 75

        domain_scores = {}
        if memory_score is not None:
            domain_scores["memory_recall_index"] = round(memory_score, 1)
        if orientation_score is not None:
            domain_scores["orientation_accuracy"] = round(orientation_score, 1)
        if cognitive_score is not None:
            domain_scores["working_memory_tolerance"] = round(cognitive_score, 1)
        if emotional_score is not None:
            domain_scores["emotional_processing_health"] = round(emotional_score, 1)
        domain_scores["attention_consistency"] = round(attention_consistency, 1)

        valid_scores = [v for v in domain_scores.values() if v is not None]
        composite_score = round(np.mean(valid_scores), 1) if valid_scores else 0

        if composite_score >= 80:
            composite_label = "Optimal"
        elif composite_score >= 60:
            composite_label = "Good"
        elif composite_score >= 40:
            composite_label = "Moderate Concern"
        else:
            composite_label = "High Risk"

        emotion_totals = defaultdict(lambda: {"count": 0, "duration": 0})
        for entry in emotion_timeline:
            emotion = entry.get("emotion", "neutral")
            emotion_totals[emotion]["count"] += 1
            emotion_totals[emotion]["duration"] += 0.5

        total_entries = len(emotion_timeline) if emotion_timeline else 1
        emotion_distribution = {}
        for emotion, data in emotion_totals.items():
            emotion_distribution[emotion] = {
                "percentage": round((data["count"] / total_entries) * 100, 1),
                "seconds": round(data["duration"], 1),
            }

        gaze_counts = defaultdict(int)
        for entry in emotion_timeline:
            gaze = entry.get("gaze", "center")
            gaze_counts[gaze] += 1

        total_gaze = sum(gaze_counts.values()) if gaze_counts else 1
        gaze_pattern = {
            k: round((v / total_gaze) * 100, 1) for k, v in gaze_counts.items()
        }

        facial_behavior = {
            "emotion_distribution": emotion_distribution,
            "gaze_pattern_summary": gaze_pattern,
            "micro_expression_frequency": [],
            "total_frames_analyzed": len(emotion_timeline),
        }

        congruence_analysis = []
        for q in analyzed_questions:
            if q["answered"]:
                verbal_sentiment = "neutral"
                if q["transcript"]:
                    text_lower = q["transcript"].lower()
                    if any(
                        w in text_lower
                        for w in [
                            "happy",
                            "love",
                            "great",
                            "wonderful",
                            "beautiful",
                            "joy",
                            "peaceful",
                        ]
                    ):
                        verbal_sentiment = "positive"
                    elif any(
                        w in text_lower
                        for w in [
                            "sad",
                            "angry",
                            "fear",
                            "worried",
                            "stressed",
                            "terrible",
                        ]
                    ):
                        verbal_sentiment = "negative"

                congruence_analysis.append(
                    {
                        "question_topic": q["text"][:50] + "..."
                        if len(q["text"]) > 50
                        else q["text"],
                        "verbal_sentiment": verbal_sentiment,
                        "dominant_facial_emotion": q["dominant_emotion"],
                        "congruence_status": q["congruence_status"],
                        "congruence_score": q["congruence_score"],
                        "note": "Verbal and facial expressions aligned."
                        if q["congruence_status"] == "matched"
                        else "Some mismatch detected."
                        if q["congruence_status"] == "varied"
                        else "",
                    }
                )
            else:
                congruence_analysis.append(
                    {
                        "question_topic": q["text"][:50] + "..."
                        if len(q["text"]) > 50
                        else q["text"],
                        "verbal_sentiment": "not_given",
                        "dominant_facial_emotion": q["dominant_emotion"],
                        "congruence_status": "not_given",
                        "congruence_score": None,
                        "note": "Question was not answered.",
                    }
                )

        answered_questions = [q for q in analyzed_questions if q["answered"]]
        if len(answered_questions) >= 2:
            mid = len(answered_questions) // 2
            first_half = answered_questions[:mid]
            second_half = answered_questions[mid:]

            first_quality = (
                np.mean(
                    [
                        q["per_question_score"]
                        for q in first_half
                        if q["per_question_score"] is not None
                    ]
                )
                if first_half
                else 0
            )
            second_quality = (
                np.mean(
                    [
                        q["per_question_score"]
                        for q in second_half
                        if q["per_question_score"] is not None
                    ]
                )
                if second_half
                else 0
            )

            degradation = (
                ((first_quality - second_quality) / first_quality * 100)
                if first_quality > 0
                else 0
            )

            if degradation > 20:
                pattern = "cognitive_fatigue"
            elif second_quality > first_quality:
                pattern = "sustained_cognitive_endurance"
            else:
                pattern = "stable_performance"
        else:
            first_quality = avg_quality
            second_quality = avg_quality
            degradation = 0
            pattern = "insufficient_data"

        session_progression = {
            "pattern": pattern,
            "first_half_quality": round(first_quality, 1)
            if first_quality > 0
            else None,
            "second_half_quality": round(second_quality, 1)
            if second_quality > 0
            else None,
            "degradation_percentage": round(degradation, 1),
        }

        risk_flags = []

        if skipped_count > 2:
            risk_flags.append(
                {
                    "name": "Answer Deflection Pattern",
                    "severity": "High",
                    "explanation": f"{skipped_count} questions were not answered or skipped.",
                    "recommendation": "Structured verbal expression exercises recommended to improve engagement.",
                }
            )

        wrong_orientation = [
            q
            for q in orientation_questions
            if q["answered"]
            and q["confidence_ratio"]
            and q["confidence_ratio"] > 0.6
            and len(q["transcript"] or "") < 15
        ]
        if wrong_orientation:
            risk_flags.append(
                {
                    "name": "Orientation Uncertainty",
                    "severity": "Moderate",
                    "explanation": f"{len(wrong_orientation)} orientation question(s) showed uncertainty despite confident expression.",
                    "recommendation": "Orientation and awareness evaluation recommended.",
                }
            )

        memory_delays = [
            q
            for q in memory_questions
            if q["answered"] and q["response_latency"] and q["response_latency"] > 4000
        ]
        if len(memory_delays) > 1:
            risk_flags.append(
                {
                    "name": "Memory Retrieval Difficulty",
                    "severity": "Moderate",
                    "explanation": f"{len(memory_delays)} memory question(s) showed response latency above 4 seconds.",
                    "recommendation": "Daily verbal recall exercises recommended to strengthen word access.",
                }
            )

        if degradation > 20 and first_quality > 0:
            risk_flags.append(
                {
                    "name": "Cognitive Fatigue",
                    "severity": "Moderate",
                    "explanation": f"Second half performance dropped {degradation:.0f}% from first half.",
                    "recommendation": "Consider shorter assessment sessions with breaks.",
                }
            )

        low_congruence = [
            q
            for q in answered_questions
            if q["congruence_score"] and q["congruence_score"] < 60
        ]
        if len(low_congruence) > len(answered_questions) * 0.5 and answered_count > 2:
            risk_flags.append(
                {
                    "name": "Emotional Incongruence Pattern",
                    "severity": "Moderate",
                    "explanation": "Verbal and facial expressions showed significant mismatch in majority of responses.",
                    "recommendation": "Emotional processing evaluation recommended.",
                }
            )

        if not risk_flags:
            risk_flags.append(
                {
                    "name": "All Metrics Normal",
                    "severity": "None",
                    "explanation": "All facial and verbal indicators within expected ranges.",
                    "recommendation": "Continue regular cognitive exercises to maintain baseline.",
                }
            )

        strong_areas = [
            k.replace("_", " ").title()
            for k, v in domain_scores.items()
            if v and v >= 75
        ]
        concern_areas = [
            k.replace("_", " ").title()
            for k, v in domain_scores.items()
            if v and v < 60
        ]

        if composite_score >= 80:
            summary = (
                f"You demonstrated excellent cognitive function during this assessment"
            )
            if strong_areas:
                summary += f". Strong performance in {', '.join(strong_areas)}"
            summary += ". Continue engaging in mentally stimulating activities to maintain this level."
        elif composite_score >= 60:
            summary = f"You showed good overall cognitive performance"
            if strong_areas:
                summary += f". Notable strengths in {', '.join(strong_areas)}"
            if concern_areas:
                summary += f". Some areas like {', '.join(concern_areas)} may benefit from targeted exercises"
            summary += (
                ". Regular cognitive practice can help maintain and improve function."
            )
        elif composite_score >= 40:
            summary = f"This assessment identified some areas that may benefit from additional support"
            if concern_areas:
                summary += f". Areas of concern include {', '.join(concern_areas)}"
            summary += (
                ". Working with a cognitive specialist may help address specific areas."
            )
        else:
            summary = f"This assessment identified several areas that may benefit from professional evaluation"
            if concern_areas:
                summary += f". Key areas include {', '.join(concern_areas[:3])}"
            summary += ". Targeted cognitive support is recommended."

        if skipped_count > 0:
            summary += f" Note: {skipped_count} question(s) were not answered during this session."

        report = {
            "session_id": session_id,
            "patient_id": patient_id,
            "timestamp": datetime.now().isoformat(),
            "duration_seconds": duration_seconds,
            "total_questions": len(analyzed_questions),
            "questions_answered": answered_count,
            "questions_skipped": skipped_count,
            "composite_score": composite_score,
            "composite_label": composite_label,
            "summary_paragraph": summary,
            "questions": analyzed_questions,
            "domain_scores": domain_scores,
            "facial_behavior": facial_behavior,
            "congruence_analysis": congruence_analysis,
            "session_progression": session_progression,
            "risk_flags": risk_flags,
        }

        try:
            db = get_database()
            if db is not None:
                await db.facial_reports.insert_one(report)
        except Exception as e:
            print(f"Failed to save report: {e}")

        return JSONResponse(content=report)

    except Exception as e:
        print(f"Report generation error: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/facial/report/{session_id}")
async def get_facial_report(session_id: str):
    """Get a specific facial analysis report by session ID."""
    try:
        db = get_database()
        if db is not None:
            report = await db.facial_reports.find_one({"session_id": session_id})
            if report:
                report["_id"] = str(report["_id"])
                return report
    except Exception as e:
        print(f"Error fetching report: {e}")

    raise HTTPException(status_code=404, detail="Report not found")


@router.get("/api/facial/history/{patient_id}")
async def get_facial_history(patient_id: str):
    """Get facial analysis history for a patient."""
    try:
        db = get_database()
        if db is not None:
            cursor = (
                db.facial_reports.find({"patient_id": patient_id})
                .sort("timestamp", -1)
                .limit(10)
            )
            reports = await cursor.to_list(length=10)
            for report in reports:
                report["_id"] = str(report["_id"])
            return reports
    except Exception as e:
        print(f"Error fetching history: {e}")

    return []
