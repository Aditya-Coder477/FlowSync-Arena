'use client'

import React from 'react'

export interface ZoneNode {
  id: string
  name: string
  type: string
  x: number
  y: number
  width: number
  height: number
  densityPct: number
  densityLevel: 'empty' | 'green' | 'amber' | 'red' | 'critical'
}

export interface Edge {
  source: string
  target: string
}

interface SimulationCanvasProps {
  zones: ZoneNode[]
  edges: Edge[]
  width?: number
  height?: number
}

const getDensityColor = (level: string) => {
  switch (level) {
    case 'critical': return 'var(--density-critical, hsl(0, 80%, 45%))'
    case 'red': return 'var(--density-red, hsl(10, 80%, 55%))'
    case 'amber': return 'var(--density-amber, hsl(40, 90%, 55%))'
    case 'green': return 'var(--density-green, hsl(140, 70%, 45%))'
    default: return 'var(--bg-elevated, hsl(196, 20%, 15%))'
  }
}

export function SimulationCanvas({ zones, edges, width = 800, height = 600 }: SimulationCanvasProps) {
  // Center helper
  const getCenter = (id: string) => {
    const zone = zones.find(z => z.id === id)
    if (!zone) return { x: 0, y: 0 }
    return {
      x: zone.x + zone.width / 2,
      y: zone.y + zone.height / 2
    }
  }

  return (
    <div style={{
      width: '100%', 
      height: '100%', 
      minHeight: 400,
      background: 'var(--bg-card, #0f172a)',
      border: '1px solid var(--border-subtle, #1e293b)',
      borderRadius: 'var(--radius-lg, 12px)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Grid Pattern Background */}
      <svg width="100%" height="100%" style={{ position: 'absolute', opacity: 0.1, pointerEvents: 'none' }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      
      <svg viewBox={`0 0 100 100`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', position: 'absolute' }}>
        {/* Draw Edges */}
        {edges.map((e, i) => {
          const start = getCenter(e.source)
          const end = getCenter(e.target)
          return (
            <line 
              key={`edge-${i}`}
              x1={start.x} y1={start.y} 
              x2={end.x} y2={end.y} 
              stroke="var(--border-strong, #334155)" 
              strokeWidth="0.5"
              strokeDasharray="1 1"
            />
          )
        })}

        {/* Draw Zones */}
        {zones.map((z) => {
          const color = getDensityColor(z.densityLevel)
          return (
            <g key={z.id} style={{ transition: 'all 0.5s ease' }}>
              <rect
                x={z.x}
                y={z.y}
                width={z.width}
                height={z.height}
                rx="2"
                fill={color}
                fillOpacity={z.densityLevel === 'empty' ? 0.2 : 0.8}
                stroke={color}
                strokeWidth="0.5"
                style={{ transition: 'fill 0.3s ease, fill-opacity 0.3s' }}
              />
              <text
                x={z.x + z.width / 2}
                y={z.y + z.height / 2}
                fontSize="2.5"
                fill="white"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ pointerEvents: 'none', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
              >
                {z.name}
              </text>
              <text
                x={z.x + z.width / 2}
                y={z.y + z.height / 2 + 3}
                fontSize="1.8"
                fill="rgba(255,255,255,0.7)"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ pointerEvents: 'none' }}
              >
                {Math.round(z.densityPct * 100)}%
              </text>
            </g>
          )
        })}
      </svg>
      
      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)',
        display: 'flex', gap: '12px', fontSize: '10px',
        color: 'var(--text-tertiary)'
      }}>
        <div style={{display:'flex', alignItems:'center', gap: 4}}>
           <div style={{width:8, height:8, borderRadius:2, background: getDensityColor('green')}}/> Normal
        </div>
        <div style={{display:'flex', alignItems:'center', gap: 4}}>
           <div style={{width:8, height:8, borderRadius:2, background: getDensityColor('amber')}}/> Elevated
        </div>
        <div style={{display:'flex', alignItems:'center', gap: 4}}>
           <div style={{width:8, height:8, borderRadius:2, background: getDensityColor('red')}}/> High Risk
        </div>
      </div>
    </div>
  )
}
