import { useState, useRef, useCallback } from 'react';
import { Download, ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const layers = [
  {
    id: 1,
    name: 'Presentation Layer',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: '#8b5cf6',
    description: 'User-facing React components with Tailwind CSS styling',
    components: ['Dashboard', 'Tests', 'CheckIn', 'Insights', 'Medications', 'Profile', 'Caregiver Portal'],
    tech: ['React Router', 'Tailwind CSS', 'Lucide Icons', 'Recharts'],
  },
  {
    id: 2,
    name: 'State Management Layer',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.1)',
    borderColor: '#06b6d4',
    description: 'Zustand stores for auth, app state, and UI controls',
    components: ['useAuthStore', 'useAppStore', 'useUIStore'],
    tech: ['Zustand'],
  },
  {
    id: 3,
    name: 'Data Access Layer',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
    description: 'Dexie.js repositories for typed CRUD operations',
    components: ['patients', 'cogniScores', 'checkIns', 'testResults', 'speechSessions', 'facialSessions', 'medications', 'insights'],
    tech: ['Dexie.js', 'IndexedDB', 'TypeScript Interfaces'],
  },
  {
    id: 4,
    name: 'Business Logic Layer',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#f59e0b',
    description: 'CogniScore computation, test scoring, rules engine',
    components: ['CogniScore Engine', 'Test Scoring', 'Insights Rules', 'Trend Analysis'],
    tech: ['Web Workers', 'Algorithms'],
  },
  {
    id: 5,
    name: 'API Service Layer',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
    description: 'Backend communication and sync queue management',
    components: ['REST API', 'WebSocket', 'Sync Queue', 'Error Handling'],
    tech: ['Fetch API', 'Offline Queue'],
  },
  {
    id: 6,
    name: 'Storage Layer',
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.1)',
    borderColor: '#ec4899',
    description: 'IndexedDB for offline data, localStorage for preferences',
    components: ['IndexedDB', 'LocalStorage', 'Session Storage', 'Cache'],
    tech: ['Dexie.js', 'Browser Storage'],
  },
  {
    id: 7,
    name: 'External Services Layer',
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: '#6366f1',
    description: 'Third-party integrations and ML models',
    components: ['Speech Analysis API', 'Facial Analysis API', 'AI Insights', 'Notifications'],
    tech: ['TensorFlow.js', 'Web Speech API', 'MediaPipe'],
  },
];

const connections = [
  { from: 1, to: 2, label: 'User Actions' },
  { from: 2, to: 3, label: 'State Updates' },
  { from: 3, to: 4, label: 'Data Fetch' },
  { from: 4, to: 5, label: 'Business Rules' },
  { from: 5, to: 6, label: 'API Calls' },
  { from: 6, to: 7, label: 'External APIs' },
];

export default function ArchitecturePage() {
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleDownload = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 1200;
    canvas.height = 1600;

    img.onload = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      const link = document.createElement('a');
      link.download = 'nakshatra-architecture.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      
      <main className="flex-1 ml-0 md:ml-64 pb-20 md:pb-0">
        <div className="p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">System Architecture</h1>
                <p className="text-slate-400 mt-1">Nakshatra Cognitive Assessment Platform</p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={20} />
                </button>
                <span className="text-slate-400 text-sm min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={20} />
                </button>
                <button
                  onClick={handleReset}
                  className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                  title="Reset View"
                >
                  <RotateCcw size={20} />
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                >
                  <Download size={18} />
                  <span className="hidden sm:inline">Download PNG</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex items-center gap-2">
                <Info size={18} className="text-slate-400" />
                <span className="text-slate-400 text-sm">Click on a layer to see details. Drag to pan.</span>
              </div>
              
              <div 
                className="overflow-hidden cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <svg
                  ref={svgRef}
                  viewBox="0 0 1200 1600"
                  className="w-full"
                  style={{ 
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                    transformOrigin: 'top left',
                    minHeight: '600px'
                  }}
                >
                  <defs>
                    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0f172a" />
                      <stop offset="100%" stopColor="#1e293b" />
                    </linearGradient>
                    {layers.map((layer) => (
                      <linearGradient key={`grad-${layer.id}`} id={`layerGrad-${layer.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={layer.color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={layer.color} stopOpacity="0.1" />
                      </linearGradient>
                    ))}
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  <rect width="1200" height="1600" fill="url(#bgGrad)" />

                  {layers.map((layer, index) => {
                    const y = 80 + index * 210;
                    const isSelected = selectedLayer === layer.id;
                    
                    return (
                      <g key={layer.id}>
                        <rect
                          x="50"
                          y={y}
                          width="1100"
                          height="180"
                          rx="12"
                          fill={isSelected ? layer.color : `url(#layerGrad-${layer.id})`}
                          stroke={layer.color}
                          strokeWidth={isSelected ? "3" : "1.5"}
                          opacity={isSelected ? 1 : 0.8}
                          className="cursor-pointer transition-all duration-200"
                          onClick={() => setSelectedLayer(isSelected ? null : layer.id)}
                          filter={isSelected ? "url(#glow)" : ""}
                        />
                        
                        <rect x="50" y={y} width="8" height="180" rx="4" fill={layer.color} />
                        
                        <text x="80" y={y + 35} fill="white" fontSize="20" fontWeight="bold">
                          Layer {layer.id}: {layer.name}
                        </text>
                        
                        <text x="80" y={y + 60} fill={layer.color} fontSize="14" opacity="0.8">
                          {layer.description}
                        </text>
                        
                        <line x1="80" y1={y + 75} x2="500" y2={y + 75} stroke={layer.color} strokeWidth="1" opacity="0.3" />
                        
                        <text x="80" y={y + 100} fill="#94a3b8" fontSize="13" fontWeight="600">Components:</text>
                        <text x="190" y={y + 100} fill="#cbd5e1" fontSize="13">
                          {layer.components.join(' • ')}
                        </text>
                        
                        <text x="80" y={y + 125} fill="#94a3b8" fontSize="13" fontWeight="600">Tech:</text>
                        <text x="130" y={y + 125} fill="#cbd5e1" fontSize="13">
                          {layer.tech.join(' • ')}
                        </text>

                        <rect
                          x="950"
                          y={y + 65}
                          width="180"
                          height="100"
                          rx="8"
                          fill={layer.bgColor}
                          stroke={layer.color}
                          strokeWidth="1"
                          opacity="0.5"
                        />
                        <text x="1040" y={y + 100} fill={layer.color} fontSize="48" fontWeight="bold" textAnchor="middle">
                          {layer.id}
                        </text>
                        <text x="1040" y={y + 150} fill={layer.color} fontSize="12" textAnchor="middle" opacity="0.7">
                          LAYER
                        </text>
                      </g>
                    );
                  })}

                  {connections.map((conn, index) => {
                    const fromY = 80 + (conn.from - 1) * 210 + 180;
                    const toY = 80 + (conn.to - 1) * 210;
                    const midY = (fromY + toY) / 2;
                    
                    return (
                      <g key={`conn-${index}`}>
                        <line
                          x1="600"
                          y1={fromY}
                          x2="600"
                          y2={toY}
                          stroke="#475569"
                          strokeWidth="2"
                          strokeDasharray="6,4"
                          opacity="0.6"
                        />
                        <polygon
                          points={`600,${toY} 595,${toY + 12} 605,${toY + 12}`}
                          fill="#475569"
                          opacity="0.6"
                        />
                        <rect
                          x="520"
                          y={midY - 12}
                          width="160"
                          height="24"
                          rx="12"
                          fill="#1e293b"
                          stroke="#334155"
                          strokeWidth="1"
                        />
                        <text
                          x="600"
                          y={midY + 4}
                          fill="#94a3b8"
                          fontSize="11"
                          textAnchor="middle"
                        >
                          {conn.label}
                        </text>
                      </g>
                    );
                  })}

                  <text x="600" y="1560" fill="#64748b" fontSize="14" textAnchor="middle">
                    Nakshatra Cognitive Assessment Platform • System Architecture Diagram
                  </text>
                </svg>
              </div>
            </div>

            {selectedLayer && (
              <div className="mt-6 p-6 rounded-xl border" style={{ 
                backgroundColor: layers.find(l => l.id === selectedLayer)?.bgColor,
                borderColor: layers.find(l => l.id === selectedLayer)?.color 
              }}>
                <h3 className="text-xl font-bold text-white mb-4">
                  {layers.find(l => l.id === selectedLayer)?.name}
                </h3>
                <p className="text-slate-300 mb-4">
                  {layers.find(l => l.id === selectedLayer)?.description}
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-400 mb-2">Components</h4>
                    <ul className="space-y-1">
                      {layers.find(l => l.id === selectedLayer)?.components.map((comp, i) => (
                        <li key={i} className="text-slate-200 text-sm flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: layers.find(l => l.id === selectedLayer)?.color }}></span>
                          {comp}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-400 mb-2">Technologies</h4>
                    <ul className="space-y-1">
                      {layers.find(l => l.id === selectedLayer)?.tech.map((tech, i) => (
                        <li key={i} className="text-slate-200 text-sm flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: layers.find(l => l.id === selectedLayer)?.color }}></span>
                          {tech}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
