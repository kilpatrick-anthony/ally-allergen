/**
 * Compliance calculation logic for ingredients and menu items
 * Determines if an item is compliant based on:
 * - Datasheet presence
 * - Last review date
 * - Supplier information
 * - Ingredient formula (for menu items)
 */

export type ComplianceStatus = 'compliant' | 'warning' | 'error';

export interface ComplianceCheckResult {
  status: ComplianceStatus;
  reasons: string[];
  lastReviewedAt: Date | null;
  daysOverdue: number | null;
  daysUntilDue: number | null;
}

/**
 * Check if an ingredient is compliant
 */
export function checkIngredientCompliance(ingredient: {
  id: string;
  name: string;
  status: string;
  last_reviewed_at: string | null;
  preferred_review_months?: number;
  suppliers?: string[];
  has_datasheets?: boolean;
  certifications?: string[];
}, businessSettings: {
  compliance_review_days: number;
}): ComplianceCheckResult {
  const reasons: string[] = [];
  let status: ComplianceStatus = 'compliant';

  // Check if item is archived (exempt from compliance checks)
  if (ingredient.status === 'archived') {
    return {
      status: 'compliant',
      reasons: ['Item is archived'],
      lastReviewedAt: null,
      daysOverdue: null,
      daysUntilDue: null
    };
  }

  // Check if datasheet exists
  if (!ingredient.has_datasheets) {
    reasons.push('No datasheet uploaded');
    status = 'error';
  }

  // Check supplier information
  const suppliers = ingredient.suppliers || [];
  if (suppliers.length === 0) {
    reasons.push('No supplier information provided');
    status = 'error';
  }

  // Check dietary attributes
  const certifications = ingredient.certifications || [];
  if (certifications.length === 0) {
    reasons.push('No dietary attributes entered (e.g. Vegan, Gluten-Free)');
    if (status === 'compliant') status = 'warning';
  }

  // Check review date - use preferred_review_months if set, otherwise use business default
  const preferredMonths = ingredient.preferred_review_months || 12;
  const reviewDays = preferredMonths * 30; // Convert months to approximate days
  const lastReviewedAt = ingredient.last_reviewed_at ? new Date(ingredient.last_reviewed_at) : null;
  const now = new Date();
  let daysOverdue = null;
  let daysUntilDue = null;

  if (lastReviewedAt) {
    const daysSinceReview = Math.floor((now.getTime() - lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceReview > reviewDays) {
      daysOverdue = daysSinceReview - reviewDays;
      reasons.push(`Review overdue by ${daysOverdue} days (last reviewed ${daysSinceReview} days ago)`);
      status = 'error';
    } else {
      daysUntilDue = reviewDays - daysSinceReview;
      if (daysUntilDue <= 14) {
        reasons.push(`Review due in ${daysUntilDue} days`);
        if (status === 'compliant') status = 'warning';
      }
    }
  } else {
    reasons.push('No review date set - needs initial review');
    status = 'error';
  }

  return {
    status,
    reasons,
    lastReviewedAt,
    daysOverdue,
    daysUntilDue
  };
}

/**
 * Check if a menu item is compliant
 */
export function checkMenuItemCompliance(menuItem: {
  id: string;
  name: string;
  status: string;
  last_reviewed_at: string | null;
  preferred_review_months?: number;
  ingredients?: string[] | Array<{ id: string; compliance?: ComplianceStatus }>;
}, ingredientComplianceMap: Map<string, ComplianceStatus>, businessSettings: {
  compliance_review_days: number;
}, ingredientReviewDatesMap?: Map<string, { daysUntilDue: number | null; daysOverdue: number | null }>): ComplianceCheckResult {
  const reasons: string[] = [];
  let status: ComplianceStatus = 'compliant';

  // Check if item is archived
  if (menuItem.status === 'archived') {
    return {
      status: 'compliant',
      reasons: ['Item is archived'],
      lastReviewedAt: null,
      daysOverdue: null,
      daysUntilDue: null
    };
  }

  // Check if all ingredients are compliant
  const ingredients = menuItem.ingredients || [];
  if (ingredients.length > 0) {
    const nonCompliantIngredients = ingredients.filter((ing: any) => {
      // Handle both string IDs and objects with id property
      const ingId = typeof ing === 'string' ? ing : ing.id;
      const ingCompliance = ingredientComplianceMap.get(ingId);
      return ingCompliance && ingCompliance !== 'compliant';
    });

    if (nonCompliantIngredients.length > 0) {
      reasons.push(`${nonCompliantIngredients.length} ingredient(s) not compliant - review ingredient(s) first`);
      status = 'error';
    }

    // Check ingredient review dates - use the earliest one
    if (ingredientReviewDatesMap && ingredients.length > 0) {
      let earliestDaysUntilDue: number | null = null;
      let earliestDaysOverdue: number | null = null;
      let hasWarning = false;

      ingredients.forEach((ing: any) => {
        const ingId = typeof ing === 'string' ? ing : ing.id;
        const ingReviewDates = ingredientReviewDatesMap.get(ingId);
        
        if (ingReviewDates) {
          if (ingReviewDates.daysOverdue !== null && ingReviewDates.daysOverdue > 0) {
            if (earliestDaysOverdue === null || ingReviewDates.daysOverdue > earliestDaysOverdue) {
              earliestDaysOverdue = ingReviewDates.daysOverdue;
            }
          }
          
          if (ingReviewDates.daysUntilDue !== null) {
            if (earliestDaysUntilDue === null || ingReviewDates.daysUntilDue < earliestDaysUntilDue) {
              earliestDaysUntilDue = ingReviewDates.daysUntilDue;
            }
          }

          if (ingReviewDates.daysUntilDue !== null && ingReviewDates.daysUntilDue <= 14) {
            hasWarning = true;
          }
        }
      });

      if (earliestDaysOverdue !== null && earliestDaysOverdue > 0) {
        reasons.push(`Ingredient review overdue by ${earliestDaysOverdue} days`);
        status = 'error';
      } else if (hasWarning && status === 'compliant') {
        status = 'warning';
      }
    }
  }

  // Check menu item's own review date
  const preferredMonths = menuItem.preferred_review_months || 12;
  const reviewDays = preferredMonths * 30;
  const lastReviewedAt = menuItem.last_reviewed_at ? new Date(menuItem.last_reviewed_at) : null;
  const now = new Date();
  let daysOverdue = null;
  let daysUntilDue = null;

  if (lastReviewedAt) {
    const daysSinceReview = Math.floor((now.getTime() - lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceReview > reviewDays) {
      daysOverdue = daysSinceReview - reviewDays;
      reasons.push(`Menu item review overdue by ${daysOverdue} days`);
      status = 'error';
    } else {
      daysUntilDue = reviewDays - daysSinceReview;
      if (daysUntilDue <= 14 && status === 'compliant') {
        reasons.push(`Menu item review due in ${daysUntilDue} days`);
        status = 'warning';
      }
    }
  } else {
    reasons.push('No menu item review date set');
    status = 'error';
  }

  return {
    status,
    reasons,
    lastReviewedAt,
    daysOverdue,
    daysUntilDue
  };
}

/**
 * Calculate days until compliance review is due
 */
export function getDaysUntilReviewDue(lastReviewedAt: Date | string | null, reviewDays: number): { daysUntilDue: number; isDue: boolean; isOverdue: boolean } {
  if (!lastReviewedAt) {
    return { daysUntilDue: 0, isDue: true, isOverdue: true };
  }

  const reviewed = new Date(lastReviewedAt);
  const dueDate = new Date(reviewed.getTime() + reviewDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    daysUntilDue: Math.max(0, daysUntilDue),
    isDue: daysUntilDue <= 0,
    isOverdue: daysUntilDue < 0
  };
}

/**
 * Format compliance status for display
 */
export function formatComplianceStatus(status: ComplianceStatus): { label: string; color: string; bgColor: string } {
  switch (status) {
    case 'compliant':
      return { label: 'Compliant', color: '#16a34a', bgColor: '#dcfce7' };
    case 'warning':
      return { label: 'Review Due Soon', color: '#f59e0b', bgColor: '#fef3c7' };
    case 'error':
      return { label: 'Not Compliant', color: '#dc2626', bgColor: '#fee2e2' };
    default:
      return { label: 'Unknown', color: '#6b7280', bgColor: '#f3f4f6' };
  }
}
