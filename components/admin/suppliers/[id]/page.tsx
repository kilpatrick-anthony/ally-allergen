// app/admin/suppliers/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Truck, AlertCircle } from 'lucide-react';

export default function SupplierDetailPage() {
  const params = useParams();
  const supplierId = params.id as string;
  
  return (
    <div className="p-6">
      <Link 
        href="/admin/suppliers" 
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Suppliers
      </Link>
      
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Truck className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supplier Details</h1>
            <p className="text-gray-600">Viewing supplier: {supplierId}</p>
          </div>
        </div>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Supplier Detail View</h2>
          <p className="text-gray-600 mb-6">
            This feature is coming soon. In development mode, all supplier information is displayed in the main dashboard.
          </p>
          <div className="text-sm text-yellow-600 flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Development Mode - Coming Soon
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link
            href="/admin/suppliers"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Return to Supplier Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}