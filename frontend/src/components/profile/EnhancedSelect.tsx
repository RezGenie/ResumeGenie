"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function EnhancedSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  className
}: EnhancedSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = () => setOpen(false);
    if (open) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-purple-400 transition-colors",
          className
        )}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span className={cn("block truncate", !selectedOption && "text-muted-foreground")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {open && !disabled && (
        <div className="absolute top-full z-50 w-full mt-1 max-h-96 overflow-auto rounded-md border border-border bg-white dark:bg-[#2d1b3d] text-popover-foreground shadow-md">
          <div className="p-1">
            {options.map((option) => (
              <div
                key={option.value}
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-purple-50 dark:hover:bg-purple-900/30 focus:bg-purple-50 dark:focus:bg-purple-900/30 transition-colors"
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
