"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Predefined avatar options - using image paths
// Upload your avatar images to: /public/avatars/
// Supported formats: PNG, JPG, WebP (recommended size: 200x200px)
export const AVATAR_OPTIONS = [
  { id: "avatar1", label: "Avatar 1", image: "/avatars/avatar1.png" },
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
  if (!isEditing) {
    return null;
  }

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
      <Card className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20 p-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3"
        >
          {AVATAR_OPTIONS.map((avatar) => (
            <motion.button
              key={avatar.id}
              variants={itemVariants}
              onClick={() => onSelect(avatar.image)}
              className={`relative p-2 rounded-lg transition-all duration-200 group overflow-hidden ${
                selectedAvatar === avatar.image
                  ? "ring-2 ring-purple-600 scale-110"
                  : "hover:ring-2 hover:ring-purple-300 dark:hover:ring-purple-600"
              } border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600`}
              title={avatar.label}
            >
              <div className="relative w-full h-20 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                <img 
                  src={avatar.image} 
                  alt={avatar.label}
                  className="h-full w-full object-cover rounded"
                  onError={(e) => {
                    // Fallback if image doesn't load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              {selectedAvatar === avatar.image && (
                <div className="absolute top-0 right-0 bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow-lg">
                  ✓
                </div>
              )}
            </motion.button>
          ))}
        </motion.div>
      </Card>
      <p className="text-sm text-muted-foreground">
        Select an avatar to personalize your profile
      </p>
    </div>
  );
}
