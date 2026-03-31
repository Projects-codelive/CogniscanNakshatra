import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  RotateCcw,
  Undo2,
  PenTool,
  Eraser,
  Trash2,
  Play,
  HelpCircle,
  User,
  CheckCircle2,
  XCircle,
  Brain,
  Timer
} from 'lucide-react';
import { repository } from '../../db/database';
import { useAppStore } from '../../store/useAppStore';

// Helper components inline
const InstructionCard = ({ icon: Icon, title, instructions }) => (
  <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl mb-6">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-blue-500" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        {instructions}
      </div>
    </div>
  </div>
);

const ScoreArc = ({ score, maxScore = 10 }) => {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let colorClass = 'text-green-500';
  if (percentage < 60) colorClass = 'text-red-500';
  else if (percentage < 80) colorClass = 'text-yellow-500';

  return (
    <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="80"
          cy="80"
          r={radius}
          className="stroke-slate-800"
          strokeWidth="12"
          fill="none"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          className={`${colorClass} transition-all duration-1000 ease-out`}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-white">{score}</span>
        <span className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
          Out of {maxScore}
        </span>
      </div>
    </div>
  );
};

const ClockDrawingTest = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [tool, setTool] = useState('pen');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [phase, setPhase] = useState('pre'); // pre, test, analyzing, result
  const [scoreData, setScoreData] = useState(null);
  const timerRef = useRef(null);
  const analyzeTimeoutRef = useRef(null);

  const patientId = 'default';

  useEffect(() => {
    if (phase === 'test') {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  useEffect(() => {
    return () => {
      if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === 'test' || phase === 'pre') {
      drawClockBorder();
    }
  }, [phase]);

  const drawClockBorder = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 20;

    // Background clearing
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pre-drawn circle
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    if (phase !== 'test') return;
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    setCurrentStroke([coords]);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing || phase !== 'test') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoords(e);

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 20;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
    }
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentStroke.length > 0) {
      const lastPoint = currentStroke[currentStroke.length - 1];
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }

    setCurrentStroke([...currentStroke, coords]);
  };

  const stopDrawing = () => {
    if (isDrawing && currentStroke.length > 0) {
      setStrokes([...strokes, { points: currentStroke, tool }]);
    }
    setIsDrawing(false);
    setCurrentStroke([]);
    
    // Reset composite operation
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  const clearCanvas = () => {
    setStrokes([]);
    drawClockBorder();
  };

  const undo = () => {
    if (strokes.length === 0) return;
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);

    drawClockBorder();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    newStrokes.forEach((stroke) => {
      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 20;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      stroke.points.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over';
  };

  const calculateScore = () => {
    const canvas = canvasRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // Internal zoning
    const clockRadius = Math.min(canvas.width, canvas.height) / 2 - 20;

    let numberScore = 0;
    const sectorsWithStrokes = new Set();
    const numberZoneInner = clockRadius * 0.55;
    const numberZoneOuter = clockRadius * 0.95;

    strokes.forEach((stroke) => {
      if (stroke.tool !== 'pen') return;
      stroke.points.forEach((point) => {
        const dx = point.x - centerX;
        const dy = point.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if inside number zone
        if (distance >= numberZoneInner && distance <= numberZoneOuter) {
          let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
          if (angleDeg < 0) angleDeg += 360;
          const sector = Math.floor(angleDeg / 30);
          sectorsWithStrokes.add(sector);
        }
      });
    });

    // 12 sectors hit = 4 pts. 
    numberScore = Math.min(4, Math.round((sectorsWithStrokes.size / 12) * 4));

    let handScore = 0;
    let strokesNearCenterCount = 0;
    strokes.forEach((stroke) => {
      if (stroke.tool !== 'pen') return;
      // Check if stroke starts or passes very near center (origin of hands)
      const isHand = stroke.points.some(point => {
        const dx = point.x - centerX;
        const dy = point.y - centerY;
        return Math.sqrt(dx * dx + dy * dy) < 30; // within 30px of center
      });
      if (isHand) strokesNearCenterCount++;
    });
    
    // Up to 2 hands (hour, minute)
    handScore = Math.min(3, strokesNearCenterCount * 1.5);

    let timeScore = 0;
    if (elapsedTime <= 180) timeScore = 2; // Under 3 mins
    else if (elapsedTime <= 360) timeScore = 1; // 3 to 6 mins
    else timeScore = 0; 

    // Base score for circle always 1 
    const circleScore = 1;
    
    const totalScore = Math.min(10, Math.round((numberScore + handScore + timeScore + circleScore) * 10) / 10);

    return {
      total: totalScore,
      breakdown: {
        circle: circleScore,
        numbers: numberScore,
        hands: handScore,
        time: timeScore
      }
    };
  };

  const submitDrawing = () => {
    if (phase !== 'test') return;
    setPhase('analyzing');
    const result = calculateScore();
    
    analyzeTimeoutRef.current = setTimeout(async () => {
      setScoreData(result);
      setPhase('result');
      
      const scoreHundred = result.total * 10;
      await repository.testResults.add({
        patientId,
        testType: 'clock_drawing',
        score: scoreHundred,
        breakdown: result.breakdown,
        rawData: { strokes, elapsedTime },
        duration: elapsedTime,
        completedAt: new Date().toISOString(),
      });

      const { setCogniScore } = useAppStore.getState();
      setCogniScore(Math.max(0, Math.min(100, scoreHundred)));
    }, 2000);
  };

  const getRating = (score) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Moderate Concern';
    return 'Needs Review';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-[calc(100vh-80px)] w-full">
      {/* Test Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full tracking-wide mb-3 uppercase">
            Cognitive
          </span>
          <h1 className="text-3xl font-black text-white mb-1">Clock Drawing Test</h1>
          <p className="text-slate-400 font-medium tracking-wide">
            Visuospatial & Executive Function Assessment
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 flex items-center gap-2">
            <Timer className="w-4 h-4 text-blue-400" />
            <span className="text-slate-300 text-sm font-semibold">{t('tests.threeMinutes')}</span>
          </div>
        </div>
      </div>

      {phase === 'pre' && (
        <div className="max-w-2xl mx-auto mt-12">
          <InstructionCard
            icon={PenTool}
            title={t('tests.testInstructions')}
            instructions={
              <div className="text-slate-300 space-y-3">
                <p>
                  {t('tests.drawClockFace')}
                </p>
                <div className="space-y-2 ml-2">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold">1</span>
                    <p>{t('tests.ensureNumbers')}</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold">2</span>
                    <p>{t('tests.testIsTimed')}</p>
                  </div>
                </div>
              </div>
            }
          />
          <button
            onClick={() => setPhase('test')}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/20"
          >
            {t('tests.startAssessment')} →
          </button>
        </div>
      )}

      {phase === 'test' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <InstructionCard
              icon={PenTool}
              title={t('tests.instructions')}
              instructions={
                <p className="text-slate-300 text-sm leading-relaxed">
                  {t('tests.drawClockFace')}
                </p>
              }
            />
            
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-center shadow-xl">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('tests.timeElapsed')}</p>
              <p className="text-4xl font-black text-blue-500 tracking-tight">{formatTime(elapsedTime)}</p>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col items-center">
            <div className="relative bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl overflow-hidden w-full max-w-lg">
              {/* Canvas Header */}
              <div className="absolute top-4 right-4 flex gap-2 z-10">
                <button
                  onClick={undo}
                  disabled={strokes.length === 0}
                  className="w-10 h-10 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 rounded-full flex items-center justify-center text-white transition-colors"
                  title={t('tests.undo')}
                >
                  <Undo2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex justify-center mb-6">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={400}
                  className="rounded-full touch-none cursor-crosshair shadow-inner ring-1 ring-white/5 bg-[#1e293b] w-[300px] h-[300px] sm:w-[400px] sm:h-[400px]"
                  style={{ width: '100%', maxWidth: '400px', aspectRatio: '1/1' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>

              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => setTool('pen')}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${
                    tool === 'pen' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <PenTool className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Pen</span>
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${
                    tool === 'eraser' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Eraser className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Eraser</span>
                </button>
                <button
                  onClick={clearCanvas}
                  className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Clear</span>
                </button>
              </div>

              <button
                onClick={submitDrawing}
                className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/20"
              >
                {t('tests.submitDrawing')} →
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'analyzing' && (
        <div className="flex flex-col items-center justify-center min-h-[500px]">
          <div className="w-20 h-20 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin mb-6"></div>
          <h2 className="text-2xl font-black text-white mb-2">{t('tests.analyzingDrawing')}</h2>
          <p className="text-slate-400">{t('tests.computingSpatial')}</p>
        </div>
      )}

      {phase === 'result' && scoreData && (
        <div className="max-w-4xl mx-auto slide-in-bottom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl flex flex-col items-center justify-center">
              <h3 className="text-lg font-bold text-slate-300 mb-8">{t('tests.overallPerformance')}</h3>
              <ScoreArc score={scoreData.total} maxScore={10} />
              <div className="mt-8 px-6 py-2 rounded-full bg-slate-800/50 border border-slate-700">
                <span className="text-sm font-bold text-white tracking-wide">
                  {t('tests.rating')}: <span className="text-blue-400 ml-1">{getRating(scoreData.total)}</span>
                </span>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-xl flex flex-col">
              <h3 className="text-lg font-bold text-slate-300 mb-6">{t('tests.pointBreakdown')}</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                <div className="bg-slate-800/50 rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-slate-300 font-medium flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    {t('tests.clockFace')}
                  </span>
                  <span className="text-blue-400 font-bold">{scoreData.breakdown.circle} / 1</span>
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-slate-300 font-medium flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    {t('tests.numberPlacement')}
                  </span>
                  <span className="text-blue-400 font-bold">{scoreData.breakdown.numbers} / 4</span>
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-slate-300 font-medium flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    {t('tests.handAccuracy')}
                  </span>
                  <span className="text-blue-400 font-bold">{scoreData.breakdown.hands} / 3</span>
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-slate-300 font-medium flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    {t('tests.timeBonus')}
                  </span>
                  <span className="text-blue-400 font-bold">{scoreData.breakdown.time} / 2</span>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => {
                    setPhase('pre');
                    setStrokes([]);
                    setElapsedTime(0);
                    setScoreData(null);
                  }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors border border-slate-700"
                >
                  {t('tests.retakeTest')}
                </button>
                <button
                  onClick={() => navigate('/tests')}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-transform shadow-lg shadow-blue-500/20"
                >
                  {t('tests.continue')} →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClockDrawingTest;

