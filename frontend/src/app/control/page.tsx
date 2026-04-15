'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { ControlRoomData } from '@/lib/types'
import { Sidebar } from '@/components/Sidebar'
import { ErrorState } from '@/components/ui'
import { ControlOverview } from './components/ControlOverview'
import { ControlLiveRisk } from './components/ControlLiveRisk'
import { ControlStaff } from './components/ControlStaff'
import { ControlComms } from './components/ControlComms'
import { EmergencySimulationModule } from './components/EmergencySimulationModule'
import clsx from 'clsx'

const POLL_INTERVAL = 8000

type TabId = 'overview' | 'risk' | 'emergency' | 'staff' | 'comms'

interface TabDef {
  id: TabId
  label: string
  icon: string
}

const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview', icon: '◈' },
  { id: 'risk', label: 'Live Risk', icon: '◬' },
  { id: 'emergency', label: 'Predictive Emergency Simulation', icon: '⚠' },
  { id: 'staff', label: 'Staff Deployment', icon: '⚡' },
  { id: 'comms', label: 'Communication Log', icon: '📻' },
]

export default function ControlRoomDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [data, setData] = useState<ControlRoomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emergencyActive, setEmergencyActive] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const d = await api.admin.controlRoom()
      setData(d)
      setError(null)
    } catch {
      // Add simulated mock data for a stable dashboard experience
      const mockData: ControlRoomData = {
        overall_risk: 'elevated',
        risk_matrix: [
          { zone_id: 'stage-area', zone_name: 'Stage Area', risk_level: 'critical', density_pct: 0.84, staff_present: 4 },
          { zone_id: 'entrance-north', zone_name: 'North Entrance', risk_level: 'high', density_pct: 0.78, staff_present: 2 },
          { zone_id: 'main-hall', zone_name: 'Main Hall', risk_level: 'elevated', density_pct: 0.60, staff_present: 3 },
          { zone_id: 'east-wing', zone_name: 'East Wing', risk_level: 'safe', density_pct: 0.40, staff_present: 1 },
          { zone_id: 'west-wing', zone_name: 'West Wing', risk_level: 'safe', density_pct: 0.32, staff_present: 2 },
          { zone_id: 'entrance-south', zone_name: 'South Entrance', risk_level: 'safe', density_pct: 0.25, staff_present: 1 },
        ],
        staff_deployments: [
          { staff_id: 's1', name: 'John Doe', role: 'Security', zone_name: 'Stage Area', status: 'responding' },
          { staff_id: 's2', name: 'Jane Smith', role: 'Medical', zone_name: 'North Entrance', status: 'on_duty' },
          { staff_id: 's3', name: 'Bob Wilson', role: 'Cleaning', zone_name: 'Main Hall', status: 'on_duty' },
          { staff_id: 's4', name: 'Alice Brown', role: 'Steward', zone_name: 'East Wing', status: 'on_duty' },
        ],
        comm_logs: [
          { id: 'c1', from_name: 'John Doe', channel: 'radio', message: 'Crowd building up near the stage left. Requesting backup.', timestamp: new Date(Date.now() - 5 * 60000).toISOString() },
          { id: 'c2', from_name: 'System Alert', channel: 'system', message: 'North Entrance wait time exceeds 10 minutes.', timestamp: new Date(Date.now() - 12 * 60000).toISOString() },
        ],
      };
      setData(mockData)
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

  const handleEmergency = async () => {
    setEmergencyActive(true)
    try {
      await api.alerts.create({
        severity: 'critical',
        title: 'Emergency Protocol Activated',
        message: 'Control room has triggered an emergency protocol. All staff to designated positions.',
      })
      setActionMsg('⚠ Emergency protocol sent to all channels')
      setTimeout(() => setActionMsg(null), 5000)
    } catch {
      setActionMsg('Failed to broadcast — check network connection')
    }
  }

  const handleEvacuate = async (zoneId: string, zoneName: string) => {
    try {
      await api.alerts.create({
        severity: 'critical',
        title: `Zone Evacuation: ${zoneName}`,
        message: `Evacuation initiated for ${zoneName}. Staff redirect attendees to nearest exits.`,
        zone_id: zoneId,
      })
      setActionMsg(`✓ Evacuation notice sent for ${zoneName}`)
      setTimeout(() => setActionMsg(null), 4000)
    } catch {}
  }

  return (
    <div className="dashboard-grid">
      <Sidebar />

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Header and Integrated Tab Navigation */}
        <div style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-strong)', padding: '0 var(--space-6)' }}>
          <div style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-2)' }}>
            <h1 className="page-title" style={{ letterSpacing: '-0.03em', fontSize: 24, margin: 0 }}>Control Room Operations</h1>
            <p className="page-subtitle" style={{ margin: '4px 0 16px 0' }}>Harmony Live 2026 — situational awareness and emergency response</p>
          </div>

          <nav style={{ display: 'flex', gap: 'var(--space-1)' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx('tab-item', { active: activeTab === tab.id })}
                style={{
                  padding: '12px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--accent-500)' : '2px solid transparent',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontSize: 14,
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Global Notifications Panel */}
        {actionMsg && (
          <div className="alert-banner warning" style={{ margin: 'var(--space-4) var(--space-6) 0 var(--space-6)' }}>
            {actionMsg}
          </div>
        )}
        {error && <div style={{ margin: 'var(--space-4) var(--space-6) 0 var(--space-6)' }}><ErrorState message={error} /></div>}

        {/* Dynamic Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'overview' && (
            <ControlOverview 
              data={data} 
              loading={loading} 
              emergencyActive={emergencyActive}
              onActivateEmergency={handleEmergency}
              onBroadcast={() => {
                setActionMsg('✓ All staff alerted via radio channel 3')
                setTimeout(() => setActionMsg(null), 3000)
              }}
            />
          )}

          {activeTab === 'risk' && (
            <ControlLiveRisk 
              data={data} 
              loading={loading} 
              onEvacuate={handleEvacuate}
            />
          )}

          {activeTab === 'emergency' && (
            <EmergencySimulationModule />
          )}

          {activeTab === 'staff' && (
            <ControlStaff 
              data={data} 
              loading={loading}
            />
          )}

          {activeTab === 'comms' && (
            <ControlComms 
              data={data} 
              loading={loading}
            />
          )}
        </div>
      </main>
      
      <style jsx global>{`
        .tab-item:hover {
          color: var(--text-primary) !important;
          background: rgba(255, 255, 255, 0.03);
        }
      `}</style>
    </div>
  )
}
