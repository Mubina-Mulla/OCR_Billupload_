# Company & Product Name Parsing Fix

## Problem
Bill parser wasn't correctly separating company names from product names:
- ❌ Showing "Unknown Company" instead of "Racold"
- ❌ Not extracting product names correctly
- ❌ HSN codes with 10 digits weren't being recognized (only 6-8 digits)

## Your Bill Format
```
1 Racold Gas Geyser ECO 6L NF 8999770609 8419 18% 1 No. 7,300.00 6,186.44
2 Phillips Mixer HL7756 750W 3J 84212190 18% 1 No. 4,200.00 3,559.32
```

## Parsing Logic (Navaratna Format)

### Format Structure
```
[Serial] [CompanyName] [ProductName] [HSN] [GST%] [Qty] [Unit] [Rate] [Amount]
```

### Extraction Rules

**1. Serial Number**
- First number at start of line: `1`, `2`, `3`, etc.

**2. Company Name**
- **ALWAYS the first word** after serial number
- Examples: `Racold`, `Phillips`, `Whirlpool`, `LG`

**3. Product Name**
- Everything **after company name** until HSN code
- Examples: 
  - `Gas Geyser ECO 6L NF`
  - `Mixer HL7756 750W 3J`

**4. HSN Code**
- 4-10 digit number
- Examples: `8419`, `84182100`, `8999770609`, `84212190`

## What I Fixed

### 1. Enhanced HSN Detection
```javascript
// Before: Only 6-8 digits
const hsnMatch = line.match(/\b(\d{6,8})\b/);

// After: 4-10 digits (handles all HSN formats)
const hsnMatch = line.match(/\b(\d{4,10})\b/);
```

### 2. Improved Product Name Extraction
```javascript
// Now stops at:
// - HSN code (4-10 digits)
// - Quantity pattern (1 No., 2 Nos)
// - Percentage (18%)
// - Price pattern (7,300.00)
```

### 3. Company Name Normalization
```javascript
// Handles common variations:
'Phillips' → 'Philips' ✅
'Racold' → 'Racold' ✅
'Whirlpool' → 'Whirlpool' ✅
'LG' → 'LG' ✅
```

### 4. Better Logging
```javascript
console.log('🎯 COMPANY NAME:', companyName);
console.log('🎯 PRODUCT NAME:', productName);
console.log('🎯 HSN CODE:', hsn);
```

## Expected Output

### Product 1
```
✅ Company: Racold
✅ Product: Gas Geyser ECO 6L NF
✅ HSN: 8999770609
✅ Qty: 1 No
✅ Rate: ₹7,300.00
✅ Amount: ₹6,186.44
```

### Product 2
```
✅ Company: Philips (auto-corrected from Phillips)
✅ Product: Mixer HL7756 750W 3J
✅ HSN: 84212190
✅ Qty: 1 No
✅ Rate: ₹4,200.00
✅ Amount: ₹3,559.32
```

## How to Test

1. **Upload your bill** (PDF or JPG)
2. **Open browser console** (F12)
3. **Look for logs:**
   ```
   🎯 PROCESSING LINE: 1 Racold Gas Geyser ECO 6L NF...
   🎯 COMPANY NAME: Racold
   🎯 AFTER COMPANY NAME: Gas Geyser ECO 6L NF 8999770609...
   🎯 PRODUCT NAME (Pattern 1): Gas Geyser ECO 6L NF
   🎯 HSN CODE EXTRACTED: 8999770609
   ```

4. **Check extracted products** in the form

## Supported HSN Formats

| Format | Digits | Example | Status |
|--------|--------|---------|--------|
| Short HSN | 4 | 8419 | ✅ Supported |
| Standard HSN | 6 | 841821 | ✅ Supported |
| Full HSN | 8 | 84182100 | ✅ Supported |
| Extended HSN | 10 | 8999770609 | ✅ Supported |

## Company Name Variations

| Input | Output | Notes |
|-------|--------|-------|
| Racold | Racold | ✅ Correct |
| Phillips | Philips | ✅ Auto-corrected |
| Whirlpool | Whirlpool | ✅ Correct |
| LG | LG | ✅ Uppercase preserved |
| Samsung | Samsung | ✅ Capitalized |

## Troubleshooting

### If company shows "Unknown"
- Check console logs for company extraction
- Ensure first word after serial is the company name
- Add brand to company list if needed

### If product name is wrong
- Check if HSN code is being detected
- Look for "🎯 PRODUCT NAME" in console
- Verify format matches: `[Serial] [Company] [Product] [HSN]`

### If HSN is missing
- Check if number is 4-10 digits
- Look for "🎯 HSN CODE EXTRACTED" in console
- Verify HSN appears after product name

## Files Modified
- ✅ `src/utils/pdfParser.js` - Enhanced company/product extraction

---
**Status**: ✅ Fixed - First word is company, rest is product name
