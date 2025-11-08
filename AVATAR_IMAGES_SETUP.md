# Avatar Images Setup Guide

## 📁 Where to Upload Images

Upload your avatar images to:
```
/frontend/public/avatars/
```

## 📋 Required Images

Create the `/avatars` folder in the public directory and add these 12 image files:

```
frontend/
└── public/
    └── avatars/
        ├── avatar1.png
        ├── avatar2.png
        ├── avatar3.png
        ├── avatar4.png
        ├── avatar5.png
        ├── avatar6.png
        ├── avatar7.png
        ├── avatar8.png
        ├── avatar9.png
        ├── avatar10.png
        ├── avatar11.png
        └── avatar12.png
```

## 🎨 Image Specifications

- **Format**: PNG, JPG, or WebP
- **Recommended Size**: 200x200 pixels (square)
- **File Size**: Keep under 100KB each for optimal loading
- **Background**: Recommended transparent PNG for better styling flexibility

## ✅ Steps to Setup

1. **Create the avatars folder:**
   ```bash
   mkdir frontend/public/avatars
   ```

2. **Add your 12 avatar images:**
   - Name them: `avatar1.png`, `avatar2.png`, etc.
   - Place them in `frontend/public/avatars/`

3. **Test in browser:**
   - Navigate to profile page
   - Click "Edit"
   - Avatar selector should display all 12 images in a grid
   - Click to select, then save

## 🔧 Customization

If you want to add/change the number of avatars or rename files:

Edit `/frontend/src/components/profile/AvatarSelector.tsx`:

```typescript
export const AVATAR_OPTIONS = [
  { id: "avatar1", label: "Avatar 1", image: "/avatars/avatar1.png" },
  { id: "avatar2", label: "Avatar 2", image: "/avatars/avatar2.png" },
  // Add or modify as needed
  { id: "avatar12", label: "Avatar 12", image: "/avatars/avatar12.png" },
];
```

## 📸 Example Avatar Specifications

Good avatar images should be:
- ✅ Character/person illustrations or stylized avatars
- ✅ Distinctive and recognizable
- ✅ Square format (200x200px)
- ✅ High quality and well-rendered
- ✅ Consistent visual style (optional but recommended)

## 🚀 How It Works

1. User uploads avatar images to `frontend/public/avatars/`
2. Images are referenced in `AVATAR_OPTIONS` array
3. Avatar selector displays them in a grid
4. When user selects an avatar, the image path is stored (e.g., `/avatars/avatar1.png`)
5. Avatar displays in:
   - Profile page header
   - Dashboard welcome section
   - Header dropdown menu

## 💾 Storage

The avatar path is stored in localStorage:
```json
{
  "avatar": "/avatars/avatar3.png",
  "name": "John Doe",
  ...
}
```

## 🎯 Next Steps

1. Prepare your 12 avatar images
2. Create the `frontend/public/avatars/` directory
3. Upload images with names: `avatar1.png` through `avatar12.png`
4. Run the app and test selection
5. Avatar should appear in profile, dashboard, and header

---

**Note**: Images must be in the `public` folder to be served correctly. The paths are relative to the public directory.
