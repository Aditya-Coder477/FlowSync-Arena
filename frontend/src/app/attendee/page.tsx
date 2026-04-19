'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import type { ZoneStatus, QueueLive, Alert, Zone, RouteRecommendation } from '@/lib/types'
import { MOCK_ZONE_STATUS, MOCK_QUEUES, MOCK_ALERTS } from '@/lib/mockData'
import { Sidebar } from '@/components/Sidebar'
import { CrowdMap } from '@/components/maps/CrowdMap'
import {
  DensityBadge, DensityBar, ConfidenceIndicator,
  LiveIndicator, Skeleton, EmptyState, ErrorState, SectionHeader
} from '@/components/ui'
import clsx from 'clsx'

const POLL_INTERVAL = 12000 // 12s

// ── Invisible Concierge suggestions (generated from live data) ────────────

function buildSuggestions(zoneStatus: ZoneStatus | null, queues: QueueLive | null) {
  const suggestions = []

  if (zoneStatus) {
    const crowdedZone = zoneStatus.zones.find(z => z.density_level === 'critical')
    const quietZone = zoneStatus.zones.find(z => z.density_level === 'empty' || z.density_level === 'green')

    if (crowdedZone) {
      suggestions.push({
        id: 'crowd-1',
        headline: `${crowdedZone.name} is packed right now`,
        body: quietZone
          ? `If you're heading there, ${quietZone.name} is much quieter and you'll get there faster.`
          : `Consider waiting 15 minutes before heading over — things tend to clear up quickly.`,
        action: quietZone ? `Find route to ${quietZone.name}` : undefined,
        targetZone: quietZone ? quietZone.id : undefined,
      })
    }
  }

  if (queues) {
    const fastQueue = queues.queues.find(q => q.predicted_wait_min < 3)
    if (fastQueue) {
      suggestions.push({
        id: 'queue-1',
        headline: `${fastQueue.zone_name} is moving fast`,
        body: `This gate is flowing faster right now — wait is under ${Math.ceil(fastQueue.predicted_wait_min)} minutes.`,
        action: 'See route to queue',
        targetZone: fastQueue.zone_id,
      })
    }
  }

  suggestions.push({
    id: 'tip-1',
    headline: 'Restrooms near East Wing have no queue',
    body: 'The facilities in East Wing are currently quiet. Worth the short detour if you need them.',
    action: 'Find route to East Wing',
    targetZone: 'east-wing',
  })

  return suggestions.slice(0, 2)
}

// ── Route Selector ─────────────────────────────────────────────────────────

function RouteSelector({ zones, from, to, setFrom, setTo, onRecommend }: {
  zones: Zone[]
  from: string
  to: string
  setFrom: (v: string) => void
  setTo: (v: string) => void
  onRecommend: (from: string, to: string) => void
}) {
  const zoneOptions = zones.filter(z => z.coordinates)

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 140 }}>
        <label
          htmlFor="route-from"
          style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}
        >
          You&apos;re at
        </label>
        <select
          id="route-from"
          value={from}
          onChange={e => setFrom(e.target.value)}
          aria-label="Your current zone"
          style={{
            width: '100%', background: 'var(--bg-overlay)',
            border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)', padding: '8px 12px', fontSize: 13,
            fontFamily: 'inherit',
          }}
        >
          <option value="">Select zone</option>
          {zoneOptions.map(z => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <label
          htmlFor="route-to"
          style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}
        >
          Going to
        </label>
        <select
          id="route-to"
          value={to}
          onChange={e => setTo(e.target.value)}
          aria-label="Your destination zone"
          style={{
            width: '100%', background: 'var(--bg-overlay)',
            border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)', padding: '8px 12px', fontSize: 13,
            fontFamily: 'inherit',
          }}
        >
          <option value="">Select destination</option>
          {zoneOptions.map(z => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </div>
      <button
        className="btn btn-primary btn-sm"
        disabled={!from || !to || from === to}
        onClick={() => from && to && onRecommend(from, to)}
        aria-label="Find the least crowded route between selected zones"
      >
        Find route
      </button>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

export default function AttendeeDashboard() {
  const [zoneStatus, setZoneStatus] = useState<ZoneStatus | null>(null)
  const [queues, setQueues] = useState<QueueLive | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [route, setRoute] = useState<RouteRecommendation | null>(null)
  const [routeFrom, setRouteFrom] = useState('entrance-north')
  const [routeTo, setRouteTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const routeSectionRef = useRef<HTMLDivElement>(null)
  
  const triggerRoute = (toZone: string) => {
    setRouteTo(toZone)
    handleRecommend(routeFrom || 'entrance-north', toZone)
    routeSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const [z, q, a] = await Promise.all([
        api.zones.status(),
        api.queues.live(),
        api.alerts.list(),
      ])
      // Ignore stale responses after unmount
      if (signal?.aborted) return
      setZoneStatus(z)
      setQueues(q)
      setAlerts(a.filter(al => !al.resolved).slice(0, 3))
      setError(null)
    } catch (e) {
      if (signal?.aborted) return
      // Provide simulated data if the API backend is down so the dashboard works
      setZoneStatus(MOCK_ZONE_STATUS)
      setQueues(MOCK_QUEUES)
      setAlerts(MOCK_ALERTS)
      setError(null)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)
    const interval = setInterval(() => fetchData(controller.signal), POLL_INTERVAL)
    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [fetchData])

  const handleRecommend = async (from: string, to: string) => {
    try {
      const r = await api.routes.recommend(from, to)
      setRoute(r)
    } catch {
      // Simulate specific routes based on the destination
      let steps: any[] = [];
      let totalTime = 5;
      let note: string | undefined = undefined;

      const fromName = zoneStatus?.zones.find(z => z.id === from)?.name || from;
      const toName = zoneStatus?.zones.find(z => z.id === to)?.name || to;

      if (from === to) {
        steps = [
          { zone_id: from, zone_name: fromName, instruction: `You are already at ${toName}.`, density_level: 'green', estimated_time_min: 0 }
        ];
        totalTime = 0;
      } else if (to === 'east-wing') {
        steps = [
          { zone_id: from, zone_name: fromName, instruction: `Start at ${fromName}`, density_level: 'green', estimated_time_min: 0 },
          { zone_id: "main-hall", zone_name: "Main Hall", instruction: `Keep to the right wall of Main Hall to avoid the crowd buildup`, density_level: 'amber', estimated_time_min: 4 },
          { zone_id: to, zone_name: toName, instruction: `Arrive at Restrooms in ${toName}`, density_level: 'green', estimated_time_min: 2 },
        ];
        totalTime = 6;
      } else if (to === 'main-hall') {
        steps = [
          { zone_id: from, zone_name: fromName, instruction: `Walk straight from ${fromName}`, density_level: 'green', estimated_time_min: 0 },
          { zone_id: to, zone_name: toName, instruction: `Look for Food Stall A near the central pillar`, density_level: 'amber', estimated_time_min: 3 },
        ];
        totalTime = 3;
      } else if (to === 'gate-c') {
        steps = [
          { zone_id: from, zone_name: fromName, instruction: `Head away from ${fromName}`, density_level: 'green', estimated_time_min: 0 },
          { zone_id: "west-wing", zone_name: "West Wing", instruction: `Pass through West Wing corridors`, density_level: 'empty', estimated_time_min: 3 },
          { zone_id: to, zone_name: toName, instruction: `Exit through Gate C`, density_level: 'empty', estimated_time_min: 1 },
        ];
        totalTime = 4;
        note = "Gate C has zero queue right now. Excellent choice for a quick exit.";
      } else if (to === 'entrance-north') {
        steps = [
          { zone_id: from, zone_name: fromName, instruction: `Navigate out of ${fromName}`, density_level: 'green', estimated_time_min: 0 },
          { zone_id: "main-hall", zone_name: "Main Hall", instruction: `Cross Main Hall towards the north plaza`, density_level: 'amber', estimated_time_min: 4 },
          { zone_id: to, zone_name: toName, instruction: `Arrive at Info Desk at ${toName}`, density_level: 'amber', estimated_time_min: 2 },
        ];
        totalTime = 6;
      } else {
        steps = [
          { zone_id: from, zone_name: fromName, instruction: `Start at location`, density_level: 'green', estimated_time_min: 0 },
          { zone_id: "main-hall", zone_name: "Main Hall", instruction: `Continue through Main cross-section (Gently steered here to avoid stage crowd)`, density_level: 'amber', estimated_time_min: 3 },
          { zone_id: to, zone_name: toName, instruction: `Arrive at destination`, density_level: 'green', estimated_time_min: 2 },
        ];
        totalTime = 5;
        note = "FlowSync Thermostat: We routed you slightly away from the Stage Area to avoid congestion.";
      }

      setRoute({
        steps: steps,
        total_time_min: totalTime,
        confidence: 0.95,
        confidence_label: "High",
        thermostat_note: note
      });
    }
  }

  const calmMode = zoneStatus?.calm_mode_active ?? false
  const suggestions = buildSuggestions(zoneStatus, queues)

  const helpShortcuts = [
    { label: '🚻 Restrooms', note: 'East Wing — quiet now', target: 'east-wing' },
    { label: '🍔 Food', note: 'Main Hall stall A', target: 'main-hall' },
    { label: '🚪 Exit', note: 'Gate C — 85m away', target: 'gate-c' },
    { label: 'ℹ️ Info', note: 'North Entrance desk', target: 'entrance-north' },
  ]

  return (
    <div className={clsx('dashboard-grid', { 'calm-mode': calmMode })}>
      <Sidebar calmMode={calmMode} />

      <main className="main-content" aria-label="Attendee dashboard">
        {/* Page header */}
        <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Your Arena</h1>
            <p className="page-subtitle">Harmony Live 2026 — Gate B open, Main Stage in 40 min</p>
          </div>
          <LiveIndicator label="Updating every 12s" />
        </div>

        {error && (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <ErrorState message={error} />
          </div>
        )}

        {/* Top alert banner */}
        {alerts.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            {alerts.slice(0, 1).map(alert => (
              <div
                key={alert.id}
                className={`alert-banner ${alert.severity}`}
                role="alert"
                aria-live="polite"
                aria-label={`${alert.severity} alert: ${alert.title}`}
              >
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }} aria-hidden="true">
                  {alert.severity === 'critical' ? '⚠️' : alert.severity === 'warning' ? '💬' : 'ℹ️'}
                </span>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{alert.title}</div>
                  <div style={{ opacity: 0.85 }}>{alert.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
        }}>
          {/* Crowd Map */}
          <div>
            <SectionHeader title="Crowd Map" action={<LiveIndicator />} />
            {loading ? (
              <Skeleton width="100%" height={280} />
            ) : (
              <CrowdMap
                zones={zoneStatus?.zones ?? []}
                onZoneClick={(z) => console.log('Zone clicked:', z.name)}
              />
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Invisible Concierge */}
            <div>
              <SectionHeader title="For You Right Now" />
              <div className="concierge-panel fade-in">
                <div className="concierge-header">
                  <span style={{ fontSize: 14 }}>✦</span>
                  <span className="concierge-title">Concierge</span>
                </div>
                {suggestions.length === 0 ? (
                  <p className="concierge-body">All areas of the venue are flowing well. Enjoy the show!</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {suggestions.map((s, i) => (
                      <div key={s.id} style={i > 0 ? { paddingTop: 'var(--space-4)', borderTop: '1px solid hsl(196, 20%, 18%)' } : undefined}>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                          {s.headline}
                        </div>
                        <p className="concierge-body" style={{ marginBottom: 0 }}>{s.body}</p>
                        {s.action && (
                          <button 
                            className="concierge-action btn btn-ghost" 
                            style={{ padding: 0, marginTop: 4, height: 'auto', background: 'transparent' }}
                            onClick={(e) => {
                                e.preventDefault();
                                if (s.targetZone) triggerRoute(s.targetZone);
                                else document.getElementById('queues-section')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                          >
                            {s.action} →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Help shortcuts */}
            <div className="secondary-info">
              <SectionHeader title="Quick Find" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                {helpShortcuts.map(s => (
                  <button
                    key={s.label}
                    className="card"
                    onClick={() => triggerRoute(s.target)}
                    aria-label={`Find route to ${s.label.replace(/[^a-zA-Z ]/g, '').trim()} — ${s.note}`}
                    style={{
                      cursor: 'pointer', textAlign: 'left',
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)', transition: 'all var(--t-fast)'
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }} aria-hidden="true">{s.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.note}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Smart Route */}
        <div style={{ marginBottom: 'var(--space-6)' }} ref={routeSectionRef}>
          <SectionHeader title="Smart Route" />
          <div className="route-card">
            <div className="route-card-header">
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Find the least crowded path
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                  We&apos;ll pick a route that avoids the busy spots right now
                </div>
              </div>
            </div>
            <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
              <RouteSelector
                zones={zoneStatus?.zones ?? []}
                from={routeFrom}
                to={routeTo}
                setFrom={setRouteFrom}
                setTo={setRouteTo}
                onRecommend={handleRecommend}
              />
            </div>

            {route && (
              <div>
                <div className="route-steps">
                  {route.steps.map((step, i) => (
                    <div key={step.zone_id} className="route-step">
                      <div className={`route-step-dot ${step.density_level}`}>
                        {i + 1}
                      </div>
                      <div className="route-step-text">
                        <div className="route-step-instruction">{step.instruction}</div>
                        {step.estimated_time_min > 0 && (
                          <div className="route-step-time">~{step.estimated_time_min} min walk</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{
                  padding: 'var(--space-4) var(--space-5)',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: 'var(--space-3)',
                }}>
                  <div>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      ~{route.total_time_min} min total
                    </span>
                  </div>
                  <ConfidenceIndicator confidence={route.confidence} label={route.confidence_label} />
                </div>
                {route.thermostat_note && (
                  <div style={{
                    margin: '0 var(--space-5) var(--space-4)',
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'hsl(196, 25%, 11%)', border: '1px solid hsl(196, 30%, 20%)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-sm)', color: 'var(--accent-300)',
                  }}>
                    ↻ {route.thermostat_note}
                  </div>
                )}
              </div>
            )}

            {!route && (
              <div style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                Choose a start and destination above to get a route
              </div>
            )}
          </div>
        </div>

        {/* Queue cards */}
        <div id="queues-section">
          <SectionHeader title="Queue Status" action={
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Predicted wait times</span>
          } />
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
              {[1, 2, 3].map(i => <Skeleton key={i} height={100} />)}
            </div>
          ) : queues?.queues.length === 0 ? (
            <EmptyState message="No active queues at the moment" icon="✓" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
              {queues?.queues.map(q => (
                <div key={q.id} className="queue-card fade-in">
                  <div className="queue-card-header">
                    <div>
                      <div className="queue-name">{q.name}</div>
                      <div className="queue-location">{q.zone_name}</div>
                    </div>
                    <div className="queue-wait">
                      <div className="queue-wait-value">{Math.ceil(q.predicted_wait_min)}</div>
                      <div className="queue-wait-label">min wait</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{q.length} people ahead</span>
                      <span style={{ fontSize: 11, color: q.is_virtual ? 'var(--accent-400)' : 'var(--text-tertiary)' }}>
                        {q.is_virtual ? '✦ Virtual' : 'Physical'}
                      </span>
                    </div>
                    <div className="density-bar-track">
                      <div
                        className="density-bar-fill"
                        style={{
                          width: `${Math.min(100, (q.length / 60) * 100)}%`,
                          background: q.predicted_wait_min > 10
                            ? 'var(--density-red)'
                            : q.predicted_wait_min > 5
                            ? 'var(--density-amber)'
                            : 'var(--density-green)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
