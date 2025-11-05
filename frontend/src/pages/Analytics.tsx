import { useEffect, useState } from 'react'
import { TrendingUp, AlertCircle, Lightbulb, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { analyticsApi } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function Analytics() {
  const [insights, setInsights] = useState<any>(null)
  const [comparison, setComparison] = useState<any>(null)
  const [peakTimes, setPeakTimes] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [insightsRes, comparisonRes, peakTimesRes] = await Promise.all([
        analyticsApi.getInsights(),
        analyticsApi.getComparison('month'),
        analyticsApi.getPeakTimes(30),
      ])

      setInsights(insightsRes.data)
      setComparison(comparisonRes.data)
      setPeakTimes(peakTimesRes.data)
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Loading analytics...</p>
      </div>
    )
  }

  const hourlyData = peakTimes?.hourlyAverages.map((avg: number, hour: number) => ({
    hour: `${hour}:00`,
    average: (avg / 1000).toFixed(2), // Convert to kW
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Insights and recommendations to optimize your energy usage
        </p>
      </div>

      {/* Insights Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Fluvius Insight */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Capacity Tariff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Average Peak: {insights?.fluviusTariff.averagePeak.toFixed(2)} W
            </p>
            <p className="text-sm">
              {insights?.fluviusTariff.recommendation}
            </p>
          </CardContent>
        </Card>

        {/* Self Consumption Insight */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Self Consumption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Ratio: {insights?.selfConsumption.ratio.toFixed(1)}%
            </p>
            <p className="text-sm">
              {insights?.selfConsumption.recommendation}
            </p>
          </CardContent>
        </Card>

        {/* Cost Insight */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Cost Optimization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {insights?.costs.recommendation}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Comparison</CardTitle>
          <CardDescription>
            Compare this month's consumption to last month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">
                {(comparison?.current / 1000).toFixed(2)} kWh
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Month</p>
              <p className="text-2xl font-bold">
                {(comparison?.previous / 1000).toFixed(2)} kWh
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Change</p>
              <p className={`text-2xl font-bold ${comparison?.trend === 'up' ? 'text-red-500' : 'text-green-500'}`}>
                {comparison?.percentageChange > 0 ? '+' : ''}
                {comparison?.percentageChange.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Peak Times Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Peak Consumption Times
          </CardTitle>
          <CardDescription>
            Average consumption by hour of day (last 30 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                label={{ value: 'kW', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                }}
              />
              <Bar dataKey="average" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              {peakTimes?.recommendation}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
