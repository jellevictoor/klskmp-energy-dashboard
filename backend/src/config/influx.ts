import { InfluxDB } from '@influxdata/influxdb-client';

if (!process.env.INFLUX_URL || !process.env.INFLUX_TOKEN || !process.env.INFLUX_ORG) {
  throw new Error('InfluxDB configuration missing. Please check your .env file.');
}

export const influxDB = new InfluxDB({
  url: process.env.INFLUX_URL,
  token: process.env.INFLUX_TOKEN,
});

export const queryApi = influxDB.getQueryApi(process.env.INFLUX_ORG);

export const influxConfig = {
  url: process.env.INFLUX_URL,
  token: process.env.INFLUX_TOKEN,
  org: process.env.INFLUX_ORG,
  bucket: process.env.INFLUX_BUCKET || 'energy',
  priceBucket: process.env.INFLUX_PRICE_BUCKET || process.env.INFLUX_BUCKET || 'energy_prices',
  measurements: {
    consumption: process.env.INFLUX_CONSUMPTION_MEASUREMENT || 'energy_consumption',
    production: process.env.INFLUX_PRODUCTION_MEASUREMENT || 'solar_production',
    price: process.env.INFLUX_PRICE_MEASUREMENT || 'electricity_price',
    p1: process.env.INFLUX_P1_MEASUREMENT || 'p1_meter',
  },
  priceCountry: process.env.INFLUX_PRICE_COUNTRY || 'BE',
};
