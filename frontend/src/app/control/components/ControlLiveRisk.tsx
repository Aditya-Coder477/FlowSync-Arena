'use client'

import React from 'react'
import type { ControlRoomData, RiskLevel } from '@/lib/types'
import { RiskBadge, Skeleton, SectionHeader } from '@/components/ui'

const riskDescriptions: Record<RiskLevel, string> = {
  safe: 'Conditions normal. No action needed.',
  elevated: 'Slight pressure building. Monitor closely.',
  high: 'Crowding risk detected. Prepare intervention.',
  critical: 'Immediate action required.',
}

interface ControlLiveRiskProps {
  data: ControlRoomData | null
  loading: boolean
  onEvacuate: (zoneId: string, zoneName: string) => void
}

export function ControlLiveRisk({ data, loading, onEvacuate }: ControlLiveRiskProps) {
  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <SectionHeader title="Live Risk Matrix" action={
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Real-time sensor & reporting data</span>
      } />
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={140} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {data?.risk_matrix.map(zone => (
            <div key={zone.zone_id} className={`risk-cell ${zone.risk_level}`} style={{ padding: 'var(--space-4)', minHeight: 120 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="risk-zone-name" style={{ fontSize: 16, fontWeight: 600 }}>{zone.zone_name}</span>
                <RiskBadge level={zone.risk_level} />
              </div>
              <div className="risk-zone-meta" style={{ marginTop: 8 }}>
                {Math.round(zone.density_pct * 100)}% capacity · {zone.staff_present} staff
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', maxWidth: '60%' }}>
                  {riskDescriptions[zone.risk_level]}
                </span>
                {(zone.risk_level === 'high' || zone.risk_level === 'critical') && (
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => onEvacuate(zone.zone_id, zone.zone_name)}
                  >
                    Evacuate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
