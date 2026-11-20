import { JURISDICTIONS, isJurisdiction, type Jurisdiction } from '@/lib/location-jurisdiction'

export function LocationJurisdictionField({ value, onChange }: {
  value: Jurisdiction
  onChange: (jurisdiction: Jurisdiction) => void
}) {
  return (
    <div>
      <label htmlFor="site-jurisdiction" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Allergen jurisdiction</label>
      <select id="site-jurisdiction" value={value}
        onChange={(event) => { if (isJurisdiction(event.target.value)) onChange(event.target.value) }}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900">
        {Object.entries(JURISDICTIONS).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </select>
    </div>
  )
}
