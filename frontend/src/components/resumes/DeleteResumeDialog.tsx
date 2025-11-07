"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";

interface DeleteResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeName: string;
  onConfirm: () => void;
}

export function DeleteResumeDialog({ 
  open, 
  onOpenChange, 
  resumeName,
  onConfirm 
}: DeleteResumeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
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
          onClick={() => onOpenChange(false)}
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
            className="bg-card w-full max-w-[450px] rounded-lg overflow-hidden shadow-2xl border border-red-200/50 dark:border-red-700/50 backdrop-blur-sm flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-red-100 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-red-900 dark:text-red-200">
                    Delete Resume
                  </h2>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full h-8 w-8 p-0 transition-colors flex items-center justify-center"
                disabled={isLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">"{resumeName}"</span>?
              </p>

              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
              >
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-900 dark:text-red-200">
                      This will permanently delete:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
                      <li>The resume file and all extracted data</li>
                      <li>Any analysis results associated with this resume</li>
                      <li>Job comparisons using this resume</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Resume
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
