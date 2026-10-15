interface AttachmentDraft {
  id?: string
  file?: unknown
  file_name?: string
  supplier_name?: string
  version?: string
  next_review_date?: string
  notes?: string
}

/** Ignore uploader presentation flags and asynchronously loaded, unchanged evidence. */
export function changedAttachments(files: AttachmentDraft[], original: AttachmentDraft[]) {
  const fields = ['id', 'file_name', 'supplier_name', 'version', 'next_review_date', 'notes'] as const
  const signature = (items: AttachmentDraft[]) => JSON.stringify(items.map(item => fields.map(field => item[field] || '')))
  return files.some(file => file.file) || signature(files) !== signature(original) ? files : null
}
