'use client'

import React, { useState, useEffect } from 'react'
import { Plus, History, Play, AlertTriangle, ShieldAlert, FileText, ArrowLeft, Loader2, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { EmergencyMap } from './EmergencyMap'
import { PlaybackControls } from '@/components/digital-twin/PlaybackControls'
import { SectionHeader } from '@/components/ui'

type ViewMode = 'list' | 'builder' | 'playback'

export function EmergencySimulationModule() {
  const [view, setView] = useState<ViewMode>('list')
  const [loading, setLoading] = useState(false)
  const [scenarios, setScenarios] = useState<any[]>([])
  const [activeScenario, setActiveScenario] = useState<any>(null)
  const [runResult, setRunResult] = useState<any>(null)
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const totalFrames = 45

  // Simulation playback logic
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentFrame((prev) => {
          if (prev >= totalFrames - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, totalFrames])

  // Simulation parameters for builder
  const [formData, setFormData] = useState({
    name: 'Untitled Emergency Plan',
    incidentType: 'fire',
    severity: 5,
    affectedZones: [] as string[],
    blockedRoutes: [] as string[],
    crowdDensity: 1.0,
    staffResponse: 3
  })

  // Mock list for now
  useEffect(() => {
    setScenarios([
      { id: 'sim-1', name: 'West Gate Fire Drill', type: 'fire', date: '2026-04-10', risk: 'high', clearance: '22m' },
      { id: 'sim-2', name: 'Crowd Panic - Sector 4', type: 'crowd_panic', date: '2026-04-12', risk: 'critical', clearance: '38m' }
    ])
  }, [])

  const handleStartSim = () => {
    setLoading(true)
    // In a real app, this hits /api/emergency/simulate
    setTimeout(() => {
      setLoading(false)
      setView('playback')
      setCurrentFrame(0)
      setIsPlaying(true)
    }, 1500)
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      {view === 'list' && (
        <div style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <SectionHeader title="Emergency Readiness Simulations" />
            <button 
              className="btn btn-primary" 
              onClick={() => setView('builder')}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={18} /> New Scenario
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
            {scenarios.map(s => (
              <div key={s.id} className="risk-cell safe" style={{ padding: 'var(--space-4)', background: 'var(--bg-card)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, color: 'var(--risk-critical)' }}>
                       <AlertTriangle size={20} />
                    </div>
                    <div>
                       <div style={{ fontSize: 16, fontWeight: 700 }}>{s.name}</div>
                       <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{s.type.replace('_', ' ')}</div>
                    </div>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Risk: <span style={{ color: s.risk === 'critical' ? 'var(--risk-critical)' : 'var(--risk-high)' }}>{s.risk.toUpperCase()}</span></div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Clearance: {s.clearance}</div>
                 </div>
                 <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => setView('playback')}>
                    Review Timeline
                 </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'builder' && (
        <div style={{ padding: 'var(--space-6)', maxWidth: 800 }}>
          <button 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}
            onClick={() => setView('list')}
          >
            <ArrowLeft size={16} /> Back to Library
          </button>
          
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
               <ShieldAlert size={24} color="var(--risk-critical)" />
               Configure Emergency Scenario
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Incident Type</label>
                <select 
                  style={{ width: '100%', padding: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', color: 'white', borderRadius: 8 }}
                  value={formData.incidentType}
                  onChange={e => setFormData({...formData, incidentType: e.target.value})}
                >
                  <option value="fire">Fire Breakdown</option>
                  <option value="medical">Mass Medical Incident</option>
                  <option value="security">Unauthorized Breach / Security Alarm</option>
                  <option value="crowd_panic">Localized Crowd Pressure / Panic</option>
                  <option value="weather">Severe Weather Evacuation</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Impact Severity (1-10)</label>
                  <input 
                    type="range" min="1" max="10" 
                    value={formData.severity}
                    onChange={e => setFormData({...formData, severity: parseInt(e.target.value)})}
                    style={{ width: '100%' }} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 4, color: 'var(--text-tertiary)' }}>
                    <span>Minor</span>
                    <span>Critical</span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Crowd Intensity</label>
                  <select 
                    style={{ width: '100%', padding: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', color: 'white', borderRadius: 8 }}
                    value={formData.crowdDensity}
                    onChange={e => setFormData({...formData, crowdDensity: parseFloat(e.target.value)})}
                  >
                    <option value="0.5">Low (Empty Venue)</option>
                    <option value="1.0">Standard Operative</option>
                    <option value="1.5">Peak / Sold Out</option>
                  </select>
                </div>
              </div>

              <div>
                 <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.15)', padding: 16, borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-400)', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                       <Info size={16} />
                       Incident Scope
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                       Select affected zones and blocked exits on the venue map in the next step or simulate default full evacuation.
                    </p>
                 </div>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ marginTop: 12, height: 48, fontSize: 16, fontWeight: 700 }}
                onClick={handleStartSim}
                disabled={loading}
              >
                {loading ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Loader2 className="animate-spin" size={20} /> Initializing Engine...</span> : 'Generate Predictive Model'}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'playback' && (
        <div style={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
           <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
              <button 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setView('list')}
              >
                <ArrowLeft size={16} /> End Simulation
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--risk-critical)', animation: 'pulse-ring 1s infinite' }} />
                    <span style={{ color: 'var(--risk-critical)' }}>CRITICAL RISK DETECTED</span>
                 </div>
                 <div style={{ width: 1, height: 20, background: 'var(--border-strong)' }} />
                 <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Clearance Progress: <span style={{ color: 'white', fontWeight: 700 }}>{Math.min(100, currentFrame * 3.5).toFixed(1)}%</span></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                 <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} /> Readiness Report
                 </button>
              </div>
           </div>

           <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', overflow: 'hidden' }}>
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                 <EmergencyMap frame={currentFrame} />
                 
                 <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 800 }}>
                    <PlaybackControls 
                      isPlaying={isPlaying}
                      onTogglePlay={() => setIsPlaying(!isPlaying)}
                      currentFrame={currentFrame}
                      totalFrames={totalFrames}
                      onSeek={setCurrentFrame}
                    />
                 </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', borderLeft: '1px solid var(--border-strong)', padding: 'var(--space-5)', overflowY: 'auto' }}>
                 <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 20 }}>Response Recommendations</h3>
                 
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 12, borderRadius: 8 }}>
                       <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--risk-critical)', marginBottom: 4 }}>Isolate Sector 4 Lobby</div>
                       <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>Blockage at Exit B causing dangerous compression. Redirect via North Ramp.</p>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: 12, borderRadius: 8 }}>
                       <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--risk-elevated)', marginBottom: 4 }}>Deploy Stewards: Gate 2</div>
                       <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>Flow throughput at Gate 2 dropping below 60%. Manual override ticketing scans.</p>
                    </div>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: 12, borderRadius: 8 }}>
                       <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Broadcast "Calm Mode" Audio</div>
                       <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>Activate low-frequency calming sound cues to reduce rapid surge movement.</p>
                    </div>
                 </div>

                 <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginTop: 32, marginBottom: 16 }}>Live Breakdown</h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                       <span style={{ color: 'var(--text-secondary)' }}>Clearance Time Est.</span>
                       <span style={{ fontWeight: 600 }}>24.2 min</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                       <span style={{ color: 'var(--text-secondary)' }}>Critical Bottlenecks</span>
                       <span style={{ fontWeight: 600, color: 'var(--risk-critical)' }}>2 zones</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                       <span style={{ color: 'var(--text-secondary)' }}>Staff Responsiveness</span>
                       <span style={{ fontWeight: 600 }}>Fast (Lvl 4)</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      <style jsx>{`
        .btn-primary {
          background: var(--accent-500);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
        }
        .btn-secondary {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          padding: 8px 12px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
        }
        .btn-sm { padding: 6px 10px; fontSize: 12px; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
