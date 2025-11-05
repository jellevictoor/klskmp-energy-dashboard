import React, { useEffect, useState } from 'react'
import { Battery, Car, Thermometer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { StatCard } from '@/components/StatCard'
import { evccApi } from '@/lib/api'
import { formatPower, formatEnergy, formatCurrency } from '@/lib/utils'

export function EVCC() {
  const [status, setStatus] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [heatPump, setHeatPump] = useState<any>(null)
  const [ev, setEV] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [statusRes, sessionsRes, heatPumpRes, evRes] = await Promise.all([
        evccApi.getStatus(),
        evccApi.getSessions(30),
        evccApi.getHeatPump(),
        evccApi.getEV(),
      ])

      setStatus(statusRes.data)
      setSessions(sessionsRes.data)
      setHeatPump(heatPumpRes.data)
      setEV(evRes.data)
    } catch (err) {
      console.error('Error fetching EVCC data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Loading EVCC data...</p>
      </div>
    )
  }

  if (!status?.enabled || !status?.available) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card>
          <CardHeader>
            <CardTitle>EVCC Not Available</CardTitle>
            <CardDescription>
              EVCC is not enabled or not responding. Please check your configuration.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">EVCC</h1>
        <p className="text-muted-foreground">
          Monitor your heat pump and EV charging
        </p>
      </div>

      {/* Heat Pump */}
      {heatPump && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Heat Pump
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-xl font-bold">
                  {heatPump.charging ? 'Active' : 'Idle'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Power</p>
                <p className="text-xl font-bold">{formatPower(heatPump.power)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Energy Today</p>
                <p className="text-xl font-bold">{formatEnergy(heatPump.energy * 1000)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mode</p>
                <p className="text-xl font-bold capitalize">{heatPump.mode}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* EV Charging */}
      {ev.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {ev.map((vehicle: any) => (
            <Card key={vehicle.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  {vehicle.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-bold">
                        {vehicle.charging ? 'Charging' : vehicle.connected ? 'Connected' : 'Disconnected'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Power</p>
                      <p className="font-bold">{formatPower(vehicle.power)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">State of Charge</p>
                      <p className="text-2xl font-bold">{vehicle.soc}%</p>
                      <div className="w-full bg-secondary rounded-full h-2 mt-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${vehicle.soc}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Energy Charged</p>
                      <p className="text-2xl font-bold">{formatEnergy(vehicle.energy * 1000)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mode</p>
                    <p className="font-medium capitalize">{vehicle.mode}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charging Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Charging Sessions</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.slice(0, 10).map((session: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <div>
                    <p className="font-medium">{session.loadpoint || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.created).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {formatEnergy((session.chargedEnergy || 0) * 1000)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {session.duration ? `${(session.duration / 60).toFixed(0)} min` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No charging sessions found</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
