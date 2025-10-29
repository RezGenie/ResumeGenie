"use client";

import { DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EnhancedSalaryInputProps {
  id: string;
  label: string;
  value: string;
  isEditing: boolean;
  register: any;
  placeholder: string;
}

export function EnhancedSalaryInput({
  id,
  label,
  value,
  isEditing,
  register,
  placeholder
}: EnhancedSalaryInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-purple-600" />
        {label}
      </Label>
      {isEditing ? (
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id={id}
            type="number"
            {...register}
            placeholder={placeholder}
            className="pl-10 bg-white dark:bg-input border-gray-300 dark:border-gray-600 focus-visible:!border-purple-600 focus-visible:!ring-purple-600/50 hover:border-purple-400 transition-colors"
          />
        </div>
      ) : (
        <div className="py-2 px-3 bg-muted rounded-md flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-purple-600" />
          <span>
            {value ? `$${parseInt(value || '0').toLocaleString()}` : 'Not specified'}
          </span>
        </div>
      )}
    </div>
  );
}
