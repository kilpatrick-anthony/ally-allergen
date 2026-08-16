import type { Metadata } from 'next'
import InternalPortal from './InternalPortal'

export const metadata: Metadata = {
  title: 'AllyJen Internal',
  description: 'Private people and operations workspace for the AllyJen team.',
  robots: { index: false, follow: false },
}

export default function InternalPage() {
  return <InternalPortal />
}
