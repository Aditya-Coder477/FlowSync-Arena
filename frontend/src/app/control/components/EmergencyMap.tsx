'use client'

import React, { useMemo } from 'react'

interface EmergencyMapProps {
  frame: number
}

// Mock venue layout nodes for visualization
const NODES = [
  { id: 'gate-n', x: 200, y: 50, label: 'North Gate', type: 'exit' },
  { id: 'gate-s', x: 200, y: 350, label: 'South Gate', type: 'exit' },
  { id: 'concourse-a', x: 100, y: 150, label: 'Sector A', type: 'zone' },
  { id: 'concourse-b', x: 300, y: 150, label: 'Sector B', type: 'zone' },
  { id: 'arena-center', x: 200, y: 200, label: 'Center Bowl', type: 'zone' },
  { id: 'sector-4', x: 100, y: 250, label: 'Sector 4', type: 'zone' },
  { id: 'sector-5', x: 300, y: 250, label: 'Sector 5', type: 'zone' },
]

const EDGES = [
  ['gate-n', 'concourse-a'], ['gate-n', 'concourse-b'],
  ['concourse-a', 'arena-center'], ['concourse-b', 'arena-center'],
  ['arena-center', 'sector-4'], ['arena-center', 'sector-5'],
  ['sector-4', 'gate-s'], ['sector-5', 'gate-s'],
]

export function EmergencyMap({ frame }: EmergencyMapProps) {
  // Simulate risk propagation based on frame
  const riskLevels = useMemo(() => {
    const levels: Record<string, string> = {}
    NODES.forEach(node => {
      // Risk starting at arena-center and moving outwards
      let riskScore = 0
      if (node.id === 'arena-center') {
        riskScore = frame < 10 ? frame / 10 : Math.max(0, 1 - (frame - 10) / 20)
      } else if (node.id === 'sector-4' || node.id === 'sector-5') {
        riskScore = frame > 5 && frame < 20 ? (frame - 5) / 10 : Math.max(0, 1 - (frame - 15) / 20)
      } else if (node.id === 'gate-s') {
        riskScore = frame > 15 ? Math.min(1, (frame - 15) / 15) : 0
      }
      
      if (riskScore > 0.8) levels[node.id] = 'var(--risk-critical)'
      else if (riskScore > 0.5) levels[node.id] = 'var(--risk-high)'
      else if (riskScore > 0.2) levels[node.id] = 'var(--risk-elevated)'
      else levels[node.id] = 'rgba(255, 255, 255, 0.05)'
    })
    return levels
  }, [frame])

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg-card)', position: 'relative' }}>
      <svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
        {/* Draw Edges */}
        {EDGES.map(([from, to], idx) => {
          const n1 = NODES.find(n => n.id === from)!
          const n2 = NODES.find(n => n.id === to)!
          return (
            <line 
              key={`${from}-${to}-${idx}`}
              x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y}
              stroke="var(--border-strong)"
              strokeWidth="2"
              strokeDasharray={ (from === 'sector-4' && frame > 10) ? "4 4" : "0"}
            />
          )
        })}

        {/* Draw Flow Indicator Arrows (Animated based on frame) */}
        {EDGES.map(([from, to], idx) => {
          const n1 = NODES.find(n => n.id === from)!
          const n2 = NODES.find(n => n.id === to)!
          const isActive = frame > 0 && frame < 35
          if (!isActive) return null
          
          return (
            <circle key={`flow-${idx}`} r="3" fill="var(--accent-400)">
              <animateMotion 
                path={`M ${n1.x} ${n1.y} L ${n2.x} ${n2.y}`} 
                dur={`${2 + idx*0.5}s`} 
                repeatCount="indefinite" 
              />
            </circle>
          )
        })}

        {/* Draw Nodes */}
        {NODES.map(node => (
          <g key={node.id}>
            <circle 
              cx={node.x} cy={node.y} r={node.type === 'exit' ? 14 : 10}
              fill={riskLevels[node.id]}
              stroke={riskLevels[node.id] !== 'rgba(255, 255, 255, 0.05)' ? 'white' : 'var(--border-strong)'}
              strokeWidth="2"
              style={{ transition: 'fill 0.5s ease', cursor: 'help' }}
            />
            {node.type === 'exit' && (
               <rect x={node.x - 7} y={node.y - 7} width={14} height={14} fill="none" stroke="white" strokeWidth="1.5" opacity="0.6" />
            )}
            <text 
              x={node.x} y={node.y + 25} 
              textAnchor="middle" 
              fontSize="10" 
              fill="var(--text-secondary)"
              fontWeight="600"
            >
              {node.label}
            </text>
          </g>
        ))}

        {/* Hazard Overlay (e.g. Fire starting point) */}
        {frame > 0 && frame < 20 && (
           <g transform={`translate(${NODES[4].x - 15}, ${NODES[4].y - 30})`}>
              <path d="M15 0 L30 30 L0 30 Z" fill="var(--risk-critical)" opacity={0.6}>
                 <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
              </path>
              <text x="15" y="45" textAnchor="middle" fontSize="9" fill="var(--risk-critical)" fontWeight="bold">INCIDENT ORIGIN</text>
           </g>
        )}
      </svg>

      {/* Legend */}
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--risk-critical)' }} />
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Critical Congestion</span>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-400)' }} />
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Evacuation Flow</span>
         </div>
      </div>
    </div>
  )
}
