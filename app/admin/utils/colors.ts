export function adjustColor(color: string, amount: number): string {
  color = color.replace('#', '')
  const r = clamp(parseInt(color.substring(0, 2), 16) + amount)
  const g = clamp(parseInt(color.substring(2, 4), 16) + amount)
  const b = clamp(parseInt(color.substring(4, 6), 16) + amount)
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, value))
}

// Brand color utilities
export function getBrandColors() {
  return {
    primary: '#003842',
    secondary: '#42b8ac',
    light: '#e6f4f1',
    dark: '#002a32'
  }
}