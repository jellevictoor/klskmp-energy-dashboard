import axios from 'axios';

export interface EVCCStatus {
  enabled: boolean;
  available: boolean;
  loadpoints?: LoadPoint[];
}

export interface LoadPoint {
  id: number;
  title: string;
  mode: string;
  charging: boolean;
  power: number;
  energy: number;
  soc: number; // State of charge
  vehicle?: string;
  connected: boolean;
}

export class EVCCService {
  private baseUrl: string;
  private enabled: boolean;

  constructor() {
    this.baseUrl = process.env.EVCC_URL || 'http://localhost:7070';
    this.enabled = process.env.EVCC_ENABLED === 'true';
  }

  /**
   * Check if EVCC is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await axios.get(`${this.baseUrl}/api/state`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.error('EVCC not available:', error);
      return false;
    }
  }

  /**
   * Get EVCC status
   */
  async getStatus(): Promise<EVCCStatus> {
    if (!this.enabled) {
      return { enabled: false, available: false };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/state`);
      const data = response.data;

      return {
        enabled: true,
        available: true,
        loadpoints: data.loadpoints || [],
      };
    } catch (error) {
      console.error('Error fetching EVCC status:', error);
      return { enabled: true, available: false };
    }
  }

  /**
   * Get loadpoint details
   */
  async getLoadPoint(id: number): Promise<LoadPoint | null> {
    const status = await this.getStatus();

    if (!status.loadpoints) return null;

    return status.loadpoints.find(lp => lp.id === id) || null;
  }

  /**
   * Get charging sessions from last N days
   */
  async getChargingSessions(days: number = 30): Promise<any[]> {
    if (!this.enabled) return [];

    try {
      const response = await axios.get(`${this.baseUrl}/api/sessions`, {
        params: { since: `${days}d` },
      });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching charging sessions:', error);
      return [];
    }
  }

  /**
   * Get heat pump data (if configured as loadpoint)
   */
  async getHeatPumpData(): Promise<any> {
    const status = await this.getStatus();

    if (!status.loadpoints) return null;

    // Find heat pump loadpoint (you may need to adjust this based on your setup)
    const heatPump = status.loadpoints.find(lp =>
      lp.title.toLowerCase().includes('heat') ||
      lp.title.toLowerCase().includes('warmte')
    );

    return heatPump || null;
  }

  /**
   * Get EV charging data
   */
  async getEVChargingData(): Promise<LoadPoint[]> {
    const status = await this.getStatus();

    if (!status.loadpoints) return [];

    // Filter for EV loadpoints (exclude heat pump)
    return status.loadpoints.filter(lp =>
      !lp.title.toLowerCase().includes('heat') &&
      !lp.title.toLowerCase().includes('warmte')
    );
  }

  /**
   * Calculate charging costs
   */
  async calculateChargingCosts(
    sessions: any[],
    averagePrice: number
  ): Promise<number> {
    let totalCost = 0;

    for (const session of sessions) {
      const energy = session.chargedEnergy || 0; // kWh
      const cost = energy * averagePrice;
      totalCost += cost;
    }

    return totalCost;
  }
}

export const evccService = new EVCCService();
