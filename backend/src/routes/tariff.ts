import { Router } from 'express';
import { tariffService } from '../services/tariffService';

export const tariffRouter = Router();

/**
 * GET /api/tariff/fluvius
 * Get Fluvius capacity tariff calculation
 */
tariffRouter.get('/fluvius', async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const data = await tariffService.calculateFluviusCapacityTariff(Number(months));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tariff/costs
 * Calculate energy costs for a period
 */
tariffRouter.get('/costs', async (req, res) => {
  try {
    const { start = '-30d', stop = 'now()' } = req.query;
    const data = await tariffService.calculateEnergyCosts(
      start as string,
      stop as string
    );
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tariff/breakdown/:period
 * Get cost breakdown for a specific period
 */
tariffRouter.get('/breakdown/:period', async (req, res) => {
  try {
    const { period } = req.params;

    if (!['day', 'week', 'month', 'year'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const data = await tariffService.getCostBreakdown(
      period as 'day' | 'week' | 'month' | 'year'
    );
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tariff/self-consumption
 * Calculate self-consumption ratio
 */
tariffRouter.get('/self-consumption', async (req, res) => {
  try {
    const { start = '-30d', stop = 'now()' } = req.query;
    const ratio = await tariffService.calculateSelfConsumptionRatio(
      start as string,
      stop as string
    );
    res.json({ selfConsumptionRatio: ratio });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tariff/current-price
 * Get current electricity price with breakdown
 */
tariffRouter.get('/current-price', async (req, res) => {
  try {
    const priceData = await tariffService.getCurrentPrice();
    res.json({
      ...priceData,
      currency: 'EUR',
      unit: 'kWh',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tariff/forecast
 * Get price forecast
 */
tariffRouter.get('/forecast', async (req, res) => {
  try {
    const forecast = await tariffService.getPriceForecast();
    res.json(forecast);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tariff/rates
 * Get all Ecopower tariff rates and formulas
 */
tariffRouter.get('/rates', async (req, res) => {
  try {
    const rates = tariffService.getTariffRates();
    res.json(rates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
