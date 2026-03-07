// app/admin/analytics/page.tsx - Enhanced with Design System
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { 
  BarChart3, TrendingUp, Eye,
  Download, Package, ChefHat, Building, Calendar,
  Filter, RefreshCw, ArrowUpRight, ArrowDownRight,
  DollarSign, PieChart, LineChart, Target
} from 'lucide-react'

// Import design system components
import { Container } from '../../components/layout/Container'
import { Card } from '../../components/layout/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

export default function AnalyticsPage() {
  type DateRange = { from?: Date; to?: Date }

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangePreset, setRangePreset] = useState<'week' | 'month' | 'quarter' | 'year'>('week')
  const [customRange, setCustomRange] = useState<DateRange | undefined>()
  const [draftRange, setDraftRange] = useState<DateRange | undefined>()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState('overview')
  const [analyticsData, setAnalyticsData] = useState<{ 
    overview: {
      reportDownloads: number
      kioskUsage: number
      activeMenuIngredients: number
      activeMenuItems: number
    }
    deltas: {
      reportDownloads: number | null
      kioskUsage: number | null
      activeMenuIngredients: number | null
      activeMenuItems: number | null
    }
    trends: any[]
    topIngredients: any[]
    topMenus: any[]
  } | null>(null)

  const searchParams = useSearchParams()
  const siteId = searchParams.get('site_id')

  const presetConfig = {
    week: { label: 'Week', days: 7 },
    month: { label: 'Month', days: 30 },
    quarter: { label: 'Quarter', days: 90 },
    year: { label: 'Year', days: 365 }
  }

  const getPresetRange = (preset: keyof typeof presetConfig): DateRange => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(end.getDate() - presetConfig[preset].days + 1)

    return { from: start, to: end }
  }

  const formatDateLabel = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const formatDateParam = (date: Date) => date.toISOString().slice(0, 10)

  const parseDateInput = (value: string) => {
    if (!value) return undefined
    const parsed = new Date(`${value}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  const activeRangeLabel = customRange?.from && customRange?.to
    ? `${formatDateLabel(customRange.from)} - ${formatDateLabel(customRange.to)}`
    : presetConfig[rangePreset].label

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (siteId) {
          params.set('site_id', siteId)
        }

        if (customRange?.from && customRange?.to) {
          params.set('start', formatDateParam(customRange.from))
          params.set('end', formatDateParam(customRange.to))
        } else {
          params.set('range', rangePreset)
        }

        const response = await fetch(`/api/analytics?${params.toString()}`)
        const contentType = response.headers.get('content-type') || ''

        if (!contentType.includes('application/json')) {
          const text = await response.text()
          throw new Error(text || 'Unexpected response while loading analytics')
        }

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load analytics')
        }

        setAnalyticsData(data)
      } catch (err: any) {
        console.error('Analytics load error:', err)
        setError(err?.message || 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [rangePreset, customRange, siteId])

  const formatDelta = (value: number | null) => {
    if (value === null || Number.isNaN(value)) {
      return {
        label: '0%',
        className: 'text-gray-500 group-hover:text-white'
      }
    }

    const rounded = Math.round(value * 10) / 10
    const isPositive = rounded >= 0

    return {
      label: `${isPositive ? '+' : ''}${rounded}%`,
      className: isPositive ? 'text-emerald-600 group-hover:text-white' : 'text-red-600 group-hover:text-white'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#42b8ac] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !analyticsData) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">{error || 'Unable to load analytics.'}</p>
        </div>
      </div>
    )
  }

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-teal-400 to-teal-600 dark:from-teal-500 dark:to-gray-700 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#003842] dark:text-white">Analytics Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Track usage, engagement, and compliance across your allergen platform
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="primary" icon={Target}>
              Real-time
            </Badge>
            <Badge variant="default">
              {activeRangeLabel}
            </Badge>
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <Card className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Time Range
              </span>
              {(Object.keys(presetConfig) as Array<keyof typeof presetConfig>).map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setRangePreset(preset)
                    setCustomRange(undefined)
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors border ${
                    rangePreset === preset && !customRange
                      ? 'bg-white text-[#003842] shadow border-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent'
                  }`}
                >
                  {presetConfig[preset].label}
                </button>
              ))}
              <Dialog.Root
                open={calendarOpen}
                onOpenChange={(open) => {
                  setCalendarOpen(open)
                  if (open) {
                    setDraftRange(customRange || getPresetRange(rangePreset))
                  }
                }}
              >
                <Dialog.Trigger asChild>
                  <button
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors border ${
                      customRange
                        ? 'bg-white text-[#003842] shadow border-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent'
                    }`}
                  >
                    Custom Range
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                  <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Dialog.Title className="text-lg font-semibold text-[#003842]">Select date range</Dialog.Title>
                        <p className="text-sm text-gray-600">Choose a custom range for analytics.</p>
                      </div>
                      <Dialog.Close className="rounded-full p-2 hover:bg-gray-100">X</Dialog.Close>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="text-sm text-gray-600">
                          Start date
                          <input
                            type="date"
                            value={draftRange?.from ? formatDateParam(draftRange.from) : ''}
                            onChange={(event) =>
                              setDraftRange((prev) => ({
                                from: parseDateInput(event.target.value),
                                to: prev?.to
                              }))
                            }
                            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                          />
                        </label>
                        <label className="text-sm text-gray-600">
                          End date
                          <input
                            type="date"
                            value={draftRange?.to ? formatDateParam(draftRange.to) : ''}
                            onChange={(event) =>
                              setDraftRange((prev) => ({
                                from: prev?.from,
                                to: parseDateInput(event.target.value)
                              }))
                            }
                            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-gray-600">
                        {draftRange?.from && draftRange?.to
                          ? `${formatDateLabel(draftRange.from)} - ${formatDateLabel(draftRange.to)}`
                          : 'Select a start and end date'}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                          onClick={() => {
                            setDraftRange(getPresetRange(rangePreset))
                          }}
                        >
                          Reset
                        </button>
                        <button
                          className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#42b8ac] text-white hover:bg-[#36948a]"
                          onClick={() => {
                            if (draftRange?.from && draftRange?.to) {
                              setCustomRange(draftRange)
                              setCalendarOpen(false)
                            }
                          }}
                        >
                          Apply Range
                        </button>
                      </div>
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
            <Button
              variant="ghost"
              size="sm"
              icon={Filter}
            >
              Filters
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              icon={Download}
            >
              Export Report
            </Button>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-all hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-500 hover:to-blue-600 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors">Report Downloads</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-white mt-1 group-hover:text-white transition-colors">
                {analyticsData.overview.reportDownloads.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-blue-600 transition-all">
              <Download className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <div
              className={`flex items-center text-sm font-medium transition-colors ${formatDelta(analyticsData.deltas.reportDownloads).className}`}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>{formatDelta(analyticsData.deltas.reportDownloads).label}</span>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:border-purple-500 hover:bg-gradient-to-br hover:from-purple-500 hover:to-purple-600 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors">Kiosk Interactions</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-white mt-1 group-hover:text-white transition-colors">
                {analyticsData.overview.kioskUsage.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-purple-600 transition-all">
              <Building className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <div
              className={`flex items-center text-sm font-medium transition-colors ${formatDelta(analyticsData.deltas.kioskUsage).className}`}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>{formatDelta(analyticsData.deltas.kioskUsage).label}</span>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:border-amber-500 hover:bg-gradient-to-br hover:from-amber-500 hover:to-amber-600 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors">Active Menu Ingredients</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-white mt-1 group-hover:text-white transition-colors">
                {analyticsData.overview.activeMenuIngredients.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-amber-600 transition-all">
              <Package className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <div
              className={`flex items-center text-sm font-medium transition-colors ${formatDelta(analyticsData.deltas.activeMenuIngredients).className}`}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>{formatDelta(analyticsData.deltas.activeMenuIngredients).label}</span>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:border-emerald-500 hover:bg-gradient-to-br hover:from-emerald-500 hover:to-emerald-600 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors">Active Menu Items</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-white mt-1 group-hover:text-white transition-colors">
                {analyticsData.overview.activeMenuItems.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-emerald-600 transition-all">
              <LineChart className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <div
              className={`flex items-center text-sm font-medium transition-colors ${formatDelta(analyticsData.deltas.activeMenuItems).className}`}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>{formatDelta(analyticsData.deltas.activeMenuItems).label}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Engagement Trends */}
        <Card>
          <div className="p-6 border-b dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-[#003842] dark:text-[#42b8ac]">Engagement Trends</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Daily views and searches</p>
              </div>
              <Badge variant="primary">
                Weekly
              </Badge>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analyticsData.trends.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No engagement data yet.</div>
              ) : (
                analyticsData.trends.map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 w-16">{day.day}</div>
                    <div className="flex-1 mx-4">
                      <div className="flex items-center h-8">
                        <div
                          className="bg-gradient-to-r from-[#42b8ac] to-[#36948a] h-4 rounded"
                          style={{ width: `${(day.views / 5200) * 100}%` }}
                        ></div>
                        <div
                          className="bg-gradient-to-r from-[#003842] to-[#001f26] h-4 rounded ml-1"
                          style={{ width: `${(day.searches / 850) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 w-24 text-right">
                      {day.views.toLocaleString()} views
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 flex items-center gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gradient-to-r from-[#42b8ac] to-[#36948a] rounded mr-2"></div>
                <span className="text-gray-600 dark:text-gray-300">Menu Views</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gradient-to-r from-[#003842] to-[#001f26] rounded mr-2"></div>
                <span className="text-gray-600 dark:text-gray-300">Ingredient Searches</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Top Performing */}
        <Card>
          <div className="p-6 border-b dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-[#003842] dark:text-[#42b8ac]">Top Performing</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Most searched ingredients</p>
              </div>
              <Badge variant="primary">
                This Month
              </Badge>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analyticsData.topIngredients.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No ingredient activity yet.</div>
              ) : (
                analyticsData.topIngredients.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Package className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{item.searches.toLocaleString()} searches</div>
                      </div>
                    </div>
                    <Badge
                      variant={item.change.startsWith('+') ? 'success' : 'error'}
                      icon={item.change.startsWith('+') ? ArrowUpRight : ArrowDownRight}
                    >
                      {item.change}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Kiosk Performance */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[#003842] dark:text-[#42b8ac]">Kiosk Performance</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Site usage statistics</p>
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">No kiosk performance data yet.</div>
          </div>
        </Card>

        {/* Report Downloads */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <Download className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[#003842] dark:text-[#42b8ac]">Report Downloads</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Allergen guide distribution</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">This Month</span>
                  <span className="text-sm font-medium text-[#003842] dark:text-white">
                    {analyticsData.overview.reportDownloads}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(analyticsData.overview.reportDownloads, 100)}%`
                    }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">No report downloads yet.</div>
            </div>
          </div>
        </Card>
      </div>

    </Container>
  )
}
