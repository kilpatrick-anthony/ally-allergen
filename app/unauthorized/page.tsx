// app/unauthorized/page.tsx
'use client'

import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md p-8 text-center shadow-xl rounded-2xl border border-gray-100 bg-white">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7 text-red-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#003842] mb-2">Access denied</h1>
        <p className="text-gray-500 text-sm mb-6">
          You don&apos;t have permission to view this page. If you believe this is a mistake, contact your account administrator.
        </p>
        <Link href="/auth/signin">
          <Button className="w-full">Back to sign in</Button>
        </Link>
      </Card>
    </div>
  )
}
