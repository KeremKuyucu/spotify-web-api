import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function formatDuration(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60)
  const minutes = Math.floor((ms / (1000 * 60)) % 60)
  const hours = Math.floor(ms / (1000 * 60 * 60))

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  } else {
    return `${minutes}:${String(seconds).padStart(2, "0")}`
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
