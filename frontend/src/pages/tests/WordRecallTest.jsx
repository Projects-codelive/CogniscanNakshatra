import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Brain,
  Timer,
  BookOpen,
  Check,
  X,
  Play
} from 'lucide-react';
import { repository } from '../../db/database';
import { useAppStore } from '../../store/useAppStore';

const WORD_POOL = [
  'Apple', 'Table', 'River', 'Sunset', 'Carpet', 'Mirror', 'Forest', 'Pencil', 'Bridge',
  'Castle', 'Lantern', 'Garden', 'Window', 'Basket', 'Thunder'
];

// Inline Helper Components
const InstructionCard = ({ icon: Icon, title, instructions }) => (
  <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl mb-6">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-purple-500" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
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

const WordRecallTest = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('pre'); // pre, memorize, distraction, recall, result
  const [words, setWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayedWord, setDisplayedWord] = useState('');
  const [wordOpacity, setWordOpacity] = useState(0);
  const [wordProgress, setWordProgress] = useState(100);

  const [distractionAnswer, setDistractionAnswer] = useState('');
  const [distractionStatus, setDistractionStatus] = useState(null); // null, 'correct', 'incorrect'

  const [recallInput, setRecallInput] = useState('');
  const [recalledWords, setRecalledWords] = useState([]);
  const [incorrectWords, setIncorrectWords] = useState([]);
  
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const animationRef = useRef(null);
  const patientId = 'default';

  // Format Timer
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRating = (pts) => {
    if (pts >= 9) return 'Excellent';
    if (pts >= 7) return 'Good';
    if (pts >= 5) return 'Moderate';
    if (pts >= 3) return 'Mild Concern';
    return 'Poor';
  };

  const getRatingContext = (pts) => {
    if (pts >= 7) return 'Your short-term recall is above average for your age group.';
    if (pts >= 5) return 'Your short-term recall is within typical developmental ranges.';
    return 'Your short-term recall is below expected thresholds, suggesting possible interference issues.';
  };

  useEffect(() => {
    const shuffled = [...WORD_POOL].sort(() => Math.random() - 0.5);
    setWords(shuffled.slice(0, 10));
  }, [phase === 'pre']);

  useEffect(() => {
    if (phase === 'memorize' && words.length > 0) {
      animateWordSequence();
    }
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [phase, currentWordIndex, words]);

  useEffect(() => {
    if (phase === 'recall') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleFinishRecall();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      if (inputRef.current) inputRef.current.focus();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const animateWordSequence = () => {
    if (currentWordIndex >= 10) {
      setPhase('distraction');
      return;
    }

    setDisplayedWord(words[currentWordIndex]);
    setWordOpacity(1);
    setWordProgress(100);

    const wordDuration = 2000;
    const fadeOutStart = 1800;
    
    // Progress bar animation
    const startTime = performance.now();
    const animateProgress = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.max(0, 100 - (elapsed / wordDuration) * 100);
      setWordProgress(progress);
      
      if (elapsed < fadeOutStart) {
        requestAnimationFrame(animateProgress);
      } else if (elapsed >= fadeOutStart && elapsed < wordDuration) {
        setWordOpacity(0);
        requestAnimationFrame(animateProgress);
      }
    };
    requestAnimationFrame(animateProgress);

    animationRef.current = setTimeout(() => {
      setCurrentWordIndex((prev) => prev + 1);
    }, wordDuration + 200);
  };

  const handleDistractionSubmit = () => {
    const correct = distractionAnswer.trim() === '93';
    setDistractionStatus(correct ? 'correct' : 'incorrect');
    
    if (correct) {
      setTimeout(() => {
        startRecall();
      }, 1000);
    }
  };

  const startRecall = () => {
    setPhase('recall');
    setTimeLeft(60);
  };

  const handleAddWord = (e) => {
    e.preventDefault();
    const word = recallInput.trim();
    if (!word) return;

    // Case-insensitive match check
    const wordLower = word.toLowerCase();
    const isOriginal = words.some(w => w.toLowerCase() === wordLower);
    const originalWordCased = words.find(w => w.toLowerCase() === wordLower);
    
    const alreadyRecalled = recalledWords.some(w => w.toLowerCase() === wordLower);
    const alreadyIncorrect = incorrectWords.some(w => w.toLowerCase() === wordLower);

    if (alreadyRecalled || alreadyIncorrect) {
      setRecallInput('');
      return; // Deduplicate
    }

    if (isOriginal) {
      setRecalledWords([...recalledWords, originalWordCased]);
    } else {
      setIncorrectWords([...incorrectWords, word]);
    }
    
    setRecallInput('');
  };

  const handleFinishRecall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Process anything left in input
    let finalRecalled = [...recalledWords];
    let finalIncorrect = [...incorrectWords];

    if (recallInput.trim()) {
      const word = recallInput.trim();
      const wordLower = word.toLowerCase();
      const originalWordCased = words.find(w => w.toLowerCase() === wordLower);
      if (originalWordCased && !recalledWords.includes(originalWordCased)) {
        finalRecalled.push(originalWordCased);
      } else if (!originalWordCased && !incorrectWords.some(w => w.toLowerCase() === wordLower)) {
        finalIncorrect.push(word);
      }
    }
    
    setRecalledWords(finalRecalled);
    setIncorrectWords(finalIncorrect);
    completeTest(finalRecalled, finalIncorrect);
  };

  const completeTest = (finalRecalledWords, finalIncorrect) => {
    const finalScore = finalRecalledWords.length;
    setScore(finalScore);
    setPhase('result');
    
    const missed = words.filter(w => !finalRecalledWords.includes(w));

    repository.testResults.add({
      patientId,
      testType: 'word_recall',
      score: finalScore * 10,
      breakdown: {
        recalled: finalRecalledWords.length,
        missed: missed.length,
        incorrect: finalIncorrect.length,
      },
      rawData: {
        wordList: words,
        recalledWords: finalRecalledWords,
        distractionCorrect: distractionStatus === 'correct',
      },
      duration: 60 - timeLeft + 30, // Approx
      completedAt: new Date().toISOString(),
    });

    const { setCogniScore } = useAppStore.getState();
    setCogniScore(Math.max(0, Math.min(100, finalScore * 10)));
  };

  return (
    <div className="min-h-[calc(100vh-80px)] w-full">
      {/* Shared Header Structure */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full tracking-wide mb-3 uppercase">
            Memory
          </span>
          <h1 className="text-3xl font-black text-white mb-1">Word Recall Test</h1>
          <p className="text-slate-400 font-medium tracking-wide">
            Short-Term Memory Assessment: Evaluating immediate recall and cognitive interference resilience
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 flex items-center gap-2">
            <Timer className="w-4 h-4 text-purple-400" />
            <span className="text-slate-300 text-sm font-semibold">~4 Minutes</span>
          </div>
        </div>
      </div>

      {phase === 'pre' && (
        <div className="max-w-2xl mx-auto mt-12">
          <InstructionCard
            icon={BookOpen}
            title="Overview"
            instructions={
              <p className="text-slate-300 space-y-3">
                This test evaluates your short-term verbal memory. You will be shown a list of 10 words, one by one. Try to remember as many as you can. After a brief distraction task, you will be asked to recall the words.
              </p>
            }
          />
          <button
            onClick={() => setPhase('memorize')}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-lg transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/20"
          >
            Start Assessment →
          </button>
        </div>
      )}

      {phase === 'memorize' && (
        <div className="max-w-2xl mx-auto mt-12 flex flex-col items-center">
          <p className="tracking-widest text-slate-400 font-bold mb-6 text-sm">PHASE 1: MEMORIZE</p>
          <div className="bg-slate-900 rounded-[2rem] p-10 lg:p-14 w-full shadow-2xl border border-slate-800 text-center relative overflow-hidden min-h-[400px] flex flex-col justify-between">
            <p className="text-slate-300 font-medium mb-8">Remember these words. They will be shown one at a time.</p>
            
            <div className="flex-1 flex flex-col justify-center items-center">
              <h2 
                className="text-6xl font-black text-white transition-opacity duration-200"
                style={{ opacity: wordOpacity }}
              >
                {displayedWord}
              </h2>
            </div>

            <div className="mt-8 w-full max-w-sm mx-auto">
              <p className="text-slate-400 text-sm mb-3 font-semibold tracking-wide">
                {String(currentWordIndex + 1).padStart(2, '0')} / 10 Words Displayed
              </p>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full w-full"
                  style={{ transform: `scaleX(${wordProgress / 100})`, transformOrigin: 'left' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === 'distraction' && (
        <div className="max-w-xl mx-auto mt-12 flex flex-col items-center">
          <p className="tracking-widest text-slate-400 font-bold mb-6 text-sm">PHASE 2: DISTRACTION TASK</p>
          <div className="bg-slate-900 rounded-[2rem] p-10 lg:p-14 w-full shadow-2xl border border-slate-800 text-center relative">
            <p className="text-slate-300 font-medium mb-8 text-lg">Answer this math question before proceeding.</p>
            
            <p className="text-5xl font-black text-white mb-8 tracking-widest">
              100 − 7
            </p>

            <input
              type="number"
              value={distractionAnswer}
              onChange={(e) => setDistractionAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDistractionSubmit()}
              disabled={distractionStatus !== null}
              className="w-full max-w-[200px] mx-auto h-16 px-4 bg-slate-950 border-2 border-slate-700 rounded-2xl text-white text-center text-3xl font-bold focus:outline-none focus:border-blue-500 mb-6 disabled:opacity-50"
              placeholder="?"
              autoFocus
            />

            {distractionStatus === 'correct' && (
              <div className="flex flex-col items-center animate-in slide-in-bottom-2 fade-in">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-green-400 font-bold text-lg">Correct! Moving on...</p>
              </div>
            )}

            {distractionStatus === 'incorrect' && (
              <div className="flex flex-col items-center animate-in slide-in-bottom-2 fade-in">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-3">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-red-400 font-bold text-lg mb-6">The correct answer was 93.</p>
                <button
                  onClick={startRecall}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                >
                  Continue Anyway
                </button>
              </div>
            )}

            {distractionStatus === null && (
              <button
                onClick={handleDistractionSubmit}
                className="w-full max-w-[200px] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg mt-4 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Submit Answer
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'recall' && (
        <div className="max-w-3xl mx-auto mt-12 flex flex-col items-center">
          <p className="tracking-widest text-slate-400 font-bold mb-6 text-sm">PHASE 3: RECALL</p>
          <div className="bg-slate-900 rounded-[2rem] p-8 lg:p-10 w-full shadow-2xl border border-slate-800 text-center relative flex flex-col lg:flex-row gap-8">
            
            <div className="flex-1 flex flex-col">
              <p className="text-slate-300 font-medium mb-8 text-left leading-relaxed">
                Type as many words as you remember from the list. You have 60 seconds.
              </p>

              <form onSubmit={handleAddWord} className="mb-6 flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={recallInput}
                  onChange={(e) => setRecallInput(e.target.value)}
                  className="flex-1 h-14 px-6 bg-slate-950 border-2 border-slate-800 rounded-2xl text-white text-xl font-medium focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Type a word and Event Enter..."
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm transition-colors border border-slate-700"
                >
                  Add Word
                </button>
              </form>

              <div className="bg-slate-950/50 min-h-[160px] rounded-2xl p-6 border border-slate-800/50 flex flex-wrap gap-3 content-start">
                {recalledWords.length === 0 && incorrectWords.length === 0 && (
                  <p className="text-slate-500 italic w-full text-center mt-4">Submitted words will appear here...</p>
                )}
                {recalledWords.map((word, i) => (
                  <span key={`correct-${i}`} className="px-4 py-2 bg-green-500 text-white rounded-full font-bold shadow-lg shadow-green-500/20 text-sm animate-in scale-in duration-200">
                    {word}
                  </span>
                ))}
                {incorrectWords.map((word, i) => (
                  <span key={`wrong-${i}`} className="px-4 py-2 bg-red-500 text-white rounded-full font-bold shadow-lg shadow-red-500/20 text-sm animate-in scale-in duration-200">
                    {word}
                  </span>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-48 flex flex-col gap-4 border-t border-slate-800 lg:border-t-0 lg:border-l lg:pl-8 pt-6 lg:pt-0">
              <div className="text-center bg-slate-950/50 rounded-2xl p-6 border border-slate-800/50 flex flex-col items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Time Left</span>
                <span className={`text-4xl font-black tracking-tight ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-purple-400'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              
              <button
                onClick={handleFinishRecall}
                className="w-full mt-auto py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-transform hover:scale-[1.02] shadow-lg text-sm tracking-wide border border-slate-700"
              >
                Finish Early
              </button>
            </div>
            
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className="max-w-5xl mx-auto mt-8 slide-in-bottom">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl flex flex-col items-center justify-center">
              <h3 className="text-lg font-bold text-slate-300 mb-8">Test Results</h3>
              <ScoreArc score={score} maxScore={10} />
              <p className="text-slate-400 font-medium mt-4">words recalled correctly</p>
              
              <div className="mt-8 px-6 py-2 rounded-full bg-slate-800/50 border border-slate-700 w-full text-center">
                <span className="text-sm font-bold text-white tracking-wide">
                  Rating: <span className={score >= 7 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400'}>
                    {getRating(score)}
                  </span>
                </span>
              </div>
              <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed px-4">
                {getRatingContext(score)}
              </p>
            </div>

            <div className="lg:col-span-8 bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-xl flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Original Word List</h3>
                <div className="flex gap-4">
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div> Recalled
                  </span>
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-slate-600"></div> Missed
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {words.map((word, i) => {
                  const wasRecalled = recalledWords.includes(word);
                  return (
                    <div
                      key={`result-${i}`}
                      className={`px-4 py-3 rounded-xl border flex items-center justify-between font-bold text-sm ${
                        wasRecalled ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {word}
                      {wasRecalled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 opacity-50" />}
                    </div>
                  );
                })}
              </div>

              {incorrectWords.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Not in List (Intrusions)</h4>
                  <div className="flex flex-wrap gap-2">
                    {incorrectWords.map((word, i) => (
                      <span key={`incorrect-${i}`} className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm font-bold">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 mt-auto pt-8">
                <button
                  onClick={() => {
                    setPhase('pre');
                    setCurrentWordIndex(0);
                    setRecalledWords([]);
                    setIncorrectWords([]);
                    setRecallInput('');
                    setDistractionStatus(null);
                    setDistractionAnswer('');
                    const shuffled = [...WORD_POOL].sort(() => Math.random() - 0.5);
                    setWords(shuffled.slice(0, 10));
                  }}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-colors border border-slate-700 text-sm tracking-wide"
                >
                  Retake Test
                </button>
                <button
                  onClick={() => navigate('/tests')}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-transform shadow-lg shadow-blue-500/20 text-sm tracking-wide"
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

export default WordRecallTest;
