import React, { useEffect, useState } from 'react'
import { Zap, Sun, TrendingUp, TrendingDown, Activity, Euro } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { ConsumptionChart } from '@/components/ConsumptionChart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { dashboardApi, DashboardOverview } from '@/lib/api'
import { formatPower, formatEnergy, formatCurrency } from '@/lib/utils'

export function Dashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [overviewRes, chartRes] = await Promise.all([
        dashboardApi.getOverview(),
        dashboardApi.getChartData('consumption-production', {
          start: '-24h',
          stop: 'now()',
          window: '1h',
        }),
      ])

      setOverview(overviewRes.data)
      setChartData(chartRes.data)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!overview) return null

  const netPower = overview.current.production - overview.current.consumption
  const isExporting = netPower > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time overview of your energy consumption and production
        </p>
      </div>

      {/* Current Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current Consumption"
          value={formatPower(overview.current.consumption)}
          icon={Zap}
          subtitle="Right now"
        />
        <StatCard
          title="Solar Production"
          value={formatPower(overview.current.production)}
          icon={Sun}
          subtitle="Right now"
        />
        <StatCard
          title="Grid"
          value={formatPower(Math.abs(netPower))}
          icon={isExporting ? TrendingDown : TrendingUp}
          subtitle={isExporting ? 'Exporting to grid' : 'Importing from grid'}
        />
        <StatCard
          title="Current Price"
          value={formatCurrency(overview.current.price)}
          icon={Euro}
          subtitle="per kWh"
        />
      </div>

      {/* Today's Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Consumption"
          value={formatEnergy(overview.today.consumption * 1000)}
          subtitle="Total consumed"
        />
        <StatCard
          title="Today's Production"
          value={formatEnergy(overview.today.production * 1000)}
          subtitle="Solar generated"
        />
        <StatCard
          title="Self Consumption"
          value={formatEnergy(overview.today.selfConsumption * 1000)}
          subtitle={`${((overview.today.selfConsumption / overview.today.consumption) * 100).toFixed(0)}% of consumption`}
        />
        <StatCard
          title="Grid Export"
          value={formatEnergy(overview.today.gridExport * 1000)}
          subtitle="Sold to grid"
        />
      </div>

      {/* Chart */}
      <ConsumptionChart data={chartData} title="24 Hour Energy Flow" />

      {/* Fluvius Capacity Tariff */}
      <Card>
        <CardHeader>
          <CardTitle>Fluvius Capacity Tariff</CardTitle>
          <CardDescription>
            Your capacity tariff is based on your average monthly peak consumption
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Average Peak</p>
              <p className="text-2xl font-bold">
                {overview.fluvius.averagePeak.toFixed(2)} kW
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Cost</p>
              <p className="text-2xl font-bold">
                {formatCurrency(overview.fluvius.monthlyCost)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Yearly Estimate</p>
              <p className="text-2xl font-bold">
                {formatCurrency(overview.fluvius.yearlyCost)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EVCC Status */}
      {overview.evcc.enabled && overview.evcc.available && (
        <Card>
          <CardHeader>
            <CardTitle>EVCC Status</CardTitle>
            <CardDescription>Heat pump and EV charging</CardDescription>
          </CardHeader>
          <CardContent>
            {overview.evcc.loadpoints && overview.evcc.loadpoints.length > 0 ? (
              <div className="space-y-4">
                {overview.evcc.loadpoints.map((lp: any) => (
                  <div key={lp.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{lp.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {lp.charging ? 'Charging' : 'Idle'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatPower(lp.power)}</p>
                      {lp.energy > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {formatEnergy(lp.energy * 1000)} total
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No active loadpoints</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
