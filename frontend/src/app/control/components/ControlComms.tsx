'use client'

import React from 'react'
import type { ControlRoomData } from '@/lib/types'
import { Skeleton, SectionHeader, EmptyState } from '@/components/ui'

function timeAgo(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  if (mins < 60) return `${mins} min ago`
  return `${Math.floor(mins / 60)}h ago`
}

interface ControlCommsProps {
  data: ControlRoomData | null
  loading: boolean
}

export function ControlComms({ data, loading }: ControlCommsProps) {
  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <SectionHeader title="Staff & System Comms" action={
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Live channel logs</span>
      } />
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} height={80} />)}
        </div>
      ) : !data?.comm_logs.length ? (
        <EmptyState message="No recent communications" icon="📻" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {data.comm_logs.map(log => (
            <div key={log.id} className={`comm-item ${log.channel}`} style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="comm-sender" style={{ fontWeight: 700, fontSize: 13 }}>{log.from_name}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                  textTransform: 'uppercase',
                  background: log.channel === 'radio' ? 'var(--accent-muted)' : 'var(--bg-overlay)',
                  color: log.channel === 'radio' ? 'var(--accent-400)' : 'var(--text-tertiary)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  {log.channel}
                </span>
              </div>
              <div className="comm-message" style={{ marginTop: 6, fontSize: 14 }}>{log.message}</div>
              <div className="comm-time" style={{ marginTop: 8, opacity: 0.6 }}>{timeAgo(log.timestamp)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
