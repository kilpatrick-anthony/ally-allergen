// app/admin/suppliers/products/page.tsx
'use client';

import Link from 'next/link';
import { ArrowLeft, Package, AlertCircle } from 'lucide-react';

export default function SupplierProductsPage() {
  return (
    <div className="p-6">
      <Link 
        href="/admin/suppliers" 
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Suppliers
      </Link>
      
      <div className="bg-white rounded-xl shadow-sm p-8 text-center border-2 border-dashed border-gray-300">
        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Supplier Products</h1>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Manage all products from your suppliers and track allergen profiles.
        </p>
        <div className="flex items-center justify-center gap-2 text-yellow-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Development Mode - Coming Soon</span>
        </div>
      </div>
    </div>
  );
}