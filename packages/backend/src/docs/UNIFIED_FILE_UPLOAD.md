# Unified File Upload System

## Overview

Instead of having multiple specific file upload endpoints, we now have **ONE** powerful unified file upload system that handles all file types and automatically updates the appropriate records.

## Single Endpoint

**`POST /api/media/upload`**

## How It Works

### 1. Upload Request
```javascript
// Frontend sends file with metadata
const formData = new FormData();
formData.append('file', file);
formData.append('category', 'profile'); // or 'product', 'banner', 'certificate', 'document'
formData.append('resourceId', 'productId123'); // Optional: for product images, certificates
formData.append('description', 'Brand logo'); // Optional: for specific identification

fetch('/api/media/upload', {
  method: 'POST',
  body: formData
});
```

### 2. Automatic Updates
Based on the `category` and `resourceId`, the system automatically:

- **`category: 'profile'`** → Updates both brand and manufacturer profile pictures
- **`category: 'product'` + `resourceId`** → Adds image to specific product
- **`category: 'banner'` + `description: 'Brand logo'`** → Updates brand logo
- **`category: 'banner'` + `description: 'Brand banner image'`** → Adds to brand banners
- **`category: 'certificate'` + `resourceId`** → Updates certificate document

### 3. Response
```javascript
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "media": {
      "id": "mediaId123",
      "url": "https://s3.amazonaws.com/bucket/file.jpg",
      "category": "profile",
      "s3Key": "businessId/mediaId123.jpg",
      "storage": {
        "type": "s3",
        "s3Bucket": "my-bucket",
        "s3Region": "us-east-1"
      }
    },
    "autoUpdates": {
      "updated": [
        "Brand profile picture updated",
        "Manufacturer profile picture updated"
      ],
      "errors": []
    }
  }
}
```

## Frontend Implementation

### Profile Picture Upload
```javascript
// Drag & drop profile picture
const uploadProfilePicture = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', 'profile');
  
  const response = await fetch('/api/media/upload', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  // Profile picture automatically updated!
  console.log('Profile updated:', result.data.autoUpdates.updated);
};
```

### Product Image Upload
```javascript
// Drag & drop product image
const uploadProductImage = async (file, productId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', 'product');
  formData.append('resourceId', productId);
  
  const response = await fetch('/api/media/upload', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  // Product automatically updated with new image!
  console.log('Product updated:', result.data.autoUpdates.updated);
};
```

### Brand Logo Upload
```javascript
// Drag & drop brand logo
const uploadBrandLogo = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', 'banner');
  formData.append('description', 'Brand logo');
  
  const response = await fetch('/api/media/upload', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  // Brand logo automatically updated!
  console.log('Brand logo updated:', result.data.autoUpdates.updated);
};
```

## Benefits

### ✅ **Simplified Architecture**
- **1 endpoint** instead of 7+ specific endpoints
- **1 service** handles all file types
- **1 validation schema** for all uploads

### ✅ **Automatic Updates**
- No manual URL copying needed
- Records update automatically based on category
- S3 handles all storage details

### ✅ **Consistent Experience**
- Same drag & drop interface everywhere
- Same response format for all uploads
- Same error handling

### ✅ **Easy Maintenance**
- Add new file types by updating the `handleAutomaticUpdates` function
- No need to create new endpoints for new file types
- Centralized file handling logic

## Migration from Specific Endpoints

### Old Way (Multiple Endpoints)
```javascript
// Profile picture
POST /api/brand/account/profile-picture
POST /api/manufacturer/account/profile-picture

// Product images  
POST /api/products/:id/images

// Brand assets
POST /api/brand-settings/logo
POST /api/brand-settings/banner

// Documents
POST /api/manufacturer/account/verification/submit
```

### New Way (Single Endpoint)
```javascript
// Everything goes through one endpoint
POST /api/media/upload

// With different categories:
category: 'profile'           // Profile pictures
category: 'product'           // Product images  
category: 'banner'            // Brand logos/banners
category: 'certificate'       // Certificate documents
category: 'document'          // General documents
```

## File Type Support

- **Images:** JPEG, PNG, WebP, SVG
- **Documents:** PDF, DOC, DOCX, TXT
- **Videos:** MP4, MOV, AVI
- **Audio:** MP3, WAV, AAC
- **Archives:** ZIP, RAR, 7Z

## File Size Limits

- **Profile Pictures:** 5MB
- **Product Images:** 10MB  
- **Brand Logos:** 10MB
- **Brand Banners:** 15MB
- **Documents:** 50MB
- **Videos:** 100MB

## Security

- All files uploaded to S3 with secure filenames
- File type validation on upload
- Virus scanning (if configured)
- Rate limiting to prevent abuse
- Authentication required for all uploads
