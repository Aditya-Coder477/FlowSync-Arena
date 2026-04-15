// Types mirroring backend Pydantic schemas

export type DensityLevel = 'empty' | 'green' | 'amber' | 'red' | 'critical'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'in_progress' | 'done'
export type UserRole = 'attendee' | 'staff' | 'admin' | 'control'
export type RiskLevel = 'safe' | 'elevated' | 'high' | 'critical'

export interface Zone {
  id: string
  name: string
  capacity: number
  current_count: number
  density_level: DensityLevel
  density_pct: number
  last_updated: string
  coordinates?: { x: number; y: number; width: number; height: number }
  adjacent_zones: string[]
  amenities: string[]
}

export interface ZoneStatus {
  zones: Zone[]
  avg_density: number
  calm_mode_active: boolean
  timestamp: string
}

export interface Queue {
  id: string
  zone_id: string
  zone_name: string
  name: string
  length: number
  avg_wait_min: number
  predicted_wait_min: number
  is_virtual: boolean
  status: string
  last_updated: string
}

export interface QueueLive {
  queues: Queue[]
  timestamp: string
}

export interface RouteStep {
  zone_id: string
  zone_name: string
  instruction: string
  density_level: DensityLevel
  estimated_time_min: number
}

export interface RouteRecommendation {
  steps: RouteStep[]
  total_time_min: number
  confidence: number
  confidence_label: string
  alternative?: RouteStep[]
  thermostat_note?: string
}

export interface Alert {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  zone_id?: string
  zone_name?: string
  created_at: string
  resolved: boolean
  resolved_at?: string
}

export interface StaffTask {
  id: string
  staff_id?: string
  priority: TaskPriority
  title: string
  description?: string
  zone_id?: string
  zone_name?: string
  status: TaskStatus
  created_at: string
  updated_at?: string
}

export interface KPI {
  label: string
  value: string
  change?: string
  trend?: 'up' | 'down' | 'stable'
}

export interface GatePerformance {
  gate_id: string
  gate_name: string
  throughput_per_hour: number
  avg_wait_min: number
  status: string
}

export interface TrendPoint {
  timestamp: string
  value: number
}

export interface AdminAnalytics {
  kpis: KPI[]
  gate_performance: GatePerformance[]
  density_trend: TrendPoint[]
  alert_trend: TrendPoint[]
  zone_heatmap: { zone_id: string; zone_name: string; density_pct: number }[]
  timestamp: string
}

export interface RiskZone {
  zone_id: string
  zone_name: string
  risk_level: RiskLevel
  density_pct: number
  open_alerts: number
  staff_present: number
}

export interface StaffDeployment {
  staff_id: string
  name: string
  zone_id: string
  zone_name: string
  role: string
  status: string
}

export interface CommLog {
  id: string
  from_name: string
  message: string
  channel: string
  timestamp: string
  priority: string
}

export interface ControlRoomData {
  risk_matrix: RiskZone[]
  staff_deployments: StaffDeployment[]
  comm_logs: CommLog[]
  overall_risk: RiskLevel
  timestamp: string
}

export interface Suggestion {
  id: string
  type: string
  headline: string
  body: string
  action_label?: string
  action_data?: Record<string, unknown>
  priority: number
}
