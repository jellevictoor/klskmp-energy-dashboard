import { Router } from 'express';
import { evccService } from '../services/evccService';

export const evccRouter = Router();

/**
 * GET /api/evcc/status
 * Get EVCC status
 */
evccRouter.get('/status', async (req, res) => {
  try {
    const status = await evccService.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/evcc/loadpoint/:id
 * Get specific loadpoint
 */
evccRouter.get('/loadpoint/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const loadpoint = await evccService.getLoadPoint(Number(id));

    if (!loadpoint) {
      return res.status(404).json({ error: 'Loadpoint not found' });
    }

    res.json(loadpoint);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/evcc/sessions
 * Get charging sessions
 */
evccRouter.get('/sessions', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const sessions = await evccService.getChargingSessions(Number(days));
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/evcc/heatpump
 * Get heat pump data
 */
evccRouter.get('/heatpump', async (req, res) => {
  try {
    const data = await evccService.getHeatPumpData();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/evcc/ev
 * Get EV charging data
 */
evccRouter.get('/ev', async (req, res) => {
  try {
    const data = await evccService.getEVChargingData();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/evcc/charging-costs
 * Calculate charging costs
 */
evccRouter.get('/charging-costs', async (req, res) => {
  try {
    const { days = 30, averagePrice = 0.30 } = req.query;
    const sessions = await evccService.getChargingSessions(Number(days));
    const costs = await evccService.calculateChargingCosts(
      sessions,
      Number(averagePrice)
    );
    res.json({ totalCost: costs, sessions: sessions.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
