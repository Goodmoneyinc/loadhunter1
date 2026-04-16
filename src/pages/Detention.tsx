import { useState, useEffect } from 'react';
import { Clock, TrendingUp, AlertTriangle, BarChart3, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DetentionEvent {
  id: string;
  load_id: string;
  arrival_time: string;
  departure_time: string | null;
}

interface Load {
  id: string;
  facility_address: string;
  driver_id: string;
}

interface Driver {
  id: string;
  name: string;
}

function getDurationHours(arrival: string, departure: string | null): number | null {
  if (!departure) return null;
  return (new Date(departure).getTime() - new Date(arrival).getTime()) / (1000 * 60 * 60);
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export default function Detention() {
  const [events, setEvents] = useState<DetentionEvent[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all-time');
  const [selectedDriver, setSelectedDriver] = useState('all-drivers');
  const [selectedFacility, setSelectedFacility] = useState('all-facilities');

  useEffect(() => {
    fetchDetentionData();
  }, []);

  async function fetchDetentionData() {
    try {
      setLoading(true);

      const { data: eventsData } = await supabase
        .from('detention_events')
        .select('*')
        .order('arrival_time', { ascending: false });

      const { data: loadsData } = await supabase
        .from('loads')
        .select('id, facility_address, driver_id');

      const { data: driversData } = await supabase
        .from('drivers')
        .select('id, name');

      setEvents(eventsData || []);
      setLoads(loadsData || []);
      setDrivers(driversData || []);
    } catch (err) {
      console.error('Failed to fetch detention data:', err);
    } finally {
      setLoading(false);
    }
  }

  const loadsMap = new Map(loads.map((l) => [l.id, l]));
  const driversMap = new Map(drivers.map((d) => [d.id, d]));

  const completedEvents = events.filter((e) => e.departure_time);
  const activeEvents = events.filter((e) => !e.departure_time);

  const durations = completedEvents.map((e) => getDurationHours(e.arrival_time, e.departure_time)!);
  const avgHours = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const maxHours = durations.length > 0 ? Math.max(...durations) : 0;
  const totalCost = durations.reduce((sum, h) => sum + Math.max(0, h - 2) * 75, 0);
  const avgCostPerLoad = completedEvents.length > 0 ? totalCost / completedEvents.length : 0;

  const facilityStats = new Map<string, { count: number; totalHours: number }>();
  completedEvents.forEach((event) => {
    const load = loadsMap.get(event.load_id);
    const hours = getDurationHours(event.arrival_time, event.departure_time)!;
    if (load) {
      const current = facilityStats.get(load.facility_address) || { count: 0, totalHours: 0 };
      facilityStats.set(load.facility_address, {
        count: current.count + 1,
        totalHours: current.totalHours + hours,
      });
    }
  });

  const topFacilities = Array.from(facilityStats.entries())
    .map(([name, stats]) => ({
      name,
      count: stats.count,
      avgHours: stats.totalHours / stats.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const driverStats = new Map<string, { name: string; totalHours: number; count: number }>();
  completedEvents.forEach((event) => {
    const load = loadsMap.get(event.load_id);
    const hours = getDurationHours(event.arrival_time, event.departure_time)!;
    if (load && load.driver_id) {
      const driver = driversMap.get(load.driver_id);
      const driverName = driver?.name || 'Unknown';
      const current = driverStats.get(load.driver_id) || { name: driverName, totalHours: 0, count: 0 };
      driverStats.set(load.driver_id, {
        name: driverName,
        totalHours: current.totalHours + hours,
        count: current.count + 1,
      });
    }
  });

  const longestWaitingDrivers = Array.from(driverStats.values())
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 5);

  const monthlyHours: Record<string, number> = {};
  completedEvents.forEach((event) => {
    const date = new Date(event.arrival_time);
    const monthKey = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    const hours = getDurationHours(event.arrival_time, event.departure_time)!;
    monthlyHours[monthKey] = (monthlyHours[monthKey] || 0) + hours;
  });

  const monthlyData = Object.entries(monthlyHours)
    .slice(-6)
    .map(([month, hours]) => ({ month, hours: Math.round(hours) }));

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-extra-wide uppercase">Reports</h2>
          <p className="text-sm text-slate-400 mt-1">Loading...</p>
        </div>
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-electric-cyan animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-extra-wide uppercase">Reports</h2>
        <p className="text-sm text-slate-400 mt-1">Detention analytics and facility insights</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="appearance-none px-4 py-2.5 pr-10 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-medium hover:bg-white/10 focus:outline-none focus:border-electric-cyan focus:ring-1 focus:ring-electric-cyan/50 transition-all cursor-pointer"
          >
            <option value="all-time">All-time</option>
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="last-3-months">Last 3 Months</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="appearance-none px-4 py-2.5 pr-10 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-medium hover:bg-white/10 focus:outline-none focus:border-electric-cyan focus:ring-1 focus:ring-electric-cyan/50 transition-all cursor-pointer"
          >
            <option value="all-drivers">All Drivers</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            className="appearance-none px-4 py-2.5 pr-10 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-medium hover:bg-white/10 focus:outline-none focus:border-electric-cyan focus:ring-1 focus:ring-electric-cyan/50 transition-all cursor-pointer"
          >
            <option value="all-facilities">All Facilities</option>
            {Array.from(new Set(loads.map((l) => l.facility_address))).map((facility) => (
              <option key={facility} value={facility}>
                {facility}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Analytics */}
        <div className="lg:col-span-1 space-y-6">
          {/* Key Metrics */}
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5 shadow-lg shadow-electric-violet/5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Total Active Users</p>
              <p className="text-3xl font-bold text-white font-mono">{drivers.length}</p>
            </div>

            <div className="glass-card rounded-2xl p-5 shadow-lg shadow-electric-violet/5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Total Loads</p>
              <p className="text-3xl font-bold text-white font-mono">{loads.length}</p>
            </div>

            <div className="glass-card rounded-2xl p-5 shadow-lg shadow-electric-violet/5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Avg. Session Length</p>
              <p className="text-3xl font-bold text-white font-mono">{formatDuration(avgHours)}</p>
            </div>
          </div>

          {/* Detention Cost Insights */}
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5 shadow-lg shadow-electric-violet/5 bg-gradient-to-br from-orange-500/10 to-orange-500/5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Total Detention Cost</p>
              <p className="text-3xl font-bold text-white font-mono">${Math.round(totalCost).toLocaleString()}</p>
            </div>

            <div className="glass-card rounded-2xl p-5 shadow-lg shadow-electric-violet/5 bg-gradient-to-br from-orange-500/10 to-orange-500/5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Avg. Cost per Load</p>
              <p className="text-3xl font-bold text-white font-mono">${Math.round(avgCostPerLoad).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Right Column - Insights */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detention Hours Bar Chart */}
          <div className="glass-card rounded-2xl p-6 shadow-xl shadow-electric-violet/10">
            <h3 className="text-sm font-semibold text-white mb-6 uppercase tracking-wide">Detention Hours per Month</h3>
            {monthlyData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No data available</p>
            ) : (
              <div className="space-y-4">
                {monthlyData.map((item) => {
                  const maxHours = Math.max(...monthlyData.map((d) => d.hours), 1);
                  const percentage = (item.hours / maxHours) * 100;

                  return (
                    <div key={item.month}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-slate-300">{item.month}</p>
                        <p className="text-xs font-bold text-electric-cyan">{item.hours}h</p>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-electric-violet to-electric-cyan transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Facilities & Longest Waiting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Top Facilities */}
            <div className="glass-card rounded-2xl p-6 shadow-xl shadow-electric-violet/10">
              <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">Top Facilities for Detention</h3>
              {topFacilities.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No data available</p>
              ) : (
                <div className="space-y-3">
                  {topFacilities.map((facility, idx) => (
                    <div key={facility.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{idx + 1}. {facility.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{facility.count} events</p>
                      </div>
                      <p className="text-xs font-bold text-electric-cyan ml-2">{formatDuration(facility.avgHours)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Longest Waiting Drivers */}
            <div className="glass-card rounded-2xl p-6 shadow-xl shadow-electric-violet/10">
              <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">Longest Waiting Drivers</h3>
              {longestWaitingDrivers.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No data available</p>
              ) : (
                <div className="space-y-3">
                  {longestWaitingDrivers.map((driver, idx) => (
                    <div key={driver.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{idx + 1}. {driver.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{driver.count} detentions</p>
                      </div>
                      <p className="text-xs font-bold text-electric-cyan ml-2">{formatDuration(driver.totalHours)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* All Events Table */}
      <div className="glass-card rounded-2xl shadow-xl shadow-electric-violet/10 overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 bg-white/5">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wide">All Detention Events</h3>
        </div>
        <div className="divide-y divide-white/10">
          {events.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-400">
              No detention events yet. Check in at a load to start tracking.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 hidden sm:table-header-group">
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Facility</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Arrival Time</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const hours = getDurationHours(event.arrival_time, event.departure_time);
                    const load = loadsMap.get(event.load_id);
                    const isActive = !event.departure_time;

                    return (
                      <tr key={event.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <p className="text-xs font-medium text-white truncate">{load?.facility_address || 'Unknown'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-300">
                            {new Date(event.arrival_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`text-xs font-semibold ${!isActive && hours! > 2 ? 'text-orange-400' : 'text-emerald-400'}`}>
                            {isActive ? 'In Progress' : formatDuration(hours!)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-electric-cyan animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${hours! > 2 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
                              Complete
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
