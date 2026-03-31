import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Timer,
  Activity,
  Footprints,
  AlertCircle
} from 'lucide-react';
import { repository } from '../../db/database';
import { useAppStore } from '../../store/useAppStore';

// Inline Helper Components
const InstructionCard = ({ icon: Icon, title, instructions }) => (
  <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl mb-6">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-green-500" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        {instructions}
      </div>
    </div>
  </div>
);

const ScoreArc = ({ score, textOverride }) => {
  const percentage = Math.min(100, Math.max(0, score));
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
        <span className="text-3xl font-black text-white">{textOverride || score}</span>
      </div>
    </div>
  );
};

const TrailMakingTest = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  
  const [phase, setPhase] = useState('pre'); // pre, test, result
  const [circles, setCircles] = useState([]);
  const [expectedNext, setExpectedNext] = useState(1);
  const [errorCount, setErrorCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  
  const [flashCircle, setFlashCircle] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const linesRef = useRef([]);
  const animationFrameRef = useRef(null);

  const patientId = 'default';

  // Live timer logic
  useEffect(() => {
    if (phase === 'test' && startTime && !completed) {
      const updateTimer = () => {
        setCurrentTimeMs(performance.now() - startTime);
        animationFrameRef.current = requestAnimationFrame(updateTimer);
      };
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [phase, startTime, completed]);

  // Generate circles layout
  useEffect(() => {
    if (phase === 'test') {
      generateCircles();
    }
  }, [phase]);

  // Draw canvas loop (efficient redraw)
  useEffect(() => {
    if (phase === 'test' || phase === 'result') {
      drawCanvas();
    }
  }, [circles, phase, flashCircle, currentTimeMs]); // Render when these change, or on timer if needed (but currently timer is outside canvas)

  const generateCircles = () => {
    const minDistance = 80;
    const padding = 50;
    // We assume a standard internal canvas size of 500x500 for consistency, visually scaled by CSS
    const width = 500;
    const height = 500;
    
    const newCircles = [];
    const quadrants = [
      { minX: padding, maxX: width / 2 - padding, minY: padding, maxY: height / 2 - padding },
      { minX: width / 2 + padding, maxX: width - padding, minY: padding, maxY: height / 2 - padding },
      { minX: padding, maxX: width / 2 - padding, minY: height / 2 + padding, maxY: height - padding },
      { minX: width / 2 + padding, maxX: width - padding, minY: height / 2 + padding, maxY: height - padding },
    ];

    let attempts = 0;
    while (newCircles.length < 10 && attempts < 2000) {
      const quadrant = quadrants[newCircles.length % 4];
      const x = quadrant.minX + Math.random() * (quadrant.maxX - quadrant.minX);
      const y = quadrant.minY + Math.random() * (quadrant.maxY - quadrant.minY);

      let valid = true;
      for (const circle of newCircles) {
        const dist = Math.sqrt((circle.x - x) ** 2 + (circle.y - y) ** 2);
        if (dist < minDistance) {
          valid = false;
          break;
        }
      }

      if (valid) {
        newCircles.push({ x, y, number: newCircles.length + 1, completed: false });
      }
      attempts++;
    }

    setCircles(newCircles);
    setExpectedNext(1);
    setStartTime(null);
    setCurrentTimeMs(0);
    setErrorCount(0);
    linesRef.current = [];
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw lines
    ctx.strokeStyle = '#3b82f6'; // Blue trail
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    linesRef.current.forEach((line) => {
      ctx.moveTo(line.fromX, line.fromY);
      ctx.lineTo(line.toX, line.toY);
    });
    ctx.stroke();

    // Draw circles
    circles.forEach((circle) => {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, 28, 0, Math.PI * 2);

      if (circle.completed) {
        ctx.fillStyle = '#22c55e'; // Green
        ctx.strokeStyle = '#16a34a';
      } else if (flashCircle === circle.number) {
        ctx.fillStyle = '#ef4444'; // Red flash
        ctx.strokeStyle = '#dc2626';
      } else {
        ctx.fillStyle = '#1e293b'; // Slate background
        ctx.strokeStyle = '#334155';
      }
      
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(circle.number.toString(), circle.x, circle.y + 2);
    });
  };

  const handleClick = (e) => {
    if (completed || phase !== 'test') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Support both mouse and touch
    let clientX = e.clientX;
    let clientY = e.clientY;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault(); // Prevent scrolling
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Increased hit area slightly for touch friendliness (35px instead of 28px)
    for (const circle of circles) {
      const dist = Math.sqrt((circle.x - x) ** 2 + (circle.y - y) ** 2);
      if (dist <= 45) {
        handleCircleInteraction(circle);
        break;
      }
    }
  };

  const handleCircleInteraction = (circle) => {
    if (circle.completed) return;

    if (circle.number === expectedNext) {
      if (!startTime) {
        setStartTime(performance.now());
      }

      const newCircles = circles.map((c) =>
        c.number === circle.number ? { ...c, completed: true } : c
      );
      setCircles(newCircles);

      const prevCircle = newCircles.find(c => c.number === expectedNext - 1);
      if (prevCircle) {
        linesRef.current.push({
          fromX: prevCircle.x,
          fromY: prevCircle.y,
          toX: circle.x,
          toY: circle.y,
        });
      }

      if (expectedNext === 10) {
        handleCompletion(newCircles);
      } else {
        setExpectedNext(expectedNext + 1);
      }
    } else {
      // Wrong circle
      setErrorCount(prev => prev + 1);
      setFlashCircle(circle.number);
      if (navigator.vibrate) navigator.vibrate(50);
      setTimeout(() => {
        setFlashCircle(null);
      }, 300);
    }
  };

  const handleCompletion = (finalCircles) => {
    setCompleted(true);
    const endMs = performance.now();
    setEndTime(endMs);
    
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    setTimeout(() => {
      calculateAndShowResult(finalCircles, startTime, endMs);
    }, 800);
  };

  const calculateAndShowResult = (finalCircles, st, et) => {
    const rawDurationSecs = (et - st) / 1000;
    const errorPenaltySecs = errorCount * 3;
    const totalTimeSecs = rawDurationSecs + errorPenaltySecs;
    
    // Scoring logic
    // < 15s = Excellent (100)
    // < 25s = Good (80)
    // < 40s = Moderate (60)
    // > 40s = Poor (40)
    let score = 0;
    let rating = 'Poor';
    if (totalTimeSecs <= 15) { score = 95; rating = 'Excellent'; }
    else if (totalTimeSecs <= 25) { score = 80; rating = 'Good'; }
    else if (totalTimeSecs <= 40) { score = 60; rating = 'Moderate'; }
    else { score = 40; rating = 'Poor'; }

    score = Math.max(0, score - (errorCount * 5)); // Additional minor penalty on 0-100 scale

    setScoreData({
      rawTime: rawDurationSecs.toFixed(1),
      errorPenalty: errorPenaltySecs,
      totalTime: totalTimeSecs.toFixed(1),
      rating,
      finalScore: score
    });
    
    setPhase('result');

    repository.testResults.add({
      patientId,
      testType: 'trail_making',
      score: score,
      breakdown: {
        rawTime: rawDurationSecs,
        errorCount,
        penaltySecs: errorPenaltySecs,
        totalTime: totalTimeSecs
      },
      rawData: {
        circles: finalCircles,
        lines: linesRef.current,
      },
      duration: Math.round(totalTimeSecs),
      completedAt: new Date().toISOString(),
    });

    const { setCogniScore } = useAppStore.getState();
    setCogniScore(Math.max(0, Math.min(100, score)));
  };

  return (
    <div className="min-h-[calc(100vh-80px)] w-full">
      {/* Shared Header Structure */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-green-600 top-text-white text-xs font-bold rounded-full tracking-wide mb-3 uppercase">
            {t('tests.trailMaking.category')}
          </span>
          <h1 className="text-3xl font-black text-white mb-1">{t('tests.trailMaking.title')}</h1>
          <p className="text-slate-400 font-medium tracking-wide">
            {t('tests.trailMaking.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 flex items-center gap-2">
            <Timer className="w-4 h-4 text-green-400" />
            <span className="text-slate-300 text-sm font-semibold">{t('tests.trailMaking.duration')}</span>
          </div>
        </div>
      </div>

      {phase === 'pre' && (
        <div className="max-w-2xl mx-auto mt-12">
          <InstructionCard
            icon={Footprints}
            title={t('tests.overview')}
            instructions={
              <p className="text-slate-300 space-y-3 leading-relaxed">
                {t('tests.trailMaking.instructions.overview')}
                <br /><br />
                <strong>{t('tests.trailMaking.instructions.note')}:</strong> {t('tests.trailMaking.instructions.penalty')}
              </p>
            }
          />
          <button
            onClick={() => setPhase('test')}
            className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-lg transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/20"
          >
            {t('tests.startAssessment')} →
          </button>
        </div>
      )}

      {phase === 'test' && (
        <div className="max-w-3xl mx-auto mt-4 flex flex-col items-center">
          
          <div className="w-full grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-widest block mb-1">{t('tests.trailMaking.currentTarget')}</span>
              <span className="text-2xl font-black text-blue-400">{expectedNext > 10 ? '-' : expectedNext}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-widest block mb-1">{t('tests.trailMaking.errors')}</span>
              <span className={`text-2xl font-black ${errorCount > 0 ? 'text-red-400' : 'text-slate-300'}`}>{errorCount}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-widest block mb-1">{t('tests.time')}</span>
              <span className="text-2xl font-black text-white">{(currentTimeMs / 1000).toFixed(1)}s</span>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-4 sm:p-8 w-full shadow-2xl border border-slate-800 flex justify-center items-center touch-none">
            <canvas
              ref={canvasRef}
              width={500}
              height={500}
              className="w-full max-w-[500px] aspect-square bg-slate-950 rounded-2xl cursor-crosshair shadow-inner"
              onMouseDown={handleClick}
              onTouchStart={handleClick}
            />
          </div>
          <p className="text-slate-400 text-sm mt-6 font-medium bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
            {t('tests.trailMaking.tapCircles')}
          </p>
        </div>
      )}

      {phase === 'result' && scoreData && (
        <div className="max-w-5xl mx-auto mt-8 slide-in-bottom">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl flex flex-col items-center justify-center">
              <h3 className="text-lg font-bold text-slate-300 mb-8">{t('tests.trailMaking.testTime')}</h3>
              <ScoreArc score={scoreData.finalScore} textOverride={`${scoreData.totalTime}s`} />
              <p className="text-slate-400 font-medium mt-4">{t('tests.trailMaking.totalAdjustedTime')}</p>
              
              <div className="mt-8 px-6 py-2 rounded-full bg-slate-800/50 border border-slate-700 w-full text-center">
                <span className="text-sm font-bold text-white tracking-wide">
                  {t('tests.rating')}: <span className={
                    scoreData.rating === 'Excellent' ? 'text-green-400' : 
                    scoreData.rating === 'Good' ? 'text-green-300' : 
                    scoreData.rating === 'Moderate' ? 'text-yellow-400' : 'text-red-400'
                  }>
                    {scoreData.rating}
                  </span>
                </span>
              </div>
            </div>

            <div className="lg:col-span-8 bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-6">{t('tests.trailMaking.performanceBreakdown')}</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-3">
                      <Timer className="w-5 h-5 text-slate-400" />
                      <span className="font-medium text-slate-300">{t('tests.trailMaking.rawTime')}</span>
                    </div>
                    <span className="text-xl font-bold text-white">{scoreData.rawTime}s</span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="font-medium text-slate-300">{t('tests.trailMaking.errorPenalty', { count: errorCount })}</span>
                    </div>
                    <span className="text-xl font-bold text-red-400">+{scoreData.errorPenalty}s</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-slate-800 rounded-xl border border-slate-700">
                    <span className="font-bold text-white uppercase tracking-wider text-sm mt-1">{t('tests.trailMaking.totalAdjustedTime')}</span>
                    <span className="text-2xl font-black text-white">{scoreData.totalTime}s</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button
                  onClick={() => {
                    setPhase('pre');
                    setCompleted(false);
                  }}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-colors border border-slate-700 text-sm tracking-wide"
                >
                  Retake Test
                </button>
                <button
                  onClick={() => navigate('/tests')}
                  className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold transition-transform shadow-lg shadow-green-500/20 text-sm tracking-wide"
                >
                  Continue Assessment →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrailMakingTest;
