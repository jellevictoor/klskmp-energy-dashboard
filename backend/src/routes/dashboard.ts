import { Router } from 'express';
import { influxService } from '../services/influxService';
import { tariffService } from '../services/tariffService';
import { evccService } from '../services/evccService';
import NodeCache from 'node-cache';

export const dashboardRouter = Router();

// Cache for 1 minute for dashboard data
const cache = new NodeCache({ stdTTL: 60 });

/**
 * GET /api/dashboard/test
 * Simple test endpoint
 */
dashboardRouter.get('/test', (req, res) => {
  res.json({ message: 'Debug endpoint is working!', time: new Date().toISOString() });
});

/**
 * GET /api/dashboard/debug-p1
 * Debug P1 data structure
 */
dashboardRouter.get('/debug-p1', async (req, res) => {
  try {
    const p1Test = await influxService.testConnection();
    const p1Data = await influxService.queryP1Power('-1h', 'now()', '5m');

    res.json({
      sampleData: p1Test.slice(0, 3),
      p1PowerResults: {
        count: p1Data.length,
        sample: p1Data.slice(0, 3)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

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
      todayData,
      monthlyCosts,
    ] = await Promise.all([
      influxService.getCurrentPowerValues(),
      tariffService.getCurrentPrice(),
      tariffService.calculateFluviusCapacityTariff(),
      evccService.getStatus(),
      influxService.queryNetConsumption('-24h', 'now()', '1h'),
      tariffService.getCostBreakdown('month'),
    ]);

    // Calculate totals from net consumption data
    const todayConsumptionTotal = todayData.reduce((sum, p) => sum + Math.max(0, p.value), 0) / 1000; // Convert to kWh
    const todayProductionTotal = currentValues.pvProduction > 0 ? currentValues.pvProduction / 1000 : 0;

    const overview = {
      current: {
        consumption: currentValues.netConsumption > 0 ? currentValues.netConsumption : currentValues.p1,
        production: currentValues.pvProduction,
        gridImport: currentValues.p1,
        gridExport: 0,
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

    const [netConsumption, production, costs, selfConsumption] = await Promise.all([
      influxService.queryNetConsumption(start, 'now()', '1h'),
      influxService.queryPVInverter(start, 'now()', '1h'),
      tariffService.calculateEnergyCosts(start, 'now()'),
      tariffService.calculateSelfConsumptionRatio(start, 'now()'),
    ]);

    const totalConsumption = netConsumption.reduce((sum, p) => sum + Math.abs(p.value), 0) / 1000;
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
        const [netConsumption, pvProduction] = await Promise.all([
          influxService.queryNetConsumption(
            start as string,
            stop as string,
            window as string
          ),
          influxService.queryPVInverter(
            start as string,
            stop as string,
            window as string
          ),
        ]);

        // Combine data for chart
        const chartData = [];
        const timestamps = new Set([
          ...netConsumption.map(p => p.timestamp),
          ...pvProduction.map(p => p.timestamp),
        ]);

        for (const timestamp of timestamps) {
          const netPoint = netConsumption.find(p => p.timestamp === timestamp);
          const prodPoint = pvProduction.find(p => p.timestamp === timestamp);
          chartData.push({
            timestamp,
            consumption: netPoint ? Math.abs(netPoint.value) / 1000 : 0,
            production: prodPoint ? prodPoint.value / 1000 : 0,
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
