import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { influxRouter } from './routes/influx';
import { tariffRouter } from './routes/tariff';
import { evccRouter } from './routes/evcc';
import { analyticsRouter } from './routes/analytics';
import { dashboardRouter } from './routes/dashboard';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/influx', influxRouter);
app.use('/api/tariff', tariffRouter);
app.use('/api/evcc', evccRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/dashboard', dashboardRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Energy Dashboard API running on port ${PORT}`);
  console.log(`📊 InfluxDB: ${process.env.INFLUX_URL}`);
  console.log(`🔌 EVCC: ${process.env.EVCC_ENABLED === 'true' ? process.env.EVCC_URL : 'Disabled'}`);
});
