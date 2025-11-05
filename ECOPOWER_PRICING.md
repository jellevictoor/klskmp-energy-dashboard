# Ecopower Tariff Calculation

This document explains the Ecopower electricity tariff structure implemented in the energy dashboard.

## Tariff Structure (October 2025)

The Ecopower tariff consists of multiple components calculated based on your consumption, injection, and EPEX day-ahead electricity prices.

### Fixed Costs (EUR/month)
- **Ecopower Subscription**: €5.00/month
- **Fluvius Subscription**: €2.00/month
- **Total Fixed Cost**: €7.00/month

### Variable Energy Costs

#### 1. Energy Cost (Consumption)
The cost per kWh of electricity consumed from the grid is calculated using:

```
Cost per kWh = (0.00102 × EPEX_price_EUR/MWh) + €0.004
```

Where:
- `EPEX_price_EUR/MWh` is the day-ahead EPEX electricity price in EUR per MWh
- This formula results in a dynamic price that varies hourly based on market conditions

**Example**: If EPEX price is 100 EUR/MWh:
```
Cost = (0.00102 × 100) + 0.004 = €0.106/kWh
```

#### 2. Energy Revenue (Injection)
The revenue per kWh of electricity injected back to the grid is calculated using:

```
Revenue per kWh = (0.00098 × EPEX_price_EUR/MWh) - €0.015
```

**Example**: If EPEX price is 100 EUR/MWh:
```
Revenue = (0.00098 × 100) - 0.015 = €0.083/kWh
```

Note: The fixed offset is negative, meaning you receive slightly less than the market price for injected energy.

#### 3. Distribution Cost
Network distribution cost for consumed energy:
- **Rate**: €0.0704386/kWh
- Applied to total energy delivered (consumed)

#### 4. Injection Tariff (Prosumer Tariff)
Tariff for injecting energy back to the grid:
- **Rate**: €0.0017510/kWh
- Applied to total energy returned (injected)

#### 5. Green Certificate (GSC)
Green certificate surcharge:
- **Rate**: €0.011/kWh
- Applied to total energy delivered (consumed)

#### 6. CHP (WKK) Surcharge
Combined Heat and Power surcharge:
- **Rate**: €0.00392/kWh
- Applied to total energy delivered (consumed)

#### 7. Capacity Tariff
Based on peak power consumption:
- **Rate**: €56.93 per kW per year (€4.74/kW/month)
- Calculated based on monthly peak power usage
- Example: If your peak power is 5 kW, monthly capacity cost = 5 × €4.74 = €23.70

## Total Cost Calculation

The total monthly cost is calculated as:

```
Total Cost = Fixed Cost
           + Energy Cost
           + Distribution Cost
           + Injection Cost
           + GSC Cost
           + WKK Cost
           + Capacity Cost
           - Energy Revenue

Net Cost = Total Cost - Energy Revenue
```

## API Endpoints

### Get Current Price
```
GET /api/tariff/current-price
```

Returns the current electricity price per kWh with breakdown:
```json
{
  "pricePerKwh": 0.20543,
  "epexPrice": 100,
  "breakdown": {
    "energyCost": 0.106,
    "distribution": 0.0704386,
    "gsc": 0.011,
    "wkk": 0.00392
  },
  "currency": "EUR",
  "unit": "kWh"
}
```

### Get Cost Breakdown
```
GET /api/tariff/breakdown/:period
```

Where period is one of: `day`, `week`, `month`, `year`

Returns detailed cost breakdown:
```json
{
  "totalCost": 150.50,
  "netCost": 120.30,
  "breakdown": {
    "fixedCost": 7.00,
    "energyCost": 85.20,
    "energyRevenue": 30.20,
    "distributionCost": 42.26,
    "injectionCost": 0.53,
    "gscCost": 6.60,
    "wkkCost": 2.35,
    "capacityCost": 23.70
  },
  "usage": {
    "totalKwhDelivered": 600,
    "totalKwhReturned": 300,
    "peakPowerKw": 5.0
  }
}
```

### Get Tariff Rates
```
GET /api/tariff/rates
```

Returns all current tariff rates and formulas.

### Get Fluvius Capacity Tariff
```
GET /api/tariff/fluvius?months=12
```

Returns capacity tariff calculation based on average monthly peaks.

## InfluxDB Data Requirements

### Energy Prices
- **Measurement**: `electricity_price` or similar
- **Field**: `price` (should be in EUR/MWh)
- **Aggregation**: 15-minute or hourly intervals

**Important**: EPEX prices in InfluxDB should be stored in EUR/MWh, not EUR/kWh. The formulas convert them to EUR/kWh internally.

### Consumption Data
- **Measurement**: Defined in `INFLUXDB_CONSUMPTION_MEASUREMENT`
- **Field**: `power` or `energy`
- **Units**: Watts (W) - automatically converted to kW
- **Aggregation**: 15-minute intervals recommended

### Production/Injection Data
- **Measurement**: Defined in `INFLUXDB_PRODUCTION_MEASUREMENT`
- **Field**: `power` or `energy`
- **Units**: Watts (W) - automatically converted to kW
- **Aggregation**: 15-minute intervals recommended

## Environment Variables

Add these to your `.env` file:

```bash
# Default EPEX price if not available (EUR/MWh)
DEFAULT_EPEX_PRICE=100
```

## Calculation Notes

1. **15-Minute Intervals**: The system processes data in 15-minute intervals, matching the standard Belgian smart meter reporting interval.

2. **Power to Energy Conversion**: Power readings in kW are converted to kWh for 15-minute intervals by multiplying by 0.25 (15 minutes / 60 minutes).

3. **Peak Detection**: The system tracks the highest instantaneous power reading (in kW) during the period for capacity tariff calculation.

4. **Dynamic Pricing**: Energy costs and injection revenues vary hourly based on EPEX day-ahead market prices.

## References

- Ecopower tariff information: [Ecopower website](https://www.ecopower.be)
- EPEX day-ahead prices: Typically available through energy price APIs
- Fluvius capacity tariff: [Fluvius website](https://www.fluvius.be)

## Source Code

The complete Ecopower pricing logic is implemented in:
- Backend: `/backend/src/services/tariffService.ts`
- Routes: `/backend/src/routes/tariff.ts`

Reference implementation: [ecopower-tarrifs repository](https://github.com/jellevictoor/ecopower-tarrifs)
