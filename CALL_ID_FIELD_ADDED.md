# Call ID Field Added to Ticket Form

## Feature Added

Added a "Call ID" field to the ticket creation form that:
- ✅ Appears ONLY when category is "Demo" or "Service"
- ✅ Positioned after "Expected End Date" field
- ✅ Optional field (not required)
- ✅ Saves to ticket document in Firebase

## Changes Made

### 1. Updated Form State (AddTicket.js)

Added `callId` to the initial form data:
```javascript
const [formData, setFormData] = useState({
  // ... other fields
  endDate: "",
  callId: "",  // ← New field
});
```

### 2. Added Call ID Input Field (AddTicket.js)

Added the input field after "Expected End Date":
```javascript
{/* Call ID - Only for Demo and Service categories */}
{showServiceCenters && (
  <div className="form-group">
    <label>Call ID</label>
    <input
      type="text"
      name="callId"
      value={formData.callId}
      onChange={handleChange}
      placeholder="Enter call ID (optional)"
    />
    <small>Reference ID for service/demo call</small>
  </div>
)}
```

## Form Layout

### When Category = "Demo" or "Service":

```
┌─────────────────────────────────────┐
│ Product Information                 │
│ - Company Name                      │
│ - Serial Number                     │
│ - Product Name                      │
│ - Price                             │
├─────────────────────────────────────┤
│ Category: [Demo ▼]                  │
│ Issue Type: [Select ▼]              │
│ Priority: [Medium ▼]                │
│ Expected End Date: [dd/mm/yyyy]     │
│ Call ID: [Enter call ID]  ← NEW!   │
│ Service Center: [Select ▼]          │
└─────────────────────────────────────┘
```

### When Category = "Third Party" or "In Store":

```
┌─────────────────────────────────────┐
│ Product Information                 │
│ - Company Name                      │
│ - Serial Number                     │
│ - Product Name                      │
│ - Price                             │
├─────────────────────────────────────┤
│ Category: [Third Party ▼]           │
│ Issue Type: [Select ▼]              │
│ Priority: [Medium ▼]                │
│ Expected End Date: [dd/mm/yyyy]     │
│ (No Call ID field)                  │
│ Technician: [Select ▼]              │
│ Service Amount: [₹]                 │
│ Commission Amount: [₹]              │
│ Amount Received By: [Select ▼]      │
│ Note: [Text area]                   │
└─────────────────────────────────────┘
```

## Field Details

### Call ID Field:
- **Label**: "Call ID"
- **Type**: Text input
- **Required**: No (optional)
- **Placeholder**: "Enter call ID (optional)"
- **Help Text**: "Reference ID for service/demo call"
- **Visibility**: Only when category is "Demo" or "Service"
- **Position**: After "Expected End Date", before "Service Center"

## Data Storage

When a ticket is created with Call ID, it's saved to Firebase:

```javascript
// Path: /mainData/Billuload/users/{adminId}/tickets/{ticketId}
{
  ticketNumber: "907387630",
  customerName: "Rohan Gurav",
  productName: "macbook",
  category: "Demo",
  issueType: "Product Demonstration",
  priority: "Medium",
  endDate: "2024-01-25",
  callId: "CALL-2024-001",  // ← New field
  subOption: "Apple - Apple services",
  status: "Pending",
  createdAt: "2024-01-20T10:30:00.000Z",
  // ... other fields
}
```

## Display in Tickets

The Call ID is already displayed in the Tickets.js component:
```javascript
{(ticket.category === "Demo" || ticket.category === "Service") && ticket.callId && (
  <span className="meta-call-id">Call ID: {ticket.callId}</span>
)}
```

## Testing Steps

### Test 1: Demo Category
1. Login as any admin
2. Go to Customers → Select customer → Add Product → Raise Ticket
3. Select Category: "Demo"
4. **Verify**: Call ID field appears after Expected End Date
5. Enter a Call ID (e.g., "DEMO-001")
6. Complete and submit the form
7. Go to Tickets page
8. **Verify**: Ticket shows "Call ID: DEMO-001"

### Test 2: Service Category
1. Create a ticket with Category: "Service"
2. **Verify**: Call ID field appears
3. Enter Call ID and submit
4. **Verify**: Ticket displays with Call ID

### Test 3: Third Party Category
1. Create a ticket with Category: "Third Party"
2. **Verify**: Call ID field does NOT appear
3. Submit ticket
4. **Verify**: Ticket created without Call ID field

### Test 4: In Store Category
1. Create a ticket with Category: "In Store"
2. **Verify**: Call ID field does NOT appear

## Benefits

✅ **Conditional Display**: Only shows for relevant categories
✅ **Optional Field**: Not required, won't block ticket creation
✅ **Reference Tracking**: Helps track service/demo calls
✅ **Clean UI**: Appears only when needed
✅ **Proper Position**: Logically placed after end date

## Summary

- ✅ Call ID field added to ticket form
- ✅ Only visible for "Demo" and "Service" categories
- ✅ Positioned after "Expected End Date"
- ✅ Optional field with placeholder text
- ✅ Saves to Firebase with ticket data
- ✅ Displays in Tickets management view

The Call ID field is now available for Demo and Service tickets! 🎉
