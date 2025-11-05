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

#### Option 1: Build from source

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

#### Option 2: Use pre-built images from GitHub Container Registry

```bash
# Pull the latest images
docker pull ghcr.io/jellevictoor/klskmp-energy-dashboard-frontend:latest
docker pull ghcr.io/jellevictoor/klskmp-energy-dashboard-backend:latest

# Or use docker-compose with the release images
# Download docker-compose.yml from the latest release
# Then run:
docker-compose up -d
```

Images are automatically built and published on every push to main and on tagged releases.

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

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

### Workflows

1. **CI (`ci.yml`)**: Runs on every push and PR
   - Type checks TypeScript code
   - Builds frontend and backend
   - Uploads build artifacts

2. **Docker (`docker.yml`)**: Builds and publishes Docker images
   - Runs on push to `main` branch and tags
   - Publishes to GitHub Container Registry (ghcr.io)
   - Tags images with branch name, commit SHA, and version

3. **Release (`release.yml`)**: Creates GitHub releases
   - Triggered on version tags (e.g., `v1.0.0`)
   - Generates changelog
   - Publishes Docker images with version tags
   - Uploads release-ready docker-compose.yml

### Docker Images

Pre-built Docker images are available at:
- `ghcr.io/jellevictoor/klskmp-energy-dashboard-frontend:latest`
- `ghcr.io/jellevictoor/klskmp-energy-dashboard-backend:latest`

Tagged versions are available for releases (e.g., `:v1.0.0`)

## Screenshots

(Coming soon - the dashboard is being built!)

## License

MIT
