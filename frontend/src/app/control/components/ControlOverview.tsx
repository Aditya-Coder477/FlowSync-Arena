'use client'

import React from 'react'
import type { ControlRoomData, RiskLevel } from '@/lib/types'
import { LiveIndicator, Skeleton, SectionHeader } from '@/components/ui'

const riskLabels: Record<RiskLevel, string> = {
  safe: 'Safe',
  elevated: 'Elevated',
  high: 'High',
  critical: 'Critical',
}

const riskDescriptions: Record<RiskLevel, string> = {
  safe: 'Venue conditions are within safe operational limits. Standard monitoring in progress.',
  elevated: 'Minor density build-up observed in transition zones. No immediate action required.',
  high: 'Significant crowding detected in one or more sectors. Operational teams on standby.',
  critical: 'Safety thresholds exceeded. Immediate intervention and evacuation protocols required.',
}

const overallBorder: Record<RiskLevel, string> = {
  safe: '2px solid hsl(152, 40%, 22%)',
  elevated: '2px solid hsl(45, 50%, 25%)',
  high: '2px solid hsl(22, 50%, 25%)',
  critical: '2px solid hsl(4, 55%, 28%)',
}

interface ControlOverviewProps {
  data: ControlRoomData | null
  loading: boolean
  emergencyActive: boolean
  onActivateEmergency: () => void
  onBroadcast: () => void
}

export function ControlOverview({ data, loading, emergencyActive, onActivateEmergency, onBroadcast }: ControlOverviewProps) {
  return (
    <div style={{ padding: 'var(--space-6)' }}>
      {/* Risk Summary Card */}
      <div style={{
        background: 'var(--bg-card)', 
        border: data ? overallBorder[data.overall_risk] : '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)', 
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-6)',
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 'var(--space-8)',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center', minWidth: 160 }}>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Overall Venue Risk</div>
          {loading ? <Skeleton height={40} width={100} /> : (
            <div style={{ 
              fontSize: 32, fontWeight: 800, 
              color: data?.overall_risk === 'critical' ? 'var(--risk-critical)' : data?.overall_risk === 'high' ? 'var(--risk-high)' : data?.overall_risk === 'elevated' ? 'var(--risk-elevated)' : 'var(--risk-safe)',
              textTransform: 'uppercase'
            }}>
              {data ? riskLabels[data.overall_risk] : '---'}
            </div>
          )}
        </div>

        <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: 'var(--space-8)' }}>
           <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.5, maxWidth: 500 }}>
             {data ? riskDescriptions[data.overall_risk] : 'Loading situational awareness data...'}
           </p>
        </div>

        <div>
           <LiveIndicator label="Real-time Feed" />
        </div>
      </div>

      {/* Emergency Action Center */}
      <SectionHeader title="Emergency Control Center" />
      <div style={{
        background: 'hsl(4, 30%, 6%)', border: '1px solid hsl(4, 35%, 15%)',
        borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-6)'
      }}>
        <div style={{ maxWidth: 450 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'hsl(4, 70%, 75%)', marginBottom: 6 }}>Immediate Tactical Actions</div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
            Activating the emergency protocol will broadcast alerts to all staff mobile devices, digital signage, and override the public address system.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
           <button 
             className="btn btn-secondary"
             onClick={onBroadcast}
             style={{ padding: '12px 20px', borderRadius: 'var(--radius-md)' }}
           >
             📢 Staff Radio Broadcast
           </button>
           <button 
             className="btn btn-danger"
             onClick={onActivateEmergency}
             disabled={emergencyActive}
             style={{ 
               padding: '12px 24px', borderRadius: 'var(--radius-md)', 
               fontWeight: 700, border: '2px solid hsl(4, 60%, 40%)',
               opacity: emergencyActive ? 0.5 : 1
             }}
           >
             {emergencyActive ? '⚠ Protocol Active' : '⚠ Trigger Emergency Protocol'}
           </button>
        </div>
      </div>

      {/* Quick Glance Matrix (Small) */}
      <div style={{ marginTop: 'var(--space-8)' }}>
        <SectionHeader title="Risk Hotspots" action={<span style={{fontSize: 11, color: 'var(--text-tertiary)'}}>Automated detection</span>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
          {data?.risk_matrix.slice(0, 4).map(zone => (
            <div key={zone.zone_id} style={{ 
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', 
              borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
              borderBottom: `3px solid ${zone.risk_level === 'critical' ? 'var(--risk-critical)' : zone.risk_level === 'high' ? 'var(--risk-high)' : zone.risk_level === 'elevated' ? 'var(--risk-elevated)' : 'var(--risk-safe)'}`
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{zone.zone_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{Math.round(zone.density_pct * 100)}% density</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
