export interface BrandColors {
  primary_color: string
  secondary_color: string
  logo_url: string | null
}

export interface StatsCard {
  title: string
  value: string | number
  description: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down'
  trendValue?: string
}