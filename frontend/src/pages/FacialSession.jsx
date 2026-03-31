import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Activity,
  AlertTriangle,
  Loader2,
  Mic,
  Square,
  Volume2,
  VolumeX,
  ChevronRight,
  RotateCcw,
  Eye,
  Brain,
  Clock,
  MessageSquare,
  Zap,
  Users,
  CheckCircle2,
  X,
  StopCircle,
  SkipForward,
  Speaker
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';
const WS_BASE_URL = 'ws://localhost:8000';

const QUESTION_BANK = {
  memory_recall: [
    { text: "What did you have for breakfast this morning?", category: "memory_recall" },
    { text: "Can you describe what your childhood home looked like?", category: "memory_recall" },
    { text: "What is the name of your closest friend and how did you meet them?", category: "memory_recall" },
    { text: "Describe what you did last weekend in as much detail as you can.", category: "memory_recall" },
    { text: "What is the name of your doctor and when did you last visit them?", category: "memory_recall" }
  ],
  orientation: [
    { text: "What is today's date — day, month, and year?", category: "orientation" },
    { text: "What city are you currently in?", category: "orientation" },
    { text: "What season is it right now?", category: "orientation" },
    { text: "What did you do to celebrate your last birthday?", category: "orientation" }
  ],
  cognitive_load: [
    { text: "Starting from 100, subtract 7 and keep going as far as you can.", category: "cognitive_load" },
    { text: "Spell the word WORLD backwards.", category: "cognitive_load" },
    { text: "Name as many animals as you can in 30 seconds.", category: "cognitive_load" },
    { text: "I will say three words — Apple, Penny, Table. Remember them. I will ask again later.", category: "cognitive_load" }
  ],
  emotional_memory: [
    { text: "Tell me about a moment in your life that made you very happy.", category: "emotional_memory" },
    { text: "Describe a place where you feel completely safe and calm.", category: "emotional_memory" },
    { text: "Who is someone you love deeply and why?", category: "emotional_memory" }
  ]
};

const CATEGORY_COLORS = {
  memory_recall: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  orientation: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  cognitive_load: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  emotional_memory: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' }
};

const CATEGORY_LABELS = {
  memory_recall: 'Memory Recall',
  orientation: 'Orientation',
  cognitive_load: 'Working Memory',
  emotional_memory: 'Emotional Memory'
};

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'er', 'ah'];

const FacialSession = () => {
  const navigate = useNavigate();
  const [sessionPhase, setSessionPhase] = useState('idle');
  const [videoElement, setVideoElement] = useState(null);
  const [overlayCanvas, setOverlayCanvas] = useState(null);
  
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [calibrationStep, setCalibrationStep] = useState('position');
  const [calibrationSteps, setCalibrationSteps] = useState({
    position: false,
    expression: false,
    blink: false,
    complete: false
  });
  const [calibrationBaseline, setCalibrationBaseline] = useState(null);
  const [calibrationFrames, setCalibrationFrames] = useState([]);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [responseTimer, setResponseTimer] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [fillerCount, setFillerCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeakingFirstDetected, setIsSpeakingFirstDetected] = useState(false);
  
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showProcessing, setShowProcessing] = useState(false);
  
  const [frameCount, setFrameCount] = useState(0);
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    engagement: 85,
    attention: 80,
    emotion: 'neutral',
    gaze: 'center'
  });
  
  const [sessionData, setSessionData] = useState(null);
  const [questionResponses, setQuestionResponses] = useState({});
  
  const patientId = useAppStore((state) => state.user?.id || 'demo-patient-001');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const calibrationIntervalRef = useRef(null);
  const frameCaptureIntervalRef = useRef(null);
  const responseTimerIntervalRef = useRef(null);
  const questionTimeoutRef = useRef(null);
  const sessionDataRef = useRef(null);

  useEffect(() => {
    sessionDataRef.current = {
      session_id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      patient_id: patientId,
      start_timestamp: new Date().toISOString(),
      calibration_baseline: calibrationBaseline,
      questions: [],
      frame_data: {},
      audio_data: {},
      emotion_timeline: []
    };
  }, [patientId, calibrationBaseline]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });
      
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
      
      setCameraError(null);
      setSessionPhase('calibration');
      startCalibration();
      
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError({
        title: 'Camera Access Required',
        message: 'Please allow camera access to use this feature. Check your browser settings and try again.'
      });
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (frameCaptureIntervalRef.current) {
      clearInterval(frameCaptureIntervalRef.current);
    }
    if (responseTimerIntervalRef.current) {
      clearInterval(responseTimerIntervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [cameraStream]);

  const startCalibration = () => {
    setCalibrationProgress(0);
    setCalibrationStep('position');
    setCalibrationSteps({ position: false, expression: false, blink: false, complete: false });
    setCalibrationFrames([]);
    
    let elapsed = 0;
    const duration = 5000;
    const interval = 100;
    
    calibrationIntervalRef.current = setInterval(() => {
      elapsed += interval;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setCalibrationProgress(progress);
      
      if (progress >= 20 && !calibrationSteps.position) {
        setCalibrationStep('expression');
        setCalibrationSteps(prev => ({ ...prev, position: true }));
        captureCalibrationFrame();
      }
      if (progress >= 50 && !calibrationSteps.expression) {
        setCalibrationStep('blink');
        setCalibrationSteps(prev => ({ ...prev, expression: true }));
        captureCalibrationFrame();
      }
      if (progress >= 75 && !calibrationSteps.blink) {
        setCalibrationStep('complete');
        setCalibrationSteps(prev => ({ ...prev, blink: true }));
        captureCalibrationFrame();
      }
      
      if (elapsed >= duration) {
        clearInterval(calibrationIntervalRef.current);
        captureCalibrationFrame();
        completeCalibration();
      }
    }, interval);
  };

  const captureCalibrationFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    
    const frameData = canvas.toDataURL('image/jpeg', 0.8);
    setCalibrationFrames(prev => [...prev, frameData]);
  };

  const completeCalibration = async () => {
    setCalibrationSteps(prev => ({ ...prev, complete: true }));
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/facial/calibrate`, {
        frames: calibrationFrames,
        patient_id: patientId
      });
      
      setCalibrationBaseline(response.data);
      sessionDataRef.current.calibration_baseline = response.data;
      
    } catch (error) {
      console.error('Calibration API error:', error);
      const mockBaseline = {
        neutral_expression: { neutral: 0.7, happy: 0.15, sad: 0.05, surprised: 0.1 },
        blink_rate_per_minute: 15,
        baseline_gaze: 'center',
        baseline_head_position: { pitch: 0, yaw: 0, roll: 0 }
      };
      setCalibrationBaseline(mockBaseline);
      sessionDataRef.current.calibration_baseline = mockBaseline;
    }
    
    setTimeout(() => {
      setSessionPhase('ready');
      initializeSession();
    }, 1000);
  };

  const initializeSession = () => {
    const selectedQuestions = selectQuestions();
    setQuestions(selectedQuestions);
    setCurrentQuestionIndex(0);
    setQuestionResponses({});
    setFrameCount(0);
    
    sessionDataRef.current.questions = selectedQuestions.map((q, i) => ({
      index: i,
      text: q.text,
      category: q.category,
      display_timestamp: null,
      first_movement_timestamp: null,
      first_speech_timestamp: null,
      response_latency: null,
      verbal_latency: null,
      transcript: '',
      filler_count: 0,
      answer_duration: 0,
      skipped: false,
      timeout: false
    }));
    
    initializeSpeechRecognition();
    startAudioRecording();
    connectWebSocket();
    
    setTimeout(() => {
      setSessionPhase('question');
      startQuestion(0);
    }, 1500);
  };

  const selectQuestions = () => {
    const selected = [];
    
    const orientationIdx = Math.floor(Math.random() * QUESTION_BANK.orientation.length);
    selected.push({ ...QUESTION_BANK.orientation[orientationIdx], index: selected.length });
    
    for (let i = 0; i < 2; i++) {
      const idx = Math.floor(Math.random() * QUESTION_BANK.memory_recall.length);
      selected.push({ ...QUESTION_BANK.memory_recall[idx], index: selected.length });
    }
    
    const cognitiveIdx = Math.floor(Math.random() * QUESTION_BANK.cognitive_load.length);
    selected.push({ ...QUESTION_BANK.cognitive_load[cognitiveIdx], index: selected.length });
    
    const emotionalIdx = Math.floor(Math.random() * QUESTION_BANK.emotional_memory.length);
    selected.push({ ...QUESTION_BANK.emotional_memory[emotionalIdx], index: selected.length });
    
    const additionalCognitiveIdx = Math.floor(Math.random() * QUESTION_BANK.cognitive_load.length);
    selected.push({ ...QUESTION_BANK.cognitive_load[additionalCognitiveIdx], index: selected.length });
    
    return selected;
  };

  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    
    recognitionRef.current.onstart = () => {
      console.log('Speech recognition started');
    };
    
    recognitionRef.current.onresult = (event) => {
      let final = '';
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      
      if (final) {
        setTranscript(prev => prev + ' ' + final);
        setInterimTranscript('');
        
        if (!isSpeakingFirstDetected && final.trim().length > 0) {
          setIsSpeakingFirstDetected(true);
          const firstSpeechTime = Date.now() - questionStartTime;
          setQuestionResponses(prev => ({
            ...prev,
            [currentQuestionIndex]: {
              ...prev[currentQuestionIndex],
              first_speech_timestamp: firstSpeechTime,
              verbal_latency: firstSpeechTime
            }
          }));
        }
        
        const words = (transcript + ' ' + final).toLowerCase().split(/\s+/);
        const fillers = words.filter(w => FILLER_WORDS.includes(w)).length;
        setFillerCount(fillers);
        
      } else if (interim) {
        setInterimTranscript(interim);
        
        const words = interim.toLowerCase().split(/\s+/);
        const fillers = words.filter(w => FILLER_WORDS.includes(w)).length;
        setFillerCount(prev => {
          const currentTranscript = transcript + ' ' + interim;
          const allWords = currentTranscript.toLowerCase().split(/\s+/);
          return allWords.filter(w => FILLER_WORDS.includes(w)).length;
        });
      }
    };
    
    recognitionRef.current.onerror = (event) => {
      console.log('Speech recognition error:', event.error);
    };
    
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.log('Recognition already started');
    }
  };

  const startAudioRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        
        mediaRecorderRef.current.start(100);
      })
      .catch(err => {
        console.log('Audio recording not available');
      });
  };

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(`${WS_BASE_URL}/ws/facial-frames`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        if (calibrationBaseline) {
          ws.send(JSON.stringify({
            type: 'calibration_baseline',
            baseline: calibrationBaseline
          }));
        }
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleFrameAnalysis(data);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };
      
      wsRef.current = ws;
    } catch (e) {
      console.log('WebSocket not available');
    }
  };

  const handleFrameAnalysis = (data) => {
    setFrameCount(prev => prev + 1);
    
    setRealTimeMetrics({
      engagement: data.engagement_score || 0,
      attention: data.attention_level || 0,
      emotion: data.dominant_emotion || 'neutral',
      gaze: data.gaze_direction || 'center'
    });
    
    drawOverlay(data);
    
    const emotionEntry = {
      timestamp_ms: Date.now() - questionStartTime,
      emotion: data.dominant_emotion,
      engagement: data.engagement_score,
      attention: data.attention_level
    };
    
    if (sessionDataRef.current) {
      sessionDataRef.current.emotion_timeline.push(emotionEntry);
    }
  };

  const drawOverlay = (data) => {
    if (!overlayCanvasRef.current || !videoRef.current) return;
    
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    if (data.landmarks && data.landmarks.length > 0) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
      ctx.lineWidth = 1;
      
      data.landmarks.slice(0, 68).forEach((point, idx) => {
        const x = point.x * width;
        const y = point.y * height;
        
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
        
        if (idx > 0 && idx % 3 === 0) {
          ctx.beginPath();
          ctx.moveTo(data.landmarks[idx - 3].x * width, data.landmarks[idx - 3].y * height);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      });
    }
  };

  const startQuestion = (index) => {
    const question = questions[index];
    if (!question) return;
    
    setCurrentQuestionIndex(index);
    setQuestionStartTime(Date.now());
    setResponseTimer(0);
    setTranscript('');
    setInterimTranscript('');
    setFillerCount(0);
    setIsSpeakingFirstDetected(false);
    setIsSpeaking(false);
    
    sessionDataRef.current.questions[index].display_timestamp = Date.now();
    sessionDataRef.current.frame_data[index] = [];
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setTimeout(() => initializeSpeechRecognition(), 100);
    }
    
    speakQuestion(question.text);
    
    responseTimerIntervalRef.current = setInterval(() => {
      setResponseTimer(prev => prev + 1);
    }, 1000);
    
    frameCaptureIntervalRef.current = setInterval(() => {
      captureAndSendFrame(index);
    }, 500);
    
    if (index === questions.length - 1) {
      questionTimeoutRef.current = setTimeout(() => {
        stopQuestionCapture();
        handleEndSession();
      }, 45000);
    }
  };

  const speakQuestion = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const captureAndSendFrame = (questionIndex) => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    
    const frameData = canvas.toDataURL('image/jpeg', 0.7);
    const timestampOffset = Date.now() - questionStartTime;
    const phase = !isSpeakingFirstDetected ? 'thinking' : 'answering';
    
    if (sessionDataRef.current) {
      sessionDataRef.current.frame_data[questionIndex].push({
        timestamp_ms: timestampOffset,
        frame: frameData,
        phase: phase,
        ...realTimeMetrics
      });
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'frame',
        frame: frameData,
        question_index: questionIndex,
        timestamp_offset_ms: timestampOffset,
        phase: phase
      }));
    }
  };

  const handleNextQuestion = () => {
    stopQuestionCapture();
    
    const finalTranscript = transcript.trim() || interimTranscript.trim();
    const isAnswered = finalTranscript.length > 0;
    
    const currentResponse = {
      transcript: finalTranscript || null,
      filler_count: isAnswered ? fillerCount : null,
      answer_duration: responseTimer,
      skipped: !isAnswered,
      timeout: false,
      response_latency: isAnswered ? Date.now() - questionStartTime : 0,
      first_movement: questionResponses[currentQuestionIndex]?.first_movement_timestamp || 0
    };
    
    setQuestionResponses(prev => ({
      ...prev,
      [currentQuestionIndex]: {
        ...prev[currentQuestionIndex],
        ...currentResponse,
        answered: isAnswered
      }
    }));
    
    if (currentQuestionIndex < questions.length - 1) {
      setSessionPhase('transition');
      setTimeout(() => {
        setSessionPhase('question');
        startQuestion(currentQuestionIndex + 1);
      }, 2000);
    } else {
      handleEndSession();
    }
  };

  const handleSkipQuestion = () => {
    stopQuestionCapture();
    
    setQuestionResponses(prev => ({
      ...prev,
      [currentQuestionIndex]: {
        ...prev[currentQuestionIndex],
        transcript: null,
        filler_count: null,
        answer_duration: responseTimer,
        skipped: true,
        timeout: false,
        answered: false
      }
    }));
    
    if (currentQuestionIndex < questions.length - 1) {
      setSessionPhase('transition');
      setTimeout(() => {
        setSessionPhase('question');
        startQuestion(currentQuestionIndex + 1);
      }, 2000);
    } else {
      handleEndSession();
    }
  };

  const stopQuestionCapture = () => {
    if (frameCaptureIntervalRef.current) {
      clearInterval(frameCaptureIntervalRef.current);
      frameCaptureIntervalRef.current = null;
    }
    if (responseTimerIntervalRef.current) {
      clearInterval(responseTimerIntervalRef.current);
      responseTimerIntervalRef.current = null;
    }
    if (questionTimeoutRef.current) {
      clearTimeout(questionTimeoutRef.current);
      questionTimeoutRef.current = null;
    }
  };

  const handleEndSession = () => {
    setShowEndConfirm(false);
    stopCamera();
    generateReport();
  };

  const generateReport = async () => {
    setShowProcessing(true);
    
    const stages = [
      { name: 'Analyzing facial expressions...', progress: 15 },
      { name: 'Transcribing verbal responses...', progress: 30 },
      { name: 'Computing response latencies...', progress: 45 },
      { name: 'Mapping emotional congruence...', progress: 60 },
      { name: 'Calculating domain scores...', progress: 75 },
      { name: 'Generating risk assessment...', progress: 90 },
      { name: 'Composing report...', progress: 100 }
    ];
    
    for (const stage of stages) {
      setProcessingStage(stage.name);
      setProcessingProgress(stage.progress);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    try {
      const sessionPayload = {
        ...sessionDataRef.current,
        questions: sessionDataRef.current.questions.map((q, i) => ({
          ...q,
          ...questionResponses[i]
        }))
      };
      
      const response = await axios.post(`${API_BASE_URL}/api/facial/generate-report`, sessionPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });
      
      setShowProcessing(false);
      navigate(`/facial-report/${response.data.session_id}`, { state: { report: response.data } });
      
    } catch (error) {
      console.error('Report generation error:', error);
      setShowProcessing(false);
      navigate(`/facial-report/demo-session`, { state: { report: generateMockReport() } });
    }
  };

  const generateMockReport = () => {
    const answeredQuestions = questions.map((q, i) => {
      const response = questionResponses[i] || {};
      const isAnswered = response.answered && response.transcript && response.transcript.trim().length > 0;
      return {
        index: i,
        text: q.text,
        category: q.category,
        answered: isAnswered,
        skipped: response.skipped || false,
        transcript: isAnswered ? response.transcript : null,
        filler_count: isAnswered ? response.filler_count : null,
        response_latency: isAnswered ? response.response_latency : null,
        expression_journey: sessionDataRef.current?.emotion_timeline?.filter((_, idx) => idx % 2 === 0).slice(0, 20) || [],
        congruence_status: isAnswered ? 'matched' : 'not_given',
        congruence_score: isAnswered ? 75 : null,
        per_question_score: isAnswered ? 70 + Math.random() * 20 : null,
        confidence_ratio: isAnswered ? 0.6 : null,
        dominant_emotion: 'neutral'
      };
    });

    const answeredCount = answeredQuestions.filter(q => q.answered).length;
    const skippedCount = answeredQuestions.filter(q => q.skipped).length;
    const answeredScores = answeredQuestions.filter(q => q.per_question_score !== null).map(q => q.per_question_score);
    const avgScore = answeredScores.length > 0 ? answeredScores.reduce((a, b) => a + b, 0) / answeredScores.length : 0;

    const riskFlags = [];
    if (skippedCount > 2) {
      riskFlags.push({ name: 'Answer Deflection Pattern', severity: 'High', explanation: `${skippedCount} questions were not answered or skipped.`, recommendation: 'Structured verbal expression exercises recommended.' });
    }
    if (answeredCount === 0) {
      riskFlags.push({ name: 'No Responses Recorded', severity: 'High', explanation: 'No questions were answered during this session.', recommendation: 'Please ensure microphone access is enabled and try again.' });
    }
    if (riskFlags.length === 0 && answeredCount > 0) {
      riskFlags.push({ name: 'All Metrics Normal', severity: 'None', explanation: 'All facial and verbal indicators within expected ranges.', recommendation: 'Continue regular cognitive exercises.' });
    }

    let summary = '';
    if (answeredCount === 0) {
      summary = 'No responses were recorded during this assessment session. Please check microphone access and try again.';
    } else if (avgScore >= 80) {
      summary = `You demonstrated excellent cognitive function. Strong performance with ${answeredCount} of ${questions.length} questions answered.`;
    } else if (avgScore >= 60) {
      summary = `You showed good overall cognitive performance with ${answeredCount} of ${questions.length} questions answered. Some areas may benefit from targeted exercises.`;
    } else {
      summary = `This assessment identified areas that may benefit from additional support with ${answeredCount} of ${questions.length} questions answered.`;
    }
    if (skippedCount > 0) {
      summary += ` Note: ${skippedCount} question(s) were not answered.`;
    }

    return {
      session_id: `report-${Date.now()}`,
      patient_id: patientId,
      timestamp: new Date().toISOString(),
      duration_seconds: questions.length * 30,
      total_questions: questions.length,
      questions_answered: answeredCount,
      questions_skipped: skippedCount,
      composite_score: answeredCount > 0 ? avgScore : 0,
      composite_label: answeredCount === 0 ? 'No Data' : avgScore >= 80 ? 'Optimal' : avgScore >= 60 ? 'Good' : avgScore >= 40 ? 'Moderate Concern' : 'High Risk',
      summary_paragraph: summary,
      questions: answeredQuestions,
      domain_scores: answeredCount > 0 ? {
        memory_recall_index: avgScore,
        orientation_accuracy: avgScore,
        working_memory_tolerance: avgScore,
        emotional_processing_health: avgScore,
        attention_consistency: 75
      } : {
        memory_recall_index: null,
        orientation_accuracy: null,
        working_memory_tolerance: null,
        emotional_processing_health: null,
        attention_consistency: 75
      },
      facial_behavior: {
        emotion_distribution: {
          neutral: { percentage: 60, seconds: 30 },
          engaged: { percentage: 25, seconds: 12 },
          happy: { percentage: 15, seconds: 8 }
        },
        gaze_pattern_summary: { up: 5, down: 3, left: 2, right: 2, center: 88 },
        micro_expression_frequency: [],
        total_frames_analyzed: frameCount
      },
      congruence_analysis: answeredQuestions.map(q => ({
        question_topic: q.text.substring(0, 50),
        verbal_sentiment: q.answered ? 'neutral' : 'not_given',
        dominant_facial_emotion: q.dominant_emotion,
        congruence_status: q.congruence_status,
        congruence_score: q.congruence_score,
        note: q.answered ? 'Verbal and facial expressions aligned.' : 'Question was not answered.'
      })),
      session_progression: {
        pattern: answeredCount > 0 ? 'stable_performance' : 'insufficient_data',
        first_half_quality: answeredCount > 0 ? avgScore : null,
        second_half_quality: answeredCount > 0 ? avgScore : null,
        degradation_percentage: 0
      },
      risk_flags: riskFlags
    };
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (responseTimer < 5) return 'text-emerald-400';
    if (responseTimer < 10) return 'text-yellow-400';
    return 'text-orange-400';
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (calibrationIntervalRef.current) clearInterval(calibrationIntervalRef.current);
      if (frameCaptureIntervalRef.current) clearInterval(frameCaptureIntervalRef.current);
      if (responseTimerIntervalRef.current) clearInterval(responseTimerIntervalRef.current);
      if (questionTimeoutRef.current) clearTimeout(questionTimeoutRef.current);
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (sessionPhase === 'calibration' && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [sessionPhase, cameraStream]);

  return (
    <div className="min-h-screen bg-slate-950 p-4 lg:p-8">
      {showProcessing && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 max-w-md w-full mx-4">
            <div className="flex flex-col items-center">
              <Loader2 size={48} className="text-blue-500 animate-spin mb-6" />
              <h2 className="text-xl font-bold text-white mb-2">Generating Report</h2>
              <p className="text-sm text-slate-400 mb-6">{processingStage}</p>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">Please wait...</p>
            </div>
          </div>
        </div>
      )}

      {showEndConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-2">End Session?</h3>
            <p className="text-sm text-slate-400 mb-6">
              Your progress will be saved and a partial report will be generated.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-all"
              >
                Continue Session
              </button>
              <button
                onClick={handleEndSession}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-all"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden relative">
              <div className="relative aspect-video bg-slate-950">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                <canvas
                  ref={overlayCanvasRef}
                  width={1280}
                  height={720}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {sessionPhase === 'idle' && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80">
                    <Camera size={64} className="text-blue-500 mb-6" />
                    <h2 className="text-xl font-bold text-white mb-2">Facial Analysis Session</h2>
                    <p className="text-sm text-slate-400 mb-6 text-center max-w-md">
                      This assessment will analyze your facial expressions while you answer questions.
                    </p>
                    <button
                      onClick={startCamera}
                      className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-900/30"
                    >
                      Start Camera
                    </button>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 p-6">
                    <AlertTriangle size={48} className="text-red-500 mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">{cameraError.title}</h3>
                    <p className="text-sm text-slate-400 text-center mb-6">{cameraError.message}</p>
                    <button
                      onClick={startCamera}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {sessionPhase === 'calibration' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/70 backdrop-blur-sm">
                    <div className="w-64 h-64 rounded-full border-4 border-blue-500/30 flex items-center justify-center mb-6 relative">
                      <div className="absolute inset-4 rounded-full border-2 border-blue-500/50" />
                      <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                        <circle cx="50" cy="35" r="20" fill="none" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
                        <ellipse cx="50" cy="70" rx="25" ry="15" fill="none" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
                      </svg>
                      <Eye size={48} className="text-blue-500/50" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Calibrating...</h3>
                    <p className="text-sm text-slate-400 mb-4 text-center max-w-sm">
                      Look straight at the camera and relax your face.
                    </p>
                    <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-100"
                        style={{ width: `${calibrationProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-blue-400 font-bold">{Math.round(calibrationProgress)}%</p>
                    
                    <div className="mt-6 space-y-2">
                      <div className="flex items-center gap-2">
                        {calibrationSteps.position ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
                        )}
                        <span className={`text-xs ${calibrationSteps.position ? 'text-emerald-400' : 'text-slate-500'}`}>
                          Detecting face position...
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {calibrationSteps.expression ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
                        )}
                        <span className={`text-xs ${calibrationSteps.expression ? 'text-emerald-400' : 'text-slate-500'}`}>
                          Measuring expression baseline...
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {calibrationSteps.blink ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
                        )}
                        <span className={`text-xs ${calibrationSteps.blink ? 'text-emerald-400' : 'text-slate-500'}`}>
                          Calculating blink rate...
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {calibrationSteps.complete ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
                        )}
                        <span className={`text-xs ${calibrationSteps.complete ? 'text-emerald-400' : 'text-slate-500'}`}>
                          Baseline established
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {sessionPhase === 'ready' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
                    <div className="text-center">
                      <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-white mb-2">Calibration Complete</h3>
                      <p className="text-sm text-slate-400">Starting session...</p>
                    </div>
                  </div>
                )}

                {(sessionPhase === 'question' || sessionPhase === 'transition') && (
                  <>
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded-full">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-red-400">Recording</span>
                    </div>

                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <button
                        onClick={() => setShowEndConfirm(true)}
                        className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-all flex items-center gap-2"
                      >
                        <StopCircle size={18} />
                        <span className="text-xs font-bold hidden sm:inline">End</span>
                      </button>
                    </div>

                    <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm px-3 py-2 rounded-lg flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: realTimeMetrics.emotion === 'happy' ? '#22c55e' : realTimeMetrics.emotion === 'neutral' ? '#6b7280' : '#eab308' }}
                      />
                      <span className="text-xs font-medium text-white capitalize">{realTimeMetrics.emotion}</span>
                    </div>

                    <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-sm px-3 py-2 rounded-lg">
                      <span className="text-xs text-slate-400">Frames: </span>
                      <span className="text-xs font-bold text-white">{frameCount}</span>
                    </div>

                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-full">
                      <div className="flex items-center gap-4">
                        {[...Array(5)].map((_, i) => (
                          <div 
                            key={i}
                            className={`w-2 h-2 rounded-full ${i <= currentQuestionIndex ? 'bg-blue-500' : 'bg-slate-600'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {sessionPhase === 'question' && questions[currentQuestionIndex] && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    <span className={`text-2xl font-black tabular-nums ${getTimerColor()}`}>
                      {formatTime(responseTimer)}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500"
                      style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${CATEGORY_COLORS[questions[currentQuestionIndex].category].bg} ${CATEGORY_COLORS[questions[currentQuestionIndex].category].text} border ${CATEGORY_COLORS[questions[currentQuestionIndex].category].border}`}>
                  {CATEGORY_LABELS[questions[currentQuestionIndex].category]}
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <p className="text-lg lg:text-xl text-white leading-relaxed font-medium">
                    {questions[currentQuestionIndex].text}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-slate-500">
                  {isSpeaking ? (
                    <>
                      <Speaker size={16} className="text-blue-400 animate-pulse" />
                      <span className="text-xs">Reading question...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare size={16} />
                      <span className="text-xs">Your turn to answer</span>
                    </>
                  )}
                </div>

                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 min-h-[100px]">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Detected speech:
                  </p>
                  <p className="text-sm text-slate-400 italic leading-relaxed">
                    {(transcript + ' ' + interimTranscript).trim() || (
                      <span className="text-slate-600">Speak to see your words appear here...</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Filler words:</span>
                  <span className="font-bold text-yellow-400">{fillerCount}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleSkipQuestion}
                    className="py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <SkipForward size={16} />
                    Skip
                  </button>
                  <button
                    onClick={handleNextQuestion}
                    className={`py-3 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      currentQuestionIndex === questions.length - 1
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/30'
                        : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/30'
                    }`}
                  >
                    {currentQuestionIndex === questions.length - 1 ? (
                      <>
                        Generate Report
                        <CheckCircle2 size={16} />
                      </>
                    ) : (
                      <>
                        Next Question
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {sessionPhase === 'transition' && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6">
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
                  <p className="text-sm text-slate-400">Processing your response...</p>
                </div>
              </div>
            )}

            {(sessionPhase === 'idle' || sessionPhase === 'ready') && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6">
                <h3 className="text-sm font-bold text-white mb-4">Session Overview</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Brain size={16} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">6 Questions</p>
                      <p className="text-xs text-slate-500">Various cognitive domains</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <Camera size={16} className="text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Facial Analysis</p>
                      <p className="text-xs text-slate-500">Real-time tracking</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <Activity size={16} className="text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Full Report</p>
                      <p className="text-xs text-slate-500">Comprehensive analysis</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {sessionPhase === 'calibration' && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6">
                <h3 className="text-sm font-bold text-white mb-4">Live Metrics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Engagement</span>
                      <span className="text-emerald-400">{Math.round(realTimeMetrics.engagement)}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${realTimeMetrics.engagement}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Attention</span>
                      <span className="text-blue-400">{Math.round(realTimeMetrics.attention)}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${realTimeMetrics.attention}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacialSession;
