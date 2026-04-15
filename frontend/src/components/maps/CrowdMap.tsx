'use client'

import { type Zone } from '@/lib/types'
import { DensityBadge } from '@/components/ui'
import { useState } from 'react'

interface CrowdMapProps {
  zones: Zone[]
  onZoneClick?: (zone: Zone) => void
}

const densityFills: Record<string, { fill: string; stroke: string }> = {
  empty:    { fill: 'hsl(152, 35%, 14%)', stroke: 'hsl(152, 40%, 28%)' },
  green:    { fill: 'hsl(148, 40%, 14%)', stroke: 'hsl(148, 50%, 32%)' },
  amber:    { fill: 'hsl(38, 50%, 14%)',  stroke: 'hsl(38, 70%, 36%)' },
  red:      { fill: 'hsl(16, 50%, 13%)',  stroke: 'hsl(16, 65%, 34%)' },
  critical: { fill: 'hsl(4, 52%, 13%)',   stroke: 'hsl(4, 68%, 34%)' },
}

export function CrowdMap({ zones, onZoneClick }: CrowdMapProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ zone: Zone; x: number; y: number } | null>(null)

  const zoneMap = Object.fromEntries(zones.map(z => [z.id, z]))

  // Only render zones that have coordinate data
  const mappableZones = zones.filter(z => z.coordinates)

  if (mappableZones.length === 0) {
    return (
      <div className="crowd-map-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
          Map data loading…
        </span>
      </div>
    )
  }

  return (
    <div className="crowd-map-container" style={{ position: 'relative' }}>
      {/* Legend */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {(['empty', 'green', 'amber', 'red', 'critical'] as const).map(level => (
          <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 10, height: 10, borderRadius: 2,
              background: densityFills[level].fill,
              border: `1px solid ${densityFills[level].stroke}`,
            }} />
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
              {level === 'empty' ? 'Empty' : level === 'green' ? 'Flowing' : level === 'amber' ? 'Busy' : level === 'red' ? 'Crowded' : 'Critical'}
            </span>
          </div>
        ))}
      </div>

      <svg
        viewBox="0 0 100 100"
        style={{ width: '100%', height: '100%', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {mappableZones.map(zone => {
          const c = zone.coordinates!
          const style = densityFills[zone.density_level]
          const isHovered = hovered === zone.id
          return (
            <g key={zone.id}>
              <rect
                x={c.x} y={c.y}
                width={c.width} height={c.height}
                rx={1.5} ry={1.5}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={isHovered ? 0.8 : 0.5}
                opacity={isHovered ? 1 : 0.9}
                className="zone-shape"
                onMouseEnter={(e) => {
                  setHovered(zone.id)
                  const svg = (e.target as SVGRectElement).closest('svg')!
                  const rect = svg.getBoundingClientRect()
                  const cx = c.x + c.width / 2
                  const cy = c.y + c.height / 2
                  setTooltip({ zone, x: (cx / 100) * rect.width, y: (cy / 100) * rect.height })
                }}
                onMouseLeave={() => { setHovered(null); setTooltip(null) }}
                onClick={() => onZoneClick?.(zone)}
                style={{ cursor: 'pointer' }}
              />
              {/* Zone label */}
              <text
                x={c.x + c.width / 2}
                y={c.y + c.height / 2 - (c.height > 15 ? 3 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="zone-label"
                style={{
                  fontSize: c.width > 20 ? 3.5 : 2.8,
                  fill: 'var(--text-primary)',
                  opacity: 0.85,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  pointerEvents: 'none',
                }}
              >
                {zone.name.split(' ').slice(0, 2).join(' ')}
              </text>
              {/* Density % label */}
              {c.height > 12 && (
                <text
                  x={c.x + c.width / 2}
                  y={c.y + c.height / 2 + 5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: 3,
                    fill: style.stroke,
                    fontFamily: 'DM Mono, monospace',
                    fontWeight: 500,
                    pointerEvents: 'none',
                  }}
                >
                  {Math.round(zone.density_pct * 100)}%
                </text>
              )}
              {/* Critical pulse ring */}
              {zone.density_level === 'critical' && (
                <circle
                  cx={c.x + c.width / 2}
                  cy={c.y + c.height / 2}
                  r={Math.min(c.width, c.height) * 0.35}
                  fill="none"
                  stroke="hsl(4, 68%, 34%)"
                  strokeWidth={0.6}
                  opacity={0.5}
                  style={{ animation: 'pulse-ring 2s ease-out infinite' }}
                />
              )}
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 12,
          top: tooltip.y - 40,
          background: 'var(--bg-overlay)',
          border: '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          pointerEvents: 'none',
          zIndex: 20,
          minWidth: 160,
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
            {tooltip.zone.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <DensityBadge level={tooltip.zone.density_level} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {tooltip.zone.current_count.toLocaleString()} / {tooltip.zone.capacity.toLocaleString()} people
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {Math.round(tooltip.zone.density_pct * 100)}% capacity
          </div>
        </div>
      )}
    </div>
  )
}
