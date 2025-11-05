import { influxService } from './influxService';

export interface TariffCalculation {
  totalCost: number;
  netCost: number;
  breakdown: {
    fixedCost: number;
    energyCost: number;
    energyRevenue: number;
    distributionCost: number;
    injectionCost: number;
    gscCost: number;
    wkkCost: number;
    capacityCost: number;
  };
  usage: {
    totalKwhDelivered: number;
    totalKwhReturned: number;
    peakPowerKw: number;
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
  // Ecopower Tariff Constants (October 2025)
  // Fixed monthly subscription costs (EUR/month)
  private readonly ECOPOWER_SUBSCRIPTION = 5.0;
  private readonly FLUVIUS_SUBSCRIPTION = 2.0;

  // Energy cost coefficients (based on EPEX price in EUR/MWh)
  private readonly CONSUMPTION_COEFFICIENT = 0.00102;
  private readonly CONSUMPTION_FIXED = 0.004;

  // Injection revenue coefficients (based on EPEX price in EUR/MWh)
  private readonly INJECTION_COEFFICIENT = 0.00098;
  private readonly INJECTION_FIXED = -0.015;

  // Distribution and other costs (EUR/kWh)
  private readonly DISTRIBUTION_TARIFF = 0.0704386;
  private readonly INJECTION_TARIFF = 0.0017510;
  private readonly GSC_TARIFF = 0.011;
  private readonly WKK_TARIFF = 0.00392;

  // Capacity tariff (EUR/kW/year)
  private readonly CAPACITY_TARIFF_YEARLY = 56.93;

  /**
   * Calculate monthly fixed subscription cost
   */
  private calculateFixedCost(): number {
    return this.ECOPOWER_SUBSCRIPTION + this.FLUVIUS_SUBSCRIPTION;
  }

  /**
   * Calculate energy cost per kWh based on EPEX day-ahead price
   */
  private calculateEnergyCostPerKwh(epexPriceEurMwh: number): number {
    return this.CONSUMPTION_COEFFICIENT * epexPriceEurMwh + this.CONSUMPTION_FIXED;
  }

  /**
   * Calculate energy injection revenue per kWh based on EPEX day-ahead price
   */
  private calculateEnergyRevenuePerKwh(epexPriceEurMwh: number): number {
    return this.INJECTION_COEFFICIENT * epexPriceEurMwh + this.INJECTION_FIXED;
  }

  /**
   * Calculate distribution network cost
   */
  private calculateDistributionCost(kwh: number): number {
    return kwh * this.DISTRIBUTION_TARIFF;
  }

  /**
   * Calculate injection (prosumer) tariff cost
   */
  private calculateInjectionCost(kwh: number): number {
    return kwh * this.INJECTION_TARIFF;
  }

  /**
   * Calculate green certificate (GSC) cost
   */
  private calculateGscCost(kwh: number): number {
    return kwh * this.GSC_TARIFF;
  }

  /**
   * Calculate CHP (WKK) surcharge cost
   */
  private calculateWkkCost(kwh: number): number {
    return kwh * this.WKK_TARIFF;
  }

  /**
   * Calculate monthly capacity cost based on peak power
   */
  private calculateMonthlyCapacityCost(peakPowerKw: number): number {
    return (peakPowerKw * this.CAPACITY_TARIFF_YEARLY) / 12;
  }

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
   * Calculate total energy costs using Ecopower tariff structure
   */
  async calculateEnergyCosts(
    start: string,
    stop: string
  ): Promise<TariffCalculation> {
    // Get consumption data
    const consumptionData = await influxService.queryConsumption(start, stop, '15m');

    // Get production data (injection)
    const productionData = await influxService.querySolarProduction(start, stop, '15m');

    // Get EPEX price data
    const priceData = await influxService.queryEnergyPrices(start, stop);

    // Initialize counters
    let totalKwhDelivered = 0;
    let totalKwhReturned = 0;
    let peakPowerKw = 0;
    let energyCost = 0;
    let energyRevenue = 0;

    // Default EPEX price if not available (EUR/MWh)
    const defaultEpexPrice = parseFloat(process.env.DEFAULT_EPEX_PRICE || '100');

    // Process consumption readings
    for (const meterData of consumptionData) {
      for (const point of meterData.data) {
        // Convert W to kW
        const powerKw = point.value / 1000;

        // Convert 15-minute power reading to kWh
        const kwh15min = powerKw * 0.25;
        totalKwhDelivered += kwh15min;

        // Track peak power
        if (powerKw > peakPowerKw) {
          peakPowerKw = powerKw;
        }

        // Get EPEX price for this timestamp (convert from EUR/kWh to EUR/MWh if needed)
        const price = this.findPriceForTimestamp(point.timestamp, priceData);
        const epexPrice = price !== null ? price : defaultEpexPrice;

        // Calculate cost for this period using Ecopower formula
        const costPerKwh = this.calculateEnergyCostPerKwh(epexPrice);
        energyCost += costPerKwh * kwh15min;
      }
    }

    // Process injection readings (solar production returned to grid)
    for (const point of productionData) {
      // Convert W to kW
      const powerKw = point.value / 1000;

      // Convert 15-minute power reading to kWh
      const kwh15min = powerKw * 0.25;
      totalKwhReturned += kwh15min;

      // Get EPEX price for this timestamp
      const price = this.findPriceForTimestamp(point.timestamp, priceData);
      const epexPrice = price !== null ? price : defaultEpexPrice;

      // Calculate revenue for this period using Ecopower formula
      const revenuePerKwh = this.calculateEnergyRevenuePerKwh(epexPrice);
      energyRevenue += revenuePerKwh * kwh15min;
    }

    // Calculate all cost components
    const fixedCost = this.calculateFixedCost();
    const distributionCost = this.calculateDistributionCost(totalKwhDelivered);
    const injectionCost = this.calculateInjectionCost(totalKwhReturned);
    const gscCost = this.calculateGscCost(totalKwhDelivered);
    const wkkCost = this.calculateWkkCost(totalKwhDelivered);
    const capacityCost = this.calculateMonthlyCapacityCost(peakPowerKw);

    // Calculate totals
    const totalCost = fixedCost + energyCost + distributionCost + injectionCost + gscCost + wkkCost + capacityCost;
    const netCost = totalCost - energyRevenue;

    return {
      totalCost,
      netCost,
      breakdown: {
        fixedCost,
        energyCost,
        energyRevenue,
        distributionCost,
        injectionCost,
        gscCost,
        wkkCost,
        capacityCost,
      },
      usage: {
        totalKwhDelivered,
        totalKwhReturned,
        peakPowerKw,
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
   * Get current electricity price (EUR/kWh) based on EPEX price
   * Note: Expects EPEX prices in InfluxDB to be in EUR/MWh
   */
  async getCurrentPrice(): Promise<{ pricePerKwh: number; epexPrice: number; breakdown: any }> {
    const prices = await influxService.queryEnergyPrices('-1h', 'now()');

    let epexPrice = parseFloat(process.env.DEFAULT_EPEX_PRICE || '100');

    if (prices.length > 0) {
      // Use the most recent EPEX price (expected to be in EUR/MWh)
      epexPrice = prices[prices.length - 1].value;
    }

    // Calculate the total price per kWh including all components
    const energyCostPerKwh = this.calculateEnergyCostPerKwh(epexPrice);
    const totalPricePerKwh = energyCostPerKwh + this.DISTRIBUTION_TARIFF + this.GSC_TARIFF + this.WKK_TARIFF;

    return {
      pricePerKwh: totalPricePerKwh,
      epexPrice,
      breakdown: {
        energyCost: energyCostPerKwh,
        distribution: this.DISTRIBUTION_TARIFF,
        gsc: this.GSC_TARIFF,
        wkk: this.WKK_TARIFF,
      },
    };
  }

  /**
   * Get price forecast for next 24 hours
   */
  async getPriceForecast(): Promise<any[]> {
    // This would integrate with your dynamic tariff provider
    // For now, return prices from InfluxDB
    return influxService.queryEnergyPrices('-1h', 'now() + 24h');
  }

  /**
   * Get all Ecopower tariff rates
   */
  getTariffRates() {
    return {
      fixedCosts: {
        ecopowerSubscription: this.ECOPOWER_SUBSCRIPTION,
        fluviusSubscription: this.FLUVIUS_SUBSCRIPTION,
        total: this.calculateFixedCost(),
      },
      energyCost: {
        consumptionCoefficient: this.CONSUMPTION_COEFFICIENT,
        consumptionFixed: this.CONSUMPTION_FIXED,
        formula: '0.00102 × EPEX_EUR_MWh + 0.004 EUR/kWh',
      },
      injectionRevenue: {
        injectionCoefficient: this.INJECTION_COEFFICIENT,
        injectionFixed: this.INJECTION_FIXED,
        formula: '0.00098 × EPEX_EUR_MWh - 0.015 EUR/kWh',
      },
      distributionAndOther: {
        distribution: this.DISTRIBUTION_TARIFF,
        injection: this.INJECTION_TARIFF,
        gsc: this.GSC_TARIFF,
        wkk: this.WKK_TARIFF,
      },
      capacity: {
        yearlyRate: this.CAPACITY_TARIFF_YEARLY,
        monthlyRate: this.CAPACITY_TARIFF_YEARLY / 12,
        unit: 'EUR/kW',
      },
    };
  }
}

export const tariffService = new TariffService();
