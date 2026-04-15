'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Play, Settings2 } from 'lucide-react'

export default function ScenarioBuilder() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: 'Halftime Rush (Sector A)',
    event_phase: 'halftime',
    attendance: 8500,
    gate_delay: 0,
    crowd_intensity: 1.0,
    staff_count: 45
  })

  // In a real app this hits POST /api/digital-twin/scenarios and then POST /simulate
  const handleRunSimulation = async () => {
    setIsSubmitting(true)
    // mock network delay
    await new Promise(r => setTimeout(r, 1000))
    // we route to a demo id
    router.push('/digital-twin/simulation/demo-run-id')
  }

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 800, margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', marginBottom: 8 }}>Scenario Builder</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
          Define the variables and conditions you want to simulate. 
        </p>
      </header>

      <div style={{
        background: 'var(--bg-card)', 
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)', 
        padding: '32px',
        display: 'flex', flexDirection: 'column', gap: '24px'
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
          <Settings2 size={20} color="var(--accent-500)" />
          <h2 style={{ fontSize: 18, color: 'var(--text-primary)' }}>Scenario Parameters</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>Scenario Name</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              style={{ padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 16 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>Event Phase</label>
            <select 
              value={formData.event_phase}
              onChange={e => setFormData({...formData, event_phase: e.target.value})}
              style={{ padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 16 }}
            >
              <option value="entry">Pre-Match Entry</option>
              <option value="first_half">First Half</option>
              <option value="halftime">Halftime Rush</option>
              <option value="exit">End of Match Exit</option>
              <option value="evacuation">Emergency Evacuation</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>Total Attendance</label>
            <input 
              type="number" 
              value={formData.attendance}
              onChange={e => setFormData({...formData, attendance: parseInt(e.target.value)})}
              style={{ padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 16 }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>Gate Delay (Minutes)</label>
            <input 
              type="number" 
              value={formData.gate_delay}
              onChange={e => setFormData({...formData, gate_delay: parseInt(e.target.value)})}
              style={{ padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 16 }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>Crowd Intensity Multiplier</span>
              <span style={{ fontSize: 14, color: 'var(--accent-400)', fontFamily: 'monospace' }}>{formData.crowd_intensity}x</span>
            </label>
            <input 
              type="range" 
              min="0.5" max="2.0" step="0.1"
              value={formData.crowd_intensity}
              onChange={e => setFormData({...formData, crowd_intensity: parseFloat(e.target.value)})}
              style={{ marginTop: 8 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>1.0 = Normal flow rate. 1.5 = Highly urgent crowd.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>Staff Deployed</label>
            <input 
              type="number" 
              value={formData.staff_count}
              onChange={e => setFormData({...formData, staff_count: parseInt(e.target.value)})}
              style={{ padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 16 }}
            />
          </div>
        </div>

        {/* Closed Routes UI Mock */}
        <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 16, borderRadius: 'var(--radius-sm)' }}>
           <h3 style={{ fontSize: 14, color: 'var(--density-red)', marginBottom: 8, fontWeight: 600 }}>Route Closures</h3>
           <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Click on the map editor to toggle zone closures, or select from list. Currently 0 closed zones.</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 16, paddingTop: 24, borderTop: '1px solid var(--border-subtle)' }}>
          <button style={{ 
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', background: 'transparent', border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 15, fontWeight: 500
          }}>
            <Save size={18} /> Save Scenario
          </button>
          
          <button 
            onClick={handleRunSimulation}
            disabled={isSubmitting}
            style={{ 
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', background: 'var(--accent-500)', border: '1px solid var(--accent-600)',
            color: 'white', borderRadius: 'var(--radius-sm)', cursor: isSubmitting ? 'wait' : 'pointer', fontSize: 15, fontWeight: 500,
            opacity: isSubmitting ? 0.7 : 1
          }}>
            <Play size={18} /> {isSubmitting ? 'Engine Starting...' : 'Run Simulation'}
          </button>
        </div>
      </div>
    </div>
  )
}
