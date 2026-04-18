/**
 * Component tests for the FlowSync Arena UI component library.
 *
 * Tests cover:
 * - DensityBadge — correct label + class for each density level
 * - AlertBadge — correct label for each severity
 * - PriorityBadge — renders priority text
 * - RiskBadge — renders risk level text
 * - LiveIndicator — renders label, has status role
 * - DensityBar — renders correct width percentage
 * - ConfidenceIndicator — correct number of filled dots, ARIA label
 * - Skeleton — renders with custom dimensions
 * - EmptyState — renders message with and without icon
 * - ErrorState — renders error message
 * - SectionHeader — renders title and optional action
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  DensityBadge,
  AlertBadge,
  PriorityBadge,
  RiskBadge,
  LiveIndicator,
  DensityBar,
  ConfidenceIndicator,
  Skeleton,
  EmptyState,
  ErrorState,
  SectionHeader,
} from '@/components/ui'

// ---------------------------------------------------------------------------
// DensityBadge
// ---------------------------------------------------------------------------

describe('DensityBadge', () => {
  const cases = [
    { level: 'empty', expected: 'Empty' },
    { level: 'green', expected: 'Flowing' },
    { level: 'amber', expected: 'Getting Busy' },
    { level: 'red', expected: 'Crowded' },
    { level: 'critical', expected: 'At Capacity' },
  ] as const

  cases.forEach(({ level, expected }) => {
    it(`renders "${expected}" for level "${level}"`, () => {
      render(<DensityBadge level={level} />)
      expect(screen.getByText(expected)).toBeInTheDocument()
    })
  })

  it('includes a descriptive aria-label for screen readers', () => {
    render(<DensityBadge level="critical" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveAttribute('aria-label')
    // Aria label should not just say "At Capacity" — it should have context
    expect(badge.getAttribute('aria-label')).toMatch(/density|capacity|crowd/i)
  })
})

// ---------------------------------------------------------------------------
// AlertBadge
// ---------------------------------------------------------------------------

describe('AlertBadge', () => {
  it('renders "Info" for severity info', () => {
    render(<AlertBadge severity="info" />)
    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('renders "Warning" for severity warning', () => {
    render(<AlertBadge severity="warning" />)
    expect(screen.getByText('Warning')).toBeInTheDocument()
  })

  it('renders "Critical" for severity critical', () => {
    render(<AlertBadge severity="critical" />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// PriorityBadge
// ---------------------------------------------------------------------------

describe('PriorityBadge', () => {
  ;(['low', 'medium', 'high', 'urgent'] as const).forEach(priority => {
    it(`renders capitalized "${priority}"`, () => {
      render(<PriorityBadge priority={priority} />)
      expect(
        screen.getByText(priority.charAt(0).toUpperCase() + priority.slice(1))
      ).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// RiskBadge
// ---------------------------------------------------------------------------

describe('RiskBadge', () => {
  ;(['safe', 'elevated', 'high', 'critical'] as const).forEach(level => {
    it(`renders for risk level "${level}"`, () => {
      render(<RiskBadge level={level} />)
      expect(
        screen.getByText(level.charAt(0).toUpperCase() + level.slice(1))
      ).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// LiveIndicator
// ---------------------------------------------------------------------------

describe('LiveIndicator', () => {
  it('renders default "Live" label', () => {
    render(<LiveIndicator />)
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('renders custom label', () => {
    render(<LiveIndicator label="Updating every 12s" />)
    expect(screen.getByText('Updating every 12s')).toBeInTheDocument()
  })

  it('has role="status" for screen reader awareness', () => {
    render(<LiveIndicator />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has an aria-label', () => {
    render(<LiveIndicator label="Live" />)
    const indicator = screen.getByRole('status')
    expect(indicator).toHaveAttribute('aria-label')
  })
})

// ---------------------------------------------------------------------------
// DensityBar
// ---------------------------------------------------------------------------

describe('DensityBar', () => {
  it('renders a progress bar element', () => {
    render(<DensityBar pct={0.6} level="amber" />)
    // Should have aria role or a bar element
    const bar = document.querySelector('.density-bar-fill')
    expect(bar).toBeInTheDocument()
  })

  it('applies correct width percentage', () => {
    render(<DensityBar pct={0.75} level="red" />)
    const fill = document.querySelector('.density-bar-fill') as HTMLElement
    expect(fill?.style.width).toBe('75%')
  })

  it('has aria attributes for accessibility', () => {
    render(<DensityBar pct={0.5} level="amber" />)
    const bar = screen.getByRole('meter')
    expect(bar).toHaveAttribute('aria-valuenow', '50')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })
})

// ---------------------------------------------------------------------------
// ConfidenceIndicator
// ---------------------------------------------------------------------------

describe('ConfidenceIndicator', () => {
  it('renders the label text', () => {
    render(<ConfidenceIndicator confidence={0.9} label="Very reliable" />)
    expect(screen.getByText('Very reliable')).toBeInTheDocument()
  })

  it('renders 5 dots total', () => {
    render(<ConfidenceIndicator confidence={0.8} label="Reliable" />)
    const dots = document.querySelectorAll('.confidence-dot')
    expect(dots).toHaveLength(5)
  })

  it('has an aria-label describing the confidence value', () => {
    render(<ConfidenceIndicator confidence={0.8} label="Likely accurate" />)
    const indicator = screen.getByRole('img', { hidden: true })
      || document.querySelector('[aria-label]')
    // Either aria-label on the wrapper or role=img should be present
    const wrapper = document.querySelector('.confidence-ring')
    expect(wrapper).toHaveAttribute('aria-label')
  })
})

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

describe('Skeleton', () => {
  it('renders with default dimensions', () => {
    render(<Skeleton />)
    const el = document.querySelector('.skeleton') as HTMLElement
    expect(el).toBeInTheDocument()
  })

  it('applies custom width and height', () => {
    render(<Skeleton width={200} height={80} />)
    const el = document.querySelector('.skeleton') as HTMLElement
    expect(el.style.width).toBe('200px')
    expect(el.style.height).toBe('80px')
  })

  it('has aria-hidden to exclude from accessibility tree', () => {
    render(<Skeleton />)
    const el = document.querySelector('.skeleton')
    expect(el).toHaveAttribute('aria-hidden', 'true')
  })
})

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

describe('EmptyState', () => {
  it('renders message', () => {
    render(<EmptyState message="No active queues at the moment" />)
    expect(screen.getByText('No active queues at the moment')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(<EmptyState message="All clear" icon="✓" />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('renders without icon (no crash)', () => {
    render(<EmptyState message="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('has descriptive aria-label', () => {
    render(<EmptyState message="No data" />)
    // Should have a region or aria-live
    const el = screen.getByRole('status') ?? document.querySelector('[aria-label]')
    expect(el).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// ErrorState
// ---------------------------------------------------------------------------

describe('ErrorState', () => {
  it('renders error message', () => {
    render(<ErrorState message="Failed to load data. Please try again." />)
    expect(screen.getByText('Failed to load data. Please try again.')).toBeInTheDocument()
  })

  it('has role="alert" so screen readers announce it immediately', () => {
    render(<ErrorState message="An error occurred" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------

describe('SectionHeader', () => {
  it('renders title', () => {
    render(<SectionHeader title="Crowd Map" />)
    expect(screen.getByText('Crowd Map')).toBeInTheDocument()
  })

  it('renders action when provided', () => {
    render(<SectionHeader title="Zones" action={<span>Live</span>} />)
    expect(screen.getByText('Zones')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('renders without action (no crash)', () => {
    render(<SectionHeader title="Queue Status" />)
    expect(screen.getByText('Queue Status')).toBeInTheDocument()
  })
})
