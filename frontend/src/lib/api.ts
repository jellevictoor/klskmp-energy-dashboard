import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export interface DashboardOverview {
  current: {
    consumption: number;
    production: number;
    gridImport: number;
    gridExport: number;
    price: number;
    timestamp: string;
  };
  today: {
    consumption: number;
    production: number;
    selfConsumption: number;
    gridImport: number;
    gridExport: number;
  };
  month: {
    costs: any;
    consumption: number;
    production: number;
  };
  fluvius: {
    averagePeak: number;
    monthlyCost: number;
    yearlyCost: number;
  };
  evcc: {
    enabled: boolean;
    available: boolean;
    loadpoints?: any[];
  };
}

export interface ChartData {
  timestamp: string;
  consumption: number;
  production: number;
}

export const dashboardApi = {
  getOverview: () => api.get<DashboardOverview>('/dashboard/overview'),
  getSummary: (period: 'day' | 'week' | 'month' | 'year') =>
    api.get(`/dashboard/summary/${period}`),
  getChartData: (
    type: 'consumption-production' | 'costs' | 'fluvius-peaks',
    params?: any
  ) => api.get<ChartData[]>(`/dashboard/chart/${type}`, { params }),
};

export const analyticsApi = {
  getInsights: () => api.get('/analytics/insights'),
  getComparison: (period: 'day' | 'week' | 'month' | 'year') =>
    api.get('/analytics/comparison', { params: { period } }),
  getPeakTimes: (days?: number) =>
    api.get('/analytics/peak-times', { params: { days } }),
};

export const tariffApi = {
  getFluvius: () => api.get('/tariff/fluvius'),
  getCosts: (start?: string, stop?: string) =>
    api.get('/tariff/costs', { params: { start, stop } }),
  getBreakdown: (period: 'day' | 'week' | 'month' | 'year') =>
    api.get(`/tariff/breakdown/${period}`),
  getSelfConsumption: (start?: string, stop?: string) =>
    api.get('/tariff/self-consumption', { params: { start, stop } }),
  getCurrentPrice: () => api.get('/tariff/current-price'),
  getForecast: () => api.get('/tariff/forecast'),
};

export const evccApi = {
  getStatus: () => api.get('/evcc/status'),
  getLoadpoint: (id: number) => api.get(`/evcc/loadpoint/${id}`),
  getSessions: (days?: number) =>
    api.get('/evcc/sessions', { params: { days } }),
  getHeatPump: () => api.get('/evcc/heatpump'),
  getEV: () => api.get('/evcc/ev'),
  getChargingCosts: (days?: number, averagePrice?: number) =>
    api.get('/evcc/charging-costs', { params: { days, averagePrice } }),
};

export default api;
