import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Capitalize a name properly (first letter uppercase, rest lowercase)
 * Example: "john doe" -> "John Doe", "JANE SMITH" -> "Jane Smith"
 */
export function capitalizeName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .split(' ')
    .map(word => {
      if (!word) return '';
      // Capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

