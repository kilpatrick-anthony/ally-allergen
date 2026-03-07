// components/ui/Select.tsx
interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
}

export function Select({ value, onChange, options, placeholder, className = '' }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-4 py-3 border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:border-[#42b8ac] transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white ${className}`}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}