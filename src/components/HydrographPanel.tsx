import React from 'react';
import type { FewsDataPoint } from '../types';

interface Props {
  data: FewsDataPoint[];
  currentIndex: number;
}

export function HydrographPanel({ data, currentIndex }: Props) {
  if (!data || data.length === 0) return null;

  const maxFlow = Math.max(...data.map(d => d.riverFlow), 500);
  const chartHeight = 150;
  const chartWidth = 300;

  const getPoints = () => {
    return data.map((d, i) => {
      const x = (i / (data.length - 1)) * chartWidth;
      const y = chartHeight - (d.riverFlow / maxFlow) * chartHeight;
      return `${x},${y}`;
    }).join(' ');
  };

  const currentPoint = data[currentIndex];
  const currentX = (currentIndex / (data.length - 1)) * chartWidth;
  const currentY = chartHeight - (currentPoint.riverFlow / maxFlow) * chartHeight;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col shrink-0">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Hidrograf Aliran</h3>
      
      <div className="relative w-full h-[150px] rounded-lg overflow-hidden border-b border-slate-100 mb-2">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
          {/* Threshold lines */}
          <line x1="0" y1={chartHeight - (150/maxFlow)*chartHeight} x2={chartWidth} y2={chartHeight - (150/maxFlow)*chartHeight} stroke="#eab308" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1={chartHeight - (300/maxFlow)*chartHeight} x2={chartWidth} y2={chartHeight - (300/maxFlow)*chartHeight} stroke="#f97316" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1={chartHeight - (450/maxFlow)*chartHeight} x2={chartWidth} y2={chartHeight - (450/maxFlow)*chartHeight} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" />

          {/* Area fill */}
          <polygon 
            points={`0,${chartHeight} ${getPoints()} ${chartWidth},${chartHeight}`} 
            fill="rgba(59, 130, 246, 0.2)" 
          />
          {/* Line */}
          <polyline 
            points={getPoints()} 
            fill="none" 
            stroke="#3b82f6" 
            strokeWidth="2" 
            strokeLinejoin="round" 
          />
          {/* Current playhead */}
          <line x1={currentX} y1="0" x2={currentX} y2={chartHeight} stroke="#1e293b" strokeWidth="1.5" />
          <circle cx={currentX} cy={currentY} r="4" fill="#1e293b" />
        </svg>

        {/* Labels overlay */}
        <div className="absolute top-1 left-2 text-[10px] text-red-500 font-bold tracking-widest select-none">BAHAYA</div>
        <div className="absolute bottom-1 right-2 text-[10px] bg-white/90 px-1.5 py-0.5 rounded border border-slate-200 shadow-sm font-mono font-bold select-none text-slate-700">
          {currentPoint.riverFlow.toFixed(1)} <span className="font-sans text-[8px] font-normal text-slate-500">m³/s</span>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold px-1">
        <span>T+0</span>
        <span className="text-blue-500 text-xs text-center border-t border-blue-500 pt-1 mt-1 -ml-2 -mr-2">T+{currentIndex}</span>
        <span>T+{data.length - 1}</span>
      </div>
    </div>
  );
}
