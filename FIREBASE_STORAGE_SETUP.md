# Firebase Storage Setup for Bill Images

## Files Created

1. **storage.rules** - Security rules for Firebase Storage
2. **firestore.rules** - Security rules for Firestore
3. **firebase.json** - Firebase configuration file

## Storage Rules Configuration

The `storage.rules` file allows:
- ✅ **Read access**: Authenticated users can read images
- ✅ **Write access**: Authenticated users can upload jpg/jpeg/png images
- ✅ **File size limit**: Maximum 10MB per image
- ✅ **File type validation**: Only jpeg, jpg, and png images allowed
- ✅ **Storage location**: All images stored in `/images` folder

## Deployment Steps

### Option 1: Deploy via Firebase Console (Recommended for Quick Setup)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **my-crd-53479**
3. Navigate to **Storage** → **Rules**
4. Copy the contents from `storage.rules` file
5. Paste into the rules editor
6. Click **Publish**

### Option 2: Deploy via Firebase CLI

#### Install Firebase CLI (if not already installed):
```bash
npm install -g firebase-tools
```

#### Login to Firebase:
```bash
firebase login
```

#### Initialize Firebase (if not already done):
```bash
firebase init
```
- Select: Storage, Firestore
- Use existing files when prompted

#### Deploy Storage Rules:
```bash
firebase deploy --only storage
```

#### Or deploy everything:
```bash
firebase deploy
```

## Storage Structure

After deployment, your images will be stored as:
```
Firebase Storage
└── images/
    ├── temp_1234567890_salesimage.jpeg
    ├── customerId_1234567891_invoice.png
    └── ...
```

## Testing Upload

1. Start your app: `npm start`
2. Go to Add Customer page
3. Upload a jpg/png bill image
4. Check Firebase Console → Storage → images folder
5. Verify the image URL is saved in Firestore customer document

## Security Features

✅ Only authenticated users can upload/read images
✅ Maximum file size: 10MB
✅ Only jpeg/jpg/png formats accepted
✅ Images organized in `/images` folder
✅ Unique filenames prevent overwrites

## Troubleshooting

**Issue**: "Permission denied" when uploading
- **Solution**: Ensure user is authenticated (logged in)
- **Solution**: Deploy storage rules using steps above

**Issue**: "File too large"
- **Solution**: Image must be under 10MB

**Issue**: "Invalid file type"
- **Solution**: Only jpg, jpeg, png files are accepted

## Current Implementation

The app automatically:
1. Uploads jpg/png images to Storage when bill is uploaded
2. Stores the download URL in Firestore with customer data
3. Extracts customer data via OCR after upload completes

## Next Steps

Deploy the storage rules using **Option 1** (Firebase Console) for immediate access, or **Option 2** (CLI) for automated deployments.
