# Features

## Dashboard Overview

### Real-time Monitoring
- **Current consumption** from all meters
- **Solar production** tracking
- **Grid import/export** status
- **Current electricity price** (dynamic tariff)
- **Auto-refresh** every 60 seconds

### Today's Summary
- Total energy consumed today
- Total solar energy produced
- Self-consumption ratio
- Energy sold to grid

### 24-Hour Energy Flow Chart
- Interactive line chart showing consumption vs. production
- Hourly aggregation
- Zoom and pan functionality
- Color-coded for easy reading

### Fluvius Capacity Tariff
- **Automatic calculation** based on your consumption data
- Average peak consumption display (kW)
- Monthly and yearly cost estimates
- Based on actual Fluvius tariff rates for Flanders, Belgium

### EVCC Integration (Optional)
- Heat pump status and power consumption
- EV charging status with State of Charge (SOC)
- Real-time charging power
- Charging session tracking

## Analytics Page

### Smart Insights
- **Capacity Tariff Recommendations**: Tips to reduce your Fluvius capacity tariff
- **Self-Consumption Optimization**: Suggestions to increase solar self-consumption
- **Cost Reduction Tips**: Personalized advice based on your usage patterns

### Consumption Comparison
- Compare current period to previous period
- Day, week, month, or year comparisons
- Percentage change calculations
- Trend indicators

### Peak Consumption Times
- **Hourly consumption chart**: See which hours you use most energy
- **Peak hour identification**: Know when to avoid heavy appliances
- **30-day average**: Based on actual usage patterns
- **Actionable recommendations**: Tips to shift consumption

## Costs Page

### Current Pricing
- **Real-time electricity price** from your dynamic tariff
- Price forecasting (if available)
- Historical price trends

### Cost Breakdown
- **Monthly cost overview**:
  - Energy consumption costs
  - Fluvius capacity tariff
  - Solar feed-in revenue
  - Net cost after revenue

- **Interactive pie chart**: Visual breakdown of cost components
- **Detailed cost table**: Line-by-line breakdown

### Fluvius Capacity Tariff Details
- Average peak consumption (kW)
- Current tariff rate (€/kW/month)
- Monthly and yearly projections
- Tips to reduce capacity charges

### Dynamic Tariff Support
- Integration with dynamic pricing data
- Hourly price variations
- Cost calculations based on actual consumption and prices

## EVCC Page

### Heat Pump Monitoring
- Current status (Active/Idle)
- Real-time power consumption
- Daily energy consumption
- Operating mode (PV mode, Min+PV, etc.)

### EV Charging
- **Charging status**: Active, connected, or idle
- **State of Charge (SOC)**: Visual battery indicator
- **Current charging power**
- **Energy charged** in current session
- **Charging mode**: Solar-only, fast, etc.

### Charging Sessions History
- Last 30 days of charging sessions
- Energy delivered per session
- Duration and date/time
- Session costs (when combined with pricing data)

## Technical Features

### Data Sources
- **InfluxDB** integration for time-series data
- **P1 meter** support (DSMR protocol)
- **Solar inverter** data
- **EVCC** API integration
- **Dynamic tariff** providers

### Performance
- **Caching**: 1-minute cache for dashboard, 5-minute for analytics
- **Efficient queries**: Optimized Flux queries for InfluxDB
- **Lazy loading**: Components load data as needed
- **Auto-refresh**: Configurable refresh intervals

### Mobile Support
- **Fully responsive** design
- Works on phones, tablets, and desktops
- **Touch-friendly** interface
- **PWA-ready**: Can be installed as a mobile app

### Deployment
- **Docker support**: Easy deployment with docker-compose
- **Production-ready**: Nginx, health checks, logging
- **Scalable**: Can handle multiple meters and data sources

## Belgium-Specific Features

### Fluvius Capacity Tariff
The dashboard is specifically designed for the Flemish capacity tariff system:
- Calculates average monthly peaks
- Uses actual Fluvius tariff rates
- Provides recommendations to reduce capacity charges
- Tracks peak consumption per month

### Dutch/Belgian UI
- Currency: EUR (€)
- Time zone: Europe/Brussels
- Date format: DD/MM/YYYY
- Decimal separator: comma (,)

## Coming Soon

Future features planned:
- [ ] **Alerts**: Email/push notifications for high usage or costs
- [ ] **Automation**: API for home automation integration
- [ ] **Export**: CSV/Excel export of data
- [ ] **Comparison**: Compare to neighbors or regional averages
- [ ] **Forecasting**: Predict next month's costs based on trends
- [ ] **Multi-language**: Support for Dutch and French
- [ ] **Weather integration**: Correlate consumption with weather
- [ ] **Carbon footprint**: Track CO2 savings from solar

## API

All features are available via REST API at `/api`:

### Dashboard
- `GET /api/dashboard/overview` - Complete dashboard overview
- `GET /api/dashboard/summary/:period` - Period summary
- `GET /api/dashboard/chart/:type` - Chart data

### Analytics
- `GET /api/analytics/insights` - Smart insights and recommendations
- `GET /api/analytics/comparison` - Period comparisons
- `GET /api/analytics/peak-times` - Peak consumption analysis

### Tariff & Costs
- `GET /api/tariff/fluvius` - Fluvius capacity tariff
- `GET /api/tariff/costs` - Cost calculations
- `GET /api/tariff/breakdown/:period` - Detailed breakdown
- `GET /api/tariff/current-price` - Current electricity price

### EVCC
- `GET /api/evcc/status` - EVCC status
- `GET /api/evcc/sessions` - Charging sessions
- `GET /api/evcc/heatpump` - Heat pump data

### InfluxDB
- `GET /api/influx/consumption` - Consumption data
- `GET /api/influx/production` - Production data
- `GET /api/influx/prices` - Price data
- `GET /api/influx/meters` - Available meters

See API documentation for detailed parameters and responses.
