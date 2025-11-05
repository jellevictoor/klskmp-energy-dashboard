# Setup Guide

This guide will help you set up and configure your Energy Dashboard.

## Prerequisites

Before you begin, ensure you have:

1. **InfluxDB** instance running with your energy data
2. **Node.js 18+** (for local development) or **Docker** (for containerized deployment)
3. **Energy data** being written to InfluxDB from:
   - P1 meter (DSMR protocol)
   - Solar inverter
   - Energy price feed (optional)
   - EVCC (optional)

## Quick Start

### Option 1: Docker (Recommended)

1. **Clone and configure**:
```bash
cd klskmp-energy-dashboard
cp backend/.env.example backend/.env
```

2. **Edit `backend/.env`** with your settings:
```env
# InfluxDB Configuration
INFLUX_URL=http://your-influx-host:8086
INFLUX_TOKEN=your-influx-token
INFLUX_ORG=your-org
INFLUX_BUCKET=energy

# Optional: EVCC
EVCC_URL=http://your-evcc-host:7070
EVCC_ENABLED=true
```

3. **Start the application**:
```bash
docker-compose up -d
```

4. **Access the dashboard**:
- Frontend: http://localhost
- Backend API: http://localhost:3001

### Option 2: Local Development

1. **Install dependencies**:
```bash
npm install
```

2. **Configure backend**:
```bash
cd backend
cp .env.example .env
# Edit .env with your settings
```

3. **Start development servers**:
```bash
# From project root
npm run dev
```

4. **Access the dashboard**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## InfluxDB Configuration

### Required Data

Your InfluxDB needs these measurements:

1. **Energy Consumption** (`energy_consumption` by default)
   - Field: `power` (W) or `energy` (Wh)
   - Tag: `meter` (optional, for multiple meters)

2. **Solar Production** (`solar_production` by default)
   - Field: `power` (W) or `energy` (Wh)

3. **Energy Prices** (`energy_prices` by default)
   - Field: `price` (EUR/kWh)

4. **P1 Meter Data** (`p1_meter` by default)
   - Various fields for detailed grid info

See `backend/src/config/influx-schema.md` for detailed schema recommendations.

### Custom Measurement Names

If your measurements have different names, update them in `.env`:

```env
INFLUX_CONSUMPTION_MEASUREMENT=your_consumption_measurement
INFLUX_PRODUCTION_MEASUREMENT=your_production_measurement
INFLUX_PRICE_MEASUREMENT=your_price_measurement
INFLUX_P1_MEASUREMENT=your_p1_measurement
```

## Fluvius Capacity Tariff

The dashboard automatically calculates your Fluvius capacity tariff based on your consumption data.

**How it works:**
1. Calculates your monthly peak consumption (highest 15-minute average)
2. Averages the peaks over 12 months
3. Multiplies by the Fluvius tariff rate (€3.07/kW/month in 2024)

**Configure the tariff rate**:
```env
FLUVIUS_CAPACITY_TARIFF_MONTHLY=3.07
```

Update this value if Fluvius changes their rates.

## Dynamic Tariff Configuration

### Using InfluxDB Prices

If you have energy prices in InfluxDB (recommended):

1. Ensure prices are written to the `energy_prices` measurement
2. The dashboard will automatically use these prices

### Using Fixed Prices

If you don't have dynamic prices:

```env
DEFAULT_ELECTRICITY_PRICE=0.30
DEFAULT_FEEDIN_PRICE=0.05
```

## EVCC Integration

If you use EVCC for EV charging and heat pump management:

1. **Enable EVCC**:
```env
EVCC_URL=http://your-evcc-host:7070
EVCC_ENABLED=true
```

2. **Configure loadpoints**: EVCC loadpoints will be auto-detected

3. **View in dashboard**: Navigate to the EVCC page to see:
   - Heat pump status and consumption
   - EV charging status and SOC
   - Charging sessions history

## Home Assistant Integration

If you're collecting data via Home Assistant:

### InfluxDB Integration

Add to your `configuration.yaml`:

```yaml
influxdb:
  api_version: 2
  ssl: false
  host: your-influx-host
  port: 8086
  token: !secret influxdb_token
  organization: your-org
  bucket: energy
  tags:
    source: home-assistant
  include:
    entities:
      - sensor.power_consumption
      - sensor.solar_production
      - sensor.electricity_price
      # Add all your energy sensors
```

### Energy Dashboard

You can keep using Home Assistant's energy dashboard alongside this one!
This dashboard provides:
- Better Fluvius capacity tariff visualization
- More detailed analytics and insights
- Mobile-optimized interface
- Custom cost calculations

## Customization

### Solar Panel Capacity

Update your solar capacity for better analytics:

```env
SOLAR_CAPACITY_KWP=10.0
```

### Time Zone

```env
TIMEZONE=Europe/Brussels
```

### Currency

```env
CURRENCY=EUR
```

## Troubleshooting

### Dashboard shows no data

1. **Check InfluxDB connection**:
```bash
curl http://localhost:3001/api/influx/current
```

2. **Verify InfluxDB credentials** in `.env`

3. **Check measurement names** match your InfluxDB schema

4. **View backend logs**:
```bash
docker-compose logs -f backend
```

### Fluvius calculation seems wrong

1. **Check your data frequency**: Needs at least 15-minute intervals
2. **Verify peak calculation period**: Default is 12 months
3. **Update tariff rate** if Fluvius changed rates

### EVCC not showing

1. **Check EVCC is running**:
```bash
curl http://your-evcc-host:7070/api/state
```

2. **Verify EVCC_URL** in `.env`

3. **Enable EVCC**:
```env
EVCC_ENABLED=true
```

## Production Deployment

### Using Docker

1. **Update docker-compose.yml** to use environment variables:
```yaml
environment:
  - NODE_ENV=production
  - INFLUX_URL=${INFLUX_URL}
  - INFLUX_TOKEN=${INFLUX_TOKEN}
  # ... other vars
```

2. **Use secrets for sensitive data**:
```bash
docker secret create influx_token influx_token.txt
```

3. **Set up reverse proxy** (nginx, Traefik) for HTTPS

### Using systemd

See `docs/systemd-setup.md` for systemd service configuration.

## Updating

### Docker

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

### Local

```bash
git pull
npm install
npm run build
npm start
```

## Support

For issues and questions:
- Check the logs: `docker-compose logs -f`
- Review InfluxDB schema: `backend/src/config/influx-schema.md`
- Open an issue on GitHub

## Next Steps

1. **Set up alerts**: Configure alerts for high consumption or costs
2. **Add automation**: Integrate with home automation to optimize usage
3. **Share feedback**: Let us know how you're using the dashboard!
