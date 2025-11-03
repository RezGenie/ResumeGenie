"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/api/auth";
import { useAuth } from "@/contexts/AuthContext";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    setIsLoading(true);
    try {
      await authService.deleteAccount();
      
      toast.success("Account deleted successfully", {
        description: "Your account and all associated data have been permanently deleted.",
        duration: 5000,
      });
      
      // Clear tokens and redirect
      authService.clearTokens();
      logout();
      router.push("/");
    } catch (error: any) {
      toast.error("Failed to delete account", {
        description: error.message || "Please try again later.",
        duration: 5000,
      });
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
          onClick={() => {
            setConfirmText("");
            onOpenChange(false);
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 400,
              duration: 0.3
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full max-w-[500px] max-h-[90vh] rounded-lg overflow-hidden shadow-2xl border border-red-200/50 dark:border-red-700/50 backdrop-blur-sm flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-red-100 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-red-900 dark:text-red-200">
                    Delete Account
                  </h2>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    This action is permanent and cannot be undone
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setConfirmText("");
                  onOpenChange(false);
                }}
                className="hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full h-8 w-8 p-0 transition-colors flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Deleting your account will:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>Permanently delete your profile and preferences</li>
                  <li>Remove all your saved jobs and applications</li>
                  <li>Delete all your uploaded resumes</li>
                  <li>Erase all your Genie wishes and history</li>
                </ul>
              </div>

              <div className="space-y-4">
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
                >
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-red-900 dark:text-red-200">
                        Warning: This action is irreversible
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        All your data will be permanently deleted from our servers.
                      </p>
                    </div>
                  </div>
                </motion.div>

                <div className="space-y-2">
                  <Label htmlFor="confirmText" className="text-gray-700 dark:text-gray-300">
                    Type <span className="font-bold text-red-600 dark:text-red-500">DELETE</span> to confirm
                  </Label>
                  <Input
                    id="confirmText"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE here"
                    className="bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-red-600 focus-visible:!ring-red-600/50"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setConfirmText("");
                  onOpenChange(false);
                }}
                disabled={isLoading}
                className="flex-1 bg-white dark:bg-transparent text-black dark:text-white border-gray-300 dark:border-gray-600 hover:border-purple-600 dark:hover:border-purple-600 hover:bg-white dark:hover:bg-transparent"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={isLoading || confirmText !== "DELETE"}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
