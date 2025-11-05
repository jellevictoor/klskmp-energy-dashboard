import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'

interface ChartData {
  timestamp: string
  consumption: number
  production: number
}

interface ConsumptionChartProps {
  data: ChartData[]
  title?: string
}

export function ConsumptionChart({ data, title = 'Energy Flow' }: ConsumptionChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    time: format(new Date(item.timestamp), 'HH:mm'),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{ value: 'kWh', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="consumption"
              stroke="#ef4444"
              name="Consumption"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="production"
              stroke="#10b981"
              name="Production"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
