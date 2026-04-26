'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Clock, Filter, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface ComplianceItem {
  id: string;
  name: string;
  type: 'ingredient' | 'menu_item';
  status: 'compliant' | 'warning' | 'error';
  reasons: string[];
  lastReviewedAt?: string;
  daysOverdue?: number;
  daysUntilDue?: number;
}

interface ComplianceSummary {
  ingredients: ComplianceItem[];
  menuItems: ComplianceItem[];
  totalNonCompliant: number;
  totalWarnings: number;
  totalErrors: number;
}

export default function ComplianceDashboard() {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'compliant'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'ingredient' | 'menu_item'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompliance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/compliance/status?scope=all');
      
      if (!res.ok) {
        setError('Failed to fetch compliance data');
        console.error('Failed to fetch compliance data:', res.status);
        return;
      }

      const data = await res.json();
      if (data.compliance) {
        setSummary(data.compliance);
      } else {
        setError('No compliance data returned');
      }
    } catch (error) {
      setError('Error fetching compliance: ' + (error instanceof Error ? error.message : 'Unknown error'));
      console.error('Error fetching compliance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompliance();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCompliance();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'text-emerald-600 bg-emerald-50';
      case 'warning':
        return 'text-amber-600 bg-amber-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
            <CheckCircle2 size={14} /> {t('admin.compliant')}
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            <Clock size={14} /> {t('admin.reviewDueSoon')}
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
            <AlertCircle size={14} /> {t('admin.notCompliant')}
          </span>
        );
      default:
        return null;
    }
  };

  const filterItems = (items: ComplianceItem[]) => {
    let filtered = items;

    if (filter !== 'all') {
      filtered = filtered.filter(item => item.status === filter);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    return filtered;
  };

  const filteredIngredients = filterItems(summary?.ingredients || []);
  const filteredMenuItems = filterItems(summary?.menuItems || []);
  const allFiltered = [...filteredIngredients, ...filteredMenuItems];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Compliance Dashboard</h1>
              <h1 className="text-3xl font-bold text-slate-900">{t('admin.complianceDashboard')}</h1>
              <p className="text-slate-600 mt-1">{t('admin.complianceDashboardDesc')}</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              {t('admin.refresh')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error Loading Compliance Data</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Total Non-Compliant</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{summary.totalNonCompliant}</p>
                </div>
                <AlertCircle size={32} className="text-red-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Errors</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{summary.totalErrors}</p>
                </div>
                <AlertCircle size={32} className="text-red-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Warnings</p>
                  <p className="text-3xl font-bold text-amber-600 mt-2">{summary.totalWarnings}</p>
                </div>
                <Clock size={32} className="text-amber-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Total Items</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-2">
                    {(summary.ingredients.length + summary.menuItems.length)}
                  </p>
                </div>
                <CheckCircle2 size={32} className="text-emerald-600 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Filter size={16} className="inline mr-2" />
                {t('admin.filter')}
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="all">{t('admin.allStatus')}</option>
                <option value="error">{t('admin.notCompliant')}</option>
                <option value="warning">{t('admin.reviewDueSoon')}</option>
                <option value="compliant">{t('admin.compliant')}</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Item Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="ingredient">Ingredients</option>
                <option value="menu_item">Menu Items</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">
              <RefreshCw size={18} className="animate-spin" />
              {t('admin.loading')}
            </div>
          </div>
        ) : allFiltered.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
            <CheckCircle2 size={48} className="mx-auto text-emerald-600 mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">All Clear!</h3>
            <p className="text-slate-600">
              {filter === 'all'
                ? 'No items to display with current filters.'
                : `No ${filter} items found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ingredients Section */}
            {filteredIngredients.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Ingredients ({filteredIngredients.length})</h2>
                <div className="space-y-3">
                  {filteredIngredients.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-900 truncate">{item.name}</h3>
                            {getStatusBadge(item.status)}
                          </div>

                          {item.reasons.length > 0 && (
                            <ul className="text-sm text-slate-600 space-y-1 ml-4">
                              {item.reasons.map((reason, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-slate-400 mt-0.5">•</span>
                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {item.lastReviewedAt && (
                            <p className="text-xs text-slate-500 mt-2">
                              Last reviewed: {new Date(item.lastReviewedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        <Link
                          href={`/admin/ingredients/${item.id}/edit`}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-semibold whitespace-nowrap shadow-sm transition-colors hover:shadow-md"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Menu Items Section */}
            {filteredMenuItems.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Menu Items ({filteredMenuItems.length})</h2>
                <div className="space-y-3">
                  {filteredMenuItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-900 truncate">{item.name}</h3>
                            {getStatusBadge(item.status)}
                          </div>

                          {item.reasons.length > 0 && (
                            <ul className="text-sm text-slate-600 space-y-1 ml-4">
                              {item.reasons.map((reason, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-slate-400 mt-0.5">•</span>
                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {item.lastReviewedAt && (
                            <p className="text-xs text-slate-500 mt-2">
                              Last reviewed: {new Date(item.lastReviewedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        <Link
                          href={`/admin/menu-builder/${item.id}/edit`}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-semibold whitespace-nowrap shadow-sm transition-colors hover:shadow-md"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
