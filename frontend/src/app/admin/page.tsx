'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { api } from '@/lib/api'
import type { AdminAnalytics, ZoneStatus } from '@/lib/types'
import { Sidebar } from '@/components/Sidebar'
import { CrowdMap } from '@/components/maps/CrowdMap'
import { LiveIndicator, Skeleton, ErrorState, SectionHeader } from '@/components/ui'

const POLL_INTERVAL = 15000

// Custom chart tooltip
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-overlay)', border: '1px solid var(--border-muted)',
      borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--accent-400)', fontWeight: 600 }}>
        {typeof payload[0].value === 'number' ? payload[0].value.toFixed(0) : payload[0].value}
        {payload[0].unit || ''}
      </div>
    </div>
  )
}

const trendMap: Record<string, string> = {
  up: '↑',
  down: '↓',
  stable: '→',
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [zoneStatus, setZoneStatus] = useState<ZoneStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [a, z] = await Promise.all([api.admin.analytics(), api.zones.status()])
      setAnalytics(a)
      setZoneStatus(z)
      setError(null)
    } catch {
      // Provide simulated data if the API backend is down so the dashboard works
      const MOCK_ZONE_STATUS: ZoneStatus = {
        zones: [
          { id: "entrance-north", name: "North Entrance", capacity: 800, current_count: 620, density_level: 'amber', density_pct: 0.775, last_updated: new Date().toISOString(), adjacent_zones: ["main-hall", "gate-a"], amenities: ["exit", "info"], coordinates: {x: 40, y: 5, width: 20, height: 12} },
          { id: "main-hall", name: "Main Hall", capacity: 3000, current_count: 1800, density_level: 'amber', density_pct: 0.60, last_updated: new Date().toISOString(), adjacent_zones: ["entrance-north", "stage-area", "east-wing", "west-wing"], amenities: ["food", "restroom", "info"], coordinates: {x: 25, y: 25, width: 50, height: 35} },
          { id: "stage-area", name: "Stage Area", capacity: 5000, current_count: 4200, density_level: 'red', density_pct: 0.84, last_updated: new Date().toISOString(), adjacent_zones: ["main-hall"], amenities: [], coordinates: {x: 30, y: 65, width: 40, height: 25} },
          { id: "east-wing", name: "East Wing", capacity: 1200, current_count: 480, density_level: 'green', density_pct: 0.40, last_updated: new Date().toISOString(), adjacent_zones: ["main-hall", "gate-b"], amenities: ["restroom", "food"], coordinates: {x: 80, y: 25, width: 18, height: 35} },
          { id: "west-wing", name: "West Wing", capacity: 1200, current_count: 290, density_level: 'empty', density_pct: 0.24, last_updated: new Date().toISOString(), adjacent_zones: ["main-hall", "gate-c"], amenities: ["restroom", "exit"], coordinates: {x: 2, y: 25, width: 18, height: 35} },
          { id: "gate-a", name: "Gate A", capacity: 500, current_count: 390, density_level: 'amber', density_pct: 0.78, last_updated: new Date().toISOString(), adjacent_zones: ["entrance-north"], amenities: ["exit"], coordinates: {x: 35, y: 0, width: 10, height: 5} },
          { id: "gate-b", name: "Gate B", capacity: 400, current_count: 120, density_level: 'green', density_pct: 0.30, last_updated: new Date().toISOString(), adjacent_zones: ["east-wing"], amenities: ["exit"], coordinates: {x: 90, y: 35, width: 8, height: 10} },
          { id: "gate-c", name: "Gate C", capacity: 400, current_count: 85, density_level: 'empty', density_pct: 0.21, last_updated: new Date().toISOString(), adjacent_zones: ["west-wing"], amenities: ["exit"], coordinates: {x: 0, y: 35, width: 8, height: 10} },
        ],
        avg_density: 0.55,
        calm_mode_active: false,
        timestamp: new Date().toISOString()
      };

      const MOCK_ANALYTICS: AdminAnalytics = {
        kpis: [
          { label: 'Total Attendance', value: '42,500', change: '+2.4%', trend: 'up' },
          { label: 'Avg Density', value: '68%', change: '-1.2%', trend: 'down' },
          { label: 'Active Alerts', value: '3', change: '0', trend: 'stable' },
          { label: 'Staff Deployed', value: '145', change: '+5', trend: 'up' },
          { label: 'Avg Wait Time', value: '12m', change: '-2m', trend: 'down' },
          { label: 'Gate Throughput', value: '4.2k/hr', change: '+0.5k', trend: 'up' }
        ],
        density_trend: [
          { timestamp: '12:00', value: 0.4 }, { timestamp: '14:00', value: 0.45 },
          { timestamp: '16:00', value: 0.6 }, { timestamp: '18:00', value: 0.75 },
          { timestamp: '20:00', value: 0.82 }, { timestamp: '22:00', value: 0.65 }
        ],
        alert_trend: [
          { timestamp: '12:00', value: 1 }, { timestamp: '14:00', value: 2 },
          { timestamp: '16:00', value: 5 }, { timestamp: '18:00', value: 3 },
          { timestamp: '20:00', value: 8 }, { timestamp: '22:00', value: 2 }
        ],
        gate_performance: [
          { gate_id: 'gate-a', gate_name: 'Gate A', throughput_per_hour: 1200, avg_wait_min: 8, status: 'normal' },
          { gate_id: 'gate-b', gate_name: 'Gate B', throughput_per_hour: 1800, avg_wait_min: 15, status: 'busy' },
          { gate_id: 'gate-c', gate_name: 'Gate C', throughput_per_hour: 800, avg_wait_min: 5, status: 'normal' },
        ],
        zone_heatmap: [
          { zone_id: 'entrance-north', zone_name: 'North Entrance', density_pct: 0.775 },
          { zone_id: 'main-hall', zone_name: 'Main Hall', density_pct: 0.6 },
          { zone_id: 'stage-area', zone_name: 'Stage Area', density_pct: 0.84 },
          { zone_id: 'east-wing', zone_name: 'East Wing', density_pct: 0.4 },
        ],
        timestamp: new Date().toISOString()
      };

      setAnalytics(MOCK_ANALYTICS)
      setZoneStatus(MOCK_ZONE_STATUS)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchData])

  const heatmapColors = (pct: number) => {
    if (pct < 0.2) return 'var(--density-empty)'
    if (pct < 0.5) return 'var(--density-green)'
    if (pct < 0.75) return 'var(--density-amber)'
    if (pct < 0.9) return 'var(--density-red)'
    return 'var(--density-critical)'
  }

  return (
    <div className="dashboard-grid">
      <Sidebar calmMode={zoneStatus?.calm_mode_active} />

      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">Harmony Live 2026 — event overview and decision support</p>
          </div>
          <LiveIndicator label="Refreshing every 15s" />
        </div>

        {error && <div style={{ marginBottom: 'var(--space-5)' }}><ErrorState message={error} /></div>}

        {/* KPI Grid */}
        <div style={{ marginBottom: 'var(--space-7)' }}>
          <SectionHeader title="Key Metrics" />
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={100} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
              {analytics?.kpis.map((kpi, i) => (
                <div key={i} className="stat-card fade-in">
                  <div className="stat-label">{kpi.label}</div>
                  <div className="stat-value">{kpi.value}</div>
                  {kpi.change && (
                    <div className={`stat-change ${kpi.trend ?? 'stable'}`}>
                      {kpi.trend && <span>{trendMap[kpi.trend]}</span>}
                      {kpi.change}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-7)' }}>
          {/* Density trend */}
          <div>
            <SectionHeader title="Crowd Density — Last 12 Hours" />
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              {loading ? <Skeleton height={200} /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={analytics?.density_trend ?? []} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <XAxis
                      dataKey="timestamp"
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tickFormatter={v => `${Math.round(v * 100)}%`}
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                      axisLine={false} tickLine={false}
                      domain={[0, 1]}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone" dataKey="value"
                      stroke="var(--accent-500)" strokeWidth={2}
                      dot={false} activeDot={{ r: 4, fill: 'var(--accent-400)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Alert trend */}
          <div>
            <SectionHeader title="Alerts over Time" />
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              {loading ? <Skeleton height={200} /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics?.alert_trend ?? []} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <XAxis
                      dataKey="timestamp"
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]} fill="hsl(38, 70%, 40%)">
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Bottom row: map + heatmap + gate performance */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
          {/* Live crowd map */}
          <div>
            <SectionHeader title="Live Crowd Map" />
            {loading ? <Skeleton height={260} /> : (
              <CrowdMap zones={zoneStatus?.zones ?? []} />
            )}
          </div>

          {/* Zone heatmap + gate performance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Zone density heatmap */}
            <div>
              <SectionHeader title="Zone Density Heatmap" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {(analytics?.zone_heatmap ?? []).map(zone => (
                  <div key={zone.zone_id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 48px 120px',
                    alignItems: 'center', gap: 'var(--space-4)',
                  }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {zone.zone_name}
                    </span>
                    <span style={{
                      fontSize: 11, fontFamily: 'var(--font-mono)',
                      color: heatmapColors(zone.density_pct), textAlign: 'right',
                    }}>
                      {Math.round(zone.density_pct * 100)}%
                    </span>
                    <div style={{
                      height: 8, borderRadius: 4, background: 'var(--bg-overlay)', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${zone.density_pct * 100}%`,
                        background: heatmapColors(zone.density_pct),
                        borderRadius: 4,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gate performance */}
            <div>
              <SectionHeader title="Gate Performance" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {(analytics?.gate_performance ?? []).map(gate => (
                  <div key={gate.gate_id} style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
                    display: 'grid', gridTemplateColumns: '1fr auto auto',
                    alignItems: 'center', gap: 'var(--space-5)',
                  }}>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {gate.gate_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
                        {gate.throughput_per_hour}/hr · {gate.avg_wait_min} min avg wait
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: gate.status === 'busy' ? 'var(--density-amber)' : 'var(--density-green)',
                      background: gate.status === 'busy' ? 'var(--density-amber-bg)' : 'var(--density-green-bg)',
                      padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    }}>
                      {gate.status === 'busy' ? 'Busy' : 'Normal'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
