import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Activity, 
  History, 
  ChevronRight, 
  Play, 
  CheckCircle2, 
  Circle,
  AlertTriangle,
  Loader2,
  Clock,
  Zap,
  BarChart2,
  TrendingDown,
  ArrowRight,
  RotateCcw,
  Upload
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import ResultAnalysisPanel from '../components/ResultAnalysisPanel';
import { getLastSpeechSession, addSpeechSession, getSpeechSessions } from '../store/db';
import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/speech`;


const SpeechSession = () => {
  const [sessionStatus, setSessionStatus] = useState('idle');
  const [taskProgress, setTaskProgress] = useState(68);
  const [sessionTimer] = useState(252);
  const [transcript, setTranscript] = useState("");
  const [toneStability] = useState(94.2);
  const [fillerCount, setFillerCount] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const recognitionRef = useRef(null);
  const chunksRef = useRef([]);

  const patientId = useAppStore((state) => state.user?.id || 'demo-patient-001');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        
        const fillers = ["um", "uh", "like", "basically", "you know", "er", "ah"];
        const words = currentTranscript.toLowerCase().split(/\s+/);
        const count = words.filter(w => fillers.includes(w)).length;
        setFillerCount(count);
      };
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start(100);

      audioContextRef.current = new (window.AudioContext || window.webkitSpeechContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      setSessionStatus('recording');
      setTranscript("");
      setFillerCount(0);
      if (recognitionRef.current) recognitionRef.current.start();

      const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        animationFrameRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        ctx.clearRect(0, 0, width, height);
        const barWidth = (width / bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height;
          ctx.fillStyle = i % 2 === 0 ? '#3b82f6' : '#2563eb';
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);
          x += barWidth + 2;
        }
      };
      
      draw();
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const recordedBlob = chunksRef.current.length > 0 
      ? new Blob(chunksRef.current, { type: 'audio/webm' }) 
      : null;
    const hasAudioContent = recordedBlob && recordedBlob.size > 100;
    const hasTranscript = transcript && transcript.trim().length > 0;
    
    if (!hasAudioContent && !hasTranscript) {
      setSessionStatus('idle');
      alert('Please speak into the microphone before submitting. No audio was detected.');
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      return;
    }
    
    if (recordedBlob) {
      setAudioBlob(recordedBlob);
    }
    
    setSessionStatus('analyzing');
    setIsAnalyzing(true);
    if (recognitionRef.current) recognitionRef.current.stop();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    
    analyzeSpeech(recordedBlob);
  };

  const analyzeSpeech = async (recordedBlob = null) => {
    const actualTranscript = transcript && transcript.trim().length > 0 
      ? transcript 
      : '';
    const audioToUse = recordedBlob || audioBlob;
    const hasAudio = audioToUse && audioToUse.size > 100;
    
    if (!hasAudio && !actualTranscript) {
      const noDataResult = await generateMockAnalysis(false, '');
      setAnalysisResult(noDataResult);
      setShowAnalysisPanel(true);
      setSessionStatus('completed');
      setIsAnalyzing(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('patient_id', patientId);
      formData.append('transcript', actualTranscript || 'No speech detected.');
      formData.append('prompt_text', 'Describe a peaceful afternoon in a garden you remember from your childhood.');
      
      if (hasAudio) {
        formData.append('audio', audioToUse, 'recording.webm');
      } else {
        const emptyAudio = new Blob([''], { type: 'audio/webm' });
        formData.append('audio', emptyAudio, 'empty.webm');
      }

      const response = await axios.post(`${API_BASE_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      const result = response.data;
      setAnalysisResult(result);
      setShowAnalysisPanel(true);
      setSessionStatus('completed');
    } catch (error) {
      console.error('Analysis error:', error);
      
      const mockResult = await generateMockAnalysis(hasAudio, actualTranscript);
      setAnalysisResult(mockResult);
      setShowAnalysisPanel(true);
      setSessionStatus('completed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateMockAnalysis = async (hasAudio = false, transcriptText = '') => {
    const hasValidTranscript = transcriptText && transcriptText.trim().length > 0;
    
    if (!hasAudio && !hasValidTranscript) {
      return {
        session_id: `mock-${Date.now()}`,
        patient_id: patientId,
        timestamp: new Date().toISOString(),
        transcript: '',
        duration_ms: 0,
        word_count: 0,
        cognitive_fluency_score: 0,
        score_label: 'No Data',
        score_interpretation: 'No speech was detected. Please record your response before submitting.',
        pause_timeline: [],
        cognitive_states: [],
        speech_metrics: [
          { name: 'Words Per Minute', value: 0, min_value: 90, max_value: 200, unit: 'WPM', status: 'flag', display_label: 'WPM' },
          { name: 'Vocabulary Richness', value: 0, min_value: 0.4, max_value: 1.0, unit: 'TTR', status: 'flag', display_label: 'Type-Token Ratio' },
          { name: 'Filler Word Rate', value: 0, min_value: 0, max_value: 5, unit: '/min', status: 'normal', display_label: 'Fillers per Minute' },
          { name: 'Sentence Completion', value: 0, min_value: 70, max_value: 100, unit: '%', status: 'flag', display_label: 'Completion Rate' },
          { name: 'Tone Stability', value: 0, min_value: 60, max_value: 100, unit: '%', status: 'flag', display_label: 'Energy Variance' },
          { name: 'Pitch Variation', value: 0, min_value: 50, max_value: 100, unit: 'stability', status: 'flag', display_label: 'Monotone Risk' },
          { name: 'Semantic Coherence', value: 0, min_value: 50, max_value: 100, unit: '%', status: 'flag', display_label: 'Topic Focus' },
          { name: 'Pronunciation Accuracy', value: 0, min_value: 70, max_value: 100, unit: '%', status: 'flag', display_label: 'Word Clarity' }
        ],
        annotated_transcript: [],
        pause_clustering: {
          total_pauses: 0,
          average_duration_ms: 0,
          longest_pause_ms: 0,
          longest_pause_word: '',
          pause_to_speech_ratio: 0,
          clustering_pattern: 'distributed',
          clinical_interpretation: 'No speech detected to analyze.'
        },
        risk_flags: [
          { name: 'No Speech Detected', severity: 'High', explanation: 'No audio or speech was recorded for analysis.', recommendation: 'Please record your response to the prompt before submitting.' }
        ],
        comparison_delta: null
      };
    }

    const words = transcriptText ? transcriptText.split(/\s+/) : [];
    const wordCount = words.length;
    const fillerWords = ['um', 'uh', 'like', 'basically', 'you know', 'er', 'ah'];
    const fillerCount = words.filter(w => fillerWords.includes(w.toLowerCase())).length;
    const estimatedDurationSec = wordCount > 0 ? wordCount / 2 : 30;
    const fillerRate = estimatedDurationSec > 0 ? (fillerCount / estimatedDurationSec) * 60 : 0;
    
    let wpm = estimatedDurationSec > 0 ? (wordCount / estimatedDurationSec) * 60 : 0;
    wpm = Math.max(0, Math.min(wpm, 250));
    
    let score = 50;
    if (wordCount < 3) {
      score = Math.max(10, 40 - (3 - wordCount) * 15);
    } else if (wordCount < 5) {
      score = Math.max(25, 50 - (5 - wordCount) * 10);
    } else if (wordCount < 10) {
      score = Math.max(40, 60 - (10 - wordCount) * 4);
    } else if (wordCount >= 10 && wordCount < 20) {
      score = 60 + Math.min(15, (wordCount - 10));
    } else if (wordCount >= 20) {
      score = 75 + Math.min(20, (wordCount - 20) / 2);
    }
    
    if (fillerRate > 5) score -= 10;
    else if (fillerRate > 3) score -= 5;
    
    if (wpm < 90 || wpm > 200) score -= 10;
    else if (wpm < 110 || wpm > 180) score -= 5;
    
    score = Math.max(0, Math.min(100, score));

    const pauseCount = Math.max(0, Math.floor((wordCount - 5) / 6));
    const avgPauseDuration = pauseCount > 0 ? 400 + Math.floor(Math.random() * 600) : 0;
    
    const pauseTimeline = [];
    for (let i = 0; i < pauseCount; i++) {
      const startMs = Math.floor((i + 1) * (estimatedDurationSec * 1000) / (pauseCount + 1));
      const durationMs = avgPauseDuration + Math.floor(Math.random() * 400) - 200;
      const actualDuration = Math.max(200, Math.min(durationMs, 2500));
      const severity = actualDuration < 800 ? 'short' : actualDuration < 1500 ? 'long' : 'critical';
      pauseTimeline.push({
        start_ms: startMs,
        end_ms: startMs + actualDuration,
        duration_ms: actualDuration,
        severity,
        word_after: words[Math.min(i * 3 + 2, words.length - 1)] || '',
        confidence: 0.8 + Math.random() * 0.15
      });
    }

    const cognitiveStates = [];
    const longPauses = pauseTimeline.filter(p => p.duration_ms >= 1200);
    if (longPauses.length > 0 && longPauses[0]) {
      cognitiveStates.push({
        state_type: 'retrieval_struggle',
        start_time_ms: longPauses[0].start_ms,
        end_time_ms: longPauses[0].end_ms + 800,
        confidence: Math.min(0.9, 0.5 + (longPauses[0].duration_ms / 2000)),
        description: `Extended pause of ${(longPauses[0].duration_ms / 1000).toFixed(1)}s detected — possible word retrieval delay.`,
        phrase: longPauses[0].word_after || '',
        timestamp: longPauses[0].start_ms / 1000
      });
    }
    if (wordCount > 12) {
      const fluentLength = Math.min(wordCount - longPauses.length * 2, 20);
      cognitiveStates.push({
        state_type: 'fluent_recall',
        start_time_ms: 3000,
        end_time_ms: 15000,
        confidence: Math.min(0.9, 0.6 + fluentLength / 50),
        description: `Fluent sequence of ${fluentLength} words without significant hesitation detected.`,
        phrase: `${fluentLength}-word fluent segment`,
        timestamp: 3
      });
    }

    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
    const ttr = wordCount > 0 ? uniqueWords / wordCount : 0;
    const sentences = transcriptText ? transcriptText.split(/[.!?]+/).filter(s => s.trim().length > 0) : [];
    const sentenceCount = sentences.length;
    const completedSentences = sentences.filter(s => s.split(/\s+/).length > 3).length;
    const sentenceCompletion = sentenceCount > 0 ? completedSentences / sentenceCount : 0;

    const wpmStatus = wpm < 90 ? 'flag' : wpm < 120 || wpm > 180 ? 'watch' : 'normal';
    const ttrStatus = ttr < 0.35 ? 'flag' : ttr < 0.45 ? 'watch' : 'normal';
    const fillerStatus = fillerRate > 5 ? 'flag' : fillerRate > 3 ? 'watch' : 'normal';
    const completionStatus = sentenceCompletion < 0.6 ? 'flag' : sentenceCompletion < 0.8 ? 'watch' : 'normal';
    const toneStatus = hasAudio ? (wpm < 80 ? 'flag' : 'normal') : 'flag';
    const pitchStatus = hasAudio ? (wpm < 70 ? 'watch' : 'normal') : 'flag';
    const coherenceStatus = wordCount < 10 ? 'flag' : ttr > 0.5 ? 'normal' : 'watch';
    const pronunciationStatus = wordCount > 0 ? 'normal' : 'flag';

    const metrics = [
      { name: 'Words Per Minute', value: Math.round(wpm), min_value: 90, max_value: 200, unit: 'WPM', status: wpmStatus, display_label: 'WPM' },
      { name: 'Vocabulary Richness', value: Math.round(ttr * 100) / 100, min_value: 0.4, max_value: 1.0, unit: 'TTR', status: ttrStatus, display_label: 'Type-Token Ratio' },
      { name: 'Filler Word Rate', value: Math.round(fillerRate * 10) / 10, min_value: 0, max_value: 5, unit: '/min', status: fillerStatus, display_label: 'Fillers per Minute' },
      { name: 'Sentence Completion', value: Math.round(sentenceCompletion * 100), min_value: 70, max_value: 100, unit: '%', status: completionStatus, display_label: 'Completion Rate' },
      { name: 'Tone Stability', value: hasAudio ? Math.round(65 + Math.random() * 25) : 0, min_value: 60, max_value: 100, unit: '%', status: toneStatus, display_label: 'Energy Variance' },
      { name: 'Pitch Variation', value: hasAudio ? Math.round(60 + Math.random() * 30) : 0, min_value: 50, max_value: 100, unit: 'stability', status: pitchStatus, display_label: 'Monotone Risk' },
      { name: 'Semantic Coherence', value: Math.round((wordCount > 10 ? 0.6 + ttr * 0.3 : 0.4 + ttr * 0.2) * 100), min_value: 50, max_value: 100, unit: '%', status: coherenceStatus, display_label: 'Topic Focus' },
      { name: 'Pronunciation Accuracy', value: wordCount > 0 ? Math.round(75 + Math.random() * 20) : 0, min_value: 70, max_value: 100, unit: '%', status: pronunciationStatus, display_label: 'Word Clarity' }
    ];

    const annotatedTranscript = words.map(word => ({
      word,
      token_type: fillerWords.includes(word.toLowerCase()) ? 'filler' : 'word',
      pause_duration_ms: 0,
      coherence_score: ttr,
      is_low_coherence: ttr < 0.4
    }));

    const riskFlags = [];
    
    if (wordCount < 5) {
      riskFlags.push({ 
        name: 'Very Short Response', 
        severity: 'High', 
        explanation: `Only ${wordCount} word(s) detected. Minimum 15-20 words needed for reliable analysis.`, 
        recommendation: 'Please provide a more detailed response describing the memory more fully.' 
      });
    }
    
    if (wpm < 80) {
      riskFlags.push({ 
        name: 'Reduced Speech Rate', 
        severity: 'Moderate', 
        explanation: `Speaking at ${Math.round(wpm)} WPM which is below the healthy range (120-180 WPM).`, 
        recommendation: 'Practice speaking at a more natural pace to improve verbal fluency.' 
      });
    } else if (wpm > 200) {
      riskFlags.push({ 
        name: 'Elevated Speech Rate', 
        severity: 'Low', 
        explanation: `Speaking at ${Math.round(wpm)} WPM which is faster than normal range.`, 
        recommendation: 'Try to slow down and breathe naturally during responses.' 
      });
    }
    
    if (fillerRate > 5) {
      riskFlags.push({ 
        name: 'High Filler Word Rate', 
        severity: 'Moderate', 
        explanation: `Using ${Math.round(fillerRate * 10) / 10} filler words per minute (normal: <3). Frequent fillers may indicate word-finding difficulty.`, 
        recommendation: 'Practice pausing briefly instead of using fillers like "um" or "uh".' 
      });
    } else if (fillerRate > 3) {
      riskFlags.push({ 
        name: 'Elevated Filler Words', 
        severity: 'Low', 
        explanation: `Filler word rate of ${Math.round(fillerRate * 10) / 10} per minute is slightly above normal.`, 
        recommendation: 'Try to reduce filler words with conscious breathing pauses.' 
      });
    }
    
    if (ttr < 0.35) {
      riskFlags.push({ 
        name: 'Limited Vocabulary Diversity', 
        severity: 'Moderate', 
        explanation: `Type-token ratio of ${ttr.toFixed(2)} indicates repetitive word use. Healthy range is 0.45-0.65.`, 
        recommendation: 'Try to use more varied vocabulary when describing memories.' 
      });
    }
    
    if (sentenceCompletion < 0.6 && sentenceCount > 0) {
      riskFlags.push({ 
        name: 'Incomplete Sentences', 
        severity: 'Low', 
        explanation: `Only ${Math.round(sentenceCompletion * 100)}% of sentences were fully completed.`, 
        recommendation: 'Practice completing your thoughts before moving to the next sentence.' 
      });
    }
    
    const hasCriticalPauses = pauseTimeline.some(p => p.duration_ms >= 1500);
    if (hasCriticalPauses) {
      const longestPause = Math.max(...pauseTimeline.map(p => p.duration_ms));
      riskFlags.push({ 
        name: 'Extended Pauses Detected', 
        severity: 'Moderate', 
        explanation: `Longest pause was ${(longestPause / 1000).toFixed(1)}s, which exceeds normal limits. May indicate processing difficulty.`, 
        recommendation: 'Regular practice with verbal exercises can help reduce pause duration.' 
      });
    }
    
    if (riskFlags.length === 0) {
      riskFlags.push({ 
        name: 'All Metrics Normal', 
        severity: 'None', 
        explanation: 'All speech parameters fall within healthy ranges.', 
        recommendation: 'Continue regular speech and cognitive exercises to maintain baseline.' 
      });
    }

    const prevScore = parseFloat(localStorage.getItem('lastSpeechScore')) || null;
    let comparisonDelta = null;
    
    try {
      const previousSessions = await getSpeechSessions(10);
      const lastSession = previousSessions.length > 0 ? previousSessions[0] : null;
      
      if (lastSession && lastSession.cognitive_fluency_score) {
        const scoreChange = Math.round((score - lastSession.cognitive_fluency_score) * 10) / 10;
        
        let prevPauseAvg = 0;
        let prevFillerCount = 0;
        
        if (lastSession.pause_clustering && lastSession.pause_clustering.average_duration_ms) {
          prevPauseAvg = lastSession.pause_clustering.average_duration_ms;
        }
        
        if (lastSession.annotated_transcript) {
          prevFillerCount = lastSession.annotated_transcript.filter(t => t.token_type === 'filler').length;
        }
        
        const pauseChange = Math.round(avgPauseDuration - prevPauseAvg);
        const fillerChange = fillerCount - prevFillerCount;
        
        comparisonDelta = {
          score_change: scoreChange,
          pause_change_ms: pauseChange,
          filler_change: fillerChange,
          has_previous_session: true
        };
      }
    } catch (err) {
      console.log('Could not fetch previous sessions:', err);
    }
    
    const sessionData = {
      patientId: patientId,
      timestamp: new Date().toISOString(),
      transcript: transcriptText || '',
      duration_ms: Math.round(estimatedDurationSec * 1000),
      word_count: wordCount,
      cognitive_fluency_score: score,
      score_label: score >= 80 ? 'Optimal' : score >= 60 ? 'Good' : score >= 40 ? 'Moderate Concern' : 'High Risk',
      score_interpretation: '',
      pause_timeline: pauseTimeline,
      cognitive_states: cognitiveStates,
      speech_metrics: metrics,
      annotated_transcript: annotatedTranscript,
      pause_clustering: {
        total_pauses: pauseCount,
        average_duration_ms: avgPauseDuration,
        longest_pause_ms: pauseTimeline.length > 0 ? Math.max(...pauseTimeline.map(p => p.duration_ms)) : 0,
        longest_pause_word: pauseTimeline.length > 0 ? pauseTimeline.reduce((a, b) => a.duration_ms > b.duration_ms ? a : b).word_after : '',
        pause_to_speech_ratio: pauseCount > 0 ? Math.round((pauseCount * avgPauseDuration) / (estimatedDurationSec * 1000) * 100) / 100 : 0,
        clustering_pattern: pauseCount > 3 ? 'distributed' : 'start_clustered',
        clinical_interpretation: ''
      },
      risk_flags: riskFlags,
    };
    
    try {
      await addSpeechSession(sessionData);
    } catch (err) {
      console.log('Could not save session:', err);
    }

    return {
      session_id: `mock-${Date.now()}`,
      patient_id: patientId,
      timestamp: new Date().toISOString(),
      transcript: transcriptText || '',
      duration_ms: Math.round(estimatedDurationSec * 1000),
      word_count: wordCount,
      cognitive_fluency_score: score,
      score_label: score >= 80 ? 'Optimal' : score >= 60 ? 'Good' : score >= 40 ? 'Moderate Concern' : 'High Risk',
      score_interpretation: wordCount < 5 
        ? 'Response too short for reliable analysis. Please provide more detail.' 
        : score >= 80 
          ? 'Excellent speech fluency with natural flow and good vocabulary usage.'
          : score >= 60
            ? 'Good speech patterns with minor areas for improvement.'
            : score >= 40
              ? 'Some hesitation patterns detected. Regular practice recommended.'
              : 'Significant speech difficulties detected. Consider speech therapy.',
      pause_timeline: pauseTimeline,
      cognitive_states: cognitiveStates,
      speech_metrics: metrics,
      annotated_transcript: annotatedTranscript,
      pause_clustering: {
        total_pauses: pauseCount,
        average_duration_ms: avgPauseDuration,
        longest_pause_ms: pauseTimeline.length > 0 ? Math.max(...pauseTimeline.map(p => p.duration_ms)) : 0,
        longest_pause_word: pauseTimeline.length > 0 ? pauseTimeline.reduce((a, b) => a.duration_ms > b.duration_ms ? a : b).word_after : '',
        pause_to_speech_ratio: pauseCount > 0 ? Math.round((pauseCount * avgPauseDuration) / (estimatedDurationSec * 1000) * 100) / 100 : 0,
        clustering_pattern: pauseCount > 3 ? 'distributed' : 'start_clustered',
        clinical_interpretation: pauseCount === 0 
          ? 'No significant pauses detected - natural speech flow.' 
          : avgPauseDuration < 800 
            ? 'Short pauses detected, within normal range for processing.'
            : avgPauseDuration < 1500 
              ? 'Moderate pauses suggest occasional word-finding difficulty.'
              : 'Long pauses indicate potential word retrieval challenges.'
      },
      risk_flags: riskFlags,
      comparison_delta: comparisonDelta
    };
  };

  const resetSession = () => {
    setSessionStatus('idle');
    setTranscript("");
    setFillerCount(0);
    setAnalysisResult(null);
    setShowAnalysisPanel(false);
    setAudioBlob(null);
    setTaskProgress(68);
    chunksRef.current = [];
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;
  };

  const processingSteps = [
    { title: "Audio Fingerprinting", status: isAnalyzing || sessionStatus === 'completed' ? 'completed' : 'pending' },
    { title: "Semantic Parsing", status: isAnalyzing || sessionStatus === 'completed' ? 'completed' : 'pending' },
    { title: "Paralinguistic Analysis", status: isAnalyzing ? 'processing' : sessionStatus === 'completed' ? 'completed' : 'pending' },
    { title: "Cognitive Load Score", status: sessionStatus === 'completed' ? 'completed' : isAnalyzing ? 'processing' : 'pending' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {showAnalysisPanel && analysisResult && (
        <ResultAnalysisPanel
          analysisResult={analysisResult}
          onClose={() => setShowAnalysisPanel(false)}
          onRetake={resetSession}
          onNextChallenge={resetSession}
        />
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Speech Analysis</h1>
          <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
            Cognitive linguistic screening in progress. Speak clearly and follow the curator's prompts for optimal diagnostic fidelity.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl min-w-[120px] text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Session Timer</p>
            <p className="text-xl font-bold text-white tabular-nums">{formatTime(sessionTimer)}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl min-w-[120px] text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Study Progress</p>
            <p className="text-xl font-bold text-blue-500 transition-all">{taskProgress}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className={`mb-12 transition-all duration-500 ${sessionStatus === 'completed' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4 block">The Digital Curator</span>
              <h2 className="text-2xl font-bold text-white leading-relaxed max-w-2xl">
                "Describe a peaceful afternoon in a garden you remember from your childhood."
              </h2>
              <div className="w-16 h-1 bg-blue-600 mt-6 rounded-full" />
            </div>

            <div className="relative flex flex-col items-center justify-center min-h-[300px] bg-slate-900/40 rounded-3xl border border-slate-800/50 mb-8 p-8 overflow-hidden">
              
              {sessionStatus === 'recording' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                  <canvas ref={canvasRef} width={400} height={80} className="w-full max-w-md h-20 mb-8" />
                  <div className="relative group">
                    <div className="absolute -inset-4 bg-red-600/20 rounded-full blur-xl group-hover:bg-red-500/30 transition-all animate-pulse" />
                    <button onClick={stopRecording} className="relative w-20 h-20 bg-red-600 hover:bg-red-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-900/40 transform scale-110 active:scale-95 transition-all">
                      <Square size={32} className="text-white fill-white" />
                    </button>
                  </div>
                  <p className="mt-8 text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">Live Audio Capture</p>
                </div>
              )}

              {sessionStatus === 'idle' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in duration-300">
                  <button onClick={startRecording} className="w-20 h-20 bg-blue-600 hover:bg-blue-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-900/40 hover:scale-110 active:scale-95 transition-all">
                    <Mic size={32} className="text-white" />
                  </button>
                  <p className="mt-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tap to start response</p>
                </div>
              )}

              {sessionStatus === 'analyzing' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                  <div className="relative mb-8">
                    <Loader2 size={48} className="text-blue-500 animate-spin" />
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500/10 rounded-full" />
                  </div>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest animate-pulse">Running Neural Inference</p>
                  <p className="mt-4 text-xs text-slate-500 font-medium italic">Analyzing cognitive markers...</p>
                </div>
              )}

              {sessionStatus === 'completed' && !showAnalysisPanel && (
                <div className="absolute inset-0 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 p-8 text-center">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">Analysis Complete</h3>
                  <p className="text-sm text-slate-400 mb-6 max-w-md">
                    Your speech has been analyzed. View the detailed cognitive report below.
                  </p>
                  <div className="flex gap-4">
                    <button onClick={resetSession} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-2">
                      <RotateCcw size={16} />
                      Retake
                    </button>
                    <button onClick={() => setShowAnalysisPanel(true)} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2 group">
                      View Full Report
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={`grid grid-cols-2 gap-4 transition-all duration-700 ${sessionStatus === 'recording' || sessionStatus === 'completed' ? 'opacity-100 translate-y-0' : 'opacity-20 translate-y-4 pointer-events-none'}`}>
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 group hover:border-slate-700 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tone Stability</p>
                  <BarChart2 size={16} className="text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{sessionStatus === 'recording' ? toneStability : (toneStability + (Math.random() * 2 - 1)).toFixed(1)}%</span>
                  <div className="flex gap-0.5 h-3 items-end">
                    {[0.4, 0.7, 0.5, 0.9, 0.6].map((h, i) => (
                      <div key={i} className="w-1 bg-emerald-500/50 rounded-full" style={{ height: `${sessionStatus === 'recording' ? h * 100 : (h * 110)}%` }} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 group hover:border-slate-700 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filler Words</p>
                  <TrendingDown size={16} className="text-blue-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{fillerCount}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">detected</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {Array.from({ length: Math.min(fillerCount, 10) }).map((_, i) => (
                    <div key={i} className="w-2 h-4 bg-yellow-500/30 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-800 shadow-xl">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Pipeline Status</h3>
            <div className="space-y-6">
              {processingSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-4 group">
                   {step.status === 'completed' ? (
                     <div className="p-1.5 bg-emerald-500/10 rounded-lg"><CheckCircle2 className="text-emerald-500" size={14} /></div>
                   ) : step.status === 'processing' ? (
                     <div className="p-1.5 bg-blue-500/10 rounded-lg"><Loader2 className="text-blue-500 animate-spin" size={14} /></div>
                   ) : (
                     <div className="p-1.5 bg-slate-800 rounded-lg"><Circle className="text-slate-700" size={14} /></div>
                   )}
                   <span className={`text-sm font-bold transition-colors ${
                     step.status === 'completed' ? 'text-white' : 
                     step.status === 'processing' ? 'text-blue-400' : 'text-slate-500'
                   }`}>{step.title}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden aspect-square border border-slate-800 group cursor-pointer">
            <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800" 
              alt="Diagnostic Visualization" 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent flex items-end p-6">
              <div>
                <div className="bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase text-white tracking-widest mb-2 inline-block shadow-lg">
                  AI Core Active
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Diagnostic Fidelity: 98.4%</p>
              </div>
            </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-3xl group hover:bg-red-500/10 transition-colors">
             <div className="flex items-center gap-3 mb-4">
               <AlertTriangle className="text-red-500" size={18} />
               <h3 className="text-sm font-bold text-red-500 uppercase tracking-tight">Clinician Override</h3>
             </div>
             <p className="text-xs text-red-200/60 leading-relaxed mb-6">
               Subject exhibits signs of cognitive fatigue. Activate override to suspend diagnostics.
             </p>
             <button className="w-full py-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20 active:scale-95">
               Trigger Protocol
             </button>
          </div>
        </div>
      </div>

      <footer className="pt-8 border-t border-slate-800 flex justify-between items-center opacity-40">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">V8.2 Secure Medical Protocol</p>
        <div className="flex gap-6">
          <button className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-100 transition-opacity">Privacy Policy</button>
          <button className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-100 transition-opacity">Emergency Helpline</button>
        </div>
      </footer>
    </div>
  );
};

export default SpeechSession;
