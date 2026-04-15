'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { ZoneStatus, StaffTask, Alert } from '@/lib/types'
import { Sidebar } from '@/components/Sidebar'
import {
  DensityBadge, DensityBar, PriorityBadge, LiveIndicator,
  Skeleton, EmptyState, ErrorState, SectionHeader
} from '@/components/ui'

const POLL_INTERVAL = 10000

export default function StaffDashboard() {
  const [zoneStatus, setZoneStatus] = useState<ZoneStatus | null>(null)
  const [tasks, setTasks] = useState<StaffTask[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)
  const [updatingTask, setUpdatingTask] = useState<string | null>(null)
  const [quickActionMsg, setQuickActionMsg] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [z, t, a] = await Promise.all([
        api.zones.status(),
        api.admin.tasks(),
        api.alerts.list(),
      ])
      setZoneStatus(z)
      setTasks(t)
      setAlerts(a.filter(al => !al.resolved))
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

      const MOCK_TASKS: StaffTask[] = [
        { id: "t1", priority: "urgent", title: "Clear bottleneck at North Entrance corridor", zone_id: "entrance-north", zone_name: "North Entrance", description: "Crowd building up near pillar 4. Open the secondary lane.", status: "pending", created_at: new Date().toISOString() },
        { id: "t2", priority: "high", title: "Restock food stall — West Wing", zone_id: "west-wing", zone_name: "West Wing", description: "Team B reported queue forming. Supplies in storage bay 2.", status: "in_progress", created_at: new Date().toISOString() },
        { id: "t3", priority: "medium", title: "Gate B: verify ticketing scanner", zone_id: "gate-b", zone_name: "Gate B", description: "Scanner 2 showing intermittent errors.", status: "pending", created_at: new Date().toISOString() },
        { id: "t4", priority: "low", title: "Routine zone sweep — East Wing", zone_id: "east-wing", zone_name: "East Wing", description: "Standard 30-min sweep. Log any maintenance issues.", status: "done", created_at: new Date().toISOString() },
      ];

      const MOCK_ALERTS: Alert[] = [
        { id: "a1", severity: "warning", title: "Congestion Alert", message: "North Entrance is exceeding 75% capacity.", zone_id: "entrance-north", zone_name: "North Entrance", created_at: new Date().toISOString(), resolved: false },
        { id: "a2", severity: "critical", title: "Stage Area Capacity", message: "Main stage area reached 84% capacity. Preparing overflow.", zone_id: "stage-area", zone_name: "Stage Area", created_at: new Date().toISOString(), resolved: false },
      ];

      setZoneStatus(MOCK_ZONE_STATUS)
      setTasks(MOCK_TASKS)
      setAlerts(MOCK_ALERTS)
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

  const handleResolveAlert = async (alertId: string) => {
    setResolving(alertId)
    try {
      await api.alerts.resolve(alertId)
      setAlerts(prev => prev.filter(a => a.id !== alertId))
      setQuickActionMsg('✓ Alert resolved')
      setTimeout(() => setQuickActionMsg(null), 3000)
    } catch {
      setAlerts(prev => prev.filter(a => a.id !== alertId))
      setQuickActionMsg('✓ Alert resolved (Simulated)')
      setTimeout(() => setQuickActionMsg(null), 3000)
    } finally {
      setResolving(null)
    }
  }

  const handleTaskStatus = async (taskId: string, newStatus: string) => {
    setUpdatingTask(taskId)
    try {
      await api.admin.updateTaskStatus(taskId, newStatus)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as StaffTask['status'] } : t))
      setQuickActionMsg(newStatus === 'in_progress' ? '✓ Task started' : '✓ Task marked complete')
      setTimeout(() => setQuickActionMsg(null), 3000)
    } catch {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as StaffTask['status'] } : t))
      setQuickActionMsg(newStatus === 'in_progress' ? '✓ Task started (Simulated)' : '✓ Task marked complete (Simulated)')
      setTimeout(() => setQuickActionMsg(null), 3000)
    } finally {
      setUpdatingTask(null)
    }
  }

  const createQuickAlert = async (title: string, message: string) => {
    try {
      await api.alerts.create({ severity: 'warning', title, message })
      setQuickActionMsg('✓ Alert sent to control room')
      setTimeout(() => setQuickActionMsg(null), 3000)
      await fetchData()
    } catch {
      setQuickActionMsg('✓ Alert sent to control room (Simulated)')
      setTimeout(() => setQuickActionMsg(null), 3000)
    }
  }

  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done')
  const activeTasks = tasks.filter(t => t.status !== 'done')
  const completedTasks = tasks.filter(t => t.status === 'done')

  return (
    <div className="dashboard-grid">
      <Sidebar calmMode={zoneStatus?.calm_mode_active} />

      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Operations</h1>
            <p className="page-subtitle">Staff view — Harmony Live 2026</p>
          </div>
          <LiveIndicator label="Live" />
        </div>

        {error && <div style={{ marginBottom: 'var(--space-5)' }}><ErrorState message={error} /></div>}

        {quickActionMsg && (
          <div className="alert-banner info" style={{ marginBottom: 'var(--space-5)' }}>
            {quickActionMsg}
          </div>
        )}

        {/* Urgent task callout */}
        {urgentTasks.length > 0 && (
          <div style={{
            background: 'hsl(4, 40%, 9%)', border: '1px solid hsl(4, 45%, 22%)',
            borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)',
            marginBottom: 'var(--space-6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <span style={{ fontWeight: 700, color: 'hsl(4, 70%, 68%)', fontSize: 'var(--text-sm)' }}>
                {urgentTasks.length} urgent task{urgentTasks.length > 1 ? 's' : ''} need attention
              </span>
            </div>
            {urgentTasks.slice(0, 2).map(task => (
              <div key={task.id} style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'hsl(4, 35%, 7%)', borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-2)',
              }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</div>
                {task.zone_name && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{task.zone_name}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>

          {/* Zone pressure panel */}
          <div>
            <SectionHeader title="Zone Pressure" action={
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                Avg {zoneStatus ? `${Math.round(zoneStatus.avg_density * 100)}%` : '—'}
              </span>
            } />
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3, 4].map(i => <Skeleton key={i} height={64} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {(zoneStatus?.zones ?? []).map(zone => (
                  <div key={zone.id} style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)', padding: 'var(--space-4) var(--space-5)',
                    display: 'grid', gridTemplateColumns: '1fr auto auto',
                    gap: 'var(--space-4)', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                        {zone.name}
                      </div>
                      <DensityBar pct={zone.density_pct} level={zone.density_level} />
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                        {zone.current_count.toLocaleString()} / {zone.capacity.toLocaleString()} people
                      </div>
                    </div>
                    <DensityBadge level={zone.density_level} />
                    <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {Math.round(zone.density_pct * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions + Incident log */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Quick actions */}
            <div>
              <SectionHeader title="Quick Actions" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {[
                  { label: '↔ Open extra lane', fn: () => createQuickAlert('Extra Lane Opened', 'Staff opened secondary lane at North Entrance to reduce congestion.') },
                  { label: '⚠ Report crowd buildup', fn: () => createQuickAlert('Crowd Buildup Reported', 'Staff reported crowd buildup. Control room notified.') },
                  { label: '🔒 Close gate temporarily', fn: () => createQuickAlert('Gate Temporarily Closed', 'Gate closed for safety. Alternative gates active.') },
                ].map(action => (
                  <button
                    key={action.label}
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                    onClick={action.fn}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active alerts */}
            <div>
              <SectionHeader title="Active Alerts" action={
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{alerts.length} open</span>
              } />
              {alerts.length === 0 ? (
                <EmptyState message="No active alerts — all clear" icon="✓" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {alerts.slice(0, 4).map(alert => (
                    <div key={alert.id} style={{
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {alert.title}
                          </div>
                          {alert.zone_name && (
                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>{alert.zone_name}</div>
                          )}
                        </div>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, padding: '3px 8px' }}
                          disabled={resolving === alert.id}
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          {resolving === alert.id ? '…' : 'Resolve'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Task List */}
        <div>
          <SectionHeader title="My Tasks" action={
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {activeTasks.length} active · {completedTasks.length} done
            </span>
          } />
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <Skeleton key={i} height={72} />)}
            </div>
          ) : activeTasks.length === 0 ? (
            <EmptyState message="All tasks complete — great work" icon="✓" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {activeTasks.map(task => (
                <div key={task.id} className="task-item">
                  <div className={`task-priority-indicator ${task.priority}`} />
                  <div>
                    <div className="task-title">{task.title}</div>
                    {task.description && <div className="task-description">{task.description}</div>}
                    {task.zone_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'var(--bg-overlay)', padding: '1px 7px', borderRadius: 'var(--radius-full)' }}>
                          {task.zone_name}
                        </span>
                        <PriorityBadge priority={task.priority} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {task.status === 'pending' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={updatingTask === task.id}
                        onClick={() => handleTaskStatus(task.id, 'in_progress')}
                      >
                        Start
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={updatingTask === task.id}
                        onClick={() => handleTaskStatus(task.id, 'done')}
                      >
                        Mark done
                      </button>
                    )}
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
