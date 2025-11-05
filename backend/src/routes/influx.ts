import { Router } from 'express';
import { influxService } from '../services/influxService';

export const influxRouter = Router();

/**
 * GET /api/influx/consumption
 * Query consumption data
 */
influxRouter.get('/consumption', async (req, res) => {
  try {
    const { start = '-24h', stop = 'now()', window = '1h', meter } = req.query;

    const data = await influxService.queryConsumption(
      start as string,
      stop as string,
      window as string,
      meter as string | undefined
    );

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/influx/production
 * Query solar production data
 */
influxRouter.get('/production', async (req, res) => {
  try {
    const { start = '-24h', stop = 'now()', window = '1h' } = req.query;

    const data = await influxService.querySolarProduction(
      start as string,
      stop as string,
      window as string
    );

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/influx/p1
 * Query P1 meter data
 */
influxRouter.get('/p1', async (req, res) => {
  try {
    const { start = '-24h', stop = 'now()' } = req.query;

    const data = await influxService.queryP1Data(
      start as string,
      stop as string
    );

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/influx/prices
 * Query energy prices
 */
influxRouter.get('/prices', async (req, res) => {
  try {
    const { start = '-24h', stop = 'now()' } = req.query;

    const data = await influxService.queryEnergyPrices(
      start as string,
      stop as string
    );

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/influx/current
 * Get current values
 */
influxRouter.get('/current', async (req, res) => {
  try {
    const data = await influxService.getCurrentValues();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/influx/meters
 * Get list of available meters
 */
influxRouter.get('/meters', async (req, res) => {
  try {
    const meters = await influxService.getAvailableMeters();
    res.json(meters);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
