# InfluxDB Schema Recommendations

This document describes the recommended schema for storing energy data in InfluxDB.

## Measurements

### 1. `energy_consumption` (or your configured name)

Stores energy consumption data from various meters.

**Tags:**
- `meter`: Meter identifier (e.g., "main", "heating", "kitchen")
- `location`: Optional location tag
- `type`: Optional type (e.g., "electricity", "gas")

**Fields:**
- `power`: Instantaneous power in Watts (W)
- `energy`: Cumulative energy in Watt-hours (Wh)
- `voltage`: Voltage in Volts (V) - optional
- `current`: Current in Amperes (A) - optional

**Example:**
```
energy_consumption,meter=main power=2500,energy=12345678,voltage=230,current=10.87 1704067200000000000
```

### 2. `solar_production` (or your configured name)

Stores solar panel production data.

**Tags:**
- `inverter`: Inverter identifier (if multiple)
- `location`: Panel location

**Fields:**
- `power`: Instantaneous power in Watts (W)
- `energy`: Cumulative energy in Watt-hours (Wh)
- `voltage`: DC voltage (V) - optional
- `efficiency`: Panel efficiency (%) - optional

**Example:**
```
solar_production,inverter=main power=5000,energy=98765432 1704067200000000000
```

### 3. `energy_prices` (or your configured name)

Stores dynamic energy pricing data.

**Tags:**
- `tariff`: Tariff type (e.g., "buy", "sell", "peak", "offpeak")
- `provider`: Energy provider name

**Fields:**
- `price`: Price in EUR per kWh
- `buy_price`: Purchase price (EUR/kWh)
- `sell_price`: Feed-in price (EUR/kWh)

**Example:**
```
energy_prices,tariff=buy price=0.35 1704067200000000000
energy_prices,tariff=sell price=0.05 1704067200000000000
```

### 4. `p1_meter` (or your configured name)

Stores detailed P1 meter data (DSMR protocol).

**Fields:**
- `power_delivered_l1`: Power delivered on L1 (W)
- `power_delivered_l2`: Power delivered on L2 (W)
- `power_delivered_l3`: Power delivered on L3 (W)
- `power_returned_l1`: Power returned on L1 (W)
- `power_returned_l2`: Power returned on L2 (W)
- `power_returned_l3`: Power returned on L3 (W)
- `energy_delivered_tariff1`: Energy delivered in tariff 1 (kWh)
- `energy_delivered_tariff2`: Energy delivered in tariff 2 (kWh)
- `energy_returned_tariff1`: Energy returned in tariff 1 (kWh)
- `energy_returned_tariff2`: Energy returned in tariff 2 (kWh)
- `voltage_l1`: Voltage L1 (V)
- `voltage_l2`: Voltage L2 (V)
- `voltage_l3`: Voltage L3 (V)
- `current_l1`: Current L1 (A)
- `current_l2`: Current L2 (A)
- `current_l3`: Current L3 (A)
- `gas_delivered`: Gas delivered (m³) - optional

**Example:**
```
p1_meter power_delivered_l1=800,power_delivered_l2=750,power_delivered_l3=700,voltage_l1=230,voltage_l2=229,voltage_l3=231,current_l1=3.48,current_l2=3.27,current_l3=3.04 1704067200000000000
```

## Data Collection Frequency

**Recommended intervals:**
- Real-time consumption/production: Every 5-10 seconds
- P1 meter: Every 10 seconds (DSMR standard)
- Energy prices: Every hour or when prices change
- Aggregated data: Store raw data and use Flux queries for aggregation

## Retention Policies

Consider setting up retention policies:

- **Raw data**: 30-90 days
- **Hourly aggregates**: 1 year
- **Daily aggregates**: 5 years
- **Monthly aggregates**: Forever

## Integration Examples

### Home Assistant

If you're using Home Assistant, you can configure the InfluxDB integration:

```yaml
influxdb:
  host: your-influx-host
  port: 8086
  token: your-token
  organization: your-org
  bucket: energy
  ssl: false
  verify_ssl: false
  include:
    entities:
      - sensor.power_consumption
      - sensor.solar_production
      - sensor.electricity_price
```

### Telegraf

Example Telegraf configuration:

```toml
[[inputs.mqtt_consumer]]
  servers = ["tcp://localhost:1883"]
  topics = ["energy/#"]
  data_format = "json"

[[outputs.influxdb_v2]]
  urls = ["http://localhost:8086"]
  token = "your-token"
  organization = "your-org"
  bucket = "energy"
```

## Querying Examples

### Get last 24h consumption
```flux
from(bucket: "energy")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "energy_consumption")
  |> filter(fn: (r) => r._field == "power")
  |> aggregateWindow(every: 1h, fn: mean)
```

### Calculate daily total
```flux
from(bucket: "energy")
  |> range(start: -1d)
  |> filter(fn: (r) => r._measurement == "energy_consumption")
  |> filter(fn: (r) => r._field == "energy")
  |> difference()
  |> sum()
```
