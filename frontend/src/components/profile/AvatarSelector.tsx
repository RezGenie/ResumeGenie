"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

// Predefined avatar options - using image paths
// Upload your avatar images to: /public/avatars/
// Supported formats: PNG, JPG, WebP (recommended size: 200x200px)
export const AVATAR_OPTIONS = [
  {id: "avatar1", label: "Avatar 1", image: "/avatars/avatar1.png" },
  { id: "avatar2", label: "Avatar 2", image: "/avatars/avatar2.png" },
  { id: "avatar3", label: "Avatar 3", image: "/avatars/avatar3.png" },
  { id: "avatar4", label: "Avatar 4", image: "/avatars/avatar4.png" },
  { id: "avatar5", label: "Avatar 5", image: "/avatars/avatar5.png" },
  { id: "avatar6", label: "Avatar 6", image: "/avatars/avatar6.png" },
  { id: "avatar7", label: "Avatar 7", image: "/avatars/avatar7.png" },
  { id: "avatar8", label: "Avatar 8", image: "/avatars/avatar8.png" },
  { id: "avatar9", label: "Avatar 9", image: "/avatars/avatar9.png" },
  { id: "avatar10", label: "Avatar 10", image: "/avatars/avatar10.png" },
  { id: "avatar11", label: "Avatar 11", image: "/avatars/avatar11.png" },
  { id: "avatar12", label: "Avatar 12", image: "/avatars/avatar12.png" },
  { id: "avatar13", label: "Avatar 13", image: "/avatars/avatar13.png" },
  { id: "avatar14", label: "Avatar 14", image: "/avatars/avatar14.png" },
  { id: "avatar15", label: "Avatar 15", image: "/avatars/avatar15.png" },
  { id: "avatar16", label: "Avatar 16", image: "/avatars/avatar16.png" },
  { id: "avatar17", label: "Avatar 17", image: "/avatars/avatar17.png" },
  { id: "avatar18", label: "Avatar 18", image: "/avatars/avatar18.png" },
  { id: "avatar19", label: "Avatar 19", image: "/avatars/avatar19.png" },
  { id: "avatar20", label: "Avatar 20", image: "/avatars/avatar20.png" },
  { id: "avatar21", label: "Avatar 21", image: "/avatars/avatar21.png" },
  { id: "avatar22", label: "Avatar 22", image: "/avatars/avatar22.png" },
  { id: "avatar23", label: "Avatar 23", image: "/avatars/avatar23.png" },
  { id: "avatar24", label: "Avatar 24", image: "/avatars/avatar24.png" },

];

interface AvatarSelectorProps {
  selectedAvatar: string;
  onSelect: (avatar: string) => void;
  isEditing: boolean;
}

export function AvatarSelector({
  selectedAvatar,
  onSelect,
  isEditing,
}: AvatarSelectorProps) {
  const [customImage, setCustomImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isEditing) {
    return null;
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // TODO: MIGRATION NEEDED - Replace with backend upload
    // Current: Storing base64 in localStorage (MVP only)
    // Issues: Large storage size, no cross-device sync, performance impact
    // Future: Upload to cloud storage (S3/Cloudinary), store URL in database
    // See: docs/PROFILE_PICTURE_MIGRATION.md for migration plan
    
    // Read and convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCustomImage(result);
      onSelect(result);
      toast.success("Custom image uploaded!");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomImage = () => {
    setCustomImage(null);
    onSelect(AVATAR_OPTIONS[0].image);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success("Custom image removed");
  };

  const isCustomImage = selectedAvatar && !AVATAR_OPTIONS.some(a => a.image === selectedAvatar);

  const containerVariants = {
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

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
    },
  };

  return (
    <div className="space-y-4">
      <Label>Choose Your Avatar</Label>
      
      {/* Custom Image Upload Section */}
      <Card className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20 p-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-shrink-0">
            {isCustomImage ? (
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-purple-600 shadow-lg">
                  <img 
                    src={selectedAvatar} 
                    alt="Custom avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={handleRemoveCustomImage}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors"
                  title="Remove custom image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-purple-300 dark:border-purple-700 flex items-center justify-center bg-purple-50 dark:bg-purple-900/20">
                <Upload className="h-8 w-8 text-purple-400" />
              </div>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-semibold text-sm mb-1">Upload Custom Image</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {isCustomImage 
                ? "Your custom profile picture is active" 
                : "Upload your own profile picture (max 5MB)"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="avatar-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 dark:hover:bg-purple-950/20 dark:hover:text-purple-400 dark:hover:border-purple-800"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isCustomImage ? "Change Image" : "Upload Image"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Predefined Avatars */}
      <Card className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20 p-6">
        <h3 className="font-semibold text-sm mb-4">Or Choose an Avatar</h3>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 items-center justify-items-center"
        >
          {AVATAR_OPTIONS.map((avatar) => (
            <motion.button
              key={avatar.id}
              variants={itemVariants}
              onClick={() => {
                setCustomImage(null);
                onSelect(avatar.image);
              }}
              className={`relative w-20 h-20 rounded-full transition-all duration-200 group border-[3px] flex-shrink-0 ${
                selectedAvatar === avatar.image && !isCustomImage
                  ? "border-purple-600"
                  : "border-primary/20 hover:border-primary/40"
              }`}
              title={avatar.label}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                <img 
                  src={avatar.image} 
                  alt={avatar.label}
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    // Fallback if image doesn't load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              {selectedAvatar === avatar.image && !isCustomImage && (
                <div className="absolute -top-1 -right-1 bg-purple-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white dark:border-gray-900">
                  ✓
                </div>
              )}
            </motion.button>
          ))}
        </motion.div>
      </Card>
      <p className="text-sm text-muted-foreground">
        {isCustomImage 
          ? "Using your custom profile picture" 
          : "Select an avatar to personalize your profile"}
      </p>
    </div>
  );
}
