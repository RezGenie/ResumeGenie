"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus, X } from "lucide-react";
import { toast } from 'sonner';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    console.log('AuthPage: Form submission started');
    console.log('AuthPage: isLogin:', isLogin);
    console.log('AuthPage: email:', email);
    console.log('AuthPage: Will call:', isLogin ? 'login' : 'register');

    if (isLogin) {
      console.log('AuthPage: Calling login function...');
      await login(email, password);
    } else {
      console.log('AuthPage: Calling register function...');
      await register(email, password);
    }
    console.log('AuthPage: Auth function completed');
    
    // Always set loading to false, regardless of success/failure
    // Success will redirect, failure will show toast
    setIsLoading(false);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      window.location.href = "/";
    }, 300);
  };

  const toggleAuthMode = () => {
    const wasLogin = isLogin;
    setIsLogin(!isLogin);
    // Reset form when switching
    setEmail("");
    setPassword("");
    setName("");
    
    // Show password requirements hint when switching to register
    if (wasLogin) {
      toast.info("Password Requirements", {
        description: "Must be 8+ characters with uppercase, lowercase, number, and special character.",
        duration: 5000
      });
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-h-screen bg-background">
        <Header />
        
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <AnimatePresence mode="wait">
          {isVisible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ 
                duration: 0.3,
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
            >
                            <Card className="relative rounded-2xl shadow-lg border bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-muted-foreground/20">
                {/* Close Button */}
                <motion.button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </motion.button>

                <CardHeader className="text-center space-y-4 pt-8">
                  <motion.div 
                    className="flex items-center justify-center gap-2"
                    animate={{ 
                      rotate: isLogin ? 0 : 360,
                    }}
                    transition={{ duration: 0.6, type: "spring" }}
                  >
                    <span className="text-4xl">🧞‍♂️</span>
                  </motion.div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isLogin ? "login" : "signup"}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardTitle className="text-3xl font-bold text-foreground">
                        {isLogin ? "Welcome Back" : "Join RezGenie"}
                      </CardTitle>
                      <p className="text-muted-foreground mt-2">
                        {isLogin 
                          ? "Sign in to access your career insights" 
                          : "Create your account to unlock your potential"
                        }
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </CardHeader>
                
                <CardContent className="px-8 pb-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <AnimatePresence mode="wait">
                      {!isLogin && (
                        <motion.div
                          key="name-field"
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: "auto", y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-2"
                        >
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            type="text"
                            placeholder="Enter your full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required={!isLogin}
                            className="h-11 bg-white dark:bg-input"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <motion.div 
                      className="space-y-2"
                      animate={{ y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11 bg-white dark:bg-input"
                      />
                    </motion.div>
                    
                    <motion.div 
                      className="space-y-2"
                      animate={{ y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-11 bg-white dark:bg-input"
                      />
                    </motion.div>
                    
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-semibold" 
                        size="lg"
                        disabled={isLoading}
                      >
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={isLogin ? "login" : "signup"}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center"
                          >
                            {isLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {isLogin ? "Signing In..." : "Creating Account..."}
                              </>
                            ) : isLogin ? (
                              <>
                                <LogIn className="mr-2 h-4 w-4" />
                                Sign In
                              </>
                            ) : (
                              <>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Create Account
                              </>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </Button>
                    </motion.div>
                  </form>
                  
                  <div className="mt-8 text-center">
                    <motion.button
                      type="button"
                      onClick={toggleAuthMode}
                      className="text-sm text-primary hover:underline transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={isLogin ? "signup-link" : "login-link"}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.2 }}
                        >
                          {isLogin 
                            ? "Don't have an account? Sign up" 
                            : "Already have an account? Sign in"
                          }
                        </motion.span>
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </div>
    </ProtectedRoute>
  );
}