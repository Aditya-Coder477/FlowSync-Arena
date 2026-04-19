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

const densityAriaLabels: Record<DensityLevel, string> = {
  empty: 'Crowd density: empty — very quiet',
  green: 'Crowd density: flowing — good capacity',
  amber: 'Crowd density: getting busy',
  red: 'Crowd density: crowded — near capacity',
  critical: 'Crowd density: at capacity — very full',
}

export function DensityBadge({ level }: { level: DensityLevel }) {
  return (
    <span
      role="status"
      aria-label={densityAriaLabels[level]}
      className={clsx('badge', `badge-${level === 'empty' ? 'empty' : level}`)}
    >
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
    <span
      aria-label={`Alert severity: ${severity}`}
      className={clsx('badge', {
        'badge-info': severity === 'info',
        'badge-amber': severity === 'warning',
        'badge-critical': severity === 'critical',
      })}
    >
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
    <span
      aria-label={`Priority: ${priority}`}
      className={clsx('badge', priorityColors[priority])}
    >
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
    <span
      aria-label={`Risk level: ${level}`}
      className={clsx('badge', riskColors[level])}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  )
}

// ── Live Indicator ─────────────────────────────────────────────────────────

export function LiveIndicator({ label = 'Live' }: { label?: string }) {
  return (
    <span
      role="status"
      aria-label={`Live data indicator: ${label}`}
      aria-live="polite"
      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}
    >
      <span className="live-dot" aria-hidden="true" />
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
  const pctInt = Math.round(pct * 100)
  return (
    <div
      role="meter"
      aria-valuenow={pctInt}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Crowd density: ${pctInt}% — ${densityLabels[level]}`}
      className="density-bar-track"
    >
      <div
        className="density-bar-fill"
        style={{
          width: `${pctInt}%`,
          background: densityColors[level],
        }}
      />
    </div>
  )
}

// ── Confidence Indicator ───────────────────────────────────────────────────

export function ConfidenceIndicator({ confidence, label }: { confidence: number; label: string }) {
  const filled = Math.round(confidence * 5)
  const pct = Math.round(confidence * 100)
  return (
    <div
      className="confidence-ring"
      aria-label={`Route confidence: ${pct}% — ${label}`}
    >
      <div className="confidence-dots" aria-hidden="true">
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
      aria-hidden="true"
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
    <div
      role="status"
      aria-label={message}
      style={{
        padding: 'var(--space-8)',
        textAlign: 'center',
        color: 'var(--text-tertiary)',
        fontSize: 'var(--text-sm)',
      }}
    >
      {icon && <div style={{ fontSize: 32, marginBottom: 'var(--space-3)' }} aria-hidden="true">{icon}</div>}
      {message}
    </div>
  )
}

// ── Error State ────────────────────────────────────────────────────────────

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        padding: 'var(--space-5)',
        background: 'hsl(4, 40%, 9%)',
        border: '1px solid hsl(4, 45%, 20%)',
        borderRadius: 'var(--radius-md)',
        color: 'hsl(4, 70%, 68%)',
        fontSize: 'var(--text-sm)',
      }}
    >
      {message}
    </div>
  )
}
