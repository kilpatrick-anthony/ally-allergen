// app/types/ingredient.ts

export interface Supplier {
  id: string;
  name: string;
  certification_status: 'certified' | 'pending' | 'uncertified';
}

export interface SupplierProduct {
  id: string;
  supplier_id: string;
  supplier_name: string;
  product_name: string;
  product_code: string;
  allergens: string[];
  price: number;
  unit: string;
  is_active: boolean; // Currently being purchased
  usage_percentage?: number; // e.g., 70% of stores use this
}

export interface Ingredient {
  id: string;
  name: string;
  description: string;
  business_id: string;
  created_at: string;
  
  // Multiple supplier support
  suppliers: SupplierProduct[]; // All possible suppliers
  
  // Derived allergen info
  combined_allergens: string[]; // Union of all active suppliers
  min_allergens: string[]; // Allergens present in ALL suppliers
  max_allergens: string[]; // Allergens present in ANY supplier
  
  // Display settings
  supplier_variability: 'fixed' | 'variable' | 'mixed';
  display_mode: 'specific' | 'combined' | 'store-specific';
  
  // Current primary (for reference)
  primary_supplier_id?: string;
}

// If you also need menu item types, you can add:
export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  business_id: string;
  item_type?: 'prepared' | 'packaged_product';
  supplier_id?: string | null;
  manufacturer?: string | null;
  product_code?: string | null;
  barcode?: string | null;
  ingredient_declaration?: string | null;
  label_verified_at?: string | null;
}

export interface MenuItemIngredient {
  menu_item_id: string;
  ingredient_id: string;
  quantity: string;
  is_optional: boolean;
}
