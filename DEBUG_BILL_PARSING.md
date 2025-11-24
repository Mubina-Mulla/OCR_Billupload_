# Debug Bill Parsing - Step by Step Guide

## Your Bill Shows "Unknown Company"

This means the parser is either:
1. Not detecting the product line
2. Not extracting the first word correctly
3. OCR is not reading the text properly

## How to Debug

### Step 1: Open Browser Console
1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Clear the console (trash icon)

### Step 2: Upload Your Bill
1. Go to **Add Customer** page
2. Click **"Upload Bill"**
3. Select your bill image/PDF

### Step 3: Check Console Logs

Look for these key logs in order:

#### A. OCR Extraction
```
🔍 Starting image OCR extraction
📊 File size: XX KB
✅ OCR method 1 successful! Extracted XXX characters
```

#### B. Extracted Text
```
📄 EXTRACTED TEXT PREVIEW (first 2000 chars):
[Shows the actual text OCR extracted]
```

**What to check:**
- Is "Whirlpool" spelled correctly?
- Is the product line visible?
- Are there extra spaces or line breaks?

#### C. All Lines
```
📋 ALL EXTRACTED LINES:
Line 0: "TAX INVOICE"
Line 1: "Navaratna Distributors"
Line 2: "..."
Line X: "1 Whirlpool Ref DC 205..."  ← LOOK FOR THIS
```

**What to check:**
- Find the line with your product
- Note the line number
- Check if "1 Whirlpool" is on the same line

#### D. Product Line Detection
```
🔍 Line X: "1 Whirlpool Ref DC 205 Imps Prm 3s Win Sarena-7226 84182100..."
  ├─ Starts with number: true
  ├─ Has brand: true
  ├─ Has price: true
  ├─ Has quantity: true
  └─ Has HSN: true
```

**What to check:**
- All should be `true`
- If any is `false`, that's the problem

#### E. Company Name Extraction
```
🎯 PROCESSING LINE: 1 Whirlpool Ref DC 205...
🎯 LINE AFTER REMOVING SERIAL: Whirlpool Ref DC 205...
🎯 FIRST WORD MATCH ATTEMPT: ["Whirlpool", "Whirlpool"]
🎯 FIRST WORD EXTRACTED: Whirlpool
🎯 NORMALIZED COMPANY NAME: Whirlpool
```

**What to check:**
- "LINE AFTER REMOVING SERIAL" should start with company name
- "FIRST WORD EXTRACTED" should be the company
- "NORMALIZED COMPANY NAME" should be correct

#### F. Product Name Extraction
```
🎯 AFTER COMPANY NAME: Ref DC 205 Imps Prm 3s Win Sarena-7226 84182100...
🎯 PRODUCT NAME (Pattern 1): Ref DC 205 Imps Prm 3s Win Sarena-7226
🎯 HSN CODE EXTRACTED: 84182100
```

**What to check:**
- Product name should NOT include company name
- HSN should be extracted correctly

#### G. Final Product
```
✅ Product 1: Whirlpool Ref DC 205 Imps Prm 3s Win Sarena-7226 - Qty:1 Price:₹15000 Amount:₹12711.86
```

## Common Issues & Solutions

### Issue 1: OCR Extracts Text on Multiple Lines
**Symptom:**
```
Line 10: "1 Whirlpool"
Line 11: "Ref DC 205 Imps Prm 3s Win Sarena-7226"
Line 12: "84182100 18% 1 No 15,000.00 12,711.86"
```

**Solution:** OCR quality issue. Try:
- Use PDF instead of JPG
- Take clearer photo
- Increase image resolution

### Issue 2: Company Name Not Detected
**Symptom:**
```
🎯 FIRST WORD MATCH ATTEMPT: null
❌ NO FIRST WORD FOUND
```

**Solution:** Line format issue. Check:
- Is there a serial number at start?
- Is company name right after serial?
- Are there special characters?

### Issue 3: "Unknown Company" Despite Correct Extraction
**Symptom:**
```
🎯 FIRST WORD EXTRACTED: Whirlpool
🎯 NORMALIZED COMPANY NAME: Unknown
```

**Solution:** Logic error. This shouldn't happen with current code.

### Issue 4: Product Line Skipped
**Symptom:**
```
⏭️ Skipping (no serial or brand)
```

**Solution:** Detection failed. Check:
- Does line start with number (1, 2, 3)?
- Does line contain brand name?
- Does line have HSN or price?

## What to Send Me

If it's still not working, send me:

1. **The exact OCR text** from console:
   ```
   Copy from: 📄 EXTRACTED TEXT PREVIEW
   ```

2. **The product line** from console:
   ```
   Copy the line that shows: Line X: "1 Whirlpool..."
   ```

3. **The company extraction logs**:
   ```
   Copy from: 🎯 PROCESSING LINE
   to: 🎯 NORMALIZED COMPANY NAME
   ```

4. **Screenshot** of the console showing the logs

## Quick Test

Try this in console after upload:
```javascript
// Check if Whirlpool is in extracted text
console.log('Has Whirlpool:', document.body.innerText.includes('Whirlpool'));
```

---
**With these logs, I can pinpoint exactly where the parsing fails!**
