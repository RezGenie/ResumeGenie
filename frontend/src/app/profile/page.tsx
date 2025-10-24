"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  User,
  Mail,
  Calendar,
  Shield,
  Settings,
  Edit3,
  Save,
  X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { userPreferencesService } from "@/lib/api/userPreferences";
import { userProfileService } from "@/lib/api/userProfile";

// Form validation schema
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  jobTitle: z.string().optional(),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'lead']),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  workType: z.enum(['remote', 'hybrid', 'onsite', 'flexible']),
  industries: z.string().optional(),
  skills: z.string().optional(),
  remotePreference: z.boolean(),
  willingToRelocate: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      phone: '',
      location: '',
      bio: '',
      jobTitle: '',
      experienceLevel: 'mid',
      salaryMin: '',
      salaryMax: '',
      workType: 'hybrid',
      industries: '',
      skills: '',
      remotePreference: true,
      willingToRelocate: false,
    },
  });

  useEffect(() => {
    if (user) {
      const preferences = userPreferencesService.getPreferences();
      const profile = userProfileService.getProfile();
      
      // Use saved profile name, or fallback to email-derived name
      const userName = profile.name || user.email.split('@')[0] || '';
      setDisplayName(userName);

      form.reset({
        name: userName,
        phone: profile.phone || '',
        location: profile.location || preferences.location || '',
        bio: profile.bio || '',
        jobTitle: preferences.jobTitle || '',
        experienceLevel: preferences.experienceLevel || 'mid',
        salaryMin: preferences.salaryMin || '',
        salaryMax: preferences.salaryMax || '',
        workType: preferences.workType || 'hybrid',
        industries: preferences.industries || '',
        skills: preferences.skills || '',
        remotePreference: preferences.remotePreference ?? true,
        willingToRelocate: preferences.willingToRelocate ?? false,
      });
    }
  }, [user, form]);

  const onSubmit = (data: ProfileFormData) => {
    // Save personal information
    userProfileService.saveProfile({
      name: data.name,
      phone: data.phone || '',
      location: data.location || '',
      bio: data.bio || '',
    });

    // Save job preferences
    userPreferencesService.savePreferences({
      jobTitle: data.jobTitle || '',
      experienceLevel: data.experienceLevel,
      salaryMin: data.salaryMin || '',
      salaryMax: data.salaryMax || '',
      workType: data.workType,
      industries: data.industries || '',
      skills: data.skills || '',
      remotePreference: data.remotePreference,
      willingToRelocate: data.willingToRelocate,
      location: data.location || '',
    });

    setDisplayName(data.name);
    setIsEditing(false);

    toast.success('Profile saved successfully!', {
      description: 'Your profile and job preferences have been updated.',
      duration: 4000,
    });
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  if (!user) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Profile Header */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-24 w-24">
                      <AvatarFallback className="text-2xl bg-purple-600 text-white">
                        {displayName.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h1 className="text-2xl font-bold text-purple-600">{displayName || 'User'}</h1>
                      <p className="text-muted-foreground">{user.email}</p>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <Badge variant={user.is_active ? "default" : "destructive"} className="bg-purple-600 hover:bg-purple-700">
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>

            {/* Profile Information */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Manage your personal information and preferences
                    </CardDescription>
                  </div>
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="outline" className="bg-white dark:bg-transparent text-black dark:text-white border-gray-300 dark:border-gray-600 hover:border-purple-600 dark:hover:border-purple-600 hover:bg-white dark:hover:bg-transparent">
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={form.handleSubmit(onSubmit)} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm" className="bg-white dark:bg-transparent text-black dark:text-white border-gray-300 dark:border-gray-600 hover:border-purple-600 dark:hover:border-purple-600 hover:bg-white dark:hover:bg-transparent">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      {isEditing ? (
                        <>
                          <Input
                            id="name"
                            {...form.register("name")}
                            placeholder="Enter your full name"
                            className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50"
                          />
                          {form.formState.errors.name && (
                            <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                          )}
                        </>
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md">{displayName || 'Not set'}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="py-2 px-3 bg-muted rounded-md flex-1">{user.email}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      {isEditing ? (
                        <Input
                          id="phone"
                          {...form.register("phone")}
                          placeholder="Enter your phone number"
                          className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50"
                        />
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md">{form.watch("phone") || 'Not set'}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      {isEditing ? (
                        <Input
                          id="location"
                          {...form.register("location")}
                          placeholder="Enter your location"
                          className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50"
                        />
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md">{form.watch("location") || 'Not set'}</p>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      {isEditing ? (
                        <>
                          <textarea
                            id="bio"
                            {...form.register("bio")}
                            placeholder="Tell us about yourself..."
                            className="w-full min-h-[100px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-input text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                          />
                          {form.formState.errors.bio && (
                            <p className="text-sm text-red-500">{form.formState.errors.bio.message}</p>
                          )}
                        </>
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md min-h-[100px]">
                          {form.watch("bio") || 'No bio added yet'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Job Preferences */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Job Preferences
                      </CardTitle>
                      <CardDescription>Tell us what kind of opportunities you&apos;re looking for</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Preferred Job Title</Label>
                      {isEditing ? (
                        <Input
                          id="jobTitle"
                          {...form.register("jobTitle")}
                          placeholder="e.g., Frontend Developer, Data Scientist"
                          className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50"
                        />
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md">{form.watch("jobTitle") || 'Not specified'}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experienceLevel">Experience Level</Label>
                      <Select
                        value={form.watch("experienceLevel")}
                        onValueChange={(value) => form.setValue("experienceLevel", value as any)}
                      >
                        <SelectTrigger className="bg-white dark:bg-input" disabled={!isEditing}>
                          <SelectValue placeholder="Select experience level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                          <SelectItem value="mid">Mid Level (2-5 years)</SelectItem>
                          <SelectItem value="senior">Senior Level (5-10 years)</SelectItem>
                          <SelectItem value="lead">Lead/Principal (10+ years)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="salaryMin">Minimum Salary (USD)</Label>
                      {isEditing ? (
                        <Input
                          id="salaryMin"
                          type="number"
                          {...form.register("salaryMin")}
                          placeholder="e.g., 60000"
                          className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50"
                        />
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md">
                          {form.watch("salaryMin") ? `$${parseInt(form.watch("salaryMin") || '0').toLocaleString()}` : 'Not specified'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="salaryMax">Maximum Salary (USD)</Label>
                      {isEditing ? (
                        <Input
                          id="salaryMax"
                          type="number"
                          {...form.register("salaryMax")}
                          placeholder="e.g., 120000"
                          className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50"
                        />
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md">
                          {form.watch("salaryMax") ? `$${parseInt(form.watch("salaryMax") || '0').toLocaleString()}` : 'Not specified'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="workType">Work Type Preference</Label>
                      <Select
                        value={form.watch("workType")}
                        onValueChange={(value) => form.setValue("workType", value as any)}
                      >
                        <SelectTrigger className="bg-white dark:bg-input" disabled={!isEditing}>
                          <SelectValue placeholder="Select work type preference" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="remote">Remote Only</SelectItem>
                          <SelectItem value="hybrid">Hybrid (Remote + Office)</SelectItem>
                          <SelectItem value="onsite">On-site Only</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industries">Preferred Industries</Label>
                      {isEditing ? (
                        <Input
                          id="industries"
                          {...form.register("industries")}
                          placeholder="e.g., Technology, Healthcare, Finance"
                          className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50"
                        />
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md">{form.watch("industries") || 'Not specified'}</p>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="skills">Key Skills</Label>
                      {isEditing ? (
                        <textarea
                          id="skills"
                          {...form.register("skills")}
                          placeholder="List your key skills (e.g., React, Python, Machine Learning, Project Management)"
                          className="w-full min-h-[80px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-input text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                        />
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md min-h-[80px]">
                          {form.watch("skills") || 'No skills listed yet'}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-4">
                      <Label>Additional Preferences</Label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="remotePreference"
                            {...form.register("remotePreference")}
                            disabled={!isEditing}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="remotePreference" className="text-sm font-normal">
                            Open to remote work opportunities
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="willingToRelocate"
                            {...form.register("willingToRelocate")}
                            disabled={!isEditing}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="willingToRelocate" className="text-sm font-normal">
                            Willing to relocate for the right opportunity
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Account Information */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Read-only account details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>User ID</Label>
                      <p className="py-2 px-3 bg-muted rounded-md font-mono text-sm">{user.id}</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Member Since</Label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="py-2">{new Date(user.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Account Status</Label>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <Badge variant={user.is_active ? "default" : "destructive"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Verification Status</Label>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <Badge variant={user.is_verified ? "default" : "secondary"}>
                          {user.is_verified ? "Verified" : "Pending Verification"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Account Actions */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Account Actions</CardTitle>
                  <CardDescription>Manage your account settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button variant="outline" className="flex-1 bg-white dark:bg-transparent text-black dark:text-white border-gray-300 dark:border-gray-600 hover:border-purple-600 dark:hover:border-purple-600 hover:bg-white dark:hover:bg-transparent">
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </Button>
                    <Button variant="outline" className="flex-1 bg-white dark:bg-transparent text-black dark:text-white border-gray-300 dark:border-gray-600 hover:border-purple-600 dark:hover:border-purple-600 hover:bg-white dark:hover:bg-transparent">
                      <Shield className="h-4 w-4 mr-2" />
                      Security Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
