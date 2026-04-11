# Compliance Tracking System

## Overview

The compliance tracking system automatically monitors ingredients and menu items to ensure they meet your business's allergen documentation and review requirements. It helps maintain compliance with EU Regulation 1169/2011 by flagging items that need attention.

## How It Works

### Compliance Status Levels

**✓ Compliant (Green)**
- Item has all required documentation
- Item has been reviewed within the review period
- All suppliers are documented

**⚠ Review Due Soon (Yellow/Amber)**
- Item is approaching the review deadline (within 14 days)
- Recommendation: Review soon to maintain compliance

**✕ Not Compliant (Red)**
- Item is missing required datasheets
- Item hasn't been reviewed within the review period (overdue)
- Item has no suppliers documented
- For menu items: One or more ingredients are not compliant

### Compliance Requirements

#### For Ingredients:
1. **At least one datasheet uploaded** - Required for food safety traceability
2. **Reviewed within the review period** - Default: 90 days (configurable)
3. **Supplier information provided** - Ensures you know where the ingredient comes from

#### For Menu Items:
1. **All ingredients must be compliant** - Menu items inherit ingredient compliance status
2. **Reviewed within the review period** - Default: 90 days (configurable)
3. **Menu item may be marked as reviewed** - Even if ingredients are compliant

## Using the Compliance System

### Checking Compliance Status

1. Go to **Ingredients > Edit** or **Menu Builder > Edit**
2. Look for the **Compliance Status** card
3. See the current status and reasons if it's not compliant

### Marking Items as Reviewed

1. In the **Compliance Status** card, click **"Mark as Reviewed"**
2. The system updates the review date to today
3. If all other requirements are met, the item becomes compliant

### Fixing Non-Compliance Issues

**Missing Datasheet:**
- Go to the datasheet section
- Upload the product datasheet/safety sheet

**Review Overdue:**
- Click "Mark as Reviewed" after reviewing the item's allergen information

**No Suppliers:**
- Add supplier information in the Suppliers section
- This ensures full traceability

**Non-Compliant Ingredients (Menu Items):**
- Check each ingredient's compliance status
- Fix any ingredients that are not compliant
- The menu item will inherit compliant status once all ingredients are compliant

## Configuration

### Review Frequency

The default review frequency is **90 days (quarterly)**. To change this for your business:

1. Go to **Settings**
2. Look for **Compliance Review Period**
3. Select your preferred frequency:
   - 30 days (monthly)
   - 60 days
   - 90 days (quarterly) - Recommended
   - 180 days (bi-annual)
   - 365 days (annual)

## Database Schema

### Added Tables & Columns

**ingredients table:**
- `last_reviewed_at` - Timestamp of when the ingredient was last reviewed
- `compliance_notes` - Optional notes about compliance status

**menu_items table:**
- `last_reviewed_at` - Timestamp of when the menu item was last reviewed
- `compliance_notes` - Optional notes about compliance status

**businesses table:**
- `compliance_review_days` - Configurable review frequency (default: 90)

**compliance_audit table (new):**
- Tracks all compliance status changes
- Records who changed it and when
- Useful for compliance audits

## API Endpoints

### Mark Item as Reviewed
```bash
POST /api/compliance/mark-reviewed
Body: {
  itemId: string,
  itemType: 'ingredient' | 'menu_item'
}
```

### Get Compliance Status
```bash
GET /api/compliance/status?itemId={id}&itemType=ingredient|menu_item
GET /api/compliance/status  # Get all non-compliant items
```

Returns:
```json
{
  "status": "compliant|warning|error",
  "reasons": ["reason 1", "reason 2"],
  "lastReviewedAt": "2026-04-11",
  "daysUntilDue": 45,
  "daysOverdue": null
}
```

## Best Practices

1. **Review Regularly** - Mark items as reviewed during your regular audits
2. **Upload Datasheets** - Keep product datasheets up-to-date with allergen information
3. **Monitor Warnings** - Don't wait for items to become non-compliant; review when status is "warning"
4. **Track Suppliers** - Always document where ingredients come from for traceability
5. **Audit Trail** - The compliance_audit table provides a complete history of all compliance changes

## Compliance with EU Regulation 1169/2011

This system helps ensure compliance with EU Food Information Regulation by:
- Maintaining accurate allergen data from suppliers
- Ensuring regular reviews of allergen information
- Providing traceability from suppliers to finished menu items
- Automatically flagging items that may have outdated information
- Creating an audit trail for compliance verification

## Support

If you have questions about compliance requirements, consult:
- [FSAI Allergen Guidance](https://www.fsai.ie/)
- [EU Regulation 1169/2011](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32011R1169)
- Your local food safety authority
