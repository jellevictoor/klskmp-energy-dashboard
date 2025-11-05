import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals)
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatEnergy(wh: number): string {
  if (wh >= 1000) {
    return `${(wh / 1000).toFixed(2)} kWh`
  }
  return `${wh.toFixed(0)} Wh`
}

export function formatPower(w: number): string {
  if (w >= 1000) {
    return `${(w / 1000).toFixed(2)} kW`
  }
  return `${w.toFixed(0)} W`
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}
