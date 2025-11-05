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
  const [currentPriceBreakdown, setCurrentPriceBreakdown] = useState<any>(null)
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
      setCurrentPrice(priceRes.data.pricePerKwh || 0)
      setCurrentPriceBreakdown(priceRes.data)
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
    { name: 'Fixed Cost', value: breakdown?.breakdown.fixedCost || 0 },
    { name: 'Energy Cost', value: breakdown?.breakdown.energyCost || 0 },
    { name: 'Distribution', value: breakdown?.breakdown.distributionCost || 0 },
    { name: 'GSC (Green)', value: breakdown?.breakdown.gscCost || 0 },
    { name: 'WKK (CHP)', value: breakdown?.breakdown.wkkCost || 0 },
    { name: 'Capacity Tariff', value: breakdown?.breakdown.capacityCost || 0 },
    { name: 'Injection Cost', value: breakdown?.breakdown.injectionCost || 0 },
  ]

  const COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

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
          value={formatCurrency(breakdown?.breakdown.energyRevenue || 0)}
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

      {/* Current Price Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Current Price Breakdown (per kWh)</CardTitle>
          <CardDescription>
            Real-time price components based on EPEX market price
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">EPEX Market Price</span>
              <span className="font-medium">
                {currentPriceBreakdown?.epexPrice?.toFixed(2) || 'N/A'} €/MWh
              </span>
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Per kWh Components
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Energy Cost</span>
                <span className="font-medium">
                  {formatCurrency(currentPriceBreakdown?.breakdown?.energyCost || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Distribution</span>
                <span className="font-medium">
                  {formatCurrency(currentPriceBreakdown?.breakdown?.distribution || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">GSC (Green)</span>
                <span className="font-medium">
                  {formatCurrency(currentPriceBreakdown?.breakdown?.gsc || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">WKK (CHP)</span>
                <span className="font-medium">
                  {formatCurrency(currentPriceBreakdown?.breakdown?.wkk || 0)}
                </span>
              </div>

              <div className="border-t pt-3 mt-3 flex justify-between items-center">
                <span className="font-bold">Total per kWh</span>
                <span className="text-xl font-bold">
                  {formatCurrency(currentPrice)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Cost Components
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Fixed Subscription</span>
                <span className="font-medium">
                  {formatCurrency(breakdown?.breakdown.fixedCost || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Energy Cost</span>
                <span className="font-medium">
                  {formatCurrency(breakdown?.breakdown.energyCost || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Distribution Cost</span>
                <span className="font-medium">
                  {formatCurrency(breakdown?.breakdown.distributionCost || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">GSC (Green Certificates)</span>
                <span className="font-medium">
                  {formatCurrency(breakdown?.breakdown.gscCost || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">WKK (CHP Surcharge)</span>
                <span className="font-medium">
                  {formatCurrency(breakdown?.breakdown.wkkCost || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Capacity Tariff</span>
                <span className="font-medium">
                  {formatCurrency(breakdown?.breakdown.capacityCost || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Injection Tariff</span>
                <span className="font-medium">
                  {formatCurrency(breakdown?.breakdown.injectionCost || 0)}
                </span>
              </div>

              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {formatCurrency(breakdown?.totalCost || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-green-600">Energy Revenue (Solar)</span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(breakdown?.breakdown.energyRevenue || 0)}
                  </span>
                </div>
              </div>

              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-bold">Net Cost</span>
                <span className="text-xl font-bold">
                  {formatCurrency(breakdown?.netCost || 0)}
                </span>
              </div>

              <div className="mt-4 p-3 bg-muted rounded-lg text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Consumed:</span>{' '}
                    <span className="font-medium">{breakdown?.usage.totalKwhDelivered?.toFixed(2) || 0} kWh</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Returned:</span>{' '}
                    <span className="font-medium">{breakdown?.usage.totalKwhReturned?.toFixed(2) || 0} kWh</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Peak:</span>{' '}
                    <span className="font-medium">{breakdown?.usage.peakPowerKw?.toFixed(2) || 0} kW</span>
                  </div>
                </div>
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
