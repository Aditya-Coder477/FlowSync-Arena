'use client'

import React from 'react'
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react'

interface PlaybackControlsProps {
  isPlaying: boolean
  onTogglePlay: () => void
  currentFrame: number
  totalFrames: number
  onSeek: (frame: number) => void
}

export function PlaybackControls({
  isPlaying,
  onTogglePlay,
  currentFrame,
  totalFrames,
  onSeek
}: PlaybackControlsProps) {

  const formatTime = (frame: number) => {
    // assume 1 frame = 1 minute, simulation starts at T=0
    return `T+${frame}m`
  }

  const progress = totalFrames > 1 ? (currentFrame / (totalFrames - 1)) * 100 : 0

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      padding: '16px 24px',
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-subtle)'
    }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={() => onSeek(Math.max(0, currentFrame - 5))}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="-5 min"
        >
          <SkipBack size={20} />
        </button>
        
        <button 
          onClick={onTogglePlay}
          style={{ 
            background: 'var(--accent-500)', 
            border: 'none', 
            color: 'white', 
            cursor: 'pointer',
            height: 36, width: 36,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
        </button>

        <button 
          onClick={() => onSeek(Math.min(totalFrames - 1, currentFrame + 5))}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="+5 min"
        >
          <SkipForward size={20} />
        </button>
        
        <button 
          onClick={() => onSeek(0)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: 8 }}
          title="Reset"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Scrubber */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '14px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
          {formatTime(currentFrame)}
        </span>
        
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input 
            type="range"
            min={0}
            max={totalFrames - 1}
            value={currentFrame}
            onChange={(e) => onSeek(parseInt(e.target.value))}
            style={{ 
              width: '100%',
              cursor: 'pointer',
              zIndex: 2,
              opacity: 0, // hide native input slightly but keep it functional
              height: 24,
            }}
          />
          {/* Custom Track */}
          <div style={{
            position: 'absolute',
            left: 0, right: 0, height: 6,
            background: 'var(--bg-card)',
            borderRadius: 3,
            pointerEvents: 'none',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--accent-500)',
              transition: isPlaying ? 'width 1s linear' : 'none'
            }} />
          </div>
          {/* Custom Thumb */}
          <div style={{
            position: 'absolute',
            left: `calc(${progress}% - 6px)`,
            width: 12, height: 12,
            borderRadius: '50%',
            background: 'white',
            boxShadow: '0 0 4px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            transition: isPlaying ? 'left 1s linear' : 'none'
          }} />
        </div>

        <span style={{ fontSize: '14px', fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>
          {formatTime(totalFrames - 1)}
        </span>
      </div>
    </div>
  )
}
