// app/admin/suppliers/new/page.tsx
'use client'

import Link from 'next/link'
import { ArrowLeft, Plus, AlertCircle } from 'lucide-react'

import { Container } from '../../../components/layout/Container'
import { Card } from '../../../components/layout/Card'
import { Button } from '../../../components/ui/Button'

export default function NewSupplierPage() {
  return (
    <Container>
      <div className="py-8">
        <Link href="/admin/suppliers">
          <Button variant="ghost" icon={ArrowLeft}>
            Back to Suppliers
          </Button>
        </Link>

        <Card className="mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <Plus className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Supplier</h1>
              <p className="text-gray-600">Create a supplier record for your business.</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Supplier form coming soon</h2>
            <p className="text-gray-600 mb-6">
              For now, suppliers can be created by adding them to ingredients.
            </p>
          </div>
        </Card>
      </div>
    </Container>
  )
}
