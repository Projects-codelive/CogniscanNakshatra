import { useEffect, useState } from 'react';

const getScoreColor = (score) => {
  if (score === 0 || score === null || score === undefined) return { main: '#64748b', gradient: ['#64748b', '#94a3b8'] };
  if (score >= 80) return { main: '#10b981', gradient: ['#10b981', '#34d399'] };
  if (score >= 60) return { main: '#06b6d4', gradient: ['#06b6d4', '#22d3ee'] };
  if (score >= 40) return { main: '#f59e0b', gradient: ['#f59e0b', '#fbbf24'] };
  return { main: '#ef4444', gradient: ['#ef4444', '#f87171'] };
};

const getScoreLabel = (score) => {
  if (score === 0 || score === null || score === undefined) return 'No Data';
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  return 'Needs Attention';
};

export default function CogniScoreGauge({ score = 0, size = 200, strokeWidth = 12, showLabel = true }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI;
  const center = size / 2;
  
  useEffect(() => {
    const duration = 1500;
    const startTime = performance.now();
    const startValue = animatedScore;
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (score - startValue) * easeOut;
      
      setAnimatedScore(Math.round(current * 10) / 10);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [score]);

  const progress = animatedScore / 100;
  const offset = circumference - (progress * circumference);
  const colors = getScoreColor(animatedScore);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={`gaugeGrad-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.gradient[0]} />
            <stop offset="100%" stopColor={colors.gradient[1]} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
        />
        
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#gaugeGrad-${score})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter="url(#glow)"
          style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
        />
        
        {[...Array(10)].map((_, i) => {
          const angle = -180 + (i * 18);
          const rad = (angle * Math.PI) / 180;
          const x1 = center + (radius - strokeWidth / 2 - 8) * Math.cos(rad);
          const y1 = center + (radius - strokeWidth / 2 - 8) * Math.sin(rad);
          const x2 = center + (radius - strokeWidth / 2 - 16) * Math.cos(rad);
          const y2 = center + (radius - strokeWidth / 2 - 16) * Math.sin(rad);
          
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={i <= progress * 10 ? colors.main : '#475569'}
              strokeWidth="2"
              opacity="0.6"
            />
          );
        })}
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className="text-4xl md:text-5xl font-bold transition-colors duration-500"
          style={{ color: colors.main }}
        >
          {Math.round(animatedScore)}
        </span>
        <span className="text-slate-400 text-xs md:text-sm mt-1">CogniScore</span>
        {showLabel && (
          <span 
            className="text-xs md:text-sm font-medium mt-2 px-3 py-1 rounded-full transition-colors duration-500"
            style={{ 
              color: colors.main, 
              backgroundColor: `${colors.main}20` 
            }}
          >
            {getScoreLabel(animatedScore)}
          </span>
        )}
      </div>
    </div>
  );
}
