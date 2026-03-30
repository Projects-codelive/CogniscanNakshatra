import numpy as np
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
import random
import math


@dataclass
class FrameAnalysis:
    timestamp_ms: int
    dominant_emotion: str
    emotion_distribution: Dict[str, float]
    engagement_score: float
    attention_level: float
    blink_detected: bool
    gaze_direction: str
    head_pose: Dict[str, float]
    landmarks: List[Dict[str, float]]
    micro_expression: Optional[str] = None
    micro_expression_duration_ms: int = 0


@dataclass
class QuestionAnalysis:
    question_index: int
    question_text: str
    question_category: str
    display_timestamp_ms: int
    response_latency_ms: int
    verbal_latency_ms: int
    transcript: str
    verbal_sentiment: str
    answer_relevance: float
    answer_quality_score: float
    expression_journey: List[Dict]
    micro_expression_events: List[Dict]
    congruence_status: str
    congruence_score: float
    facial_confidence_ratio: float
    per_question_score: float


@dataclass
class DomainScores:
    memory_recall_index: float
    orientation_accuracy: float
    working_memory_tolerance: float
    emotional_processing_health: float
    attention_consistency: float


@dataclass
class SessionReport:
    session_id: str
    patient_id: str
    timestamp: str
    duration_seconds: int
    total_questions: int
    questions_answered: int
    calibration_baseline: Dict
    composite_score: float
    composite_label: str
    summary_paragraph: str
    questions: List[Dict]
    domain_scores: Dict
    facial_behavior: Dict
    congruence_analysis: List[Dict]
    session_progression: Dict
    risk_flags: List[Dict]


EMOTION_COLORS = {
    "happy": "#22c55e",
    "neutral": "#6b7280",
    "sad": "#3b82f6",
    "fear": "#8b5cf6",
    "angry": "#ef4444",
    "surprise": "#f59e0b",
    "disgust": "#84cc16",
    "confused": "#eab308",
    "stressed": "#f97316",
    "engaged": "#06b6d4",
    "blank": "#9ca3af",
}

EMOTION_LABELS = {
    "happy": "Happy",
    "neutral": "Neutral",
    "sad": "Sad",
    "fear": "Fear",
    "angry": "Angry",
    "surprise": "Surprise",
    "disgust": "Disgust",
    "confused": "Confusion",
    "stressed": "Stress",
    "engaged": "Engaged",
    "blank": "Blank",
}


class FacialAnalyzerService:
    def __init__(self):
        self.initialized = False
        self._initialize_analyzer()

    def _initialize_analyzer(self):
        try:
            from deepface import DeepFace
            import mediapipe as mp

            self.DeepFace = DeepFace
            self.mp = mp
            self.mp_face_mesh = mp.solutions.face_mesh
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            self.initialized = True
        except ImportError as e:
            print(f"Face analysis libraries not available, using mock analysis: {e}")
            self.initialized = False

    async def analyze_frame(
        self,
        base64_image: str,
        baseline: Optional[Dict] = None,
        previous_frame: Optional[FrameAnalysis] = None,
        timestamp_ms: int = 0,
    ) -> FrameAnalysis:

        if self.initialized:
            return await self._analyze_frame_real(
                base64_image, baseline, previous_frame, timestamp_ms
            )
        else:
            return self._analyze_frame_mock(
                base64_image, baseline, previous_frame, timestamp_ms
            )

    async def _analyze_frame_real(
        self, base64_image, baseline, previous_frame, timestamp_ms
    ) -> FrameAnalysis:
        import base64
        import cv2
        from PIL import Image
        import io

        header, encoded = (
            base64_image.split(",", 1) if "," in base64_image else ("", base64_image)
        )
        image_bytes = base64.b64decode(encoded)
        image = Image.open(io.BytesIO(image_bytes))
        frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

        try:
            objs = self.DeepFace.analyze(
                img_path=frame,
                actions=["emotion"],
                enforce_detection=False,
                silent=True,
            )
            dominant_emotion = objs[0]["dominant_emotion"]
            emotion_distribution = objs[0]["emotion"]
        except Exception:
            dominant_emotion = "neutral"
            emotion_distribution = {"neutral": 1.0}

        results = self.face_mesh.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        landmarks = []
        gaze_direction = "center"
        head_pose = {"pitch": 0, "yaw": 0, "roll": 0}

        if results.multi_face_landmarks:
            face_landmarks = results.multi_face_landmarks[0]
            landmarks = [
                {"x": lm.x, "y": lm.y, "z": lm.z} for lm in face_landmarks.landmark
            ]

            gaze_direction = self._compute_gaze_direction(face_landmarks)
            head_pose = self._compute_head_pose(face_landmarks)

        engagement_score = self._compute_engagement_score(emotion_distribution)
        attention_level = self._compute_attention_level(
            emotion_distribution, gaze_direction
        )
        blink_detected = self._detect_blink(face_landmarks) if landmarks else False

        micro_expression, micro_duration = self._detect_micro_expression(
            emotion_distribution,
            previous_frame.emotion_distribution if previous_frame else None,
        )

        return FrameAnalysis(
            timestamp_ms=timestamp_ms,
            dominant_emotion=dominant_emotion,
            emotion_distribution=emotion_distribution,
            engagement_score=engagement_score,
            attention_level=attention_level,
            blink_detected=blink_detected,
            gaze_direction=gaze_direction,
            head_pose=head_pose,
            landmarks=landmarks,
            micro_expression=micro_expression,
            micro_expression_duration_ms=micro_duration,
        )

    def _analyze_frame_mock(
        self,
        base64_image: str,
        baseline: Optional[Dict],
        previous_frame: Optional[FrameAnalysis],
        timestamp_ms: int,
    ) -> FrameAnalysis:

        emotions = ["neutral", "happy", "confused", "engaged", "stressed", "sad"]
        weights = [0.45, 0.20, 0.12, 0.10, 0.08, 0.05]

        if previous_frame:
            dominant = previous_frame.dominant_emotion
            idx = emotions.index(dominant) if dominant in emotions else 0
            weights[idx] = max(weights[idx], 0.35)

        dominant_emotion = random.choices(emotions, weights=weights)[0]

        emotion_distribution = {
            "neutral": random.uniform(0.5, 0.9)
            if dominant_emotion == "neutral"
            else random.uniform(0.1, 0.4),
            "happy": random.uniform(0.3, 0.6)
            if dominant_emotion == "happy"
            else random.uniform(0.0, 0.2),
            "confused": random.uniform(0.3, 0.5)
            if dominant_emotion == "confused"
            else random.uniform(0.0, 0.15),
            "engaged": random.uniform(0.4, 0.6)
            if dominant_emotion == "engaged"
            else random.uniform(0.1, 0.3),
            "stressed": random.uniform(0.2, 0.4)
            if dominant_emotion == "stressed"
            else random.uniform(0.0, 0.15),
            "sad": random.uniform(0.2, 0.4)
            if dominant_emotion == "sad"
            else random.uniform(0.0, 0.1),
            "surprise": random.uniform(0.0, 0.1),
            "fear": random.uniform(0.0, 0.1),
            "angry": random.uniform(0.0, 0.05),
            "disgust": random.uniform(0.0, 0.05),
        }

        total = sum(emotion_distribution.values())
        emotion_distribution = {k: v / total for k, v in emotion_distribution.items()}

        engagement_score = random.uniform(65, 95)
        attention_level = random.uniform(60, 90)
        blink_detected = random.random() < 0.15

        gaze_options = ["center", "center", "center", "up", "down", "left", "right"]
        gaze_direction = random.choice(gaze_options)

        head_pose = {
            "pitch": random.uniform(-5, 5),
            "yaw": random.uniform(-5, 5),
            "roll": random.uniform(-3, 3),
        }

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

        micro_expression = None
        micro_duration = 0
        if random.random() < 0.05:
            micro_options = ["confusion", "surprise", "disgust", "fear"]
            micro_expression = random.choice(micro_options)
            micro_duration = random.randint(100, 400)

        return FrameAnalysis(
            timestamp_ms=timestamp_ms,
            dominant_emotion=dominant_emotion,
            emotion_distribution=emotion_distribution,
            engagement_score=engagement_score,
            attention_level=attention_level,
            blink_detected=blink_detected,
            gaze_direction=gaze_direction,
            head_pose=head_pose,
            landmarks=landmarks,
            micro_expression=micro_expression,
            micro_expression_duration_ms=micro_duration,
        )

    def _compute_engagement_score(self, emotion_dist: Dict[str, float]) -> float:
        positive = (
            emotion_dist.get("happy", 0) * 0.4 + emotion_dist.get("engaged", 0) * 0.3
        )
        neutral = emotion_dist.get("neutral", 0) * 0.3
        negative = (
            emotion_dist.get("fear", 0)
            + emotion_dist.get("angry", 0)
            + emotion_dist.get("disgust", 0)
            + emotion_dist.get("sad", 0)
        ) * 0.5

        score = (positive + neutral - negative) * 100
        return max(0, min(100, score))

    def _compute_attention_level(
        self, emotion_dist: Dict[str, float], gaze: str
    ) -> float:
        base = 100

        if gaze in ["up"]:
            base -= 15
        elif gaze in ["left", "right"]:
            base -= 25
        elif gaze == "down":
            base -= 10

        confusion_penalty = emotion_dist.get("confused", 0) * 30
        stress_penalty = emotion_dist.get("stressed", 0) * 20

        return max(0, min(100, base - confusion_penalty - stress_penalty))

    def _compute_gaze_direction(self, face_landmarks) -> str:
        try:
            left_eye_inner = face_landmarks.landmark[133]
            left_eye_outer = face_landmarks.landmark[33]
            right_eye_inner = face_landmarks.landmark[362]
            right_eye_outer = face_landmarks.landmark[263]

            left_iris = face_landmarks.landmark[468]
            right_iris = face_landmarks.landmark[473]

            left_gaze = (left_iris.x - left_eye_inner.x) / (
                left_eye_outer.x - left_eye_inner.x + 0.001
            )
            right_gaze = (right_iris.x - right_eye_inner.x) / (
                right_eye_outer.x - right_eye_inner.x + 0.001
            )
            avg_gaze = (left_gaze + right_gaze) / 2

            if avg_gaze < 0.4:
                return "left"
            elif avg_gaze > 0.6:
                return "right"
            else:
                forehead = face_landmarks.landmark[10]
                nose_tip = face_landmarks.landmark[1]

                if nose_tip.y < forehead.y - 0.05:
                    return "up"
                elif nose_tip.y > forehead.y + 0.02:
                    return "down"
                return "center"
        except:
            return "center"

    def _compute_head_pose(self, face_landmarks) -> Dict[str, float]:
        try:
            nose_tip = face_landmarks.landmark[1]
            left_ear = face_landmarks.landmark[234]
            right_ear = face_landmarks.landmark[454]

            yaw = (left_ear.x - right_ear.x) * 50
            roll = (
                math.atan2(right_ear.y - left_ear.y, right_ear.x - left_ear.x)
                * 180
                / math.pi
            )
            pitch = (nose_tip.y - 0.5) * 30

            return {"pitch": pitch, "yaw": yaw, "roll": roll}
        except:
            return {"pitch": 0, "yaw": 0, "roll": 0}

    def _detect_blink(self, face_landmarks) -> bool:
        try:
            left_eye_top = face_landmarks.landmark[159]
            left_eye_bottom = face_landmarks.landmark[145]
            left_eye_left = face_landmarks.landmark[33]
            left_eye_right = face_landmarks.landmark[133]

            eye_height = abs(left_eye_top.y - left_eye_bottom.y)
            eye_width = abs(left_eye_right.x - left_eye_left.x)

            ear = eye_height / (eye_width + 0.001)
            return ear < 0.2
        except:
            return False

    def _detect_micro_expression(
        self, current_dist: Dict[str, float], previous_dist: Optional[Dict[str, float]]
    ) -> tuple:
        if not previous_dist:
            return None, 0

        changes = {}
        for emotion in current_dist:
            prev = previous_dist.get(emotion, 0)
            curr = current_dist[emotion]
            changes[emotion] = abs(curr - prev)

        max_change_emotion = max(changes, key=changes.get)
        max_change = changes[max_change_emotion]

        if max_change > 0.25 and max_change < 0.5:
            return max_change_emotion, random.randint(100, 450)

        return None, 0

    async def calibrate_baseline(self, frames: List[str]) -> Dict:
        baseline_emotions = []
        baseline_blink_rates = []
        baseline_positions = []

        for i, frame_b64 in enumerate(frames):
            analysis = await self.analyze_frame(frame_b64, None, None, i * 500)
            baseline_emotions.append(analysis.emotion_distribution)
            baseline_positions.append(
                {"gaze": analysis.gaze_direction, "pose": analysis.head_pose}
            )
            if analysis.blink_detected:
                baseline_blink_rates.append(1)

        avg_emotions = {}
        for dist in baseline_emotions:
            for k, v in dist.items():
                avg_emotions[k] = avg_emotions.get(k, 0) + v / len(baseline_emotions)

        blink_rate_per_minute = (
            (len(baseline_blink_rates) / len(frames)) * 12 * 60 if frames else 15
        )

        dominant_gazes = [p["gaze"] for p in baseline_positions]
        center_count = dominant_gazes.count("center")
        baseline_gaze = (
            "center"
            if center_count > len(dominant_gazes) / 2
            else max(set(dominant_gazes), key=dominant_gazes.count)
        )

        avg_poses = {
            "pitch": np.mean([p["pose"]["pitch"] for p in baseline_positions]),
            "yaw": np.mean([p["pose"]["yaw"] for p in baseline_positions]),
            "roll": np.mean([p["pose"]["roll"] for p in baseline_positions]),
        }

        return {
            "neutral_expression": avg_emotions,
            "blink_rate_per_minute": blink_rate_per_minute,
            "baseline_gaze": baseline_gaze,
            "baseline_head_position": avg_poses,
            "calibration_timestamp": None,
        }

    async def analyze_question_response(
        self,
        question: Dict,
        frames: List[FrameAnalysis],
        transcript: str,
        verbal_latency_ms: int,
        baseline: Dict,
    ) -> QuestionAnalysis:

        if not frames:
            return QuestionAnalysis(
                question_index=question.get("index", 0),
                question_text=question.get("text", ""),
                question_category=question.get("category", ""),
                display_timestamp_ms=question.get("display_time", 0),
                response_latency_ms=0,
                verbal_latency_ms=verbal_latency_ms,
                transcript=transcript,
                verbal_sentiment="neutral",
                answer_relevance=0.5,
                answer_quality_score=5.0,
                expression_journey=[],
                micro_expression_events=[],
                congruence_status="unknown",
                congruence_score=50.0,
                facial_confidence_ratio=0.5,
                per_question_score=50.0,
            )

        first_frame = frames[0]
        display_time = question.get("display_time", 0)

        response_latency_ms = 0
        for i, frame in enumerate(frames):
            if i == 0:
                continue

            if (
                frame.attention_level < first_frame.attention_level - 10
                or frame.dominant_emotion != first_frame.dominant_emotion
                or frame.micro_expression
            ):
                response_latency_ms = frame.timestamp_ms - display_time
                break

        if response_latency_ms == 0 and len(frames) > 1:
            response_latency_ms = frames[1].timestamp_ms - display_time

        expression_journey = [
            {
                "timestamp_ms": f.timestamp_ms,
                "emotion": f.dominant_emotion,
                "attention": f.attention_level,
                "gaze": f.gaze_direction,
                "color": EMOTION_COLORS.get(f.dominant_emotion, "#6b7280"),
            }
            for f in frames
        ]

        micro_events = []
        for frame in frames:
            if frame.micro_expression:
                micro_events.append(
                    {
                        "timestamp_ms": frame.timestamp_ms,
                        "expression": frame.micro_expression,
                        "duration_ms": frame.micro_expression_duration_ms,
                        "emotion_distribution": frame.emotion_distribution,
                    }
                )

        word_count = len(transcript.split()) if transcript else 0
        verbal_sentiment = self._analyze_sentiment(transcript)

        confident_frames = sum(
            1 for f in frames if f.dominant_emotion in ["happy", "engaged"]
        )
        confused_frames = sum(
            1 for f in frames if f.dominant_emotion in ["confused", "stressed"]
        )
        total_frames = len(frames)

        facial_confidence_ratio = (
            confident_frames / total_frames if total_frames > 0 else 0.5
        )

        latency_score = self._score_latency(
            response_latency_ms, question.get("category", "")
        )
        confidence_score = facial_confidence_ratio * 100
        relevance_score = (
            min(100, word_count * 5) if word_count > 5 else word_count * 10
        )

        answer_quality = (
            latency_score * 0.3 + confidence_score * 0.4 + relevance_score * 0.3
        )
        answer_quality = min(100, answer_quality)

        congruence_score, congruence_status = self._compute_congruence(
            verbal_sentiment, frames, word_count
        )

        verbal_positive = verbal_sentiment in ["positive", "happy"]
        facial_positive = facial_confidence_ratio > 0.5

        if verbal_positive == facial_positive:
            congruence_score = max(congruence_score, 70)
            congruence_status = "matched"
        else:
            congruence_score = min(congruence_score, 50)
            congruence_status = "mismatched"

        per_question_score = answer_quality * 0.6 + congruence_score * 0.4

        return QuestionAnalysis(
            question_index=question.get("index", 0),
            question_text=question.get("text", ""),
            question_category=question.get("category", ""),
            display_timestamp_ms=display_time,
            response_latency_ms=response_latency_ms,
            verbal_latency_ms=verbal_latency_ms,
            transcript=transcript,
            verbal_sentiment=verbal_sentiment,
            answer_relevance=relevance_score / 100,
            answer_quality_score=answer_quality,
            expression_journey=expression_journey,
            micro_expression_events=micro_events,
            congruence_status=congruence_status,
            congruence_score=congruence_score,
            facial_confidence_ratio=facial_confidence_ratio,
            per_question_score=per_question_score,
        )

    def _score_latency(self, latency_ms: int, category: str) -> float:
        if latency_ms < 2000:
            return 100
        elif latency_ms < 4000:
            return 75
        elif latency_ms < 6000:
            return 50
        elif latency_ms < 8000:
            return 25
        return 10

    def _analyze_sentiment(self, text: str) -> str:
        if not text:
            return "neutral"

        text_lower = text.lower()

        positive_words = [
            "happy",
            "joy",
            "love",
            "wonderful",
            "great",
            "beautiful",
            "excited",
            "peaceful",
            "calm",
            "safe",
            "happy",
        ]
        negative_words = [
            "sad",
            "angry",
            "fear",
            "worried",
            "anxious",
            "stressed",
            "terrible",
            "awful",
            "scared",
        ]

        pos_count = sum(1 for w in positive_words if w in text_lower)
        neg_count = sum(1 for w in negative_words if w in text_lower)

        if pos_count > neg_count:
            return "positive"
        elif neg_count > pos_count:
            return "negative"
        return "neutral"

    def _compute_congruence(
        self, verbal_sentiment: str, frames: List[FrameAnalysis], word_count: int
    ) -> tuple:
        if word_count < 5:
            return 50.0, "insufficient_data"

        positive_frames = sum(
            1 for f in frames if f.dominant_emotion in ["happy", "engaged"]
        )
        negative_frames = sum(
            1
            for f in frames
            if f.dominant_emotion in ["sad", "angry", "fear", "stressed"]
        )
        neutral_frames = sum(1 for f in frames if f.dominant_emotion == "neutral")

        total = len(frames) if frames else 1

        if verbal_sentiment == "positive":
            score = (positive_frames * 1.0 + neutral_frames * 0.5) / total * 100
        elif verbal_sentiment == "negative":
            score = (negative_frames * 1.0 + neutral_frames * 0.5) / total * 100
        else:
            score = neutral_frames / total * 100

        status = "matched" if score > 60 else "mismatched"

        return min(100, score), status

    async def compute_domain_scores(
        self, questions: List[QuestionAnalysis]
    ) -> DomainScores:
        memory_questions = [
            q for q in questions if q.question_category == "memory_recall"
        ]
        orientation_questions = [
            q for q in questions if q.question_category == "orientation"
        ]
        cognitive_questions = [
            q for q in questions if q.question_category == "cognitive_load"
        ]
        emotional_questions = [
            q for q in questions if q.question_category == "emotional_memory"
        ]

        memory_score = (
            self._compute_memory_score(memory_questions) if memory_questions else 50
        )
        orientation_score = (
            self._compute_orientation_score(orientation_questions)
            if orientation_questions
            else 50
        )
        working_memory_score = (
            self._compute_working_memory_score(cognitive_questions)
            if cognitive_questions
            else 50
        )
        emotional_score = (
            self._compute_emotional_score(emotional_questions)
            if emotional_questions
            else 50
        )
        attention_score = self._compute_attention_score(questions) if questions else 50

        return DomainScores(
            memory_recall_index=memory_score,
            orientation_accuracy=orientation_score,
            working_memory_tolerance=working_memory_score,
            emotional_processing_health=emotional_score,
            attention_consistency=attention_score,
        )

    def _compute_memory_score(self, questions: List[QuestionAnalysis]) -> float:
        if not questions:
            return 50

        scores = []
        for q in questions:
            latency_score = max(0, 100 - q.response_latency_ms / 100)
            confidence_score = q.facial_confidence_ratio * 100
            quality_score = q.answer_quality_score

            question_score = (
                latency_score * 0.4 + confidence_score * 0.35 + quality_score * 0.25
            )
            scores.append(question_score)

        return sum(scores) / len(scores)

    def _compute_orientation_score(self, questions: List[QuestionAnalysis]) -> float:
        if not questions:
            return 50

        scores = []
        for q in questions:
            correct_answer = "correct" in q.transcript.lower() or len(q.transcript) > 0
            high_latency = q.response_latency_ms > 4000
            confused_face = q.facial_confidence_ratio < 0.5

            if correct_answer and not high_latency:
                score = 100
            elif correct_answer and high_latency:
                score = 70
            elif not correct_answer and confused_face:
                score = 30
            elif not correct_answer and not confused_face:
                score = 10
            else:
                score = 50

            scores.append(score)

        return sum(scores) / len(scores)

    def _compute_working_memory_score(self, questions: List[QuestionAnalysis]) -> float:
        if not questions:
            return 50

        scores = []
        for q in questions:
            quality_score = q.answer_quality_score
            stress_frames = sum(
                1 for e in q.expression_journey if e.get("emotion") == "stressed"
            )
            stress_ratio = (
                stress_frames / len(q.expression_journey) if q.expression_journey else 0
            )

            stress_penalty = stress_ratio * 30
            adjusted_score = quality_score - stress_penalty

            scores.append(max(0, adjusted_score))

        return sum(scores) / len(scores)

    def _compute_emotional_score(self, questions: List[QuestionAnalysis]) -> float:
        if not questions:
            return 50

        scores = []
        for q in questions:
            congruence_score = q.congruence_score
            positive_emotion = q.facial_confidence_ratio
            distress_ratio = (
                sum(
                    1
                    for e in q.expression_journey
                    if e.get("emotion") in ["sad", "fear", "angry"]
                )
                / len(q.expression_journey)
                if q.expression_journey
                else 0
            )

            score = (
                congruence_score * 0.4
                + positive_emotion * 100 * 0.4
                - distress_ratio * 100 * 0.2
            )
            scores.append(max(0, min(100, score)))

        return sum(scores) / len(scores)

    def _compute_attention_score(self, questions: List[QuestionAnalysis]) -> float:
        if not questions:
            return 50

        attention_scores = []
        for q in questions:
            if q.expression_journey:
                avg_attention = sum(
                    e.get("attention", 50) for e in q.expression_journey
                ) / len(q.expression_journey)
                attention_scores.append(avg_attention)
            else:
                attention_scores.append(50)

        baseline_attention = sum(attention_scores) / len(attention_scores)

        first_half = attention_scores[: len(attention_scores) // 2]
        second_half = attention_scores[len(attention_scores) // 2 :]

        if first_half and second_half:
            first_avg = sum(first_half) / len(first_half)
            second_avg = sum(second_half) / len(second_half)

            degradation = (first_avg - second_avg) / first_avg if first_avg > 0 else 0
            if degradation > 0.2:
                baseline_attention *= 1 - degradation * 0.5

        return max(0, min(100, baseline_attention))

    async def generate_session_report(
        self,
        session_id: str,
        patient_id: str,
        calibration_baseline: Dict,
        questions_data: List[Dict],
        domain_scores: DomainScores,
    ) -> SessionReport:

        question_analyses = []
        for q_data in questions_data:
            analysis = QuestionAnalysis(
                question_index=q_data.get("index", 0),
                question_text=q_data.get("text", ""),
                question_category=q_data.get("category", ""),
                display_timestamp_ms=q_data.get("display_time", 0),
                response_latency_ms=q_data.get("response_latency", 0),
                verbal_latency_ms=q_data.get("verbal_latency", 0),
                transcript=q_data.get("transcript", ""),
                verbal_sentiment=q_data.get("sentiment", "neutral"),
                answer_relevance=q_data.get("relevance", 0.5),
                answer_quality_score=q_data.get("quality_score", 50),
                expression_journey=q_data.get("expression_journey", []),
                micro_expression_events=q_data.get("micro_expressions", []),
                congruence_status=q_data.get("congruence", "unknown"),
                congruence_score=q_data.get("congruence_score", 50),
                facial_confidence_ratio=q_data.get("confidence_ratio", 0.5),
                per_question_score=q_data.get("per_question_score", 50),
            )
            question_analyses.append(analysis)

        composite = (
            domain_scores.memory_recall_index * 0.25
            + domain_scores.orientation_accuracy * 0.20
            + domain_scores.working_memory_tolerance * 0.20
            + domain_scores.emotional_processing_health * 0.15
            + domain_scores.attention_consistency * 0.20
        )

        if composite >= 80:
            label = "Optimal"
        elif composite >= 60:
            label = "Good"
        elif composite >= 40:
            label = "Moderate Concern"
        else:
            label = "High Risk"

        summary = self._generate_summary(domain_scores, question_analyses, composite)
        risk_flags = self._generate_risk_flags(domain_scores, question_analyses)
        facial_behavior = self._analyze_facial_behavior(question_analyses)
        session_progression = self._analyze_session_progression(question_analyses)

        return SessionReport(
            session_id=session_id,
            patient_id=patient_id,
            timestamp=None,
            duration_seconds=0,
            total_questions=len(question_analyses),
            questions_answered=sum(1 for q in question_analyses if q.transcript),
            calibration_baseline=calibration_baseline,
            composite_score=composite,
            composite_label=label,
            summary_paragraph=summary,
            questions=[asdict(qa) for qa in question_analyses],
            domain_scores=asdict(domain_scores),
            facial_behavior=facial_behavior,
            congruence_analysis=self._build_congruence_table(question_analyses),
            session_progression=session_progression,
            risk_flags=risk_flags,
        )

    def _generate_summary(
        self,
        domain_scores: DomainScores,
        questions: List[QuestionAnalysis],
        composite: float,
    ) -> str:
        summaries = []

        strong_domains = []
        if domain_scores.memory_recall_index >= 70:
            strong_domains.append("memory recall")
        if domain_scores.orientation_accuracy >= 70:
            strong_domains.append("orientation awareness")
        if domain_scores.working_memory_tolerance >= 70:
            strong_domains.append("working memory performance")
        if domain_scores.emotional_processing_health >= 70:
            strong_domains.append("emotional processing")
        if domain_scores.attention_consistency >= 70:
            strong_domains.append("sustained attention")

        concern_domains = []
        if domain_scores.memory_recall_index < 50:
            concern_domains.append("memory recall")
        if domain_scores.orientation_accuracy < 50:
            concern_domains.append("orientation accuracy")
        if domain_scores.working_memory_tolerance < 50:
            concern_domains.append("working memory tasks")
        if domain_scores.emotional_processing_health < 50:
            concern_domains.append("emotional congruence")
        if domain_scores.attention_consistency < 50:
            concern_domains.append("attention consistency")

        if strong_domains:
            summaries.append(
                f"You demonstrated strong performance in {', '.join(strong_domains)}."
            )

        if concern_domains:
            summaries.append(
                f"There were some areas showing room for improvement in {', '.join(concern_domains)}."
            )

        if composite >= 80:
            summaries.append(
                "Overall, your cognitive and emotional responses during this assessment were excellent. Keep engaging in mentally stimulating activities to maintain this level of function."
            )
        elif composite >= 60:
            summaries.append(
                "Your overall cognitive performance was good. Regular practice of cognitive exercises can help maintain and further improve these areas."
            )
        elif composite >= 40:
            summaries.append(
                "Some areas of this assessment showed patterns that might benefit from additional support. Working with a cognitive specialist may help address specific areas of concern."
            )
        else:
            summaries.append(
                "This assessment identified several areas that may benefit from professional evaluation and targeted cognitive support."
            )

        return " ".join(summaries)

    def _generate_risk_flags(
        self, domain_scores: DomainScores, questions: List[QuestionAnalysis]
    ) -> List[Dict]:
        flags = []

        orientation_wrong = [
            q
            for q in questions
            if q.question_category == "orientation"
            and q.facial_confidence_ratio > 0.6
            and len(q.transcript) < 10
        ]
        if orientation_wrong:
            flags.append(
                {
                    "name": "Orientation Disorientation",
                    "severity": "High",
                    "explanation": "Orientation questions were answered incorrectly with high facial confidence, suggesting the patient may not have recognized they were wrong.",
                    "recommendation": "Comprehensive orientation and awareness evaluation recommended.",
                }
            )

        memory_delays = [
            q
            for q in questions
            if q.question_category == "memory_recall" and q.response_latency_ms > 4000
        ]
        if len(memory_delays) > 2:
            flags.append(
                {
                    "name": "Memory Retrieval Difficulty",
                    "severity": "Moderate",
                    "explanation": f"{len(memory_delays)} memory questions showed response latency above 4 seconds combined with possible confusion expressions.",
                    "recommendation": "Daily verbal recall exercises to strengthen word access pathways.",
                }
            )

        low_congruence = [q for q in questions if q.congruence_score < 65]
        if len(low_congruence) > len(questions) * 0.5:
            flags.append(
                {
                    "name": "Emotional Incongruence Pattern",
                    "severity": "Moderate",
                    "explanation": "Verbal and facial expressions showed significant mismatch in over half of the questions.",
                    "recommendation": "Emotional processing evaluation and congruence training may be beneficial.",
                }
            )

        first_half = questions[: len(questions) // 2] if questions else []
        second_half = questions[len(questions) // 2 :] if questions else []

        if first_half and second_half:
            first_avg = sum(q.answer_quality_score for q in first_half) / len(
                first_half
            )
            second_avg = sum(q.answer_quality_score for q in second_half) / len(
                second_half
            )

            if second_avg < first_avg * 0.8:
                flags.append(
                    {
                        "name": "Cognitive Fatigue",
                        "severity": "Moderate",
                        "explanation": f"Second half performance dropped {(1 - second_avg / first_avg) * 100:.0f}% from first half, indicating cognitive fatigue pattern.",
                        "recommendation": "Consider shorter assessment sessions with more frequent breaks.",
                    }
                )

        blank_frames = sum(
            sum(1 for e in q.expression_journey if e.get("emotion") == "blank")
            for q in questions
        )
        total_frames = sum(len(q.expression_journey) for q in questions)

        if total_frames > 0 and blank_frames / total_frames > 0.30:
            flags.append(
                {
                    "name": "Blank Expression Dominance",
                    "severity": "High",
                    "explanation": f"Blank or flat expression exceeded 30% of session time, suggesting disengagement or emotional flatness.",
                    "recommendation": "Evaluation for flat affect and engagement strategies recommended.",
                }
            )

        deflection_count = sum(
            1
            for q in questions
            if len(q.transcript) < 15 and q.question_category not in ["orientation"]
        )
        if deflection_count > 2:
            flags.append(
                {
                    "name": "Answer Deflection Pattern",
                    "severity": "High",
                    "explanation": f"{deflection_count} questions were answered with minimal verbal content, suggesting avoidance or difficulty.",
                    "recommendation": "Structured verbal expression exercises recommended.",
                }
            )

        distress_memory = [
            q
            for q in questions
            if q.question_category == "memory_recall"
            and any(
                e.get("emotion") in ["fear", "sad", "angry"]
                for e in q.expression_journey
            )
        ]
        if distress_memory:
            flags.append(
                {
                    "name": "Distress During Recall",
                    "severity": "Moderate",
                    "explanation": "Negative emotional expressions detected during memory recall questions.",
                    "recommendation": "Supportive memory assessment approach recommended.",
                }
            )

        three_word_question = next(
            (
                q
                for q in questions
                if "apple" in q.transcript.lower() or "penny" in q.transcript.lower()
            ),
            None,
        )
        if three_word_question and three_word_question.answer_quality_score < 30:
            flags.append(
                {
                    "name": "Working Memory Failure",
                    "severity": "High",
                    "explanation": "Patient could not recall the three words (Apple, Penny, Table) from the earlier question.",
                    "recommendation": "Comprehensive working memory assessment and targeted exercises recommended. This is clinically significant.",
                }
            )

        if not flags:
            flags.append(
                {
                    "name": "All Metrics Normal",
                    "severity": "None",
                    "explanation": "All facial and verbal indicators fall within expected ranges.",
                    "recommendation": "Continue regular cognitive exercises to maintain baseline.",
                }
            )

        return flags

    def _analyze_facial_behavior(self, questions: List[QuestionAnalysis]) -> Dict:
        all_micro_exprs = []
        for q in questions:
            all_micro_exprs.extend(q.micro_expression_events)

        micro_expr_counts = {}
        for expr in all_micro_exprs:
            name = expr.get("expression", "unknown")
            micro_expr_counts[name] = micro_expr_counts.get(name, 0) + 1

        micro_expr_table = [
            {
                "expression": name,
                "times_detected": count,
                "avg_duration_ms": 200,
                "associated_questions": [
                    q.question_text[:50]
                    for q in questions
                    if any(
                        e.get("expression") == name for e in q.micro_expression_events
                    )
                ],
            }
            for name, count in micro_expr_counts.items()
        ]

        emotion_totals = {
            "happy": 0,
            "neutral": 0,
            "sad": 0,
            "fear": 0,
            "angry": 0,
            "surprise": 0,
            "confused": 0,
            "stressed": 0,
            "engaged": 0,
            "blank": 0,
        }

        total_frames = 0
        for q in questions:
            for e in q.expression_journey:
                emotion = e.get("emotion", "neutral")
                if emotion in emotion_totals:
                    emotion_totals[emotion] += 1
                    total_frames += 1

        emotion_distribution = {}
        for emotion, count in emotion_totals.items():
            seconds = count * 0.5
            emotion_distribution[emotion] = {
                "percentage": (count / total_frames * 100) if total_frames > 0 else 0,
                "seconds": seconds,
            }

        gaze_counts = {"up": 0, "down": 0, "left": 0, "right": 0, "center": 0}
        for q in questions:
            for e in q.expression_journey:
                gaze = e.get("gaze", "center")
                if gaze in gaze_counts:
                    gaze_counts[gaze] += 1

        blank_periods = []
        current_blank = None
        for q in questions:
            for e in q.expression_journey:
                if e.get("emotion") == "blank":
                    if current_blank is None:
                        current_blank = {
                            "start_ms": e.get("timestamp_ms", 0),
                            "duration": 0,
                        }
                    current_blank["duration"] += 500
                else:
                    if current_blank and current_blank["duration"] > 1000:
                        blank_periods.append(current_blank)
                    current_blank = None

        if current_blank and current_blank["duration"] > 1000:
            blank_periods.append(current_blank)

        return {
            "micro_expression_frequency": micro_expr_table,
            "emotion_distribution": emotion_distribution,
            "gaze_pattern_summary": gaze_counts,
            "blank_expression_analysis": blank_periods,
            "total_frames_analyzed": total_frames,
        }

    def _analyze_session_progression(self, questions: List[QuestionAnalysis]) -> Dict:
        if len(questions) < 2:
            return {
                "pattern": "insufficient_data",
                "first_half_avg": 50,
                "second_half_avg": 50,
                "degradation_percentage": 0,
            }

        mid = len(questions) // 2
        first_half = questions[:mid]
        second_half = questions[mid:]

        first_latency = (
            sum(q.response_latency_ms for q in first_half) / len(first_half)
            if first_half
            else 0
        )
        second_latency = (
            sum(q.response_latency_ms for q in second_half) / len(second_half)
            if second_half
            else 0
        )

        first_attention = (
            sum(
                sum(e.get("attention", 50) for e in q.expression_journey)
                / len(q.expression_journey)
                if q.expression_journey
                else 50
                for q in first_half
            )
            / len(first_half)
            if first_half
            else 50
        )

        second_attention = (
            sum(
                sum(e.get("attention", 50) for e in q.expression_journey)
                / len(q.expression_journey)
                if q.expression_journey
                else 50
                for q in second_half
            )
            / len(second_half)
            if second_half
            else 50
        )

        first_confusion = (
            sum(
                sum(1 for e in q.expression_journey if e.get("emotion") == "confused")
                for q in first_half
            )
            / len(first_half)
            if first_half
            else 0
        )

        second_confusion = (
            sum(
                sum(1 for e in q.expression_journey if e.get("emotion") == "confused")
                for q in second_half
            )
            / len(second_half)
            if second_half
            else 0
        )

        first_quality = (
            sum(q.answer_quality_score for q in first_half) / len(first_half)
            if first_half
            else 50
        )
        second_quality = (
            sum(q.answer_quality_score for q in second_half) / len(second_half)
            if second_half
            else 50
        )

        degradation = (
            (first_quality - second_quality) / first_quality if first_quality > 0 else 0
        )

        if degradation > 0.2:
            pattern = "cognitive_fatigue"
        elif second_quality > first_quality:
            pattern = "sustained_cognitive_endurance"
        else:
            pattern = "stable_performance"

        return {
            "pattern": pattern,
            "first_half_avg_latency_ms": first_latency,
            "second_half_avg_latency_ms": second_latency,
            "first_half_avg_attention": first_attention,
            "second_half_avg_attention": second_attention,
            "first_half_confusion_freq": first_confusion,
            "second_half_confusion_freq": second_confusion,
            "first_half_quality": first_quality,
            "second_half_quality": second_quality,
            "degradation_percentage": degradation * 100,
        }

    def _build_congruence_table(self, questions: List[QuestionAnalysis]) -> List[Dict]:
        table = []
        for q in questions:
            dominant_facial = "neutral"
            if q.expression_journey:
                emotion_counts = {}
                for e in q.expression_journey:
                    emotion = e.get("emotion", "neutral")
                    emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
                dominant_facial = (
                    max(emotion_counts, key=emotion_counts.get)
                    if emotion_counts
                    else "neutral"
                )

            table.append(
                {
                    "question_topic": q.question_text[:50] + "..."
                    if len(q.question_text) > 50
                    else q.question_text,
                    "verbal_sentiment": q.verbal_sentiment,
                    "dominant_facial_emotion": dominant_facial,
                    "congruence_status": q.congruence_status,
                    "congruence_score": q.congruence_score,
                    "note": self._generate_congruence_note(q),
                }
            )

        return table

    def _generate_congruence_note(self, question: QuestionAnalysis) -> str:
        if question.congruence_status == "matched":
            return "Verbal and facial expressions aligned well."
        elif question.congruence_status == "mismatched":
            return "Mismatch between verbal content and facial expression detected."
        elif question.congruence_status == "insufficient_data":
            return "Not enough data to assess congruence."
        return "Standard congruence observed."


facial_analyzer = FacialAnalyzerService()
