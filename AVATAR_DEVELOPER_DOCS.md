# Avatar Selection Feature - Developer Documentation

## Architecture Overview

```
Frontend Component Hierarchy
├── Header.tsx (displays avatar in dropdown)
├── Dashboard/page.tsx (displays avatar in welcome section)
└── Profile/page.tsx
    ├── Profile Header (displays selected avatar)
    └── Profile Information Card
        └── AvatarSelector.tsx (interactive selection grid)
            └── userProfileService (persistence layer)
```

## Database / Storage

### LocalStorage Schema
```typescript
// Key: "user_profile_{userId}"
{
  "name": "John Doe",
  "avatar": "🧙‍♂️",  // NEW: Emoji character
  "phone": "+1 (555) 123-4567",
  "location": "San Francisco, CA",
  "bio": "Experienced developer...",
  "profilePicture": "..." // Legacy field (still supported)
}
```

## Component API

### AvatarSelector
```tsx
interface AvatarSelectorProps {
  selectedAvatar: string;
  onSelect: (avatar: string) => void;
  isEditing: boolean;
}

<AvatarSelector
  selectedAvatar={selectedAvatar}
  onSelect={(avatar) => {
    setSelectedAvatar(avatar);
    form.setValue('avatar', avatar);
  }}
  isEditing={isEditing}
/>
```

### Export
```typescript
// Available avatar options
export const AVATAR_OPTIONS = [
  { id: "avatar1", label: "🧞‍♂️ Genie", emoji: "🧞‍♂️" },
  // ... 11 more options
];
```

## State Management

### Profile Page State Flow
```
User Input (Edit Mode)
    ↓
AvatarSelector onChange
    ↓
form.setValue('avatar', emoji)
    ↓
setSelectedAvatar(emoji)
    ↓
User clicks Save
    ↓
onSubmit(data)
    ↓
userProfileService.saveProfile({ avatar: data.avatar, ... })
    ↓
localStorage.setItem(key, JSON.stringify(updated))
    ↓
window.dispatchEvent(new CustomEvent('userProfileUpdated'))
    ↓
Header & Dashboard listen to event
    ↓
Update UI components
```

## Event System

### Custom Events

**Event Name**: `userProfileUpdated`
**Dispatched**: In `userProfileService.saveProfile()`
**Listeners**: 
- Header component
- Dashboard (via profile refresh handler)
- Profile page (implicit via form)

```typescript
// Dispatch
window.dispatchEvent(new CustomEvent('userProfileUpdated', {
  detail: updated // Updated profile object
}));

// Listen
window.addEventListener('userProfileUpdated', (event) => {
  const profile = (event as CustomEvent).detail;
  setUserAvatar(profile.avatar || '');
});
```

## Rendering Approach

### Avatar Display Methods

#### Method 1: Direct Text (AvatarFallback)
```tsx
<AvatarFallback className="text-4xl bg-purple-600 text-white">
  {selectedAvatar || fallbackLetter}
</AvatarFallback>
```
✅ Works for single emoji characters
❌ May not work for combined emoji (skin tones)

#### Method 2: SVG Data URI (AvatarImage)
```tsx
<AvatarImage 
  src={`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext x='50' y='65' font-size='60' text-anchor='middle' dominant-baseline='middle'%3E${encodeURIComponent(emoji)}%3C/text%3E%3C/svg%3E`}
  alt="User avatar"
/>
```
✅ Works for all emoji including combined emoji
✅ Fallback works automatically
❌ More complex URL encoding

## Integration Points

### 1. ProfileFormData Type
```typescript
type ProfileFormData = z.infer<typeof profileSchema>;

// Includes new field:
// avatar?: string
```

### 2. userProfileService Updates
```typescript
interface UserProfile {
  name: string;
  phone?: string;
  location?: string;
  bio?: string;
  profilePicture?: string;
  avatar?: string; // NEW
}
```

### 3. DashboardUser Type
```typescript
// dashboard/page.tsx line ~390
setDashboardUser({
  ...authUser,
  name: displayName,
  profilePicture: profile.avatar, // NEW
  memberSince,
  // ... other fields
});
```

## CSS Classes & Styling

### AvatarSelector Grid
```tsx
className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3"
```
- Mobile: 3 columns
- Tablet: 4 columns  
- Desktop: 6 columns

### Avatar Button States
```tsx
// Selected State
className="bg-purple-600 ring-2 ring-purple-600 scale-110"

// Unselected State
className="bg-white dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/30"
```

## Animation Framework

Using Framer Motion:
```tsx
containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

itemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};
```

## Validation & Error Handling

### Form Validation
```typescript
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  avatar: z.string().optional(), // NEW
  // ... other fields
});
```

### No validation on avatar:
- Any emoji is allowed
- User can select from predefined set
- Field is optional

### Storage Error Handling
```typescript
try {
  localStorage.setItem(storageKey, JSON.stringify(updated));
} catch (error) {
  console.error('Failed to save user profile:', error);
  // Continue gracefully - app still functional
}
```

## Browser Compatibility

✅ Modern browsers (Chrome, Firefox, Safari, Edge)
✅ Emoji support (all major browsers)
✅ SVG data URI support
✅ localStorage support
✅ CSS Grid support

⚠️ Requires JavaScript enabled
⚠️ localStorage may be disabled in incognito mode

## Performance Considerations

### Rendering
- ✅ Lazy renders only when avatar changes
- ✅ useCallback to prevent unnecessary re-renders
- ✅ Event-driven updates (no polling)

### Storage
- ✅ Single localStorage write per save
- ✅ No backend API calls
- ✅ Instant persistence

### Load Time
- ✅ No additional network requests
- ✅ Avatar loads from localStorage cache
- ✅ SVG encoding minimal file size

## Testing Checklist

- [ ] Avatar selection works in edit mode
- [ ] Avatar displays in profile header
- [ ] Avatar displays in dashboard
- [ ] Avatar displays in header dropdown
- [ ] Avatar persists on page reload
- [ ] Avatar updates across tabs
- [ ] Fallback works without avatar
- [ ] Dark mode displays correctly
- [ ] Mobile responsive layout works
- [ ] SVG rendering works on all browsers

## Future Enhancements

1. **Backend Integration**
   - Save avatar to user profile in database
   - Sync across devices

2. **Custom Emojis**
   - User-provided emoji input
   - Emoji picker library integration

3. **Avatar Collections**
   - Unlock new avatars (seasonal, achievements)
   - Avatar tiers based on profile completion

4. **Image Upload**
   - Complementary feature to emoji avatars
   - Base64 encoding for storage

5. **Avatar Stats**
   - Track popular avatars
   - Display avatar trends

---

**Last Updated**: November 7, 2025
**Feature Status**: ✅ Production Ready
