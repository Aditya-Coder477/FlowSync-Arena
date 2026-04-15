'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FileText, ArrowLeft, BarChart2, ShieldAlert } from 'lucide-react'
import { SimulationCanvas, ZoneNode, Edge } from '@/components/digital-twin/SimulationCanvas'
import { PlaybackControls } from '@/components/digital-twin/PlaybackControls'
import Link from 'next/link'

// Base graph template for demo
const initialZones: ZoneNode[] = [
  { id: 'gate-n', name: 'North Gate', type: 'gate', x: 40, y: 10, width: 20, height: 10, densityPct: 0, densityLevel: 'empty' },
  { id: 'corridor-A', name: 'Main Concourse', type: 'corridor', x: 30, y: 30, width: 40, height: 20, densityPct: 0, densityLevel: 'empty' },
  { id: 'stand-1', name: 'West Stand', type: 'stand', x: 5, y: 30, width: 20, height: 40, densityPct: 0, densityLevel: 'empty' },
  { id: 'stand-2', name: 'East Stand', type: 'stand', x: 75, y: 30, width: 20, height: 40, densityPct: 0, densityLevel: 'empty' },
  { id: 'food-a', name: 'Food Court', type: 'food_court', x: 30, y: 60, width: 40, height: 15, densityPct: 0, densityLevel: 'empty' },
]

const mapEdges: Edge[] = [
  { source: 'gate-n', target: 'corridor-A' },
  { source: 'corridor-A', target: 'stand-1' },
  { source: 'corridor-A', target: 'stand-2' },
  { source: 'corridor-A', target: 'food-a' },
  { source: 'stand-1', target: 'food-a' },
  { source: 'stand-2', target: 'food-a' }
]

export default function SimulationView() {
  const params = useParams()
  const router = useRouter()
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const totalFrames = 60
  
  const [zones, setZones] = useState<ZoneNode[]>(initialZones)
  const [overallRisk, setOverallRisk] = useState('SAFE')

  // Mock animation logic
  useEffect(() => {
    let interval: any
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentFrame(prev => {
          if (prev >= totalFrames - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 500) // 1 frame per 0.5s
    }
    return () => clearInterval(interval)
  }, [isPlaying, totalFrames])

  // Generate deterministic frame data
  useEffect(() => {
    // Math to make a continuous flow
    const progress = currentFrame / totalFrames
    
    // Gate peaks early
    const gateDensity = progress < 0.3 ? (progress / 0.3) * 0.9 : Math.max(0, 0.9 - (progress - 0.3) * 1.5)
    
    // Corridor peaks middle
    const corrDensity = progress > 0.1 && progress < 0.6 ? ((progress - 0.1) / 0.5) * 1.0 : (progress >= 0.6 ? Math.max(0, 1.0 - (progress - 0.6) * 1.2) : 0)

    // Stands fill up steadily
    const standDensity = Math.min(0.95, progress * 1.2)
    
    // Food court drops and rises around halftime (simulating near frame 30)
    const foodDensity = Math.abs(currentFrame - 30) < 10 ? 0.9 + Math.random()*0.1 : 0.2 + progress * 0.1

    const toLevel = (d: number) => {
      if (d < 0.1) return 'empty'
      if (d < 0.5) return 'green'
      if (d < 0.8) return 'amber'
      if (d < 0.95) return 'red'
      return 'critical'
    }

    const newZones = [
      { ...initialZones[0], densityPct: gateDensity, densityLevel: toLevel(gateDensity) },
      { ...initialZones[1], densityPct: corrDensity, densityLevel: toLevel(corrDensity) },
      { ...initialZones[2], densityPct: standDensity, densityLevel: toLevel(standDensity) },
      { ...initialZones[3], densityPct: standDensity, densityLevel: toLevel(standDensity) },
      { ...initialZones[4], densityPct: foodDensity, densityLevel: toLevel(foodDensity) },
    ] as ZoneNode[]
    
    setZones(newZones)

    const maxDensity = Math.max(gateDensity, corrDensity, standDensity, foodDensity)
    if (maxDensity > 0.95) setOverallRisk('CRITICAL')
    else if (maxDensity > 0.8) setOverallRisk('HIGH')
    else if (maxDensity > 0.6) setOverallRisk('ELEVATED')
    else setOverallRisk('SAFE')

  }, [currentFrame])

  return (
    <div style={{ padding: 'var(--space-6)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 8, borderRadius: 'var(--radius-sm)', display: 'flex' }} className="hover-bg-elevated">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: 24, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
              Simulation Playback
              <span style={{ fontSize: 13, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', padding: '4px 8px', borderRadius: 6, fontWeight: 500, color: 'var(--text-secondary)' }}>
                ID: {params.id}
              </span>
            </h1>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href={`/digital-twin/compare?run1=${params.id}`} style={{ textDecoration: 'none' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
              <BarChart2 size={16} /> Compare
            </button>
          </Link>
          <Link href={`/digital-twin/report/${params.id}`} style={{ textDecoration: 'none' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--accent-500)', border: '1px solid var(--accent-600)', color: 'white', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
              <FileText size={16} /> Generate Report
            </button>
          </Link>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24, flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Map and Scrubber */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
             <SimulationCanvas zones={zones} edges={mapEdges} />
          </div>
          <PlaybackControls 
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            currentFrame={currentFrame}
            totalFrames={totalFrames}
            onSeek={setCurrentFrame}
          />
        </div>

        {/* Right Column: Key metrics and warnings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Status Card */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
             <h3 style={{ fontSize: 14, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Simulation Status</h3>
             
             <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Time Slice</div>
                <div style={{ fontSize: 24, fontFamily: 'monospace', color: 'var(--text-primary)' }}>T + {currentFrame} min</div>
             </div>

             <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Frame Risk Level</div>
                <div style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 6, fontSize: 14, fontWeight: 600,
                  background: overallRisk === 'SAFE' ? 'rgba(34, 197, 94, 0.1)' : overallRisk === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.1)',
                  color: overallRisk === 'SAFE' ? 'var(--density-green)' : overallRisk === 'CRITICAL' ? 'var(--density-critical)' : 'var(--density-amber)'
                }}>
                  {overallRisk !== 'SAFE' && <ShieldAlert size={16} />}
                  {overallRisk}
                </div>
             </div>
             
             {overallRisk === 'CRITICAL' && (
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderLeft: '3px solid var(--density-critical)', padding: '12px 16px', borderRadius: '0 4px 4px 0' }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)' }}>Main Concourse capacity exceeded. Spillage into external walkways expected.</p>
                </div>
             )}
          </div>

          {/* Zones List */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 24, flex: 1, overflowY: 'auto' }}>
            <h3 style={{ fontSize: 14, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Live Occupancy</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {zones.map(z => (
                <div key={z.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ 
                      width: 8, height: 8, borderRadius: '50%',
                      background: z.densityLevel === 'critical' ? 'var(--density-critical)' : z.densityLevel === 'red' ? 'var(--density-red)' : z.densityLevel === 'amber' ? 'var(--density-amber)' : 'var(--density-green)'
                    }} />
                    <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{z.name}</span>
                  </div>
                  <span style={{ fontSize: 14, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {Math.round(z.densityPct * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}
