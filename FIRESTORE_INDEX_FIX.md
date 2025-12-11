# Firestore Index Error Fix

## Error
```
FIRESTORE (12.6.0) INTERNAL ASSERTION FAILED: Unexpected state
```

## Root Cause
This error occurs because Firestore needs a composite index for the `collectionGroup` query on the `tickets` collection with `createdAt` field ordering.

## Solution

### Option 1: Create Index via Firebase Console (Recommended)

1. **Click the link from the console error** (if available):
   - The error message should contain a link like:
   ```
   https://console.firebase.google.com/v1/r/project/my-crd-53479/firestore/indexes?create_composite=...
   ```

2. **Or manually create the index**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `my-crd-53479`
   - Navigate to **Firestore Database** → **Indexes** tab
   - Click **Create Index**
   - Configure:
     - **Collection ID**: Select "Collection group"
     - **Collection group ID**: `tickets`
     - **Fields to index**:
       - Field: `createdAt`, Order: `Descending`
     - **Query scope**: Collection group
   - Click **Create**

3. **Wait for index to build** (usually takes 1-5 minutes)

### Option 2: Disable Real-Time Updates (Temporary Fix)

If you need immediate access while the index builds, you can temporarily disable real-time updates:

1. The code has been updated with error handling
2. If the subscription fails, it will fall back to loading tickets without real-time updates
3. Refresh the page after the index is created

### Option 3: Clear Firestore Cache

Sometimes clearing the browser cache helps:

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Under **Storage**, click **Clear site data**
4. Refresh the page

## Verification

After creating the index:
1. Refresh your application
2. The error should disappear
3. Tickets should load normally with real-time updates

## Index Configuration Details

```
Collection Group: tickets
Fields:
  - createdAt (Descending)
Query Scope: Collection group
```

This index allows Firestore to efficiently query all `tickets` subcollections across all users and order them by creation date.
