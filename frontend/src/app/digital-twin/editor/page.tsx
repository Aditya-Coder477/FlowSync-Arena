'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Plus, Move, Map as MapIcon, Link as LinkIcon } from 'lucide-react'

export default function VenueLayoutEditor() {
  const router = useRouter()
  const [activeTool, setActiveTool] = useState<'select' | 'zone' | 'link'>('select')

  // Mock zones state for the editor
  const [zones, setZones] = useState([
    { id: 'z1', name: 'Main Concourse', type: 'corridor', capacity: 3000, x: 200, y: 150 },
    { id: 'z2', name: 'West Stand', type: 'stand', capacity: 1500, x: 100, y: 250 },
  ])

  return (
    <div style={{ padding: 'var(--space-6)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 8, borderRadius: 'var(--radius-sm)', display: 'flex' }} className="hover-bg-elevated">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: 24, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
              Venue Model Editor
            </h1>
          </div>
        </div>
        
        <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--accent-500)', border: '1px solid var(--accent-600)', color: 'white', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
           <Save size={16} /> Save Layout
        </button>
      </header>

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        
        {/* Editor Toolbar & Canvas */}
        <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 8, padding: 12, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
             <button 
               onClick={() => setActiveTool('select')}
               style={{ padding: '8px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer', 
                        background: activeTool === 'select' ? 'var(--border-strong)' : 'transparent', color: activeTool === 'select' ? 'white' : 'var(--text-secondary)' }}
             >
               <Move size={16} /> Select
             </button>
             <button 
               onClick={() => setActiveTool('zone')}
               style={{ padding: '8px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer',
                        background: activeTool === 'zone' ? 'var(--border-strong)' : 'transparent', color: activeTool === 'zone' ? 'white' : 'var(--text-secondary)' }}
             >
               <Plus size={16} /> Add Zone
             </button>
             <button 
               onClick={() => setActiveTool('link')}
               style={{ padding: '8px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer',
                        background: activeTool === 'link' ? 'var(--border-strong)' : 'transparent', color: activeTool === 'link' ? 'white' : 'var(--text-secondary)' }}
             >
               <LinkIcon size={16} /> Connect Zones
             </button>
          </div>

          {/* Canvas Area */}
          <div style={{ flex: 1, position: 'relative', background: 'var(--bg-card)' }}>
            {/* Grid pattern */}
            <svg width="100%" height="100%" style={{ position: 'absolute', opacity: 0.1, pointerEvents: 'none' }}>
              <defs>
                <pattern id="editor-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#editor-grid)" />
            </svg>

            {/* Render dragged zones fake UI */}
            {zones.map(z => (
               <div key={z.id} style={{
                 position: 'absolute', left: z.x, top: z.y, 
                 width: 120, height: 80, 
                 background: 'rgba(56, 189, 248, 0.1)',
                 border: '2px solid var(--accent-500)',
                 borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                 cursor: activeTool === 'select' ? 'move' : 'pointer'
               }}>
                 <span style={{ fontSize: 13, fontWeight: 600, color: 'white', textAlign: 'center' }}>{z.name}</span>
                 <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Cap: {z.capacity}</span>
               </div>
            ))}
          </div>

        </div>

        {/* Right Properties Panel */}
        <div style={{ width: 320, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 24, display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: 16, color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapIcon size={18} color="var(--text-secondary)" /> Zone Properties
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Zone Name</label>
              <input type="text" defaultValue="Main Concourse" style={{ padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'white', fontSize: 14 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Zone Type</label>
              <select style={{ padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'white', fontSize: 14 }}>
                <option value="corridor">Corridor</option>
                <option value="gate">Gate (Entry/Exit)</option>
                <option value="stand">Stand / Seating</option>
                <option value="food_court">Food Court</option>
                <option value="restroom">Restroom</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Max Capacity</label>
              <input type="number" defaultValue="3000" style={{ padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'white', fontSize: 14 }} />
            </div>

            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border-subtle)' }}>
              <button style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.5)', color: 'var(--density-red)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                 Delete Zone
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
