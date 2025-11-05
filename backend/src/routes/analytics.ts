import { Router } from 'express';
import { influxService } from '../services/influxService';
import { tariffService } from '../services/tariffService';
import NodeCache from 'node-cache';

export const analyticsRouter = Router();

// Cache for 5 minutes
const cache = new NodeCache({ stdTTL: 300 });

/**
 * GET /api/analytics/insights
 * Get valuable insights and recommendations
 */
analyticsRouter.get('/insights', async (req, res) => {
  try {
    const cacheKey = 'insights';
    const cached = cache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    // Calculate various metrics
    const [
      fluviusTariff,
      selfConsumption,
      costs,
    ] = await Promise.all([
      tariffService.calculateFluviusCapacityTariff(),
      tariffService.calculateSelfConsumptionRatio('-30d', 'now()'),
      tariffService.getCostBreakdown('month'),
    ]);

    const insights = {
      fluviusTariff: {
        averagePeak: fluviusTariff.averagePeak,
        monthlyCost: fluviusTariff.monthlyCost,
        recommendation: generateFluviusRecommendation(fluviusTariff.averagePeak),
      },
      selfConsumption: {
        ratio: selfConsumption,
        recommendation: generateSelfConsumptionRecommendation(selfConsumption),
      },
      costs: {
        monthly: costs.netCost,
        breakdown: costs.breakdown,
        recommendation: generateCostRecommendation(costs),
      },
    };

    cache.set(cacheKey, insights);
    res.json(insights);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/comparison
 * Compare consumption across periods
 */
analyticsRouter.get('/comparison', async (req, res) => {
  try {
    const { period = 'day' } = req.query;

    let currentStart = '-1d';
    let previousStart = '-2d';
    let previousStop = '-1d';

    switch (period) {
      case 'week':
        currentStart = '-7d';
        previousStart = '-14d';
        previousStop = '-7d';
        break;
      case 'month':
        currentStart = '-30d';
        previousStart = '-60d';
        previousStop = '-30d';
        break;
      case 'year':
        currentStart = '-365d';
        previousStart = '-730d';
        previousStop = '-365d';
        break;
    }

    const [currentConsumption, previousConsumption] = await Promise.all([
      influxService.queryNetConsumption(currentStart, 'now()', '1h'),
      influxService.queryNetConsumption(previousStart, previousStop, '1h'),
    ]);

    const currentTotal = currentConsumption.reduce(
      (sum, p) => sum + Math.abs(p.value),
      0
    );

    const previousTotal = previousConsumption.reduce(
      (sum, p) => sum + Math.abs(p.value),
      0
    );

    const percentageChange = ((currentTotal - previousTotal) / previousTotal) * 100;

    res.json({
      current: currentTotal,
      previous: previousTotal,
      change: currentTotal - previousTotal,
      percentageChange,
      trend: percentageChange > 0 ? 'up' : 'down',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/peak-times
 * Identify peak consumption times
 */
analyticsRouter.get('/peak-times', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const consumption = await influxService.queryNetConsumption(
      `-${days}d`,
      'now()',
      '1h'
    );

    // Aggregate by hour of day
    const hourlyAggregates = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);

    for (const point of consumption) {
      const hour = new Date(point.timestamp).getHours();
      hourlyAggregates[hour] += Math.abs(point.value);
      hourlyCounts[hour]++;
    }

    const hourlyAverages = hourlyAggregates.map((sum, i) =>
      hourlyCounts[i] > 0 ? sum / hourlyCounts[i] : 0
    );

    const peakHours = hourlyAverages
      .map((avg, hour) => ({ hour, average: avg }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 5);

    res.json({
      hourlyAverages,
      peakHours,
      recommendation: generatePeakTimeRecommendation(peakHours),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper functions for recommendations
 */
function generateFluviusRecommendation(averagePeak: number): string {
  const peakKW = averagePeak / 1000;

  if (peakKW > 5) {
    return `Your average peak is ${peakKW.toFixed(2)} kW, which is relatively high. Consider spreading your high-power appliances usage throughout the day to reduce your capacity tariff.`;
  } else if (peakKW > 3) {
    return `Your average peak is ${peakKW.toFixed(2)} kW. You're doing well, but there's room for optimization by avoiding simultaneous use of heavy appliances.`;
  } else {
    return `Great! Your average peak of ${peakKW.toFixed(2)} kW is low, which keeps your Fluvius capacity tariff minimal.`;
  }
}

function generateSelfConsumptionRecommendation(ratio: number): string {
  if (ratio > 70) {
    return `Excellent! You're self-consuming ${ratio.toFixed(1)}% of your solar production. This maximizes your savings.`;
  } else if (ratio > 50) {
    return `Good self-consumption at ${ratio.toFixed(1)}%. Consider using more energy during peak solar hours to increase this further.`;
  } else {
    return `Your self-consumption ratio is ${ratio.toFixed(1)}%. Try to shift energy-intensive tasks to daytime hours when your solar panels are producing.`;
  }
}

function generateCostRecommendation(costs: any): string {
  const capacityPercentage = (costs.capacityCost / costs.totalCost) * 100;

  if (capacityPercentage > 30) {
    return `Your Fluvius capacity tariff represents ${capacityPercentage.toFixed(1)}% of your total costs. Focus on reducing peak consumption to lower your bills significantly.`;
  } else {
    return `Your energy costs are well-balanced. Continue monitoring your usage patterns and optimizing during high-price periods.`;
  }
}

function generatePeakTimeRecommendation(peakHours: any[]): string {
  const peakTimes = peakHours.map(p => `${p.hour}:00`).join(', ');
  return `Your highest consumption is typically at ${peakTimes}. Try to avoid running heavy appliances simultaneously during these hours to reduce your Fluvius capacity tariff.`;
}
