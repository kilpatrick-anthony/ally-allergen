// components/admin/AllergenSelectorDemo.tsx
// Demo file showing how the subtype selection works

'use client';

import { useState } from 'react';
import AllergenWarningSelector from './AllergenWarningSelector';
import AllergenWarningDisplay from '../kiosk/AllergenWarningDisplay';
import type { AllergenWarnings } from '@/types/allergen';

export default function AllergenSelectorDemo() {
  // Example 1: Bread with wheat and oats
  const [breadWarnings, setBreadWarnings] = useState<AllergenWarnings>({
    cereals_gluten: 'contains',
    cereals_gluten_types: ['wheat', 'oats'],
    crustaceans: 'none',
    eggs: 'none',
    fish: 'none',
    peanuts: 'none',
    soybeans: 'none',
    milk: 'traces', // Made on shared equipment
    nuts: 'none',
    celery: 'none',
    mustard: 'none',
    sesame: 'none',
    sulphites: 'none',
    lupin: 'none',
    molluscs: 'none'
  });

  // Example 2: Trail mix with multiple nuts
  const [trailMixWarnings, setTrailMixWarnings] = useState<AllergenWarnings>({
    cereals_gluten: 'none',
    crustaceans: 'none',
    eggs: 'none',
    fish: 'none',
    peanuts: 'may_contain', // Peanuts are separate allergen
    soybeans: 'none',
    milk: 'none',
    nuts: 'contains',
    nuts_types: ['almonds', 'cashews', 'walnuts'],
    celery: 'none',
    mustard: 'none',
    sesame: 'none',
    sulphites: 'none',
    lupin: 'none',
    molluscs: 'none'
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-[#003842] mb-2">
          Allergen Sub-Type Selection Demo
        </h1>
        <p className="text-gray-600">
          Shows how gluten types and tree nuts are automatically prompted when selected
        </p>
      </div>

      {/* Example 1: Bread */}
      <section className="space-y-4">
        <div className="border-l-4 border-[#42b8ac] pl-4">
          <h2 className="text-2xl font-bold text-[#003842]">
            Example 1: Wholegrain Bread
          </h2>
          <p className="text-gray-600 mt-1">
            Contains wheat and oats, may have traces of milk
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-[#003842] mb-3">
              Admin View (Input Form)
            </h3>
            <AllergenWarningSelector
              value={breadWarnings}
              onChange={setBreadWarnings}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#003842] mb-3">
              Kiosk View (Customer Display)
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Detailed Mode:</h4>
                <AllergenWarningDisplay warnings={breadWarnings} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Compact Mode:</h4>
                <AllergenWarningDisplay warnings={breadWarnings} compact />
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="border-gray-300" />

      {/* Example 2: Trail Mix */}
      <section className="space-y-4">
        <div className="border-l-4 border-[#42b8ac] pl-4">
          <h2 className="text-2xl font-bold text-[#003842]">
            Example 2: Premium Trail Mix
          </h2>
          <p className="text-gray-600 mt-1">
            Contains almonds, cashews, and walnuts; may contain peanuts
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-[#003842] mb-3">
              Admin View (Input Form)
            </h3>
            <AllergenWarningSelector
              value={trailMixWarnings}
              onChange={setTrailMixWarnings}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#003842] mb-3">
              Kiosk View (Customer Display)
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Detailed Mode:</h4>
                <AllergenWarningDisplay warnings={trailMixWarnings} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Compact Mode:</h4>
                <AllergenWarningDisplay warnings={trailMixWarnings} compact />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How Sub-Type Selection Works
        </h2>
        
        <div className="space-y-3 text-blue-900">
          <div className="flex gap-3">
            <span className="flex-shrink-0 font-bold">1.</span>
            <div>
              <strong>Click on "Cereals containing gluten" or "Tree nuts"</strong> to expand the allergen card
            </div>
          </div>
          
          <div className="flex gap-3">
            <span className="flex-shrink-0 font-bold">2.</span>
            <div>
              <strong>Select a warning level</strong> (Contains, May Contain, etc.) other than "Not Present"
            </div>
          </div>
          
          <div className="flex gap-3">
            <span className="flex-shrink-0 font-bold">3.</span>
            <div>
              <strong>A sub-selection panel automatically appears</strong> showing:
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>For Gluten:</strong> Wheat, Rye, Barley, Oats, Spelt, Kamut</li>
                <li><strong>For Tree Nuts:</strong> Almonds, Hazelnuts, Walnuts, Cashews, Pecans, Brazil nuts, Pistachios, Macadamia</li>
              </ul>
            </div>
          </div>
          
          <div className="flex gap-3">
            <span className="flex-shrink-0 font-bold">4.</span>
            <div>
              <strong>Check the specific components</strong> or click "Select All" for all types
            </div>
          </div>
          
          <div className="flex gap-3">
            <span className="flex-shrink-0 font-bold">5.</span>
            <div>
              <strong>The display updates automatically:</strong>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>If specific types selected: Shows "Contains wheat, oats"</li>
                <li>If all types selected: Shows general name "Contains cereals containing gluten"</li>
                <li>If none selected: Shows warning to specify types</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Database Schema */}
      <section className="bg-gray-50 border border-gray-300 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Database Schema</h2>
        
        <div className="bg-white p-4 rounded border border-gray-200 overflow-x-auto">
          <pre className="text-sm text-gray-800">
{`{
  "cereals_gluten": "contains",
  "cereals_gluten_types": ["wheat", "oats"],
  
  "nuts": "contains",
  "nuts_types": ["almonds", "cashews", "walnuts"],
  
  "milk": "traces",
  "peanuts": "may_contain",
  
  // ... other 14 allergens with their levels
}`}
          </pre>
        </div>

        <p className="text-sm text-gray-600">
          Sub-type arrays are optional and only stored when specific components are selected.
          If all components are selected, the general allergen name is used in displays.
        </p>
      </section>
    </div>
  );
}
