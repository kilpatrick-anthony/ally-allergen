'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check } from 'lucide-react'

interface Allergen {
  id: number
  name: string
  icon: string
  description: string
}

export default function AllergenFilter() {
  const [allergens, setAllergens] = useState<Allergen[]>([])
  const [selectedAllergens, setSelectedAllergens] = useState<number[]>([])
  
  const supabase = createClient()

  useEffect(() => {
    loadAllergens()
  }, [])

  async function loadAllergens() {
    const { data } = await supabase
      .from('allergens')
      .select('*')
      .order('name')
    
    if (data) setAllergens(data)
  }

  const toggleAllergen = (allergenId: number) => {
    if (selectedAllergens.includes(allergenId)) {
      setSelectedAllergens(selectedAllergens.filter(id => id !== allergenId))
    } else {
      setSelectedAllergens([...selectedAllergens, allergenId])
    }
  }

  return (
    <div>
      <div className="space-y-3">
        {allergens.map(allergen => (
          <button
            key={allergen.id}
            onClick={() => toggleAllergen(allergen.id)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
              selectedAllergens.includes(allergen.id)
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{allergen.icon}</span>
              <div className="text-left">
                <div className="font-medium text-gray-800">{allergen.name}</div>
                <div className="text-xs text-gray-500">
                  {allergen.description}
                </div>
              </div>
            </div>
            {selectedAllergens.includes(allergen.id) && (
              <Check className="h-5 w-5 text-red-600" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        <button
          onClick={() => setSelectedAllergens([])}
          className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
        >
          Clear all filters
        </button>
        
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Items containing selected allergens will be hidden</p>
          <p>• "May contain" warnings are not shown here</p>
          <p>• Always ask staff about cross-contamination</p>
        </div>
      </div>
    </div>
  )
}