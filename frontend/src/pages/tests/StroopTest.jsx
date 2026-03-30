import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Timer,
  Palette,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { repository } from '../../db/database';
import { useAppStore } from '../../store/useAppStore';

const COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Yellow', hex: '#eab308' },
];

const WORD_OPTIONS = ['RED', 'BLUE', 'GREEN', 'YELLOW'];

const generateTrial = (prevWord, prevColor) => {
  let word, color;
  
  // Pick random word
  do {
    word = WORD_OPTIONS[Math.floor(Math.random() * WORD_OPTIONS.length)];
  } while (word === prevWord);

  // Pick random color that is NOT the word itself, and NOT the previous color
  do {
    color = COLORS[Math.floor(Math.random() * COLORS.length)];
  } while (color.name.toUpperCase() === word || color === prevColor);

  return {
    word,
    color,
    correctAnswer: color.name, // The INK color is the correct answer
  };
};

// Inline Helper Components
const InstructionCard = ({ icon: Icon, title, instructions }) => (
  <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl mb-6">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-orange-500" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        {instructions}
      </div>
    </div>
  </div>
);

const ScoreCircularGauge = ({ score, subtitle }) => {
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
        <span className="text-3xl font-black text-white">{Math.round(score)}%</span>
        <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{subtitle}</span>
      </div>
    </div>
  );
};

const StroopTest = () => {
  const navigate = useNavigate();
  
  const [phase, setPhase] = useState('pre'); // pre, countdown, practice, test, result
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [trials, setTrials] = useState([]);
  const [results, setResults] = useState([]);
  
  const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect'
  const [countdown, setCountdown] = useState(3);
  
  const wordStartTimeRef = useRef(0);
  const patientId = 'default';

  const numPracticeTrials = 3;
  const numRealTrials = 15;

  const startPhase = (newPhase) => {
    const isPractice = newPhase === 'practice';
    const numTrials = isPractice ? numPracticeTrials : numRealTrials;
    const newTrials = [];
    let prevWord = '';
    let prevColor = null;
    
    for (let i = 0; i < numTrials; i++) {
      const trial = generateTrial(prevWord, prevColor);
      newTrials.push(trial);
      prevWord = trial.word;
      prevColor = trial.color;
    }
    
    setTrials(newTrials);
    setCurrentTrialIndex(0);
    setResults([]);
    setFeedback(null);
    setPhase('countdown');
    
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        setPhase(newPhase);
        wordStartTimeRef.current = performance.now();
      }
    }, 1000);
  };

  useEffect(() => {
    // When trial changes, record start time
    if ((phase === 'test' || phase === 'practice') && trials.length > 0 && !feedback) {
      wordStartTimeRef.current = performance.now();
    }
  }, [currentTrialIndex, trials, phase, feedback]);

  const handleAnswer = (answerName) => {
    if (feedback !== null) return; // Prevent double click
    
    const reactionTime = performance.now() - wordStartTimeRef.current;
    const trial = trials[currentTrialIndex];
    const correct = answerName === trial.correctAnswer;

    setFeedback(correct ? 'correct' : 'incorrect');
    
    const newResult = { 
      trialIndex: currentTrialIndex, 
      word: trial.word,
      inkColor: trial.color.name,
      chosenColor: answerName,
      correct, 
      reactionTime 
    };
    
    const updatedResults = [...results, newResult];
    setResults(updatedResults);

    setTimeout(() => {
      setFeedback(null);
      if (currentTrialIndex < trials.length - 1) {
        setCurrentTrialIndex(currentTrialIndex + 1);
      } else {
        if (phase === 'practice') {
          // Finished practice, start real test automatically with a small delay
          startPhase('test');
        } else {
          finishTest(updatedResults);
        }
      }
    }, 250); // Fast 250ms transition
  };

  const finishTest = (finalResults) => {
    const correctCount = finalResults.filter((r) => r.correct).length;
    const avgReactionTime = finalResults.reduce((sum, r) => sum + r.reactionTime, 0) / finalResults.length;
    
    // Scoring logic
    const accuracy = (correctCount / numRealTrials) * 100;
    // Speed: 500ms is perfect (100%), 1500ms is base (0%)
    const speedScore = Math.max(0, Math.min(100, 100 - ((avgReactionTime - 500) / 10))); 
    
    const finalScore = Math.round((accuracy * 0.7) + (speedScore * 0.3));

    setPhase('result');
    repository.testResults.add({
      patientId,
      testType: 'stroop',
      score: finalScore,
      breakdown: {
        accuracy: Math.round(accuracy),
        avgReactionTime: Math.round(avgReactionTime),
      },
      rawData: { results: finalResults },
      duration: Math.round(avgReactionTime * numRealTrials / 1000),
      completedAt: new Date().toISOString(),
    });

    const { setCogniScore } = useAppStore.getState();
    setCogniScore(Math.max(0, Math.min(100, finalScore)));
  };

  const currentTrial = trials[currentTrialIndex];

  return (
    <div className="min-h-[calc(100vh-80px)] w-full">
      {/* Shared Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-orange-600 top-text-white text-xs font-bold rounded-full tracking-wide mb-3 uppercase">
            Attention
          </span>
          <h1 className="text-3xl font-black text-white mb-1">Stroop Test</h1>
          <p className="text-slate-400 font-medium tracking-wide">
            Response Inhibition Assessment: Evaluating cognitive flexibility and interference control
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 flex items-center gap-2">
            <Timer className="w-4 h-4 text-orange-400" />
            <span className="text-slate-300 text-sm font-semibold">~1.5 Minutes</span>
          </div>
        </div>
      </div>

      {phase === 'pre' && (
        <div className="max-w-2xl mx-auto mt-12">
          <InstructionCard
            icon={Palette}
            title="Instructions"
            instructions={
              <div className="text-slate-300 space-y-4">
                <p>
                  You will see a word that names a color (e.g., "RED"), but it will be printed in a different <strong>ink color</strong> (e.g., blue ink).
                </p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-6">
                  <span className="text-3xl font-black tracking-widest" style={{ color: '#3b82f6' }}>RED</span>
                  <div className="flex-1">
                    <p className="text-sm">The word says "RED", but the ink is <strong className="text-blue-400">BLUE</strong>.</p>
                    <p className="text-sm font-bold text-white mt-1">You must select the button for BLUE.</p>
                  </div>
                </div>
                <p>
                  Select the button that matches the INK COLOR, not the word. We will do 3 practice rounds first.
                </p>
              </div>
            }
          />
          <button
            onClick={() => startPhase('practice')}
            className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-lg transition-transform hover:scale-[1.02] shadow-lg shadow-orange-500/20"
          >
            Start Practice →
          </button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Get Ready</span>
          <div className="text-8xl font-black text-orange-400 animate-pulse">
            {countdown}
          </div>
        </div>
      )}

      {(phase === 'practice' || phase === 'test') && currentTrial && (
        <div className="max-w-3xl mx-auto mt-4 px-4 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-12 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              {phase === 'practice' ? (
                <span className="px-3 py-1 rounded-md bg-yellow-500/20 text-yellow-400 text-xs font-bold uppercase tracking-wider">Practice Mode</span>
              ) : (
                <span className="px-3 py-1 rounded-md bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">Live Test</span>
              )}
            </div>
            <span className="font-mono text-slate-400 font-medium">
              Round {currentTrialIndex + 1} / {phase === 'practice' ? numPracticeTrials : numRealTrials}
            </span>
          </div>

          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[300px] relative">
            <h2 
              className="text-7xl sm:text-8xl lg:text-[120px] font-black tracking-tighter uppercase transition-transform"
              style={{ color: currentTrial.color.hex, transform: feedback ? 'scale(0.95)' : 'scale(1)' }}
            >
              {currentTrial.word}
            </h2>

            {/* Instant feedback overlay */}
            {feedback && (
              <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm z-10 animate-in fade-in duration-100">
                {feedback === 'correct' ? (
                  <CheckCircle2 className="w-32 h-32 text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                ) : (
                  <XCircle className="w-32 h-32 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                )}
              </div>
            )}
          </div>

          <div className="w-full grid grid-cols-2 gap-4 mt-12 mb-8">
            {COLORS.map((colorOption) => (
              <button
                key={colorOption.name}
                onClick={() => handleAnswer(colorOption.name)}
                disabled={feedback !== null}
                className="group relative h-20 bg-slate-900 hover:bg-slate-800 border-2 border-slate-800 hover:border-slate-700 disabled:opacity-50 disabled:hover:bg-slate-900 disabled:hover:border-slate-800 rounded-2xl font-black text-2xl text-white transition-all overflow-hidden flex items-center justify-center"
              >
                <div 
                  className="absolute left-0 top-0 bottom-0 w-3 transition-transform group-hover:scale-x-150"
                  style={{ backgroundColor: colorOption.hex }}
                />
                <span className="tracking-widest relative z-10">{colorOption.name.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className="max-w-5xl mx-auto mt-8 slide-in-bottom">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl flex flex-col items-center justify-center">
                <h3 className="text-lg font-bold text-slate-300 mb-6">Accuracy</h3>
                <ScoreCircularGauge 
                  score={Math.round((results.filter(r => r.correct).length / numRealTrials) * 100)} 
                  subtitle="Correct" 
                />
              </div>

              <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-xl flex flex-col items-center justify-center">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Average Reaction Time</h3>
                <div className="text-4xl font-black text-white">
                  {Math.round(results.reduce((sum, r) => sum + r.reactionTime, 0) / results.length)}<span className="text-xl text-slate-500 ml-1">ms</span>
                </div>
              </div>

            </div>

            <div className="lg:col-span-8 bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-xl flex flex-col">
              <h3 className="text-xl font-bold text-white mb-6">Trial Breakdown</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-800/50">
                      <th className="pb-3 text-xs font-bold text-slate-500 uppercase">#</th>
                      <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Word Seen</th>
                      <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Ink Color</th>
                      <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Chosen</th>
                      <th className="pb-3 text-xs font-bold text-slate-500 uppercase text-right">RT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {results.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-3 text-sm text-slate-400 font-mono">{i + 1}</td>
                        <td className="py-3 text-sm font-bold text-slate-300">{r.word}</td>
                        <td className="py-3 text-sm font-bold" style={{ color: COLORS.find(c => c.name === r.inkColor)?.hex }}>
                          {r.inkColor.toUpperCase()}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                            r.correct ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {r.correct ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {r.chosenColor.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-slate-400 font-mono text-right">
                          {Math.round(r.reactionTime)}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4 mt-8 pt-6 border-t border-slate-800">
                <button
                  onClick={() => startPhase('practice')}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-colors border border-slate-700 text-sm tracking-wide"
                >
                  Retake Test
                </button>
                <button
                  onClick={() => navigate('/tests')}
                  className="flex-1 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold transition-transform shadow-lg shadow-orange-500/20 text-sm tracking-wide"
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

export default StroopTest;
