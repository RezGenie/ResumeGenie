"use client";

import { useState, useEffect } from "react";
import { User, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { userProfileService } from "@/lib/api/userProfile";

export function ProfileCard() {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<{ name?: string; avatar?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      const userProfile = userProfileService.getProfile();
      setProfile(userProfile);
      setLoading(false);
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  if (loading || authLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!user) return null;

  const displayName = user.name 
    ? user.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    : user.email.split('@')[0] || 'User';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg hover:border-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/30 dark:hover:border-purple-600 transition-all" 
      onClick={() => window.location.href = '/profile'}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">My Profile</p>
            <p className="text-2xl font-bold truncate">{displayName}</p>
          </div>
          <User className="h-8 w-8 text-purple-600 flex-shrink-0" />
        </div>
        <div className="text-xs text-muted-foreground mt-2 truncate">
          {user.email}
        </div>
      </CardContent>
    </Card>
  );
}
