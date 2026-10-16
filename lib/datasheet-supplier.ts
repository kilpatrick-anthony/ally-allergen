/** Document-specific metadata always wins over a current record association. */
export function recordedDatasheetSupplier(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function soleIngredientSupplier(suppliers: unknown): string | null {
  if (!Array.isArray(suppliers)) return null
  const names = new Map<string, string>()
  for (const value of suppliers) {
    const name = recordedDatasheetSupplier(value)
    if (name) names.set(name.toLocaleLowerCase(), name)
  }
  return names.size === 1 ? [...names.values()][0] : null
}
