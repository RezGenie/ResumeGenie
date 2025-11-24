"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/AuthContext"
import { userProfileService } from "@/lib/api/userProfile"
import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"

export function MobileHeader() {
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userAvatar, setUserAvatar] = useState('');

  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const profile = userProfileService.getProfile();
    setUserAvatar(profile.avatar || '');

    const handleProfileUpdate = () => {
      const profile = userProfileService.getProfile();
      setUserAvatar(profile.avatar || '');
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
  }, []);

  // Don't render on mobile at all - header is hidden on small screens
  if (!isMounted) return null;

  // Return null instead of rendering to completely hide on mobile
  return null;
}

