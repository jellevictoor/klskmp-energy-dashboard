# Energy Consumption Dashboard

A comprehensive energy monitoring dashboard for Belgian households with solar panels, dynamic tariffs, and EVCC integration.

## Features

- 📊 **Real-time Monitoring**: Track your energy consumption and production in real-time
- 💰 **Cost Tracking**: Calculate costs with dynamic tariffs and Fluvius capacity tariff
- ☀️ **Solar Integration**: Monitor solar panel production and self-consumption
- 🚗 **EVCC Support**: Track heat pump and EV charging
- 📱 **Mobile Responsive**: Works perfectly on all devices
- 📈 **Analytics**: Get valuable insights and optimization recommendations
- 🇧🇪 **Belgium Specific**: Fluvius capacity tariff calculations included

## Architecture

- **Frontend**: React + TypeScript + Vite with TailwindCSS
- **Backend**: Node.js + Express
- **Database**: InfluxDB integration
- **Deployment**: Docker-ready

## Quick Start

### Prerequisites

- Node.js 18+ or Docker
- InfluxDB instance with your energy data
- EVCC (optional)

### Configuration

1. Copy the environment file:
```bash
cp backend/.env.example backend/.env
```

2. Edit `backend/.env` with your settings:
- InfluxDB connection details
- Dynamic tariff settings
- Fluvius capacity tariff parameters
- EVCC connection (if applicable)

### Running Locally

```bash
# Install dependencies
npm install

# Run development servers (frontend + backend)
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3001`.

### Running with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Configuration

### InfluxDB Setup

Your InfluxDB should contain measurements for:
- Energy consumption (per meter)
- Solar production
- Energy prices
- EVCC data (optional)

See `backend/src/config/influx-schema.md` for recommended schema.

### Dynamic Tariff

Configure your dynamic tariff in the backend `.env` file or through the web interface.

### Fluvius Capacity Tariff

The dashboard automatically calculates your Fluvius capacity tariff based on:
- Your average peak consumption per month
- Fluvius tariff rates for your region

## Screenshots

(Coming soon - the dashboard is being built!)

## License

MIT
