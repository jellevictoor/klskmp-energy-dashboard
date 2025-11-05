import { useEffect, useState } from 'react'
import { Euro, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { StatCard } from '@/components/StatCard'
import { tariffApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

export function Costs() {
  const [breakdown, setBreakdown] = useState<any>(null)
  const [fluvius, setFluvius] = useState<any>(null)
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [breakdownRes, fluviusRes, priceRes] = await Promise.all([
        tariffApi.getBreakdown('month'),
        tariffApi.getFluvius(),
        tariffApi.getCurrentPrice(),
      ])

      setBreakdown(breakdownRes.data)
      setFluvius(fluviusRes.data)
      setCurrentPrice(priceRes.data.price)
    } catch (err) {
      console.error('Error fetching cost data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Loading cost data...</p>
      </div>
    )
  }

  const pieData = [
    { name: 'Energy Consumption', value: breakdown?.breakdown.consumptionCost || 0 },
    { name: 'Capacity Tariff', value: breakdown?.breakdown.fluviusCapacityTariff || 0 },
  ]

  const COLORS = ['#3b82f6', '#ef4444']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Costs</h1>
        <p className="text-muted-foreground">
          Track your energy costs and tariff breakdown
        </p>
      </div>

      {/* Current Price */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Current Price"
          value={formatCurrency(currentPrice)}
          icon={Euro}
          subtitle="per kWh"
        />
        <StatCard
          title="Monthly Total"
          value={formatCurrency(breakdown?.totalCost || 0)}
          icon={TrendingUp}
          subtitle="This month"
        />
        <StatCard
          title="Feed-in Revenue"
          value={formatCurrency(breakdown?.feedInRevenue || 0)}
          icon={TrendingDown}
          subtitle="Solar export"
        />
        <StatCard
          title="Net Cost"
          value={formatCurrency(breakdown?.netCost || 0)}
          icon={Euro}
          subtitle="After revenue"
        />
      </div>

      {/* Cost Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Cost Breakdown</CardTitle>
            <CardDescription>
              Distribution of your energy costs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost Details</CardTitle>
            <CardDescription>
              Detailed breakdown of charges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Energy Consumption</span>
                <span className="font-bold">
                  {formatCurrency(breakdown?.breakdown.consumptionCost || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Fluvius Capacity Tariff</span>
                <span className="font-bold">
                  {formatCurrency(breakdown?.breakdown.fluviusCapacityTariff || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Solar Feed-in</span>
                <span className="font-bold text-green-600">
                  -{formatCurrency(breakdown?.breakdown.productionRevenue || 0)}
                </span>
              </div>
              <div className="border-t pt-4 flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold">
                  {formatCurrency(breakdown?.netCost || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fluvius Details */}
      <Card>
        <CardHeader>
          <CardTitle>Fluvius Capacity Tariff Details</CardTitle>
          <CardDescription>
            Understanding your capacity tariff charges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Average Peak</p>
              <p className="text-2xl font-bold">
                {fluvius?.averagePeak ? (fluvius.averagePeak / 1000).toFixed(2) : 'N/A'} kW
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tariff Rate</p>
              <p className="text-2xl font-bold">
                {formatCurrency(fluvius?.tariffRate || 0)}/kW
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Cost</p>
              <p className="text-2xl font-bold">
                {formatCurrency(fluvius?.monthlyCost || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Yearly Estimate</p>
              <p className="text-2xl font-bold">
                {formatCurrency(fluvius?.yearlyCost || 0)}
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>💡 Tip:</strong> Your capacity tariff is based on your average monthly peak consumption.
              To reduce this cost, avoid running multiple high-power appliances simultaneously.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
