// components/admin/DatasheetViewer.tsx
'use client'

import { useState } from 'react'
import { 
  FileText, Download, Eye, X, Calendar, User, 
  AlertCircle, Clock, CheckCircle, ExternalLink,
  RefreshCw, Archive, Tag
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card } from '../layout/Card'

interface Datasheet {
  id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  supplier_name?: string
  version?: string
  uploaded_at: string
  uploaded_by?: string
  last_reviewed_at?: string
  next_review_date?: string
  review_notes?: string
  status: 'active' | 'archived' | 'expired'
  notes?: string
}

interface DatasheetViewerProps {
  datasheets: Datasheet[]
  entityType: 'ingredient' | 'menu_item'
  entityName?: string
  onDownload?: (datasheet: Datasheet) => void
  onPreview?: (datasheet: Datasheet) => void
  onMarkReviewed?: (datasheet: Datasheet) => void
  compact?: boolean
}

export default function DatasheetViewer({
  datasheets,
  entityType,
  entityName,
  onDownload,
  onPreview,
  onMarkReviewed,
  compact = false
}: DatasheetViewerProps) {
  const [selectedDatasheet, setSelectedDatasheet] = useState<Datasheet | null>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getReviewStatus = (datasheet: Datasheet) => {
    if (!datasheet.next_review_date) return null
    
    const nextReview = new Date(datasheet.next_review_date)
    const today = new Date()
    const daysUntil = Math.floor((nextReview.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntil < 0) return { status: 'overdue', label: 'Overdue', color: 'red' }
    if (daysUntil <= 7) return { status: 'due_soon', label: 'Due Soon', color: 'yellow' }
    return { status: 'up_to_date', label: 'Up to Date', color: 'green' }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('image')) return '🖼️'
    return '📎'
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {datasheets.length === 0 ? (
          <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
            <FileText className="h-6 w-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No datasheets available</p>
          </div>
        ) : (
          datasheets.map((datasheet) => {
            const reviewStatus = getReviewStatus(datasheet)
            return (
              <div
                key={datasheet.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-xl">{getFileIcon(datasheet.file_type)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {datasheet.file_name}
                      </p>
                      {reviewStatus && (
                        <Badge 
                          variant={reviewStatus.color as any} 
                          size="sm"
                        >
                          {reviewStatus.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatFileSize(datasheet.file_size)}
                      </span>
                      {datasheet.supplier_name && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-500">
                            {datasheet.supplier_name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-3">
                  {onPreview && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onPreview(datasheet)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {onDownload && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onDownload(datasheet)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {datasheets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No Datasheets Available
          </h3>
          <p className="text-sm text-gray-500">
            Upload product datasheets to track compliance and reviews
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {datasheets.map((datasheet) => {
            const reviewStatus = getReviewStatus(datasheet)
            return (
              <Card key={datasheet.id}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1 min-w-0">
                    <div className="text-3xl mt-1">
                      {getFileIcon(datasheet.file_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900 truncate">
                          {datasheet.file_name}
                        </h4>
                        {reviewStatus && (
                          <Badge 
                            variant={reviewStatus.color as any} 
                            size="md"
                          >
                            {reviewStatus.label}
                          </Badge>
                        )}
                        {datasheet.status === 'archived' && (
                          <Badge variant="default" size="md">
                            <Archive className="h-3 w-3 mr-1" />
                            Archived
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">File Size</p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatFileSize(datasheet.file_size)}
                          </p>
                        </div>
                        {datasheet.supplier_name && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Supplier</p>
                            <p className="text-sm font-medium text-gray-900">
                              {datasheet.supplier_name}
                            </p>
                          </div>
                        )}
                        {datasheet.version && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Version</p>
                            <p className="text-sm font-medium text-gray-900">
                              {datasheet.version}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Uploaded</p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(datasheet.uploaded_at)}
                          </p>
                        </div>
                      </div>

                      {datasheet.next_review_date && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-600" />
                            <div>
                              <p className="text-xs text-gray-500">Next Review Date</p>
                              <p className="text-sm font-medium text-gray-900">
                                {formatDate(datasheet.next_review_date)}
                              </p>
                            </div>
                          </div>
                          {datasheet.last_reviewed_at && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-500">
                                Last reviewed {formatDate(datasheet.last_reviewed_at)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {datasheet.notes && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Notes</p>
                          <p className="text-sm text-gray-700">{datasheet.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    {onPreview && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={() => onPreview(datasheet)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    )}
                    {onDownload && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={() => onDownload(datasheet)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                    {onMarkReviewed && reviewStatus?.status !== 'up_to_date' && (
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        onClick={() => onMarkReviewed(datasheet)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Reviewed
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
