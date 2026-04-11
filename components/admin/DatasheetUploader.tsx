// components/admin/DatasheetUploader.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, X, FileText, AlertCircle, Check, Loader2, Calendar } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

interface DatasheetFile {
  id?: string
  file?: File
  file_name: string
  file_size: number
  file_type: string
  supplier_name?: string
  version?: string
  next_review_date?: string
  notes?: string
  status?: 'uploading' | 'uploaded' | 'error'
  error?: string
}

interface DatasheetUploaderProps {
  entityType: 'ingredient' | 'menu_item'
  entityId?: number
  existingDatasheets?: DatasheetFile[]
  onFilesChange?: (files: DatasheetFile[]) => void
  maxFiles?: number
  acceptedTypes?: string[]
  compact?: boolean
}

export default function DatasheetUploader({
  entityType,
  entityId,
  existingDatasheets,
  onFilesChange,
  maxFiles = 10,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.jpg', '.jpeg', '.png'],
  compact = false
}: DatasheetUploaderProps) {
  const [files, setFiles] = useState<DatasheetFile[]>(existingDatasheets ?? [])
  const [dragActive, setDragActive] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasExistingDatasheetsProp = existingDatasheets !== undefined

  useEffect(() => {
    const isSameList = (nextFiles: DatasheetFile[], currentFiles: DatasheetFile[]) => {
      if (nextFiles.length !== currentFiles.length) {
        return false
      }
      return nextFiles.every((file, index) => {
        const current = currentFiles[index]
        return (
          file.file_name === current.file_name &&
          file.file_size === current.file_size &&
          file.file_type === current.file_type &&
          file.supplier_name === current.supplier_name &&
          file.version === current.version &&
          file.next_review_date === current.next_review_date &&
          file.notes === current.notes
        )
      })
    }

    if (!hasExistingDatasheetsProp) {
      return
    }

    const incomingDatasheets = existingDatasheets ?? []

    if (isSameList(incomingDatasheets, files)) {
      return
    }

    setFiles(incomingDatasheets)
    setEditingIndex(null)
  }, [existingDatasheets, hasExistingDatasheetsProp])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = (fileList: FileList) => {
    const newFiles: DatasheetFile[] = Array.from(fileList).map(file => ({
      file,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      status: 'uploaded' as const
    }))

    const updatedFiles = [...files, ...newFiles].slice(0, maxFiles)
    setFiles(updatedFiles)
    onFilesChange?.(updatedFiles)
  }

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index)
    setFiles(updatedFiles)
    onFilesChange?.(updatedFiles)
  }

  const updateFileMetadata = (index: number, metadata: Partial<DatasheetFile>) => {
    const updatedFiles = files.map((file, i) => 
      i === index ? { ...file, ...metadata } : file
    )
    setFiles(updatedFiles)
    onFilesChange?.(updatedFiles)
    setEditingIndex(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('image')) return '🖼️'
    return '📎'
  }

  const getUploadStatusLabel = (file: DatasheetFile) => {
    if (file.id) {
      return 'Saved'
    }
    return 'Uploaded'
  }

  const hasUnsavedFiles = files.some((file) => !file.id)

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Product Datasheets
          </label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= maxFiles}
          >
            <Upload className="h-4 w-4 mr-1" />
            Add Files
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleChange}
          className="hidden"
        />

        {files.length > 0 && (
          <div className="space-y-2">
            {hasUnsavedFiles && (
              <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Upload complete. Save the ingredient to keep these files.
              </div>
            )}
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <span className="text-lg">{getFileIcon(file.file_type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.file_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.file_size)}
                    </p>
                  </div>
                </div>
                <Badge variant="success" size="sm">
                  {getUploadStatusLabel(file)}
                </Badge>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-2 text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            No datasheets uploaded yet
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
          dragActive
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleChange}
          className="hidden"
        />

        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-base font-medium text-gray-900 mb-1">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Upload product datasheets, compliance documents, or certificates
          </p>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= maxFiles}
          >
            <Upload className="h-4 w-4 mr-2" />
            Select Files
          </Button>
          <p className="text-xs text-gray-400 mt-3">
            Supported formats: PDF, Word, Excel, Images • Max {maxFiles} files
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">
              Uploaded Files ({files.length}/{maxFiles})
            </h4>
            {hasUnsavedFiles && (
              <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-1">
                Upload complete. Save to keep.
              </span>
            )}
          </div>

          {files.map((file, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <span className="text-2xl mt-1">{getFileIcon(file.file_type)}</span>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-sm font-medium text-gray-900 truncate">
                        {file.file_name}
                      </h5>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatFileSize(file.file_size)}
                        </span>
                        {file.supplier_name && (
                          <Badge variant="info" size="sm">
                            {file.supplier_name}
                          </Badge>
                        )}
                        {file.version && (
                          <Badge variant="info" size="sm">
                            v{file.version}
                          </Badge>
                        )}
                        <Badge variant="success" size="sm">
                          {getUploadStatusLabel(file)}
                        </Badge>
                      </div>

                      {/* Additional metadata when editing */}
                      {editingIndex === index && (
                        <div className="mt-3 space-y-3 pt-3 border-t border-gray-100">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Supplier Name
                              </label>
                              <input
                                type="text"
                                value={file.supplier_name || ''}
                                onChange={(e) => updateFileMetadata(index, { supplier_name: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="e.g., Supplier A"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Version
                              </label>
                              <input
                                type="text"
                                value={file.version || ''}
                                onChange={(e) => updateFileMetadata(index, { version: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="e.g., 2024-Q1"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              <Calendar className="inline h-3 w-3 mr-1" />
                              Next Review Date
                            </label>
                            <input
                              type="date"
                              value={file.next_review_date || ''}
                              onChange={(e) => updateFileMetadata(index, { next_review_date: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Notes
                            </label>
                            <textarea
                              value={file.notes || ''}
                              onChange={(e) => updateFileMetadata(index, { notes: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Additional notes about this datasheet..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-3">
                    {editingIndex === index ? (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => setEditingIndex(null)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingIndex(index)}
                      >
                        Edit Info
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <div className="text-center py-4">
          <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            No datasheets uploaded yet
          </p>
        </div>
      )}
    </div>
  )
}
