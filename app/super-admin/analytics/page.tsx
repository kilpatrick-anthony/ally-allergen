// app/super-admin/analytics/page.tsx - Platform-wide analytics for regulatory reporting
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { 
  BarChart3, TrendingUp, Eye,
  Download, Building, Globe, Calendar,
  RefreshCw, ArrowUpRight, ArrowDownRight,
  Target, Leaf, Users
} from 'lucide-react'
import { getAllergenIconForLabel, getDietaryIconForLabel } from '@/lib/allergens'

import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export default function SuperAdminAnalyticsPage() {
  const { t } = useTranslation()
  type DateRange = { from?: Date; to?: Date }

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangePreset, setRangePreset] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [customRange, setCustomRange] = useState<DateRange | undefined>()
  const [draftRange, setDraftRange] = useState<DateRange | undefined>()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<{
    overview: {
      totalBusinesses: number
      activeKiosks: number
      totalSearches: number
      totalDownloads: number
      averageSearchPerBusiness: number
      averageKiosksPerBusiness: number
    }
    deltas: {
      businesses: number | null
      searches: number | null
      downloads: number | null
    }
    trends: any[]
    topAllergens: any[]
    topDietary: any[]
    topBusinesses: any[]
  } | null>(null)

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
        if (customRange?.from && customRange?.to) {
          params.set('start', formatDateParam(customRange.from))
          params.set('end', formatDateParam(customRange.to))
        } else {
          params.set('range', rangePreset)
        }

        const response = await fetch(`/api/super-admin/analytics?${params.toString()}`)
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
  }, [rangePreset, customRange])

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

  const handleExport = async (format: 'csv' | 'json') => {
    if (!analyticsData) return
    
    try {
      setExporting(true)
      const exportData = {
        reportType: 'Platform-Wide Analytics',
        exportDate: new Date().toISOString(),
        dateRange: activeRangeLabel,
        overview: analyticsData.overview,
        deltas: analyticsData.deltas,
        trends: analyticsData.trends,
        topAllergens: analyticsData.topAllergens,
        topDietary: analyticsData.topDietary,
        topBusinesses: analyticsData.topBusinesses
      }

      if (format === 'json') {
        const jsonStr = JSON.stringify(exportData, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `platform-analytics-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        const rows: string[] = []
        rows.push('AllyJen Platform-Wide Analytics Report')
        rows.push(`Export Date: ${new Date().toLocaleDateString()}`)
        rows.push(`Date Range: ${activeRangeLabel}`)
        rows.push('')
        
        rows.push('PLATFORM OVERVIEW')
        rows.push(`Total Businesses,${analyticsData.overview.totalBusinesses}`)
        rows.push(`Active Kiosks,${analyticsData.overview.activeKiosks}`)
        rows.push(`Total Searches,${analyticsData.overview.totalSearches}`)
        rows.push(`Total Downloads,${analyticsData.overview.totalDownloads}`)
        rows.push(`Avg Searches/Business,${analyticsData.overview.averageSearchPerBusiness.toFixed(1)}`)
        rows.push(`Avg Kiosks/Business,${analyticsData.overview.averageKiosksPerBusiness.toFixed(1)}`)
        rows.push('')
        
        rows.push('TOP ALLERGENS (NETWORK-WIDE)')
        rows.push('Allergen,Searches,Change %')
        analyticsData.topAllergens.forEach((item: any) => {
          rows.push(`"${item.name}",${item.searches},${item.change}`)
        })
        rows.push('')
        
        rows.push('TOP DIETARY PREFERENCES (NETWORK-WIDE)')
        rows.push('Dietary,Searches,Change %')
        analyticsData.topDietary.forEach((item: any) => {
          rows.push(`"${item.name}",${item.clicks},${item.change}`)
        })
        rows.push('')
        
        rows.push('TOP BUSINESSES')
        rows.push('Business,Searches,Kiosks')
        analyticsData.topBusinesses.forEach((item: any) => {
          rows.push(`"${item.name}",${item.searches},${item.kiosks}`)
        })
        
        const csvStr = rows.join('\n')
        const blob = new Blob([csvStr], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `platform-analytics-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading platform analytics...</p>
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
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-gray-700 rounded-lg">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#003842] dark:text-white">Platform Analytics</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Network-wide insights for regulatory reporting
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
                    Date Range
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                  <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Dialog.Title className="text-lg font-semibold text-[#003842] dark:text-white">Select date range</Dialog.Title>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Choose a custom range for analytics.</p>
                      </div>
                      <Dialog.Close className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700">✕</Dialog.Close>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="text-sm text-gray-600 dark:text-gray-300">
                          Start date
                          <input
                            type="date"
                            value={draftRange?.from ? formatDateParam(draftRange.from) : ''}
                            onChange={(event) =>
                              setDraftRange((prev) => ({
                                from: parseDateInput(event.target.value),
                                to: prev?.to
                              }))}
                            className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </label>
                        <label className="text-sm text-gray-600 dark:text-gray-300">
                          End date
                          <input
                            type="date"
                            value={draftRange?.to ? formatDateParam(draftRange.to) : ''}
                            onChange={(event) =>
                              setDraftRange((prev) => ({
                                from: prev?.from,
                                to: parseDateInput(event.target.value)
                              }))}
                            className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {draftRange?.from && draftRange?.to
                          ? `${formatDateLabel(draftRange.from)} - ${formatDateLabel(draftRange.to)}`
                          : 'Select a start and end date'}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
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
            <Button variant="ghost" size="sm" icon={<RefreshCw className="h-4 w-4" />}>
              Refresh
            </Button>
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Download className="h-4 w-4" />}
                  disabled={exporting}
                >
                  {exporting ? 'Exporting...' : 'Export'}
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-[#003842] dark:text-white">Export Analytics</Dialog.Title>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Choose export format</p>
                    </div>
                    <Dialog.Close className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700">✕</Dialog.Close>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleExport('json')}
                      disabled={exporting}
                      className="w-full p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors disabled:opacity-50"
                    >
                      <div className="font-semibold text-gray-900 dark:text-white">JSON Format</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Machine-readable format for integrations</div>
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      disabled={exporting}
                      className="w-full p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors disabled:opacity-50"
                    >
                      <div className="font-semibold text-gray-900 dark:text-white">CSV Format</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Compatible with Excel and spreadsheet apps</div>
                    </button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-all hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-500 hover:to-blue-600 group h-full flex flex-col">
          <div className="flex items-center justify-between flex-1">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors">Registered Businesses</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-white mt-1 group-hover:text-white transition-colors">
                {analyticsData.overview.totalBusinesses.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg group-hover:shadow-lg transition-all">
              <Building className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <div className={`flex items-center text-sm font-medium transition-colors ${formatDelta(analyticsData.deltas.businesses).className}`}>
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>{formatDelta(analyticsData.deltas.businesses).label}</span>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:border-purple-500 hover:bg-gradient-to-br hover:from-purple-500 hover:to-purple-600 group h-full flex flex-col">
          <div className="flex items-center justify-between flex-1">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors">Active Kiosks</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-white mt-1 group-hover:text-white transition-colors">
                {analyticsData.overview.activeKiosks.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg group-hover:shadow-lg transition-all">
              <Globe className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-white">
              {analyticsData.overview.averageKiosksPerBusiness.toFixed(1)} avg per business
            </p>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:border-emerald-500 hover:bg-gradient-to-br hover:from-emerald-500 hover:to-emerald-600 group h-full flex flex-col">
          <div className="flex items-center justify-between flex-1">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors">Total Searches</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-white mt-1 group-hover:text-white transition-colors">
                {analyticsData.overview.totalSearches.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg group-hover:shadow-lg transition-all">
              <Eye className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <div className={`flex items-center text-sm font-medium transition-colors ${formatDelta(analyticsData.deltas.searches).className}`}>
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>{formatDelta(analyticsData.deltas.searches).label}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Allergens */}
        <Card>
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-[#003842] dark:text-[#42b8ac] flex items-center gap-2">
              <Target className="h-5 w-5" />
              Most Searched Allergens Across Network
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Industry trends</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analyticsData.topAllergens.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No allergen search data yet.</div>
              ) : (
                analyticsData.topAllergens.map((item: any, index: number) => {
                  const { icon: AllergenIcon, color } = getAllergenIconForLabel(item.name)
                  return (
                    <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}1f` }}>
                          <AllergenIcon className="h-4 w-4" style={{ color }} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{item.searches?.toLocaleString() || 0} searches</div>
                        </div>
                      </div>
                      <Badge
                        variant={item.change?.startsWith('+') ? 'success' : 'error'}
                        icon={item.change?.startsWith('+') ? ArrowUpRight : ArrowDownRight}
                      >
                        {item.change || '0%'}
                      </Badge>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </Card>

        {/* Top Dietary */}
        <Card>
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-[#003842] dark:text-[#42b8ac] flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              Most Used Dietary Filters Across Network
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Consumer preferences</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analyticsData.topDietary.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No dietary filter data yet.</div>
              ) : (
                analyticsData.topDietary.map((item: any, index: number) => {
                  const { icon: DietaryIcon, color } = getDietaryIconForLabel(item.name)
                  return (
                    <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}1f` }}>
                          <DietaryIcon className="h-4 w-4" style={{ color }} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{item.clicks?.toLocaleString() || 0} uses</div>
                        </div>
                      </div>
                      <Badge
                        variant={item.change?.startsWith('+') ? 'success' : 'error'}
                        icon={item.change?.startsWith('+') ? ArrowUpRight : ArrowDownRight}
                      >
                        {item.change || '0%'}
                      </Badge>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Top Businesses */}
      <Card>
        <div className="p-6 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-[#003842] dark:text-[#42b8ac] flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Performing Businesses
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Highest engagement</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {analyticsData.topBusinesses.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">No business data yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Business</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Searches</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Kiosks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.topBusinesses.map((item: any, index: number) => (
                      <tr key={index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{item.name}</td>
                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{item.searches?.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{item.kiosks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Container>
  )
}
