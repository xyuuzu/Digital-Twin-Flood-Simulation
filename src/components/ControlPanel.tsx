import React from 'react';
import { Play, Pause, SkipBack } from 'lucide-react';
import type { FewsDataPoint } from '../types';

interface Props {
  data: FewsDataPoint[];
  currentIndex: number;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onSeek: (index: number) => void;
  onReset: () => void;
}

export function ControlPanel({ data, currentIndex, isPlaying, onPlayToggle, onSeek, onReset }: Props) {
  if (!data || data.length === 0) return null;

  const currentPoint = data[currentIndex];
  
  // Format Date beautifully
  const formatTime = (d: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  };

  return (
    <footer className="h-24 bg-white border-t border-slate-200 px-8 py-4 flex items-center gap-8 shrink-0 z-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={onPlayToggle}
          className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors"
        >
          {isPlaying ? <Pause className="w-5 h-5 mx-auto" /> : <Play className="w-5 h-5 ml-1" />}
        </button>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timeline Simulasi</span>
          <span className="text-sm font-bold font-mono">{formatTime(currentPoint.date)}</span>
        </div>
      </div>

      <div className="flex-grow flex flex-col gap-2">
        <input 
          type="range"
          min={0}
          max={data.length - 1}
          value={currentIndex}
          onChange={(e) => onSeek(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono font-bold">
          <span>T+0 JAM</span>
          <span>T+{Math.floor(data.length/4)}</span>
          <span>T+{Math.floor(data.length/2)}</span>
          <span>T+{Math.floor((data.length/4)*3)}</span>
          <span>T+{data.length-1} JAM</span>
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        <button onClick={onReset} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
          <SkipBack className="w-3 h-3" /> Reset
        </button>
        <button className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">
          Export Data
        </button>
      </div>
    </footer>
  );
}
