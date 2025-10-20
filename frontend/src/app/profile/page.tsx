"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Settings,
  Camera,
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    location: '',
    phone: '',
    // Job Preferences
    jobTitle: '',
    experienceLevel: 'mid',
    salaryMin: '',
    salaryMax: '',
    workType: 'hybrid',
    industries: '',
    skills: '',
    remotePreference: true,
    willingToRelocate: false,
  });

  useEffect(() => {
    if (user) {
      // Load existing preferences
      const preferences = userPreferencesService.getPreferences();
      
      const userName = user.email.split('@')[0] || '';
      setDisplayName(userName);
      
      setFormData({
        name: userName, // Extract name from email as fallback
        email: user.email,
        bio: '',
        location: preferences.location || '',
        phone: '',
        // Job Preferences - Load from saved preferences
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
  }, [user]);

  const handleSave = () => {
    // Save job preferences to localStorage for immediate filtering
    userPreferencesService.savePreferences({
      jobTitle: formData.jobTitle,
      experienceLevel: formData.experienceLevel as 'entry' | 'mid' | 'senior' | 'lead',
      salaryMin: formData.salaryMin,
      salaryMax: formData.salaryMax,
      workType: formData.workType as 'remote' | 'hybrid' | 'onsite' | 'flexible',
      industries: formData.industries,
      skills: formData.skills,
      remotePreference: formData.remotePreference,
      willingToRelocate: formData.willingToRelocate,
      location: formData.location,
    });

    // Update display name
    setDisplayName(formData.name);

    // Here you would typically make an API call to update the profile
    console.log('Saving profile and preferences:', formData);
    setIsEditing(false);
    
    // Show success toast
    toast.success('Profile updated successfully! Job recommendations will now be personalized.');
  };

  const handleCancel = () => {
    // Reset form data
    if (user) {
      setFormData({
        name: displayName,
        email: user.email,
        bio: '',
        location: '',
        phone: '',
        // Job Preferences - Reset to defaults
        jobTitle: '',
        experienceLevel: 'mid',
        salaryMin: '',
        salaryMax: '',
        workType: 'hybrid',
        industries: '',
        skills: '',
        remotePreference: true,
        willingToRelocate: false,
      });
    }
    setIsEditing(false);
  };

  if (!user) {
    return null; // ProtectedRoute will handle redirect
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
                    <div className="relative">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src="" alt="Profile" />
                        <AvatarFallback className="text-2xl">
                          {displayName.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute bottom-0 right-0 rounded-full h-8 w-8 p-0"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">{displayName || 'User'}</h1>
                      <p className="text-muted-foreground">{user.email}</p>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <Badge variant={user.is_verified ? "default" : "secondary"}>
                          <Shield className="h-3 w-3 mr-1" />
                          {user.is_verified ? "Verified" : "Unverified"}
                        </Badge>
                        <Badge variant={user.is_active ? "default" : "destructive"}>
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
                      <Button onClick={handleSave} size="sm">
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
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter your full name"
                          className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50"
                        />
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
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Enter your phone number"
                          className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50"
                        />
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md">{formData.phone || 'Not set'}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      {isEditing ? (
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Enter your location"
                          className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50"
                        />
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md">{formData.location || 'Not set'}</p>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      {isEditing ? (
                        <textarea
                          id="bio"
                          value={formData.bio}
                          onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                          placeholder="Tell us about yourself..."
                          className="w-full min-h-[100px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-input text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                        />
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md min-h-[100px]">
                          {formData.bio || 'No bio added yet'}
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
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Preferred Job Title</Label>
                      {isEditing ? (
                        <Input
                          id="jobTitle"
                          value={formData.jobTitle}
                          onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                          placeholder="e.g., Frontend Developer, Data Scientist"
                          className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50"
                        />
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md">{formData.jobTitle || 'Not specified'}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experienceLevel">Experience Level</Label>
                      {isEditing ? (
                        <Select
                          value={formData.experienceLevel}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, experienceLevel: value }))}
                        >
                          <SelectTrigger className="bg-white dark:bg-input">
                            <SelectValue placeholder="Select experience level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                            <SelectItem value="mid">Mid Level (2-5 years)</SelectItem>
                            <SelectItem value="senior">Senior Level (5-10 years)</SelectItem>
                            <SelectItem value="lead">Lead/Principal (10+ years)</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md">
                          {formData.experienceLevel === 'entry' && 'Entry Level (0-2 years)'}
                          {formData.experienceLevel === 'mid' && 'Mid Level (2-5 years)'}
                          {formData.experienceLevel === 'senior' && 'Senior Level (5-10 years)'}
                          {formData.experienceLevel === 'lead' && 'Lead/Principal (10+ years)'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="salaryMin">Minimum Salary (USD)</Label>
                      {isEditing ? (
                        <Input
                          id="salaryMin"
                          type="number"
                          value={formData.salaryMin}
                          onChange={(e) => setFormData(prev => ({ ...prev, salaryMin: e.target.value }))}
                          placeholder="e.g., 60000"
                          className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50"
                        />
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md">
                          {formData.salaryMin ? `$${parseInt(formData.salaryMin).toLocaleString()}` : 'Not specified'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="salaryMax">Maximum Salary (USD)</Label>
                      {isEditing ? (
                        <Input
                          id="salaryMax"
                          type="number"
                          value={formData.salaryMax}
                          onChange={(e) => setFormData(prev => ({ ...prev, salaryMax: e.target.value }))}
                          placeholder="e.g., 120000"
                          className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50"
                        />
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md">
                          {formData.salaryMax ? `$${parseInt(formData.salaryMax).toLocaleString()}` : 'Not specified'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="workType">Work Type Preference</Label>
                      {isEditing ? (
                        <Select
                          value={formData.workType}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, workType: value }))}
                        >
                          <SelectTrigger className="bg-white dark:bg-input">
                            <SelectValue placeholder="Select work type preference" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="remote">Remote Only</SelectItem>
                            <SelectItem value="hybrid">Hybrid (Remote + Office)</SelectItem>
                            <SelectItem value="onsite">On-site Only</SelectItem>
                            <SelectItem value="flexible">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md">
                          {formData.workType === 'remote' && 'Remote Only'}
                          {formData.workType === 'hybrid' && 'Hybrid (Remote + Office)'}
                          {formData.workType === 'onsite' && 'On-site Only'}
                          {formData.workType === 'flexible' && 'Flexible'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industries">Preferred Industries</Label>
                      {isEditing ? (
                        <Input
                          id="industries"
                          value={formData.industries}
                          onChange={(e) => setFormData(prev => ({ ...prev, industries: e.target.value }))}
                          placeholder="e.g., Technology, Healthcare, Finance"
                          className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50"
                        />
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md">{formData.industries || 'Not specified'}</p>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="skills">Key Skills</Label>
                      {isEditing ? (
                        <textarea
                          id="skills"
                          value={formData.skills}
                          onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
                          placeholder="List your key skills (e.g., React, Python, Machine Learning, Project Management)"
                          className="w-full min-h-[80px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-input text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                        />
                      ) : (
                        <p className="py-2 px-3 bg-muted rounded-md min-h-[80px]">
                          {formData.skills || 'No skills listed yet'}
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
                            checked={formData.remotePreference}
                            onChange={(e) => setFormData(prev => ({ ...prev, remotePreference: e.target.checked }))}
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
                            checked={formData.willingToRelocate}
                            onChange={(e) => setFormData(prev => ({ ...prev, willingToRelocate: e.target.checked }))}
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