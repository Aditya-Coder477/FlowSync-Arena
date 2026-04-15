'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, FileText, CheckCircle2 } from 'lucide-react'

export default function ReportView() {
  const params = useParams()
  const router = useRouter()

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 800, margin: '0 auto', background: 'white', color: 'black', borderRadius: '4px', minHeight: '100vh', paddingBottom: 100 }}>
      
      {/* Non-printable controls */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: '1px solid #ccc', color: '#333', cursor: 'pointer', padding: '8px 16px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <button onClick={() => window.print()} style={{ background: 'var(--accent-500)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px 16px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={16} /> Export to PDF
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}} />

      {/* Report Content */}
      <div style={{ borderBottom: '2px solid #000', paddingBottom: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
           <div style={{ background: '#000', color: '#fff', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontWeight: 'bold' }}>FS</div>
           <span style={{ fontSize: 20, fontWeight: 300, letterSpacing: '0.05em' }}>FLOWSYNC ARENA</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700 }}>Simulation Operations Report</h1>
        <p style={{ marginTop: 8, fontSize: 14, color: '#666' }}>Run ID: {params.id} • Generated {new Date().toLocaleDateString()}</p>
      </div>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, textTransform: 'uppercase', color: '#666', borderBottom: '1px solid #eee', paddingBottom: 8, marginBottom: 16 }}>1. Scenario Overview</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
           <tbody>
             <tr><td style={{ padding: '8px 0', fontWeight: 600, width: 200 }}>Scenario Name</td><td>Halftime Rush (Sector A)</td></tr>
             <tr><td style={{ padding: '8px 0', fontWeight: 600 }}>Event Phase</td><td>Halftime</td></tr>
             <tr><td style={{ padding: '8px 0', fontWeight: 600 }}>Expected Attendance</td><td>8,500</td></tr>
             <tr><td style={{ padding: '8px 0', fontWeight: 600 }}>Variables Tweaked</td><td>Main Corridor C Closed for Maintenance</td></tr>
           </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, textTransform: 'uppercase', color: '#666', borderBottom: '1px solid #eee', paddingBottom: 8, marginBottom: 16 }}>2. Key Findings</h2>
        <ul style={{ paddingLeft: 20, fontSize: 15, lineHeight: 1.6, color: '#333' }}>
          <li><span style={{ fontWeight: 600, color: '#d97706' }}>Bottleneck Detected:</span> Main Food Court approaches 98% density at T+5m into halftime.</li>
          <li><span style={{ fontWeight: 600 }}>Queue Spillover:</span> Restroom queues in Sector B will spill into the primary evacuation path, causing a moderate risk hazard.</li>
          <li><span style={{ fontWeight: 600, color: '#16a34a' }}>Safe Zones:</span> West End hospitality remains below 40% capacity throughout the phase.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, textTransform: 'uppercase', color: '#666', borderBottom: '1px solid #eee', paddingBottom: 8, marginBottom: 16 }}>3. Operational Recommendations</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
           <div style={{ border: '1px solid #d1d5db', padding: 16, borderRadius: 6, display: 'flex', gap: 16 }}>
             <CheckCircle2 color="#d97706" style={{ flexShrink: 0 }} />
             <div>
               <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Redirect flow to West End Food Kiosks</div>
               <div style={{ fontSize: 14, color: '#4b5563' }}>Use Smart Routing signs to push attendees towards the West End where capacity is ample, relieving pressure on the Main Food Court.</div>
             </div>
           </div>

           <div style={{ border: '1px solid #d1d5db', padding: 16, borderRadius: 6, display: 'flex', gap: 16 }}>
             <CheckCircle2 color="#d97706" style={{ flexShrink: 0 }} />
             <div>
               <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Deploy Crowd Managers to Sector B</div>
               <div style={{ fontSize: 14, color: '#4b5563' }}>Assign 4 additional stewards to artificially snake the restroom queues away from the evacuation corridor.</div>
             </div>
           </div>
        </div>
      </section>

      <div style={{ marginTop: 80, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
        This document was generated by FlowSync Arena's Digital Twin engine.<br/>
        Not for public disclosure. Confidential operational data.
      </div>

    </div>
  )
}
