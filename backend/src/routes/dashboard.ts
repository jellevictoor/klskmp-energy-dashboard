import { Router } from 'express';
import { influxService } from '../services/influxService';
import { tariffService } from '../services/tariffService';
import { evccService } from '../services/evccService';
import NodeCache from 'node-cache';

export const dashboardRouter = Router();

// Cache for 1 minute for dashboard data
const cache = new NodeCache({ stdTTL: 60 });

/**
 * GET /api/dashboard/overview
 * Get complete dashboard overview
 */
dashboardRouter.get('/overview', async (req, res) => {
  try {
    const cacheKey = 'dashboard-overview';
    const cached = cache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    // Fetch all data in parallel
    const [
      currentValues,
      currentPrice,
      fluviusTariff,
      evccStatus,
      todayConsumption,
      todayProduction,
      monthlyCosts,
    ] = await Promise.all([
      influxService.getCurrentValues(),
      tariffService.getCurrentPrice(),
      tariffService.calculateFluviusCapacityTariff(),
      evccService.getStatus(),
      influxService.queryConsumption('-24h', 'now()', '1h'),
      influxService.querySolarProduction('-24h', 'now()', '1h'),
      tariffService.getCostBreakdown('month'),
    ]);

    // Calculate totals
    const todayConsumptionTotal = todayConsumption.reduce(
      (sum, m) => sum + m.data.reduce((s, p) => s + p.value, 0),
      0
    ) / 1000; // Convert to kWh

    const todayProductionTotal = todayProduction.reduce(
      (sum, p) => sum + p.value,
      0
    ) / 1000; // Convert to kWh

    const overview = {
      current: {
        consumption: currentValues.consumption,
        production: currentValues.production,
        gridImport: currentValues.gridImport,
        gridExport: currentValues.gridExport,
        price: currentPrice,
        timestamp: new Date().toISOString(),
      },
      today: {
        consumption: todayConsumptionTotal,
        production: todayProductionTotal,
        selfConsumption: Math.min(todayConsumptionTotal, todayProductionTotal),
        gridImport: Math.max(0, todayConsumptionTotal - todayProductionTotal),
        gridExport: Math.max(0, todayProductionTotal - todayConsumptionTotal),
      },
      month: {
        costs: monthlyCosts,
        consumption: 0, // TODO: Calculate from historical data
        production: 0, // TODO: Calculate from historical data
      },
      fluvius: {
        averagePeak: fluviusTariff.averagePeak / 1000, // Convert to kW
        monthlyCost: fluviusTariff.monthlyCost,
        yearlyCost: fluviusTariff.yearlyCost,
      },
      evcc: evccStatus,
    };

    cache.set(cacheKey, overview);
    res.json(overview);
  } catch (error: any) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/summary/:period
 * Get summary for a specific period
 */
dashboardRouter.get('/summary/:period', async (req, res) => {
  try {
    const { period } = req.params;

    if (!['day', 'week', 'month', 'year'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    let start = '-1d';
    switch (period) {
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

    const [consumption, production, costs, selfConsumption] = await Promise.all([
      influxService.queryConsumption(start, 'now()', '1h'),
      influxService.querySolarProduction(start, 'now()', '1h'),
      tariffService.calculateEnergyCosts(start, 'now()'),
      tariffService.calculateSelfConsumptionRatio(start, 'now()'),
    ]);

    const totalConsumption = consumption.reduce(
      (sum, m) => sum + m.data.reduce((s, p) => s + p.value, 0),
      0
    ) / 1000;

    const totalProduction = production.reduce((sum, p) => sum + p.value, 0) / 1000;

    res.json({
      period,
      consumption: totalConsumption,
      production: totalProduction,
      selfConsumptionRatio: selfConsumption,
      costs,
      netBalance: totalProduction - totalConsumption,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/chart/:type
 * Get chart data for visualization
 */
dashboardRouter.get('/chart/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { start = '-24h', stop = 'now()', window = '1h' } = req.query;

    switch (type) {
      case 'consumption-production': {
        const [consumption, production] = await Promise.all([
          influxService.queryConsumption(
            start as string,
            stop as string,
            window as string
          ),
          influxService.querySolarProduction(
            start as string,
            stop as string,
            window as string
          ),
        ]);

        // Combine data for chart
        const chartData = [];
        const consumptionMap = new Map();

        // Aggregate consumption by timestamp
        for (const meterData of consumption) {
          for (const point of meterData.data) {
            const existing = consumptionMap.get(point.timestamp) || 0;
            consumptionMap.set(point.timestamp, existing + point.value);
          }
        }

        // Merge consumption and production
        const timestamps = new Set([
          ...Array.from(consumptionMap.keys()),
          ...production.map(p => p.timestamp),
        ]);

        for (const timestamp of timestamps) {
          const productionPoint = production.find(p => p.timestamp === timestamp);
          chartData.push({
            timestamp,
            consumption: (consumptionMap.get(timestamp) || 0) / 1000,
            production: productionPoint ? productionPoint.value / 1000 : 0,
          });
        }

        chartData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        res.json(chartData);
        break;
      }

      case 'costs': {
        const costs = await tariffService.calculateEnergyCosts(
          start as string,
          stop as string
        );
        res.json(costs);
        break;
      }

      case 'fluvius-peaks': {
        const fluviusTariff = await tariffService.calculateFluviusCapacityTariff();
        res.json({
          monthlyPeaks: fluviusTariff.monthlyPeaks.map(p => p / 1000),
          averagePeak: fluviusTariff.averagePeak / 1000,
        });
        break;
      }

      default:
        res.status(400).json({ error: 'Invalid chart type' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
