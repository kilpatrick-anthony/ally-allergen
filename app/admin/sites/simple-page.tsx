// app/admin/sites/simple-page.tsx - TEMPORARY SIMPLE VERSION
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SimpleSitesPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSites() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('sites')
          .select('*')
          .order('created_at');
        
        if (error) {
          console.error('Error loading sites:', error);
          return;
        }
        
        setSites(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadSites();
  }, []);

  if (loading) {
    return <div className="p-8">Loading sites...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Site Management</h1>
      
      {sites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No sites found. The sites table might not exist.</p>
          <p className="text-sm text-gray-500">
            Run the SQL migration to create the sites table first.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map(site => (
            <div key={site.id} className="border rounded-lg p-6">
              <h2 className="font-bold text-xl mb-2">{site.name}</h2>
              <p className="text-gray-600 mb-1">Slug: {site.slug}</p>
              <p className="text-gray-600 mb-1">City: {site.city}</p>
              <p className="text-gray-600 mb-4">
                Status: 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${site.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {site.is_active ? 'Active' : 'Inactive'}
                </span>
              </p>
              <a 
                href={`/sites/${site.slug}`}
                className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Visit Site
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}