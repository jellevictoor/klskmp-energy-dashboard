import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number, decimals: number = 2): string {
  if (num === null || num === undefined || isNaN(num)) return 'N/A'
  return num.toFixed(decimals)
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '€0.00'
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatEnergy(wh: number): string {
  if (wh === null || wh === undefined || isNaN(wh)) return 'N/A'
  if (wh >= 1000) {
    return `${(wh / 1000).toFixed(2)} kWh`
  }
  return `${wh.toFixed(0)} Wh`
}

export function formatPower(w: number): string {
  if (w === null || w === undefined || isNaN(w)) return 'N/A'
  if (w >= 1000) {
    return `${(w / 1000).toFixed(2)} kW`
  }
  return `${w.toFixed(0)} W`
}

export function formatPercentage(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  return `${value.toFixed(1)}%`
}
