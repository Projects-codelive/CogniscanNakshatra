import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Timer,
  Zap,
  AlertCircle
} from 'lucide-react';
import { repository } from '../../db/database';
import { useAppStore } from '../../store/useAppStore';

// Inline Helper Components
const InstructionCard = ({ icon: Icon, title, instructions }) => (
  <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl mb-6">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-teal-500" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        {instructions}
      </div>
    </div>
  </div>
);

const ScoreCircularGauge = ({ scoreStr, percentage, title }) => {
  const p = Math.min(100, Math.max(0, percentage));
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (p / 100) * circumference;

  let colorClass = 'text-green-500';
  if (p < 50) colorClass = 'text-red-500';
  else if (p < 80) colorClass = 'text-yellow-500';

  return (
    <div className="relative w-40 h-40 mx-auto flex items-center justify-center mb-6">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="80" cy="80" r={radius} className="stroke-slate-800" strokeWidth="12" fill="none" />
        <circle
          cx="80" cy="80" r={radius}
          className={`${colorClass} transition-all duration-1000 ease-out`}
          strokeWidth="12"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" fill="none" stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white">{scoreStr}</span>
        <span className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{title}</span>
      </div>
    </div>
  );
};

// Simple SVG Bar Chart
const ResultChart = ({ data }) => {
  const maxRT = Math.max(...data.map(d => d.rt || 0), 400); // Minimum scale 400ms
  
  return (
    <div className="mt-8">
      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Reaction Time History</h4>
      <div className="h-48 flex items-end justify-between gap-2 border-b border-slate-800 pb-2 relative">
        {data.map((item, i) => {
          const heightPct = (item.rt / maxRT) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative group">
              <div 
                className={`w-full rounded-t-md transition-all duration-500 ${item.falseStart ? 'bg-red-500/50' : 'bg-teal-500'}`}
                style={{ height: `${heightPct}%`, minHeight: '4px' }}
              />
              <span className="text-[10px] font-bold text-slate-500 mt-2">{i + 1}</span>
              
              {/* Tooltip */}
              <div className="absolute bottom-[calc(100%+10px)] bg-slate-800 text-white text-xs font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                {item.falseStart ? 'False Start' : `${Math.round(item.rt)}ms`}
              </div>
            </div>
          );
        })}
        {/* Horizontal reference line (average) */}
        {data.length > 0 && (
          <div 
            className="absolute left-0 right-0 border-t border-dashed border-slate-500/50 pointer-events-none"
            style={{ bottom: `${(data.reduce((sum, d) => sum + (d.rt || 0), 0) / data.length / maxRT) * 100}%` }}
          />
        )}
      </div>
    </div>
  );
};

const TOTAL_ROUNDS = 8;

const ReactionTimeTest = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [phase, setPhase] = useState('pre'); // pre, active, result
  const [boxState, setBoxState] = useState('waiting'); // click_to_start, waiting, go, early, round_result
  const [round, setRound] = useState(0); // 0 to TOTAL_ROUNDS - 1
  const [results, setResults] = useState([]); // Array of { rt: number, falseStart: boolean }
  
  const [lastRT, setLastRT] = useState(null);
  const [testScoreData, setTestScoreData] = useState(null);

  const greenTimeRef = useRef(0);
  const timeoutRef = useRef(null);
  
  const patientId = 'default';

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const triggerNextRound = () => {
    setBoxState('waiting');
    const delay = 1500 + Math.random() * 2500; // Random delay between 1.5s and 4.0s
    
    timeoutRef.current = setTimeout(() => {
      setBoxState('go');
      greenTimeRef.current = performance.now();
    }, delay);
  };

  const startTestSequence = () => {
    setPhase('active');
    setRound(0);
    setResults([]);
    triggerNextRound();
  };

  const handleClickBox = (e) => {
    if (e) e.preventDefault(); // Prevent double actions on touch

    if (boxState === 'waiting') {
      // False start!
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      setBoxState('early');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      
      const newResult = { rt: 0, falseStart: true };
      setResults(prev => [...prev, newResult]);
      
      setTimeout(() => {
        advanceRoundOrFinish();
      }, 1500);
      return;
    }

    if (boxState === 'go') {
      const rt = performance.now() - greenTimeRef.current;
      setBoxState('round_result');
      setLastRT(rt);
      
      const newResult = { rt, falseStart: false };
      setResults(prev => [...prev, newResult]);

      setTimeout(() => {
        advanceRoundOrFinish();
      }, 1000);
      return;
    }
  };

  const advanceRoundOrFinish = () => {
    setRound(prev => {
      const nextRound = prev + 1;
      if (nextRound < TOTAL_ROUNDS) {
        triggerNextRound();
        return nextRound;
      } else {
        // Finish test next tick
        setTimeout(() => finishTest(), 0);
        return prev; // stays at 7 until phase changes
      }
    });
  };

  const finishTest = () => {
    // Scoring logic
    // We calculate the average RT of successful rounds, and add a 500ms penalty for each false start to the "Reported Average"
    const successfulRounds = results.filter(r => !r.falseStart);
    const falseStartCount = results.filter(r => r.falseStart).length;
    
    let rawAvgRT = 500; // fallback
    if (successfulRounds.length > 0) {
      rawAvgRT = successfulRounds.reduce((sum, r) => sum + r.rt, 0) / successfulRounds.length;
    }
    
    const penaltyMs = falseStartCount * 500;
    const finalAdjustedRT = rawAvgRT + penaltyMs;

    // Rating logic based on final RT
    let rating = 'Poor';
    let pScore = 0; // 0-100
    if (finalAdjustedRT < 200) { rating = 'Superb'; pScore = 100; }
    else if (finalAdjustedRT < 250) { rating = 'Excellent'; pScore = 90; }
    else if (finalAdjustedRT < 300) { rating = 'Good'; pScore = 75; }
    else if (finalAdjustedRT < 400) { rating = 'Average'; pScore = 60; }
    else if (finalAdjustedRT < 550) { rating = 'Below Average'; pScore = 40; }
    else { rating = 'Poor'; pScore = 20; }

    setTestScoreData({
      rawAvg: rawAvgRT,
      falseStarts: falseStartCount,
      penalty: penaltyMs,
      finalRT: finalAdjustedRT,
      rating,
      pScore
    });

    setPhase('result');
    
    repository.testResults.add({
      patientId,
      testType: 'reaction_time',
      score: pScore,
      breakdown: {
        rawAvg: Math.round(rawAvgRT),
        falseStarts: falseStartCount,
        penaltyMs,
        finalAdjustedRT: Math.round(finalAdjustedRT),
      },
      rawData: { results },
      duration: Math.round(results.length * 4), // Approximate
      completedAt: new Date().toISOString(),
    });

    const { setCogniScore } = useAppStore.getState();
    setCogniScore(Math.max(0, Math.min(100, pScore)));
  };

  return (
    <div className="min-h-[calc(100vh-80px)] w-full">
      {/* Shared Header Structure */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-teal-600 text-white text-xs font-bold rounded-full tracking-wide mb-3 uppercase">
            Psychomotor
          </span>
          <h1 className="text-3xl font-black text-white mb-1">Reaction Time Test</h1>
          <p className="text-slate-400 font-medium tracking-wide">
            Processing Assessment: Evaluating raw cognitive and motor response speeds
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 flex items-center gap-2">
            <Timer className="w-4 h-4 text-teal-400" />
            <span className="text-slate-300 text-sm font-semibold">~1 Minute</span>
          </div>
        </div>
      </div>

      {phase === 'pre' && (
        <div className="max-w-2xl mx-auto mt-12">
          <InstructionCard
            icon={Zap}
            title={t('tests.overview')}
            instructions={
              <ul className="text-slate-300 space-y-2 list-disc pl-5">
                <li>{t('tests.reactionTime.instructions.clickGreen')}</li>
                <li>{t('tests.reactionTime.instructions.testRounds', { rounds: TOTAL_ROUNDS })}</li>
                <li>{t('tests.reactionTime.instructions.waitGreen')}</li>
              </ul>
            }
          />
          <button
            onClick={startTestSequence}
            className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-lg transition-transform hover:scale-[1.02] shadow-lg shadow-teal-500/20"
          >
            {t('tests.startAssessment')} →
          </button>
        </div>
      )}

      {phase === 'active' && (
        <div className="max-w-5xl mx-auto mt-4 px-4 flex flex-col lg:flex-row gap-8 items-start h-[60vh] lg:min-h-[500px]">
          
          {/* Sidebar / Top bar for History */}
          <div className="w-full lg:w-64 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col p-4 shrink-0 transition-all shadow-xl h-32 lg:h-full overflow-hidden">
             <div className="flex justify-between items-center mb-4">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('tests.history')}</span>
               <span className="text-sm font-black text-teal-400">{t('tests.round')} {round + 1}/{TOTAL_ROUNDS}</span>
             </div>
             <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar flex flex-row lg:flex-col gap-2 lg:gap-0">
                {results.map((r, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl border shrink-0 min-w-[120px] lg:min-w-0 ${
                    r.falseStart ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/50 border-slate-700/50'
                  }`}>
                    <span className="text-xs font-bold text-slate-500 uppercase">R{i + 1}</span>
                    <span className={`font-black ${r.falseStart ? 'text-red-400' : 'text-white'}`}>
                      {r.falseStart ? t('tests.early') : `${Math.round(r.rt)}ms`}
                    </span>
                  </div>
                ))}
                
                {/* Placeholders for remaining rounds */}
                {Array.from({ length: TOTAL_ROUNDS - results.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/50 opacity-40 shrink-0 min-w-[120px] lg:min-w-0">
                    <span className="text-xs font-bold text-slate-600 uppercase">R{results.length + i + 1}</span>
                    <span className="font-bold text-slate-700">---</span>
                  </div>
                ))}
             </div>
          </div>

          {/* Main Interaction Canvas */}
          <div className="flex-1 w-full h-full min-h-[300px] lg:min-h-0 relative">
            <button
              onMouseDown={handleClickBox}
              onTouchStart={handleClickBox}
              className={`w-full h-full rounded-[2rem] border-4 transition-colors flex flex-col items-center justify-center select-none shadow-2xl overflow-hidden focus:outline-none focus:ring-4 focus:ring-teal-500/30
                ${boxState === 'waiting' ? 'bg-slate-800 border-slate-700' : ''}
                ${boxState === 'go' ? 'bg-green-500 border-green-400' : ''}
                ${boxState === 'early' ? 'bg-red-500 border-red-400' : ''}
                ${boxState === 'round_result' ? 'bg-slate-900 border-slate-800' : ''}
              `}
            >
              {boxState === 'waiting' && (
                <>
                  <p className="text-3xl md:text-5xl font-black text-slate-500 mb-4 tracking-tight">{t('tests.waitForGreen')}</p>
                  <p className="text-slate-600 font-medium tracking-wide">{t('tests.doNotClickYet')}</p>
                </>
              )}

              {boxState === 'go' && (
                <div className="animate-in zoom-in duration-75 text-center">
                  <p className="text-6xl md:text-8xl font-black text-white tracking-tighter drop-shadow-xl uppercase">{t('tests.click')}</p>
                </div>
              )}

              {boxState === 'early' && (
                <div className="animate-in slide-in-bottom-4 text-center">
                  <AlertCircle className="w-20 h-20 text-white/50 mx-auto mb-4" />
                  <p className="text-4xl md:text-6xl font-black text-white tracking-tight uppercase">{t('tests.tooEarly')}</p>
                  <p className="text-red-200 font-bold mt-4 tracking-widest uppercase">{t('tests.penaltyApplied')}</p>
                </div>
              )}

              {boxState === 'round_result' && (
                <div className="animate-in fade-in text-center">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">{t('tests.reactionTimeLabel')}</p>
                  <p className="text-5xl md:text-7xl font-black text-white tracking-tight">{Math.round(lastRT)}ms</p>
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {phase === 'result' && testScoreData && (
        <div className="max-w-5xl mx-auto mt-8 slide-in-bottom">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl flex flex-col items-center justify-center">
              <h3 className="text-lg font-bold text-slate-300 mb-8 tracking-wide">{t('tests.finalAssessment')}</h3>
              <ScoreCircularGauge 
                scoreStr={`${Math.round(testScoreData.finalRT)}ms`} 
                percentage={testScoreData.pScore}
                title={t('tests.avgTime')}
              />
              
              <div className="mt-8 px-6 py-2 rounded-full bg-slate-800/50 border border-slate-700 w-full text-center">
                <span className="text-sm font-bold text-white tracking-wide">
                  {t('tests.rating')}: <span className={
                    testScoreData.rating === 'Superb' || testScoreData.rating === 'Excellent' ? 'text-teal-400' : 
                    testScoreData.rating === 'Good' || testScoreData.rating === 'Average' ? 'text-yellow-400' : 'text-red-400'
                  }>
                    {testScoreData.rating}
                  </span>
                </span>
              </div>
            </div>

            <div className="lg:col-span-8 bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-xl flex flex-col">
              <h3 className="text-xl font-black text-white mb-6 tracking-wide">Performance Data</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Raw Average</span>
                  <span className="text-2xl font-black text-white">{Math.round(testScoreData.rawAvg)}<span className="text-xs text-slate-500 ml-1">ms</span></span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-1">False Starts</span>
                  <span className={`text-2xl font-black ${testScoreData.falseStarts > 0 ? 'text-red-400' : 'text-slate-300'}`}>{testScoreData.falseStarts}</span>
                </div>
                <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/20">
                  <span className="text-xs font-bold text-red-500/70 uppercase block mb-1">Time Penalties</span>
                  <span className="text-2xl font-black text-red-400">+{testScoreData.penalty}<span className="text-xs text-red-500/50 ml-1">ms</span></span>
                </div>
                <div className="bg-teal-500/10 p-4 rounded-xl border border-teal-500/30">
                  <span className="text-xs font-bold text-teal-500/70 uppercase block mb-1">Final Score</span>
                  <span className="text-2xl font-black text-teal-400">{Math.round(testScoreData.finalRT)}<span className="text-xs text-teal-400/50 ml-1">ms</span></span>
                </div>
              </div>

              <ResultChart data={results} />

              <div className="flex gap-4 mt-auto pt-8">
                <button
                  onClick={() => setPhase('pre')}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-colors border border-slate-700 text-sm tracking-wide shadow-none hover:shadow-lg"
                >
                  Retake Test
                </button>
                <button
                  onClick={() => navigate('/tests')}
                  className="flex-1 py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-bold transition-transform shadow-lg shadow-teal-500/20 text-sm tracking-wide hover:scale-[1.02]"
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

export default ReactionTimeTest;
