import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import { Truck, CheckCircle, AlertTriangle, Clock, ArrowUpRight, ArrowDownRight, Loader2, MapPin, Navigation, Maximize2, TrendingUp, Zap } from 'lucide-react';
import { SubscriptionBanner } from '../components/SubscriptionBanner';
import StatusBadge from '../components/StatusBadge';
import DashboardMap from '../components/DashboardMap';
import DriverSimulator from '../components/DriverSimulator';
import DetentionCalculator from '../components/DetentionCalculator';
import LiveDetention from '../components/LiveDetention';
import { useRealtimeStats } from '../hooks/useRealtimeStats';

export default function Dashboard() {
  const { loads, stats, leaderboardStats, loading } = useRealtimeStats();
  const [dispatcherLocation, setDispatcherLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    updateDispatcherLocation();
    intervalRef.current = window.setInterval(updateDispatcherLocation, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function updateDispatcherLocation() {
    if (!navigator.geolocation) {
      setDispatcherLocation(prev => prev || { lat: 39.8283, lng: -98.5795 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDispatcherLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setDispatcherLocation(prev => prev || { lat: 39.8283, lng: -98.5795 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  const statCards = [
    {
      label: 'Total Active',
      value: stats.totalActive,
      icon: Truck,
      accent: 'text-[#FF6B00]',
      bg: 'bg-[#FF6B00]/10',
      trend: 'Active loads',
      trendUp: true,
    },
    {
      label: 'On Time',
      value: stats.onTime,
      icon: CheckCircle,
      accent: 'text-white',
      bg: 'bg-white/10',
      trend: stats.totalActive > 0 ? `${Math.round((stats.onTime / stats.totalActive) * 100)}% rate` : '0% rate',
      trendUp: true,
    },
    {
      label: 'Delayed',
      value: stats.delayed,
      icon: AlertTriangle,
      accent: 'text-[#FF6B00]',
      bg: 'bg-[#FF6B00]/10',
      trend: 'Needs attention',
      trendUp: false,
    },
    {
      label: 'Avg. Detention',
      value: `${stats.avgDetention}h`,
      icon: Clock,
      accent: 'text-[#FF6B00]',
      bg: 'bg-[#FF6B00]/10',
      trend: 'Target: < 2h',
      trendUp: stats.avgDetention < 2,
    },
  ];

  const recentLoads = loads.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-8 bg-[#1A1A1A] min-h-screen">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Command Center</h2>
          <p className="text-sm text-gray-400 mt-1">Loading dashboard...</p>
        </div>
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
        </div>
      </div>
    );
  }

  const loadsWithCoordinates = loads.filter(l => l.facility_lat && l.facility_long);
  const mapCenter: [number, number] = loadsWithCoordinates.length > 0 && loadsWithCoordinates[0].facility_lat && loadsWithCoordinates[0].facility_long
    ? [loadsWithCoordinates[0].facility_lat, loadsWithCoordinates[0].facility_long]
    : dispatcherLocation
      ? [dispatcherLocation.lat, dispatcherLocation.lng]
      : [39.8283, -98.5795];

  return (
    <div className="space-y-6 bg-[#1A1A1A] min-h-screen">
      <SubscriptionBanner />

      <div className="rounded-xl p-6 border border-white/10 bg-[#0F0F0F]">
        <h2 className="text-2xl font-bold text-white tracking-wide uppercase mb-2">Command Center</h2>
        <p className="text-sm text-gray-400">Real-time fleet overview and GPS tracking</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0F0F0F]">
            <div className="px-5 py-4 border-b border-white/10 bg-[#1A1A1A]">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="w-4 h-4 text-[#FF6B00]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Load Board</h3>
              </div>
              <p className="text-xs text-gray-400">{recentLoads.length} active loads</p>
            </div>
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
              {recentLoads.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  No loads yet. Visit Active Loads to add sample data.
                </div>
              ) : (
                recentLoads.map((load) => (
                  <div key={load.id} className="px-5 py-3 hover:bg-white/5 transition-all cursor-pointer group border-l-2 border-l-transparent hover:border-l-[#FF6B00]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FF6B00]/20 flex items-center justify-center flex-shrink-0">
                        <Truck className="w-4 h-4 text-[#FF6B00]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">{load.facility_address}</p>
                        <p className="text-[10px] text-gray-500">{load.driver?.name || 'Unassigned'}</p>
                      </div>
                      <StatusBadge status={load.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0F0F0F]">
            <div className="px-5 py-4 border-b border-white/10 bg-[#1A1A1A]">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-[#FF6B00]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Leader Board</h3>
              </div>
              <p className="text-xs text-gray-400">Detention insights</p>
            </div>
            <div className="px-5 py-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Detention Cost</p>
                  <p className="text-2xl font-bold text-white font-mono">${leaderboardStats.totalDetentionCost.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-[#FF6B00]/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-[#FF6B00]" />
                </div>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF6B00] transition-all duration-500"
                  style={{ width: `${Math.min(leaderboardStats.percentageOfTarget, 100)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-gray-500">{leaderboardStats.percentageOfTarget}% of monthly target reached</p>
            </div>
          </div>

          <LiveDetention />
        </div>

        <div className="space-y-6">
          <div className={`flex flex-col rounded-xl overflow-hidden transition-all duration-300 border border-white/10 bg-[#0F0F0F] ${
            mapExpanded ? 'fixed inset-4 z-[9999]' : ''
          }`} style={mapExpanded ? { display: 'flex', flexDirection: 'column', height: '100%' } : {}}>
            <div className="px-5 py-4 border-b border-white/10 bg-[#1A1A1A] flex items-center justify-between" style={{ flexShrink: 0 }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#FF6B00]/20 flex items-center justify-center">
                  <Navigation className="w-3.5 h-3.5 text-[#FF6B00]" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Live Fleet Map</h3>
              </div>
              <button
                onClick={() => setMapExpanded(!mapExpanded)}
                className="p-2 rounded-lg bg-white/5 hover:bg-[#FF6B00]/10 border border-white/10 hover:border-[#FF6B00]/30 transition-all"
                title={mapExpanded ? 'Exit fullscreen' : 'Expand map'}
              >
                <Maximize2 className={`w-4 h-4 text-[#FF6B00] transition-transform ${mapExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <div
              className="w-full relative"
              style={{ flex: 1, minHeight: mapExpanded ? 0 : '500px', height: mapExpanded ? 'calc(100vh - 120px)' : '500px' }}
            >
              {loadsWithCoordinates.length > 0 || dispatcherLocation ? (
                <DashboardMap
                  loads={loadsWithCoordinates}
                  center={mapCenter}
                  dispatcherLocation={dispatcherLocation}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-[#1A1A1A]">
                  <div className="text-center p-8">
                    <MapPin className="w-12 h-12 text-[#FF6B00]/30 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-400 mb-1">No GPS Data Available</p>
                    <p className="text-xs text-gray-500">Add coordinates to loads to see them on the map</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0F0F0F]">
            <div className="px-5 py-4 border-b border-white/10 bg-[#1A1A1A]">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#FF6B00]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">AI Insights</h3>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-gray-400 leading-relaxed">
                Driver efficiency is up 12% this week. Peak detention hours are between 2-4 PM.
              </p>
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-1.5 rounded-lg bg-[#FF6B00]/20 text-[#FF6B00] text-xs font-bold hover:bg-[#FF6B00]/30 transition-all">
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl p-5 hover:bg-white/5 transition-all group border border-white/10 bg-[#0F0F0F]"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.accent}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white font-mono mb-1">{card.value}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{card.label}</p>
              <div className="flex items-center gap-1">
                {card.trendUp ? (
                  <ArrowUpRight className="w-3 h-3 text-[#FF6B00]" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-[#FF6B00]" />
                )}
                <span className="text-[10px] text-gray-500">{card.trend}</span>
              </div>
            </div>
          ))}

          <DriverSimulator />
        </div>
      </div>

      <div id="detention-calculator">
        <DetentionCalculator
          onScrollToPricing={() => {
            const el = document.getElementById('pricing-section');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            else window.location.href = '/billing';
          }}
        />
      </div>
    </div>
  );
}
