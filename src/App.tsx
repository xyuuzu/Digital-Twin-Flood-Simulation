import { useState, useEffect } from 'react';
import { CesiumMap } from './components/CesiumMap';
import { HydrographPanel } from './components/HydrographPanel';
import { ControlPanel } from './components/ControlPanel';
import { generateSimulationData } from './lib/utils';
import type { SimulationConfig, FewsDataPoint } from './types';
import { X, Terminal, Activity, CheckCircle, Square, XCircle, PlayCircle, Download, FileJson, Server, Map as MapIcon, Droplets } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  // === SYSTEM API STATE ===
  const [activeTab, setActiveTab] = useState<'jobs' | 'new-job' | 'forecasts'>('jobs');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [responseLog, setResponseLog] = useState<{endpoint: string, method: string, status: number, data: any} | null>(null);
  const [compareResult, setCompareResult] = useState<any>(null);

  const [jobs, setJobs] = useState([
    { job_id: 'sim-8f2a1b', status: 'running', progress_pct: 45, stage: 'HEC-RAS Unsteady Flow', forecast_mode: 'ml', event_start: '2026-04-09T00:00:00', event_end: '2026-04-11T23:00:00' },
    { job_id: 'sim-2c9d4e', status: 'completed', progress_pct: 100, stage: 'Finalizing', forecast_mode: 'hybrid', event_start: '2026-03-01T00:00:00', event_end: '2026-03-03T23:00:00' },
    { job_id: 'sim-5a1e8c', status: 'failed', progress_pct: 12, stage: 'HEC-HMS Baseline', forecast_mode: 'lstm', event_start: '2026-02-15T00:00:00', event_end: '2026-02-17T23:00:00' },
  ]);

  const [newJobParams, setNewJobParams] = useState({
    event_start: '2026-04-09T00:00',
    event_end: '2026-04-11T23:00',
    rainfall_until: '2026-04-10T23:00',
    forecast_mode: 'ml',
    use_pda_baseflow: false,
  });

  // === PLAYBACK STATE ===
  const [simData, setSimData] = useState<FewsDataPoint[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Link selected job to visual playback
  useEffect(() => {
    if (selectedJob && (selectedJob.status === 'running' || selectedJob.status === 'completed')) {
       // generate dummy data mapped to this job's parameters to make it look real
       const config: SimulationConfig = {
          startDate: selectedJob.event_start,
          durationHours: 48,
          rainfallIntensityScale: selectedJob.forecast_mode === 'transformer' ? 8 : (selectedJob.forecast_mode === 'hybrid' ? 6 : 4),
          initialWaterLevel: 0.1
       };
       setSimData(generateSimulationData(config));
       setCurrentIndex(0);
       setIsPlaying(selectedJob.status === 'running');
    } else {
       setSimData([]);
       setCurrentIndex(0);
       setIsPlaying(false);
    }
  }, [selectedJob]);

  // Playback engine loop
  useEffect(() => {
    if (!isPlaying || simData.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= simData.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying, simData.length]);


  // === API ACTIONS ===
  const showResponse = (method: string, endpoint: string, data: any) => {
    setResponseLog({ method, endpoint, status: 200, data });
  };

  const handleHealthCheck = () => {
    showResponse('GET', '/health', { status: 'healthy', version: '0.1.0', timestamp: new Date().toISOString() });
  };

  const handleCreateSimulation = () => {
    const newJob = {
      job_id: `sim-${Math.floor(Math.random()*100000).toString(16)}`,
      status: 'queued',
      progress_pct: 0,
      stage: 'Waiting for worker',
      ...newJobParams
    };
    showResponse('POST', '/simulations', newJob);
    setJobs([newJob, ...jobs]);
    setActiveTab('jobs');
    setSelectedJob(newJob);
    
    // Simulate background worker progression
    setTimeout(() => setJobs(curr => curr.map(j => j.job_id === newJob.job_id ? { ...j, status: 'running', stage: 'HEC-HMS Running', progress_pct: 15 } : j)), 2000);
    setTimeout(() => setJobs(curr => curr.map(j => j.job_id === newJob.job_id ? { ...j, status: 'running', stage: 'HEC-RAS Unsteady Flow', progress_pct: 45 } : j)), 6000);
    setTimeout(() => {
       setJobs(curr => curr.map(j => j.job_id === newJob.job_id ? { ...j, status: 'completed', stage: 'Finalized', progress_pct: 100 } : j));
       setSelectedJob((curr: any) => curr?.job_id === newJob.job_id ? { ...curr, status: 'completed', stage: 'Finalized', progress_pct: 100 } : curr);
    }, 10000);
  };

  const handleJobAction = (action: string, id: string) => {
    let updatedJob = null;
    if (action === 'cancel') {
       updatedJob = { ...jobs.find(j => j.job_id === id)!, status: 'cancelled', stage: 'Cancelled by user' };
       setJobs(jobs.map(j => j.job_id === id ? updatedJob : j));
       if (selectedJob?.job_id === id) setSelectedJob(updatedJob);
    } else if (action === 'finalize') {
       updatedJob = { ...jobs.find(j => j.job_id === id)!, status: 'completed', progress_pct: 100, stage: 'Finalized manually' };
       setJobs(jobs.map(j => j.job_id === id ? updatedJob : j));
       if (selectedJob?.job_id === id) setSelectedJob(updatedJob);
    }
    showResponse('POST', `/simulations/${id}/${action}`, updatedJob);
  };

  const handleFetch = (endpoint: string, id: string) => {
    let dummyData: any = { message: 'Dummy data not defined' };
    if (endpoint === '') {
       dummyData = jobs.find(j => j.job_id === id);
    } else if (endpoint === 'results') {
       dummyData = {
         job_id: id, status: 'completed', 
         summary: { max_wse: 662.5, flood_volume_m3: 1500000, duration_hours: 48 },
         files: { 'p05.hdf': '/api/simulations/'+id+'/files/p05.hdf', 'inundation.tif': '/api/simulations/'+id+'/files/inundation.tif' }
       };
    } else if (endpoint === 'playback') {
       dummyData = {
         timestamps: ['2026-04-09T00:00:00', '2026-04-09T01:00:00', '2026-04-09T02:00:00'],
         pda_points: { 'SENSOR_MENGGER': { lon: 107.625, lat: -6.968, wse: [660.1, 660.5, 661.2] } },
         flood_extent_url: `/api/simulations/${id}/files/flood_extent.geojson`
       };
    } else if (endpoint === 'calibration') {
       dummyData = {
         'SENSOR_MENGGER': { classification: 'in_domain_wet', bias_m: 0.15, rmse_m: 0.22, nse: 0.85 },
         'SENSOR_CIGANITRI': { classification: 'in_domain_dry', recommended_snap_px: 3 }
       };
    }
    showResponse('GET', `/simulations/${id}${endpoint ? '/'+endpoint : ''}`, dummyData);
  };

  const handleDownloadFile = (id: string, fileName: string) => {
    showResponse('GET', `/simulations/${id}/files/${fileName}`, { 
      type: "application/octet-stream", 
      size_bytes: Math.floor(Math.random() * 50000000) + 1000000,
      note: "File download simulated (binary data omitted)"
    });
  };

  const handleCompareForecasts = () => {
    setCompareResult(null);
    const res = {
      window: { rainfall_until: '2026-04-10T23:00', forecast_end: '2026-04-11T23:00' },
      metrics: {
        ml: { 'CIEUNTEUNG': { sum_mm: 120.5, max_mmh: 25.4 } },
        lstm: { 'CIEUNTEUNG': { sum_mm: 115.2, max_mmh: 22.1 } },
        transformer: { 'CIEUNTEUNG': { sum_mm: 130.0, max_mmh: 30.0 } },
      }
    };
    setTimeout(() => {
      setCompareResult(res);
      showResponse('POST', '/forecasts/compare', res);
    }, 1000);
  };

  const currentPlaybackPoint = simData[currentIndex];
  
  const statusTheme = currentPlaybackPoint ? {
    AMAN: { ping: 'bg-emerald-400', dot: 'bg-emerald-500', text: 'text-emerald-600' },
    WASPADA: { ping: 'bg-yellow-400', dot: 'bg-yellow-500', text: 'text-yellow-600' },
    SIAGA: { ping: 'bg-orange-400', dot: 'bg-orange-500', text: 'text-orange-600' },
    BAHAYA: { ping: 'bg-red-400', dot: 'bg-red-500', text: 'text-red-600' },
  }[currentPlaybackPoint.status] : null;

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-800 font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR - INTEGRATED API CONSOLE */}
      <aside className="w-[450px] bg-slate-50 flex flex-col border-r border-slate-200 shadow-xl z-30 shrink-0 h-full">
         <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg shadow-sm">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-800">C2 Simulation Engine</h2>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">FFews API v0.1.0</p>
            </div>
          </div>
          <button onClick={handleHealthCheck} className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded text-[10px] font-bold transition-colors">
            <Server className="w-3 h-3" /> API OK
          </button>
        </div>

        {/* Sidebar Tabs */}
        <div className="flex px-4 pt-4 border-b border-slate-200 bg-white shrink-0 gap-2">
          <button onClick={() => { setActiveTab('jobs'); setSelectedJob(null); }} className={cn("px-3 py-2 text-xs font-bold border-b-2 transition-colors", activeTab === 'jobs' && !selectedJob ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}>Jobs</button>
          <button onClick={() => { setActiveTab('new-job'); setSelectedJob(null); }} className={cn("px-3 py-2 text-xs font-bold border-b-2 transition-colors", activeTab === 'new-job' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}>New Run</button>
          <button onClick={() => { setActiveTab('forecasts'); setSelectedJob(null); }} className={cn("px-3 py-2 text-xs font-bold border-b-2 transition-colors", activeTab === 'forecasts' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}>Compare Models</button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-4">
          
          {selectedJob && (
            <div className="animate-in slide-in-from-right-4 duration-200">
               <button onClick={() => setSelectedJob(null)} className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-4 uppercase tracking-widest">
                &larr; Back to Job List
              </button>
              
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-black font-mono">{selectedJob.job_id}</h3>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono tracking-widest uppercase">Target: Citarum Basin</div>
                  </div>
                  <span className={cn(
                    "px-2 py-1 text-[10px] font-bold uppercase rounded",
                    selectedJob.status === 'running' ? 'bg-blue-100 text-blue-700' :
                    selectedJob.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    selectedJob.status === 'cancelled' ? 'bg-slate-100 text-slate-700' :
                    'bg-red-100 text-red-700'
                  )}>{selectedJob.status}</span>
                </div>
                
                <div className="mb-6">
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                    <span>{selectedJob.stage}</span>
                    <span>{selectedJob.progress_pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{width: `${selectedJob.progress_pct}%`}}></div>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-slate-100 pt-4 flex-wrap">
                  {selectedJob.status === 'running' && (
                    <button onClick={() => handleJobAction('cancel', selectedJob.job_id)} className="px-2 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-red-100 transition-colors">
                      <Square className="w-3 h-3" /> CANCEL
                    </button>
                  )}
                  {['failed', 'running'].includes(selectedJob.status) && (
                    <button onClick={() => handleJobAction('finalize', selectedJob.job_id)} className="px-2 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-orange-100 transition-colors">
                       FORCE RECOVER
                    </button>
                  )}
                  {selectedJob.status === 'completed' && (
                    <>
                      <button onClick={() => handleFetch('results', selectedJob.job_id)} className="px-2 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 rounded text-[10px] font-bold hover:bg-slate-100 transition-colors flex items-center gap-1"><FileJson className="w-3 h-3"/> RAW RESULTS</button>
                      <button onClick={() => handleFetch('calibration', selectedJob.job_id)} className="px-2 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 rounded text-[10px] font-bold hover:bg-slate-100 transition-colors flex items-center gap-1"><Activity className="w-3 h-3"/> CALIBRATION</button>
                    </>
                  )}
                </div>
              </div>

               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 mb-4">
                 <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Simulation Parameters</h4>
                 <div className="grid grid-cols-2 gap-4 text-xs font-mono mt-1">
                    <div>
                      <span className="text-slate-400 block mb-1">Model</span>
                      <span className="text-slate-800 font-bold">{selectedJob.forecast_mode}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Start Date</span>
                      <span className="text-slate-800">{selectedJob.event_start}</span>
                    </div>
                 </div>
              </div>

              {selectedJob.status === 'completed' && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">Export Data</h4>
                  <div className="flex flex-col gap-2">
                     <button onClick={() => handleDownloadFile(selectedJob.job_id, 'p05.hdf')} className="flex items-center justify-between text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded hover:bg-blue-50 hover:text-blue-700 transition">
                       <span>p05.hdf</span><Download className="w-3 h-3" />
                     </button>
                     <button onClick={() => handleDownloadFile(selectedJob.job_id, 'inundation.tif')} className="flex items-center justify-between text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded hover:bg-blue-50 hover:text-blue-700 transition">
                       <span>inundation.tif</span><Download className="w-3 h-3" />
                     </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!selectedJob && activeTab === 'jobs' && (
            <div className="flex flex-col gap-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Executions</span>
                <button onClick={() => showResponse('GET', '/simulations', jobs)} className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">Live Sync</button>
              </div>
              {jobs.map(job => (
                <div key={job.job_id} onClick={() => setSelectedJob(job)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    {job.status === 'running' ? <Activity className="w-4 h-4 text-blue-500 animate-pulse" /> : 
                     job.status === 'completed' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> :
                     job.status === 'cancelled' ? <Square className="w-4 h-4 text-slate-400" /> :
                     <XCircle className="w-4 h-4 text-red-500" />}
                    <div>
                      <div className="text-xs font-bold font-mono text-slate-800 group-hover:text-blue-600 transition-colors">{job.job_id}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{job.stage}</div>
                    </div>
                  </div>
                  <span className={cn("px-2 py-0.5 text-[9px] font-bold uppercase rounded", 
                    job.status === 'running' ? 'bg-blue-100 text-blue-700' :
                    job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    job.status === 'cancelled' ? 'bg-slate-100 text-slate-700' : 'bg-red-100 text-red-700'
                  )}>{job.status}</span>
                </div>
              ))}
            </div>
          )}

          {!selectedJob && activeTab === 'new-job' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Simulation Start</label>
                  <input type="datetime-local" value={newJobParams.event_start} onChange={e=>setNewJobParams({...newJobParams, event_start: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Simulation End</label>
                  <input type="datetime-local" value={newJobParams.event_end} onChange={e=>setNewJobParams({...newJobParams, event_end: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Rainfall Forecast Mode</label>
                  <select value={newJobParams.forecast_mode} onChange={e=>setNewJobParams({...newJobParams, forecast_mode: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:border-blue-500 leading-tight">
                    <option value="zero">Zero (No Rain)</option>
                    <option value="observed">Observed (Hindcast)</option>
                    <option value="ml">ML (RandomForest)</option>
                    <option value="lstm">LSTM (PyTorch)</option>
                    <option value="transformer">Transformer (PyTorch)</option>
                    <option value="hybrid">Hybrid (LSTM + BMKG)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="pda_baseflow" checked={newJobParams.use_pda_baseflow} onChange={e=>setNewJobParams({...newJobParams, use_pda_baseflow: e.target.checked})} className="rounded border-slate-300 text-blue-600" />
                  <label htmlFor="pda_baseflow" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Apply PDA Baseflow Routing</label>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button onClick={handleCreateSimulation} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  Dispatch Job to Queue
                </button>
              </div>
            </div>
          )}

          {!selectedJob && activeTab === 'forecasts' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 mb-4 leading-relaxed font-medium">Evaluate ML, LSTM, and Transformer model variants synchronously on the configured temporal window before committing to a full HEC-RAS flow simulation.</p>
                <button onClick={handleCompareForecasts} className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors shadow-sm flex items-center justify-center gap-2">
                  <PlayCircle className="w-4 h-4" /> Execute Benchmarks
                </button>
              </div>
              {compareResult && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Model Accuracy Metrics</h4>
                  <div className="space-y-3">
                    {Object.entries(compareResult.metrics).map(([mode, data]: [string, any]) => (
                      <div key={mode} className="bg-slate-50 p-2.5 rounded border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-1.5">{mode}</div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div><span className="text-slate-400">sum_mm:</span> {data['CIEUNTEUNG'].sum_mm}</div>
                          <div><span className="text-slate-400">max_mmh:</span> {data['CIEUNTEUNG'].max_mmh}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* API Response Logger (Bottom of Sidebar) */}
        {responseLog && (
           <div className="h-48 border-t border-slate-300 bg-slate-900 text-slate-300 flex flex-col shrink-0">
             <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-700 bg-slate-950">
               <div className="flex items-center gap-2">
                 <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded", responseLog.method === 'GET' ? 'bg-sky-900/50 text-sky-400' : 'bg-emerald-900/50 text-emerald-400')}>
                    {responseLog.method}
                 </span>
                 <span className="text-[10px] font-mono text-white truncate max-w-[180px]">{responseLog.endpoint}</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="text-[10px] font-mono text-emerald-400">{responseLog.status} OK</span>
                 <button onClick={() => setResponseLog(null)} className="text-slate-500 hover:text-slate-300"><X className="w-3 h-3"/></button>
               </div>
             </div>
             <div className="p-3 overflow-y-auto flex-grow text-[10px] font-mono bg-[#0d1117] text-[#c9d1d9] whitespace-pre-wrap">
                {JSON.stringify(responseLog.data, null, 2)}
             </div>
           </div>
        )}
      </aside>

      {/* RIGHT MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-100 overflow-hidden relative">
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white shadow-sm shrink-0 z-20">
          <div className="flex items-center gap-3">
             <h1 className="text-lg font-bold tracking-tight text-slate-800">Citarum Basin Command View</h1>
             {selectedJob && (
               <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-xs font-mono font-bold tracking-wider uppercase">
                 Focus: {selectedJob.job_id}
               </span>
             )}
          </div>
          
          <div className="flex items-center gap-6">
            {simData.length > 0 && currentPlaybackPoint && (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Simulation Time</span>
                  <p className="font-mono font-bold text-lg leading-none text-slate-700 bg-slate-100 px-3 py-1.5 rounded border border-slate-200 shadow-inner">
                    T + {currentIndex} JAM
                  </p>
                </div>
                <div className="h-8 w-[1px] bg-slate-200"></div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Alert Level</span>
                  <span className="relative flex h-3 w-3">
                    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", statusTheme?.ping)}></span>
                    <span className={cn("relative inline-flex rounded-full h-3 w-3", statusTheme?.dot)}></span>
                  </span>
                  <span className={cn("text-xs font-black tracking-wider uppercase", statusTheme?.text)}>{currentPlaybackPoint.status}</span>
                </div>
              </>
            )}
            {simData.length === 0 && (
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">IDLE - AWAITING RUN</span>
            )}
          </div>
        </header>

        {/* 3-Column Split inside Main */}
        <div className="flex-1 flex min-h-0">
           
           {/* Center 3D Viewport Map */}
           <div className="flex-1 relative bg-slate-900 border-r border-slate-300 shadow-inner z-0 overflow-hidden flex flex-col">
             {simData.length > 0 && currentPlaybackPoint ? (
                <>
                  <div className="flex-1 relative">
                     <CesiumMap 
                        waterLevel={currentPlaybackPoint.waterMapLevel} 
                        waterAlpha={currentPlaybackPoint.waterMapAlpha} 
                        riverFlow={currentPlaybackPoint.riverFlow}
                     />
                     <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded shadow-md border border-slate-200 pointer-events-none">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">Legend</h4>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-3 h-3 bg-blue-500/60 rounded-sm border border-blue-600"></div>
                          <span className="text-[10px] font-bold text-slate-600 uppercase">Volume Rendaman</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-slate-800 rounded-full border-2 border-white shadow-sm"></div>
                          <span className="text-[10px] font-bold text-slate-600 uppercase">Pos Pantau (PDA)</span>
                        </div>
                     </div>
                  </div>
                  {/* Timeline Control bar locked to the bottom of the map view */}
                  <div className="border-t border-slate-300 bg-white p-0 shrink-0 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                     <ControlPanel 
                        data={simData}
                        currentIndex={currentIndex}
                        isPlaying={isPlaying}
                        onPlayToggle={() => setIsPlaying(!isPlaying)}
                        onSeek={setCurrentIndex}
                        onReset={() => { setIsPlaying(false); setCurrentIndex(0); }}
                     />
                  </div>
                </>
             ) : (
                <div className="flex-1 flex items-center justify-center bg-slate-100">
                   <div className="text-center">
                     <MapIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                     <h3 className="text-lg font-bold text-slate-500">No Active Visualizations</h3>
                     <p className="text-sm text-slate-400 font-medium">Select a running or completed Job from the Command panel</p>
                   </div>
                </div>
             )}
           </div>

           {/* Right Panel for Live Data metrics */}
           <div className="w-[380px] bg-white overflow-y-auto shrink-0 z-10 p-4 flex flex-col gap-4 no-scrollbar">
             {simData.length > 0 && currentPlaybackPoint ? (
                <>
                  <HydrographPanel data={simData} currentIndex={currentIndex} />
                  
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2">
                      <Droplets className="w-3.5 h-3.5 text-blue-500" /> Sensor Telemetry
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white border border-slate-100 rounded shadow-sm p-3">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Precipitation</p>
                        <p className="text-lg font-bold text-blue-900 font-mono">{currentPlaybackPoint.rainfall.toFixed(1)} <span className="text-[10px] font-sans text-slate-500 uppercase">mm/h</span></p>
                      </div>
                      <div className="bg-white border border-slate-100 rounded shadow-sm p-3">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Q - Discharge</p>
                        <p className="text-lg font-bold text-slate-800 font-mono">{currentPlaybackPoint.riverFlow.toFixed(0)} <span className="text-[10px] font-sans text-slate-500 uppercase">m³/s</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 shadow-sm flex-grow">
                     <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2 mb-3">
                       Status Ops
                     </h3>
                     <div className={cn("p-3 rounded border mt-4 text-xs font-medium leading-relaxed shadow-inner", 
                        currentPlaybackPoint.status === 'AMAN' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                        currentPlaybackPoint.status === 'WASPADA' ? 'bg-yellow-50 border-yellow-200 text-yellow-900' :
                        currentPlaybackPoint.status === 'SIAGA' ? 'bg-orange-50 border-orange-200 text-orange-900' :
                        'bg-red-50 border-red-200 text-red-900'
                     )}>
                         <span className="block text-[9px] font-black uppercase opacity-60 mb-1 tracking-widest">SOP Directive</span>
                         {currentPlaybackPoint.status === 'AMAN' ? 'Maintain standard monitoring. Discharge is within nominal bounds.' : 
                          currentPlaybackPoint.status === 'WASPADA' ? 'Elevate readiness. Surface runoff increasing. Notify local coordinators.' :
                          currentPlaybackPoint.status === 'SIAGA' ? 'Threshold breached. Activate early warning sirens in downstream zones.' :
                          'CRITICAL SEVERITY. Initiate immediate evacuation protocols for Basin Alpha/Beta sectors.'}
                     </div>
                  </div>
                </>
             ) : (
                <div className="flex-grow flex items-center justify-center p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                   Waiting for Telemetry...
                </div>
             )}
           </div>
        </div>

      </main>
    </div>
  );
}
