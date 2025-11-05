import { influxService } from './influxService';

export interface TariffCalculation {
  totalCost: number;
  energyCost: number;
  capacityCost: number;
  feedInRevenue: number;
  netCost: number;
  breakdown: {
    consumptionCost: number;
    productionRevenue: number;
    fluviusCapacityTariff: number;
  };
}

export interface FluviusCapacityTariff {
  averagePeak: number; // kW
  monthlyPeaks: number[];
  monthlyCost: number;
  yearlyCost: number;
  tariffRate: number; // EUR/kW/month
}

export class TariffService {
  /**
   * Calculate Fluvius capacity tariff based on peak consumption
   *
   * In Flanders, the capacity tariff is based on your average monthly peak
   * consumption over a 12-month period. The higher your peak, the more you pay.
   */
  async calculateFluviusCapacityTariff(months: number = 12): Promise<FluviusCapacityTariff> {
    const monthlyPeaks = await influxService.calculateMonthlyPeaks(months);

    if (monthlyPeaks.length === 0) {
      return {
        averagePeak: 0,
        monthlyPeaks: [],
        monthlyCost: 0,
        yearlyCost: 0,
        tariffRate: parseFloat(process.env.FLUVIUS_CAPACITY_TARIFF_MONTHLY || '3.07'),
      };
    }

    // Calculate average of monthly peaks
    const averagePeak = monthlyPeaks.reduce((sum, peak) => sum + peak, 0) / monthlyPeaks.length;

    // Fluvius tariff rate (EUR per kW per month)
    const tariffRate = parseFloat(process.env.FLUVIUS_CAPACITY_TARIFF_MONTHLY || '3.07');

    // Calculate costs
    const monthlyCost = (averagePeak / 1000) * tariffRate; // Convert W to kW
    const yearlyCost = monthlyCost * 12;

    return {
      averagePeak,
      monthlyPeaks,
      monthlyCost,
      yearlyCost,
      tariffRate,
    };
  }

  /**
   * Calculate total energy costs including dynamic tariffs
   */
  async calculateEnergyCosts(
    start: string,
    stop: string
  ): Promise<TariffCalculation> {
    // Get consumption data
    const consumptionData = await influxService.queryConsumption(start, stop, '1h');

    // Get production data
    const productionData = await influxService.querySolarProduction(start, stop, '1h');

    // Get price data
    const priceData = await influxService.queryEnergyPrices(start, stop);

    // Get Fluvius capacity tariff
    const capacityTariff = await this.calculateFluviusCapacityTariff();

    // Calculate consumption cost
    let consumptionCost = 0;
    const defaultPrice = parseFloat(process.env.DEFAULT_ELECTRICITY_PRICE || '0.30');

    for (const meterData of consumptionData) {
      for (const point of meterData.data) {
        // Find matching price for this timestamp
        const price = this.findPriceForTimestamp(point.timestamp, priceData) || defaultPrice;
        consumptionCost += (point.value / 1000) * price; // Convert W to kW
      }
    }

    // Calculate production revenue (feed-in)
    let productionRevenue = 0;
    const defaultFeedInPrice = parseFloat(process.env.DEFAULT_FEEDIN_PRICE || '0.05');

    for (const point of productionData) {
      const price = defaultFeedInPrice; // Could be dynamic too
      productionRevenue += (point.value / 1000) * price;
    }

    // Total costs
    const energyCost = consumptionCost;
    const capacityCost = capacityTariff.monthlyCost;
    const feedInRevenue = productionRevenue;
    const totalCost = energyCost + capacityCost;
    const netCost = totalCost - feedInRevenue;

    return {
      totalCost,
      energyCost,
      capacityCost,
      feedInRevenue,
      netCost,
      breakdown: {
        consumptionCost,
        productionRevenue,
        fluviusCapacityTariff: capacityCost,
      },
    };
  }

  /**
   * Get cost breakdown for a specific period
   */
  async getCostBreakdown(period: 'day' | 'week' | 'month' | 'year'): Promise<TariffCalculation> {
    const now = new Date();
    let start: string;

    switch (period) {
      case 'day':
        start = '-1d';
        break;
      case 'week':
        start = '-7d';
        break;
      case 'month':
        start = '-30d';
        break;
      case 'year':
        start = '-365d';
        break;
    }

    return this.calculateEnergyCosts(start, 'now()');
  }

  /**
   * Calculate self-consumption ratio
   */
  async calculateSelfConsumptionRatio(start: string, stop: string): Promise<number> {
    const productionData = await influxService.querySolarProduction(start, stop, '1h');
    const consumptionData = await influxService.queryConsumption(start, stop, '1h');

    const totalProduction = productionData.reduce((sum, p) => sum + p.value, 0);
    const totalConsumption = consumptionData.reduce(
      (sum, m) => sum + m.data.reduce((s, p) => s + p.value, 0),
      0
    );

    if (totalProduction === 0) return 0;

    const selfConsumed = Math.min(totalProduction, totalConsumption);
    return (selfConsumed / totalProduction) * 100;
  }

  /**
   * Find price for a given timestamp
   */
  private findPriceForTimestamp(timestamp: string, priceData: any[]): number | null {
    const targetTime = new Date(timestamp).getTime();

    // Find closest price point
    let closestPrice = null;
    let closestDiff = Infinity;

    for (const price of priceData) {
      const priceTime = new Date(price.timestamp).getTime();
      const diff = Math.abs(targetTime - priceTime);

      if (diff < closestDiff && diff < 3600000) { // Within 1 hour
        closestDiff = diff;
        closestPrice = price.value;
      }
    }

    return closestPrice;
  }

  /**
   * Get current electricity price
   */
  async getCurrentPrice(): Promise<number> {
    const prices = await influxService.queryEnergyPrices('-1h', 'now()');

    if (prices.length > 0) {
      return prices[prices.length - 1].value;
    }

    return parseFloat(process.env.DEFAULT_ELECTRICITY_PRICE || '0.30');
  }

  /**
   * Get price forecast for next 24 hours
   */
  async getPriceForecast(): Promise<any[]> {
    // This would integrate with your dynamic tariff provider
    // For now, return prices from InfluxDB
    return influxService.queryEnergyPrices('-1h', 'now() + 24h');
  }
}

export const tariffService = new TariffService();
