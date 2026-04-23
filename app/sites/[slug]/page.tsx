// app/sites/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Building } from 'lucide-react';
import KioskMenu from '@/components/kiosk/MenuDisplay';

const ADMIN_WORDMARK_SRC = '/Nav%20bar%20AllyJen%20Logo%20(500%20x%20150%20px).svg'

export default async function SiteKioskPage({ 
  params 
}: { 
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch site details
  const { data: site } = await supabase
    .from('sites')
    .select(`
      *,
      business:businesses (*)
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!site) {
    notFound();
  }

  // Fetch allergen items for this site
  const { data: items } = await supabase
    .from('allergen_items')
    .select('*')
    .or(`site_id.eq.${site.id},is_global.eq.true,visibility.eq.global`)
    .order('category')
    .order('name');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Site Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src={ADMIN_WORDMARK_SRC}
              alt="AllyJen Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {site.business?.name || 'Allergen Guide'}
          </h1>
          <h2 className="text-2xl text-gray-700 mb-4">{site.name}</h2>
          {site.address && (
            <p className="text-gray-600">
              {site.address}, {site.city}, {site.country}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-2">Powered by AllyJen</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
            <Building size={16} />
            <span className="font-medium">Site-Specific Allergen Guide</span>
          </div>
        </div>

        {/* Kiosk Menu with site-specific items */}
        <KioskMenu 
          items={items || []}
          site={site}
          showSiteBadge={true}
        />
      </div>
    </div>
  );
}