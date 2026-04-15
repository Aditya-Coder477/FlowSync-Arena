import React from 'react'
import Link from 'next/link'
import { Activity, Plus, Map, History } from 'lucide-react'

export default function DigitalTwinDashboard() {
  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', marginBottom: 8 }}>Digital Twin Simulation</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: 600 }}>
          Plan and forecast venue operations safely. Simulate crowd movement, test operational scenarios like gate delays or halftime rushes, and evaluate staffing changes.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '48px' }}>
        
        <Link href="/digital-twin/editor" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)', padding: '24px', height: '100%',
            transition: 'border-color 0.2s', cursor: 'pointer'
          }} className="hoverable-card">
            <div style={{ background: 'rgba(56, 189, 248, 0.1)', width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-500)', marginBottom: 16 }}>
              <Map size={24} />
            </div>
            <h3 style={{ fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>Venue Definition</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Edit the structural nodes, paths, and capacity zones of the stadium.</p>
          </div>
        </Link>

        <Link href="/digital-twin/scenario" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)', padding: '24px', height: '100%',
            transition: 'border-color 0.2s', cursor: 'pointer'
          }} className="hoverable-card">
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--density-green)', marginBottom: 16 }}>
              <Plus size={24} />
            </div>
            <h3 style={{ fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>New Simulation</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Design a new event scenario, configure delays, attendance, and run.</p>
          </div>
        </Link>
        
        <Link href="/digital-twin/compare" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)', padding: '24px', height: '100%',
            transition: 'border-color 0.2s', cursor: 'pointer'
          }} className="hoverable-card">
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--density-amber)', marginBottom: 16 }}>
              <Activity size={24} />
            </div>
            <h3 style={{ fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>What-If Analysis</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Compare outcome metrics side-by-side between two distinct simulation runs.</p>
          </div>
        </Link>

      </div>

      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <History size={20} color="var(--text-secondary)" />
          <h2 style={{ fontSize: 20, color: 'var(--text-primary)' }}>Recent Simulations</h2>
        </div>
        
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-elevated)', fontSize: 13, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Scenario</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Phase</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Overall Risk</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {/* Dummy data to look populated */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '16px 24px', color: 'var(--text-primary)', fontWeight: 500 }}>Delayed Opening (-15m)</td>
                <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>Pre-match</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ color: 'var(--density-amber)', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>ELEVATED</span>
                </td>
                <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>2 days ago</td>
                <td style={{ padding: '16px 24px' }}>
                  <Link href="/digital-twin/simulation/demo-1" style={{ color: 'var(--accent-500)', textDecoration: 'none', fontSize: 14 }}>View Playback</Link>
                </td>
              </tr>
              <tr style={{ borderBottom: 'none' }}>
                <td style={{ padding: '16px 24px', color: 'var(--text-primary)', fontWeight: 500 }}>Standard Flow 80% Cap</td>
                <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>Normal Entry</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ color: 'var(--density-green)', background: 'rgba(34, 197, 94, 0.1)', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>SAFE</span>
                </td>
                <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>Last week</td>
                <td style={{ padding: '16px 24px' }}>
                  <Link href="/digital-twin/simulation/demo-2" style={{ color: 'var(--accent-500)', textDecoration: 'none', fontSize: 14 }}>View Playback</Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hoverable-card:hover {
          border-color: var(--accent-500) !important;
        }
      `}} />
    </div>
  )
}
