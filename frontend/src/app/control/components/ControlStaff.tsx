'use client'

import React from 'react'
import type { ControlRoomData } from '@/lib/types'
import { Skeleton, SectionHeader } from '@/components/ui'

interface ControlStaffProps {
  data: ControlRoomData | null
  loading: boolean
}

export function ControlStaff({ data, loading }: ControlStaffProps) {
  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <SectionHeader title="Staff Deployment" action={
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {data?.staff_deployments.length ?? 0} active personnel
        </span>
      } />
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={64} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {data?.staff_deployments.map(staff => (
            <div key={staff.staff_id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
              display: 'grid', gridTemplateColumns: '1fr auto',
              alignItems: 'center', gap: 'var(--space-4)',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {staff.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {staff.role} · Assigned to {staff.zone_name}
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--radius-full)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                background: staff.status === 'responding' ? 'var(--density-amber-bg)' : 'var(--density-green-bg)',
                color: staff.status === 'responding' ? 'var(--density-amber)' : 'var(--density-green)',
                border: staff.status === 'responding' ? '1px solid var(--density-amber-subtle)' : '1px solid var(--density-green-subtle)',
              }}>
                {staff.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
