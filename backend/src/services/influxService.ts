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
    stop: string,
    window: string = '1h'
  ): Promise<EnergyDataPoint[]> {
    const query = `
      from(bucket: "${influxConfig.priceBucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "${influxConfig.measurements.price}")
        |> filter(fn: (r) => r._field == "price_eur_kwh" or r._field == "price_eur_mwh" or r._field == "price_eur_kwh_with_tax")
        |> filter(fn: (r) => r.country == "${influxConfig.priceCountry}")
        |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
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
      import "date"

      consumption = from(bucket: "${influxConfig.bucket}")
        |> range(start: -5m)
        |> filter(fn: (r) => r._measurement == "${influxConfig.measurements.consumption}")
        |> filter(fn: (r) => r._field == "power")
        |> last()
        |> findRecord(fn: (key) => true, idx: 0)

      production = from(bucket: "${influxConfig.bucket}")
        |> range(start: -5m)
        |> filter(fn: (r) => r._measurement == "${influxConfig.measurements.production}")
        |> filter(fn: (r) => r._field == "power")
        |> last()
        |> findRecord(fn: (key) => true, idx: 0)

      {
        consumption: consumption._value,
        production: production._value
      }
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

      // For now, return mock data structure
      // In real implementation, parse the results properly
      return {
        consumption: 0,
        production: 0,
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
