# Service Center Tickets Fix

## Problem
When selecting a service center (e.g., "Apple services"), the assigned tickets page shows "0 tickets" even though tickets have been assigned to that service center.

## Root Cause
The ServiceCenter component was loading tickets from the old location:
```javascript
const ticketsRef = getCollectionRef('tickets');  // ❌ Wrong!
// This looks at: /mainData/Billuload/tickets (doesn't exist)
```

Tickets are now stored at:
```
/mainData/Billuload/users/{adminId}/tickets/{ticketId}
```

## Solution Applied

### Updated ServiceCenter.js ✅

**Changed**: Load tickets from all admins' subcollections instead of old tickets collection

**Before**:
```javascript
// Fetch tickets from old location
const ticketsRef = getCollectionRef('tickets');
const unsubscribeTickets = onSnapshot(ticketsRef, (snapshot) => {
  const ticketsArray = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  setTickets(ticketsArray);
});
```

**After**:
```javascript
// Fetch tickets from all admins (new structure)
const loadAllTickets = async () => {
  // Get all admins
  const adminsRef = getCollectionRef('admins');
  const adminsSnapshot = await getDocs(adminsRef);
  
  const allTickets = [];
  
  // Load tickets from each admin's subcollection
  for (const adminDoc of adminsSnapshot.docs) {
    const ticketsRef = collection(db, 'mainData', 'Billuload', 'users', adminDoc.id, 'tickets');
    const ticketsSnapshot = await getDocs(ticketsRef);
    
    ticketsSnapshot.docs.forEach(ticketDoc => {
      allTickets.push({
        id: ticketDoc.id,
        adminId: adminDoc.id,
        adminEmail: adminData.email,
        ...ticketDoc.data()
      });
    });
  }
  
  setTickets(allTickets);
};
```

## How It Works Now

### Service Center Dashboard Flow:

1. **Load Services**: Loads all service centers from `/mainData/Billuload/services`

2. **Load Tickets**: 
   - Gets all admins from `/mainData/Billuload/admins`
   - For each admin, loads tickets from `/mainData/Billuload/users/{adminId}/tickets`
   - Combines all tickets into one array

3. **Filter Tickets**: When viewing a specific service center:
   - Filters tickets where `ticket.subOption` matches the service center name
   - Only shows tickets with category "Service" or "Demo"

4. **Display**: Shows filtered tickets in the service center's dashboard

### Ticket Matching Logic:

```javascript
const serviceTickets = tickets.filter(ticket => {
  // Match by subOption (where service center name is stored)
  const matchesSubOption = ticket.subOption === selectedService.serviceCenterName || 
                            ticket.subOption === selectedService.companyName;
  
  // Only service center tickets (Demo or Service category)
  const isServiceTicket = ticket.category === "Service" || ticket.category === "Demo";
  
  return matchesSubOption && isServiceTicket;
});
```

## Testing Steps

### Test 1: View Service Center Tickets

1. **Login** as any admin
2. **Navigate** to Service Centers page
3. **Click** on a service center (e.g., "Apple services")
4. **Check console** for:
   ```
   🎯 ServiceCenter: Loading tickets from all admins...
   👥 ServiceCenter: Found X admins
   🎫 ServiceCenter: Found Y tickets for admin [email]
   ✅ ServiceCenter: Loaded Z total tickets
   ```
5. **Verify**: Tickets assigned to that service center should appear

### Test 2: Create Ticket for Service Center

1. **Create a new ticket** with:
   - Category: "Demo" or "Service"
   - Assigned To: Select a service center (e.g., "Apple services")
2. **Go to Service Centers** page
3. **Click** on the service center you assigned
4. **Verify**: New ticket should appear in the list

### Test 3: Multiple Service Centers

1. **Create tickets** for different service centers
2. **Visit each service center** dashboard
3. **Verify**: Each shows only its assigned tickets

## Expected Console Output

When viewing a service center dashboard:

```
🎯 ServiceCenter: Loading tickets from all admins...
👥 ServiceCenter: Found 3 admins

🎫 ServiceCenter: Found 8 tickets for admin mubinamulla15@gmail.com
🎫 ServiceCenter: Found 1 tickets for admin vaishu@gmail.com
🎫 ServiceCenter: Found 0 tickets for admin aziim.khan17@gmail.com

✅ ServiceCenter: Loaded 9 total tickets
```

Then when filtering for "Apple services":
- Shows only tickets where `subOption === "Apple services"`
- Shows count: "Assigned Tickets (2)" for example

## Features

✅ **Loads tickets from new structure** - Uses `/users/{adminId}/tickets` path
✅ **Shows all assigned tickets** - Regardless of which admin created them
✅ **Auto-refresh** - Refreshes tickets every 30 seconds
✅ **Proper filtering** - Matches by service center name and category
✅ **Detailed logging** - Console logs show exactly what's happening

## Ticket Display

Each ticket card shows:
- Ticket number
- Status badge
- Customer name
- Product name
- Issue type
- Priority
- Created date
- Assigned to (service center name)
- Category

## Troubleshooting

### Issue 1: Still Showing 0 Tickets

**Check**:
1. Console logs - Are tickets being loaded?
2. Ticket `subOption` field - Does it match service center name exactly?
3. Ticket `category` - Is it "Demo" or "Service"?

**Solution**:
```javascript
// In browser console, check ticket data:
console.log('Tickets:', tickets);
console.log('Service Center Name:', selectedService.serviceCenterName);
console.log('Filtered Tickets:', serviceTickets);
```

### Issue 2: Tickets Not Loading

**Check**: Console for errors like "Permission denied"

**Solution**: Ensure Firebase rules allow reading from `users/{adminId}/tickets`

### Issue 3: Wrong Tickets Showing

**Check**: Ticket `subOption` field value

**Solution**: Ensure when creating tickets, the service center name is saved exactly as it appears in the services collection

## Files Modified

1. ✅ `src/components/ServiceCenter.js` - Updated ticket loading logic

## Summary

- ✅ Service centers now load tickets from `/users/{adminId}/tickets`
- ✅ Tickets are filtered by service center name (`subOption` field)
- ✅ Auto-refresh every 30 seconds to catch new tickets
- ✅ Detailed console logging for debugging
- ✅ Works with the new Firebase structure (admins + users collections)

**Action Required**: Refresh the service center page to see the tickets!
