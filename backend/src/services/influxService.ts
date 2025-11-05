import { queryApi, influxConfig } from '../config/influx';
import { flux } from '@influxdata/influxdb-client';

export interface EnergyDataPoint {
  timestamp: string;
  value: number;
  meter?: string;
}

export interface MeterData {
  meter: string;
  data: EnergyDataPoint[];
}

export class InfluxService {
  /**
   * Query consumption data for a given time range
   */
  async queryConsumption(
    start: string,
    stop: string,
    window: string = '1h',
    meter?: string
  ): Promise<MeterData[]> {
    const meterFilter = meter ? `|> filter(fn: (r) => r.meter == "${meter}")` : '';

    const query = `
      from(bucket: "${influxConfig.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "${influxConfig.measurements.consumption}")
        |> filter(fn: (r) => r._field == "energy" or r._field == "power")
        ${meterFilter}
        |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
        |> yield(name: "consumption")
    `;

    return this.executeQuery(query);
  }

  /**
   * Query solar production data
   */
  async querySolarProduction(
    start: string,
    stop: string,
    window: string = '1h'
  ): Promise<EnergyDataPoint[]> {
    const query = `
      from(bucket: "${influxConfig.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "${influxConfig.measurements.production}")
        |> filter(fn: (r) => r._field == "power" or r._field == "energy")
        |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
        |> yield(name: "production")
    `;

    const result = await this.executeQuery(query);
    return result[0]?.data || [];
  }

  /**
   * Query P1 meter data (for detailed grid info)
   */
  async queryP1Data(
    start: string,
    stop: string
  ): Promise<any> {
    const query = `
      from(bucket: "${influxConfig.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "${influxConfig.measurements.p1}")
        |> aggregateWindow(every: 15m, fn: mean, createEmpty: false)
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> yield(name: "p1")
    `;

    return this.executeQuery(query);
  }

  /**
   * Query energy prices for dynamic tariff
   */
  async queryEnergyPrices(
    start: string,
    stop: string
  ): Promise<EnergyDataPoint[]> {
    const query = `
      from(bucket: "${influxConfig.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "${influxConfig.measurements.price}")
        |> filter(fn: (r) => r._field == "price" or r._field == "buy_price")
        |> yield(name: "prices")
    `;

    const result = await this.executeQuery(query);
    return result[0]?.data || [];
  }

  /**
   * Get current/latest values
   */
  async getCurrentValues(): Promise<{
    consumption: number;
    production: number;
    gridImport: number;
    gridExport: number;
    currentPrice?: number;
  }> {
    const query = `
      from(bucket: "${influxConfig.bucket}")
        |> range(start: -5m)
        |> filter(fn: (r) =>
          r._measurement == "${influxConfig.measurements.consumption}" or
          r._measurement == "${influxConfig.measurements.production}"
        )
        |> filter(fn: (r) => r._field == "power")
        |> last()
        |> yield(name: "current_values")
    `;

    try {
      const results: any[] = [];

      await new Promise((resolve, reject) => {
        queryApi.queryRows(query, {
          next(row: string[], tableMeta: any) {
            const o = tableMeta.toObject(row);
            results.push(o);
          },
          error(error: Error) {
            console.error('Query error:', error);
            reject(error);
          },
          complete() {
            resolve(results);
          },
        });
      });

      // Parse the results
      let consumption = 0;
      let production = 0;

      results.forEach(r => {
        if (r._measurement === influxConfig.measurements.consumption) {
          consumption = r._value || 0;
        } else if (r._measurement === influxConfig.measurements.production) {
          production = r._value || 0;
        }
      });

      return {
        consumption,
        production,
        gridImport: 0,
        gridExport: 0,
      };
    } catch (error) {
      console.error('Error fetching current values:', error);
      throw error;
    }
  }

  /**
   * Calculate peak consumption for Fluvius capacity tariff
   */
  async calculateMonthlyPeaks(months: number = 12): Promise<number[]> {
    const query = `
      from(bucket: "${influxConfig.bucket}")
        |> range(start: -${months}mo)
        |> filter(fn: (r) => r._measurement == "${influxConfig.measurements.consumption}")
        |> filter(fn: (r) => r._field == "power")
        |> aggregateWindow(every: 15m, fn: mean, createEmpty: false)
        |> aggregateWindow(every: 1mo, fn: max, createEmpty: false)
        |> yield(name: "monthly_peaks")
    `;

    const result = await this.executeQuery(query);
    return result[0]?.data.map((d: EnergyDataPoint) => d.value) || [];
  }

  /**
   * Get list of available meters
   */
  async getAvailableMeters(): Promise<string[]> {
    const query = `
      import "influxdata/influxdb/schema"

      schema.tagValues(
        bucket: "${influxConfig.bucket}",
        tag: "meter",
        predicate: (r) => r._measurement == "${influxConfig.measurements.consumption}",
        start: -30d
      )
    `;

    try {
      const meters: string[] = [];

      await new Promise((resolve, reject) => {
        queryApi.queryRows(query, {
          next(row: string[], tableMeta: any) {
            const o = tableMeta.toObject(row);
            if (o._value) {
              meters.push(o._value);
            }
          },
          error(error: Error) {
            console.error('Query error:', error);
            reject(error);
          },
          complete() {
            resolve(meters);
          },
        });
      });

      return meters;
    } catch (error) {
      console.error('Error fetching meters:', error);
      return [];
    }
  }

  /**
   * Query SDM device power (excluding main-panel)
   * SDM devices are Smart Distribution Meters
   */
  async querySDMPower(
    start: string,
    stop: string,
    window: string = '1m',
    excludeMainPanel: boolean = true
  ): Promise<EnergyDataPoint[]> {
    const deviceFilter = excludeMainPanel
      ? '|> filter(fn: (r) => r["device"] != "main-panel")'
      : '';

    const query = `
      from(bucket: "${influxConfig.meteringBucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r["_measurement"] == "${influxConfig.meteringMeasurement}")
        |> filter(fn: (r) => r["source"] == "sdm")
        |> filter(fn: (r) => r["metric"] == "Power")
        |> filter(fn: (r) => r["_field"] == "value")
        ${deviceFilter}
        |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
        |> yield(name: "sdm_power")
    `;

    const result = await this.executeQuery(query);
    return result[0]?.data || [];
  }

  /**
   * Query Shelly device power
   * Shelly devices are smart power monitoring plugs/switches
   */
  async queryShellyPower(
    start: string,
    stop: string,
    window: string = '1m',
    device?: string
  ): Promise<EnergyDataPoint[]> {
    const deviceFilter = device ? `|> filter(fn: (r) => r["device"] == "${device}")` : '';

    const query = `
      from(bucket: "${influxConfig.meteringBucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r["_measurement"] == "${influxConfig.meteringMeasurement}")
        |> filter(fn: (r) => r["source"] == "shelly")
        |> filter(fn: (r) => r["metric"] == "Power")
        |> filter(fn: (r) => r["_field"] == "value")
        ${deviceFilter}
        |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
        |> yield(name: "shelly_power")
    `;

    const result = await this.executeQuery(query);
    return result[0]?.data || [];
  }

  /**
   * Query P1 smart meter power data
   * P1 interface provides grid power delivery (converted from kW to W)
   */
  async queryP1Power(
    start: string,
    stop: string,
    window: string = '1m'
  ): Promise<EnergyDataPoint[]> {
    const query = `
      from(bucket: "${influxConfig.meteringBucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r["_measurement"] == "${influxConfig.meteringMeasurement}")
        |> filter(fn: (r) => r["source"] == "p1")
        |> filter(fn: (r) => r["_field"] == "PowerDelivered")
        |> map(fn: (r) => ({ r with _value: r._value * 1000.0 }))
        |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
        |> yield(name: "p1_power")
    `;

    const result = await this.executeQuery(query);
    return result[0]?.data || [];
  }

  /**
   * Query PV inverter production
   * Solar production from SDM device monitoring the PV inverter
   */
  async queryPVInverter(
    start: string,
    stop: string,
    window: string = '1m'
  ): Promise<EnergyDataPoint[]> {
    const query = `
      from(bucket: "${influxConfig.meteringBucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r["_measurement"] == "${influxConfig.meteringMeasurement}")
        |> filter(fn: (r) => r["source"] == "sdm")
        |> filter(fn: (r) => r["device"] == "pv-inverter")
        |> filter(fn: (r) => r["_field"] == "value")
        |> filter(fn: (r) => r["metric"] == "Power")
        |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
        |> yield(name: "pv_production")
    `;

    const result = await this.executeQuery(query);
    return result[0]?.data || [];
  }

  /**
   * Query net consumption (grid power - solar production)
   * This calculates actual home consumption by combining P1 grid data with PV production
   */
  async queryNetConsumption(
    start: string,
    stop: string,
    window: string = '1m'
  ): Promise<EnergyDataPoint[]> {
    const query = `
      // P1 power data (grid delivery, converted kW to W)
      p1Data = from(bucket: "${influxConfig.meteringBucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r["_measurement"] == "${influxConfig.meteringMeasurement}")
        |> filter(fn: (r) => r["source"] == "p1")
        |> filter(fn: (r) => r["_field"] == "PowerDelivered")
        |> map(fn: (r) => ({ r with _value: r._value * 1000.0 }))
        |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)

      // SDM power data (PV inverter production)
      sdmData = from(bucket: "${influxConfig.meteringBucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r["_measurement"] == "${influxConfig.meteringMeasurement}")
        |> filter(fn: (r) => r["source"] == "sdm")
        |> filter(fn: (r) => r["device"] == "pv-inverter")
        |> filter(fn: (r) => r["_field"] == "value")
        |> filter(fn: (r) => r["metric"] == "Power")
        |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)

      // Join and calculate net consumption
      join(tables: {p1: p1Data, sdm: sdmData}, on: ["_time"])
        |> map(fn: (r) => ({
            _time: r._time,
            _value: r._value_p1 + (-1.0 * r._value_sdm),
            _field: "net_consumption"
        }))
        |> yield(name: "net_consumption")
    `;

    const result = await this.executeQuery(query);
    return result[0]?.data || [];
  }

  /**
   * Query Blitz device power
   * Blitz devices (e.g., EV chargers with "rechts" and "links" connectors)
   */
  async queryBlitzPower(
    start: string,
    stop: string,
    window: string = '1m',
    device?: 'rechts' | 'links'
  ): Promise<EnergyDataPoint[]> {
    const deviceFilter = device
      ? `|> filter(fn: (r) => r["device"] == "${device}")`
      : `|> filter(fn: (r) => r["device"] == "rechts" or r["device"] == "links")`;

    const query = `
      from(bucket: "${influxConfig.meteringBucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r["_measurement"] == "${influxConfig.meteringMeasurement}")
        |> filter(fn: (r) => r["source"] == "blitz")
        |> filter(fn: (r) => r["metric"] == "Power")
        |> filter(fn: (r) => r["_field"] == "value")
        ${deviceFilter}
        |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
        |> yield(name: "blitz_power")
    `;

    const result = await this.executeQuery(query);
    return result[0]?.data || [];
  }

  /**
   * Query all power sources for a comprehensive overview
   * Returns data grouped by source and device
   */
  async queryPowerOverview(
    start: string,
    stop: string,
    window: string = '1m'
  ): Promise<MeterData[]> {
    const query = `
      from(bucket: "${influxConfig.meteringBucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r["_measurement"] == "${influxConfig.meteringMeasurement}")
        |> filter(fn: (r) =>
            r["source"] == "sdm" or
            r["source"] == "shelly" or
            r["source"] == "blitz" or
            r["source"] == "p1"
        )
        |> filter(fn: (r) => r["metric"] == "Power" or r["_field"] == "PowerDelivered")
        |> map(fn: (r) => ({
            r with
            _value: if r["source"] == "p1" and r["_field"] == "PowerDelivered"
                    then r._value * 1000.0
                    else r._value
        }))
        |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
        |> yield(name: "power_overview")
    `;

    return this.executeQuery(query);
  }

  /**
   * Get current/latest power values from all sources
   */
  async getCurrentPowerValues(): Promise<{
    sdm: { [device: string]: number };
    shelly: { [device: string]: number };
    blitz: { [device: string]: number };
    p1: number;
    pvProduction: number;
    netConsumption: number;
  }> {
    const query = `
      from(bucket: "${influxConfig.meteringBucket}")
        |> range(start: -5m)
        |> filter(fn: (r) => r["_measurement"] == "${influxConfig.meteringMeasurement}")
        |> filter(fn: (r) =>
            r["source"] == "sdm" or
            r["source"] == "shelly" or
            r["source"] == "blitz" or
            r["source"] == "p1"
        )
        |> last()
        |> yield(name: "current_values")
    `;

    try {
      const results: any[] = [];

      await new Promise((resolve, reject) => {
        queryApi.queryRows(query, {
          next(row: string[], tableMeta: any) {
            const o = tableMeta.toObject(row);
            results.push(o);
          },
          error(error: Error) {
            console.error('Query error:', error);
            reject(error);
          },
          complete() {
            resolve(results);
          },
        });
      });

      // Parse results into structured format
      const parsed = {
        sdm: {} as { [device: string]: number },
        shelly: {} as { [device: string]: number },
        blitz: {} as { [device: string]: number },
        p1: 0,
        pvProduction: 0,
        netConsumption: 0,
      };

      results.forEach((r) => {
        const source = r.source;
        const device = r.device || 'default';
        let value = r._value || 0;

        // Convert P1 from kW to W
        if (source === 'p1' && r._field === 'PowerDelivered') {
          value *= 1000.0;
          parsed.p1 = value;
        } else if (source === 'sdm') {
          if (device === 'pv-inverter') {
            parsed.pvProduction = value;
          }
          parsed.sdm[device] = value;
        } else if (source === 'shelly') {
          parsed.shelly[device] = value;
        } else if (source === 'blitz') {
          parsed.blitz[device] = value;
        }
      });

      // Calculate net consumption
      parsed.netConsumption = parsed.p1 - parsed.pvProduction;

      return parsed;
    } catch (error) {
      console.error('Error fetching current power values:', error);
      throw error;
    }
  }

  /**
   * Query devices by source type
   * Useful for discovering available devices in the system
   */
  async getDevicesBySource(source: 'sdm' | 'shelly' | 'blitz' | 'p1'): Promise<string[]> {
    const query = `
      import "influxdata/influxdb/schema"

      schema.tagValues(
        bucket: "${influxConfig.meteringBucket}",
        tag: "device",
        predicate: (r) =>
          r._measurement == "${influxConfig.meteringMeasurement}" and
          r.source == "${source}",
        start: -30d
      )
    `;

    try {
      const devices: string[] = [];

      await new Promise((resolve, reject) => {
        queryApi.queryRows(query, {
          next(row: string[], tableMeta: any) {
            const o = tableMeta.toObject(row);
            if (o._value) {
              devices.push(o._value);
            }
          },
          error(error: Error) {
            console.error('Query error:', error);
            reject(error);
          },
          complete() {
            resolve(devices);
          },
        });
      });

      return devices;
    } catch (error) {
      console.error('Error fetching devices:', error);
      return [];
    }
  }

  /**
   * Execute a Flux query and return structured data
   */
  private async executeQuery(query: string): Promise<MeterData[]> {
    const dataByMeter = new Map<string, EnergyDataPoint[]>();

    return new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next(row: string[], tableMeta: any) {
          const o = tableMeta.toObject(row);
          const meter = o.meter || 'default';

          if (!dataByMeter.has(meter)) {
            dataByMeter.set(meter, []);
          }

          dataByMeter.get(meter)!.push({
            timestamp: o._time,
            value: o._value,
            meter: o.meter,
          });
        },
        error(error: Error) {
          console.error('Query error:', error);
          reject(error);
        },
        complete() {
          const result: MeterData[] = Array.from(dataByMeter.entries()).map(
            ([meter, data]) => ({ meter, data })
          );
          resolve(result);
        },
      });
    });
  }
}

export const influxService = new InfluxService();
