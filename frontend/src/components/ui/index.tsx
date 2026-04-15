'use client'

import { type DensityLevel, type AlertSeverity, type TaskPriority, type RiskLevel } from '@/lib/types'
import clsx from 'clsx'

// ── Density Badge ──────────────────────────────────────────────────────────

const densityLabels: Record<DensityLevel, string> = {
  empty: 'Empty',
  green: 'Flowing',
  amber: 'Getting Busy',
  red: 'Crowded',
  critical: 'At Capacity',
}

export function DensityBadge({ level }: { level: DensityLevel }) {
  return (
    <span className={clsx('badge', `badge-${level === 'empty' ? 'empty' : level}`)}>
      {densityLabels[level]}
    </span>
  )
}

// ── Alert Severity Badge ───────────────────────────────────────────────────

const alertLabels: Record<AlertSeverity, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
}

export function AlertBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span className={clsx('badge', {
      'badge-info': severity === 'info',
      'badge-amber': severity === 'warning',
      'badge-critical': severity === 'critical',
    })}>
      {alertLabels[severity]}
    </span>
  )
}

// ── Priority Badge ──────────────────────────────────────────────────────────

const priorityColors: Record<TaskPriority, string> = {
  low: 'badge-green',
  medium: 'badge-amber',
  high: 'badge-red',
  urgent: 'badge-critical',
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={clsx('badge', priorityColors[priority])}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}

// ── Risk Badge ─────────────────────────────────────────────────────────────

const riskColors: Record<RiskLevel, string> = {
  safe: 'badge-safe',
  elevated: 'badge-amber',
  high: 'badge-red',
  critical: 'badge-critical',
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={clsx('badge', riskColors[level])}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  )
}

// ── Live Indicator ─────────────────────────────────────────────────────────

export function LiveIndicator({ label = 'Live' }: { label?: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
      <span className="live-dot" />
      {label}
    </span>
  )
}

// ── Density Bar ────────────────────────────────────────────────────────────

const densityColors: Record<DensityLevel, string> = {
  empty: 'var(--density-empty)',
  green: 'var(--density-green)',
  amber: 'var(--density-amber)',
  red:   'var(--density-red)',
  critical: 'var(--density-critical)',
}

export function DensityBar({ pct, level }: { pct: number; level: DensityLevel }) {
  return (
    <div className="density-bar-track">
      <div
        className="density-bar-fill"
        style={{
          width: `${Math.round(pct * 100)}%`,
          background: densityColors[level],
        }}
      />
    </div>
  )
}

// ── Confidence Indicator ───────────────────────────────────────────────────

export function ConfidenceIndicator({ confidence, label }: { confidence: number; label: string }) {
  const filled = Math.round(confidence * 5)
  return (
    <div className="confidence-ring">
      <div className="confidence-dots">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={clsx('confidence-dot', {
              filled: i < filled,
              partial: i === filled && confidence % 0.2 > 0.05,
            })}
          />
        ))}
      </div>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{label}</span>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

export function Skeleton({ width = '100%', height = 20, style }: {
  width?: string | number
  height?: string | number
  style?: React.CSSProperties
}) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: 'var(--radius-sm)', ...style }}
    />
  )
}

// ── Section Header ─────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="section-header">
      <span className="section-title">{title}</span>
      {action}
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────

export function EmptyState({ message, icon }: { message: string; icon?: string }) {
  return (
    <div style={{
      padding: 'var(--space-8)',
      textAlign: 'center',
      color: 'var(--text-tertiary)',
      fontSize: 'var(--text-sm)',
    }}>
      {icon && <div style={{ fontSize: 32, marginBottom: 'var(--space-3)' }}>{icon}</div>}
      {message}
    </div>
  )
}

// ── Error State ────────────────────────────────────────────────────────────

export function ErrorState({ message }: { message: string }) {
  return (
    <div style={{
      padding: 'var(--space-5)',
      background: 'hsl(4, 40%, 9%)',
      border: '1px solid hsl(4, 45%, 20%)',
      borderRadius: 'var(--radius-md)',
      color: 'hsl(4, 70%, 68%)',
      fontSize: 'var(--text-sm)',
    }}>
      {message}
    </div>
  )
}
