'use client'

import React from 'react'
import { ArrowLeft, GitCompare, Download, CalendarDays, Users, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CompareView() {
  const router = useRouter()

  // Static mock comparison data for visual styling
  const scenarioA = {
    name: 'Standard Flow',
    phase: 'Pre-Match',
    peakDensity: '85%',
    avgWait: '4m 30s',
    riskLevel: 'ELEVATED',
    staffDeployed: 40
  }

  const scenarioB = {
    name: 'Gate A + B Delayed 15m',
    phase: 'Pre-Match',
    peakDensity: '98%',
    avgWait: '14m 10s',
    riskLevel: 'CRITICAL',
    staffDeployed: 40
  }

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 1000, margin: '0 auto' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 8, borderRadius: 'var(--radius-sm)', display: 'flex' }} className="hover-bg-elevated">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: 24, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
              What-If Comparison
            </h1>
            <p style={{ margin: 0, marginTop: 4, color: 'var(--text-secondary)', fontSize: 14 }}>
              Comparing impact of operational changes on crowd dynamics.
            </p>
          </div>
        </div>
      </header>

      {/* Comparison Header Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 16, alignItems: 'center', marginBottom: 32 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
           <h2 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginBottom: 8 }}>Scenario A (Baseline)</h2>
           <div style={{ fontSize: 20, color: 'var(--text-primary)', fontWeight: 500 }}>{scenarioA.name}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
           <GitCompare size={24} />
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
           <h2 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginBottom: 8 }}>Scenario B (Test)</h2>
           <div style={{ fontSize: 20, color: 'var(--text-primary)', fontWeight: 500 }}>{scenarioB.name}</div>
        </div>
      </div>

      {/* Metric Breakdown Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 32 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-strong)' }}>
              <th style={{ padding: '16px 24px', color: 'var(--text-tertiary)', fontSize: 13, textTransform: 'uppercase', fontWeight: 600 }}>Metric</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, width: '30%' }}>Baseline A</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, width: '30%' }}>Test B</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, width: '15%' }}>Delta</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '16px 24px', color: 'var(--text-primary)', fontWeight: 500 }}>Peak Density</td>
              <td style={{ padding: '16px 24px', color: 'var(--text-primary)' }}>{scenarioA.peakDensity}</td>
              <td style={{ padding: '16px 24px', color: 'var(--density-red)', fontWeight: 600 }}>{scenarioB.peakDensity}</td>
              <td style={{ padding: '16px 24px', color: 'var(--density-red)' }}>+13%</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '16px 24px', color: 'var(--text-primary)', fontWeight: 500 }}>Avg Entry Wait Time</td>
              <td style={{ padding: '16px 24px', color: 'var(--text-primary)' }}>{scenarioA.avgWait}</td>
              <td style={{ padding: '16px 24px', color: 'var(--density-red)', fontWeight: 600 }}>{scenarioB.avgWait}</td>
              <td style={{ padding: '16px 24px', color: 'var(--density-red)' }}>+9m 40s</td>
            </tr>
            <tr style={{ borderBottom: 'none' }}>
              <td style={{ padding: '16px 24px', color: 'var(--text-primary)', fontWeight: 500 }}>Overall Risk</td>
              <td style={{ padding: '16px 24px' }}>
                <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--density-amber)', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{scenarioA.riskLevel}</span>
              </td>
              <td style={{ padding: '16px 24px' }}>
                <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--density-critical)', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{scenarioB.riskLevel}</span>
              </td>
              <td style={{ padding: '16px 24px', color: 'var(--text-primary)' }}>Upgrade</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Deductions / Recommendations */}
      <h3 style={{ fontSize: 16, color: 'var(--text-primary)', marginBottom: 16 }}>Operational Impact Analysis</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
         <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--density-critical)', marginBottom: 8 }}>
             <AlertTriangle size={18} />
             <span style={{ fontWeight: 600 }}>High Risk of Spillage</span>
           </div>
           <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
             The 15 minute delay for Gate A and B causes a severe queue backlog that exceeds the entry plaza capacity. Attendees will overflow into the vehicle approach lanes.
           </p>
         </div>
      </div>

    </div>
  )
}
