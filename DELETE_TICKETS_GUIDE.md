# Delete Tickets by Email - Guide

## Overview
A new feature has been added to the SuperAdmin Dashboard that allows you to delete tickets created by specific email addresses.

## How to Use

### 1. Access the Feature
- Log in as SuperAdmin
- In the SuperAdmin Dashboard, click the **"Delete Tickets"** button in the top header (red button)

### 2. Preview Tickets
- The modal will open with pre-filled emails: `mubina@gmail.com`, `azim@gmail.com`, `pranav@gmail.com`
- You can edit the email list (comma-separated)
- Click **"Preview Tickets"** to see which tickets will be deleted
- The preview shows:
  - Ticket number
  - Customer name
  - Category and status
  - Created by email

### 3. Delete Tickets
- After previewing, click **"Delete X Tickets"** button
- Confirm the deletion (this action cannot be undone!)
- The system will:
  - Search all tickets across all users
  - Find tickets created by the specified emails
  - Delete them from Firestore
  - Show a success message with the count

## Technical Details

### Files Created
1. **src/utils/deleteTicketsByEmail.js** - Core deletion logic
   - `deleteTicketsByEmails()` - Deletes tickets by email
   - `previewTicketsDeletion()` - Preview tickets before deletion

2. **src/components/DeleteTicketsByEmail.jsx** - UI component
   - Modal interface for deletion
   - Preview functionality
   - Result display

3. **src/components/DeleteTicketsByEmail.css** - Styling

### How It Works
- Uses Firestore `collectionGroup` query to search all tickets
- Matches tickets by `createdBy` or `adminEmail` fields
- Deletes tickets from their respective user subcollections
- Provides detailed feedback on success/errors

### Safety Features
- Preview before deletion
- Confirmation dialog
- Error handling for failed deletions
- Detailed result reporting

## Example Usage

### Delete tickets from specific emails:
```
mubina@gmail.com, azim@gmail.com, pranav@gmail.com
```

### The system will:
1. Search all tickets in the database
2. Find tickets where `createdBy` or `adminEmail` matches any of these emails
3. Show you a preview of what will be deleted
4. Delete them after confirmation

## Notes
- This action is **permanent** and cannot be undone
- Make sure to preview before deleting
- The deletion happens across all user collections
- Only SuperAdmins have access to this feature
