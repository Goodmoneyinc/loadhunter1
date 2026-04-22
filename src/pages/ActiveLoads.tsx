import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, User, CheckSquare, Search, Filter, Loader2, AlertTriangle, Plus, X, Navigation, Phone, MessageSquare, Truck, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getDispatcherId } from '../lib/dispatcher';
import { geocodeAddress } from '../lib/geocoding';
import StatusBadge from '../components/StatusBadge';
import LoadMap from '../components/LoadMap';
import { useSubscription } from '../hooks/useSubscription';

interface Driver {
  id: string;
  name: string;
  phone: string;
}

interface Load {
  id: string;
  status: string;
  facility_address: string;
  scheduled_time: string;
  driver_id: string | null;
  driver?: Driver | null;
  facility_lat: number | null;
  facility_long: number | null;
  load_number?: string;
  weight?: number;
  free_time_hours?: number;
  rate_per_hour?: number;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function TruckGraphic({ loadId }: { loadId: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="relative w-full h-full flex items-center justify-center">
        <svg viewBox="0 0 200 120" className="w-48 h-32 drop-shadow-xl">
          <rect x="20" y="40" width="40" height="35" rx="4" fill="#FF6B00" opacity="0.9" />
          <rect x="26" y="45" width="12" height="12" rx="2" fill="#FF8C33" opacity="0.6" />
          <rect x="65" y="30" width="100" height="55" rx="4" fill="#FF6B00" opacity="0.7" />
          <rect x="70" y="35" width="90" height="45" rx="2" fill="#FF8C33" opacity="0.5" />
          <circle cx="50" cy="80" r="8" fill="#0F0F0F" stroke="#555" strokeWidth="2" />
          <circle cx="140" cy="80" r="8" fill="#0F0F0F" stroke="#555" strokeWidth="2" />
          <circle cx="160" cy="80" r="8" fill="#0F0F0F" stroke="#555" strokeWidth="2" />
          <rect x="25" y="48" width="6" height="8" fill="white" opacity="0.3" />
        </svg>
      </div>
    </div>
  );
}

export default function ActiveLoads() {
  const navigate = useNavigate();
  const { hasActiveSubscription } = useSubscription();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [formData, setFormData] = useState({
    load_number: '',
    facility_address: '',
    scheduled_time: '',
    driver_id: '',
    facility_lat: '',
    facility_long: '',
    free_time_hours: '2',
    rate_per_hour: '75',
  });
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [formError, setFormError] = useState('');

  function handleNewLoadClick() {
    if (!hasActiveSubscription) {
      navigate('/billing');
      return;
    }
    setShowModal(true);
  }

  useEffect(() => {
    fetchLoads();
    fetchDrivers();
  }, []);

  async function fetchDrivers() {
    const { data } = await supabase
      .from('drivers')
      .select('id, name, phone')
      .order('name', { ascending: true });

    const mappedDrivers = (data || []).map((driver: any) => ({
      id: driver.id,
      name: driver.name || '',
      phone: driver.phone || '',
    }));

    setDrivers(mappedDrivers);
  }

  async function fetchLoads() {
    try {
      setLoading(true);
      setError('');

      let { data: loadsData, error: loadsError } = await supabase
        .from('loads')
        .select('*')
        .order('scheduled_time', { ascending: true });

      if (loadsError) throw loadsError;

      const { data: driversData } = await supabase.from('drivers').select('*');
      const driversMap = new Map<string, Driver>();
      if (driversData) {
        for (const driver of driversData) {
          driversMap.set(driver.id, {
            id: driver.id,
            name: driver.name || '',
            phone: driver.phone || '',
          });
        }
      }

      const loadsWithDrivers = (loadsData || []).map((load) => ({
        ...load,
        driver: load.driver_id ? driversMap.get(load.driver_id) || null : null,
      }));

      setLoads(loadsWithDrivers);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch loads');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.load_number.trim() || !formData.facility_address.trim() || !formData.scheduled_time || !formData.driver_id) {
      setFormError('All fields are required');
      return;
    }

    const freeTimeHours = formData.free_time_hours === '' ? 2 : Number(formData.free_time_hours);
    const ratePerHour = formData.rate_per_hour === '' ? 75 : Number(formData.rate_per_hour);
    if (Number.isNaN(freeTimeHours) || Number.isNaN(ratePerHour) || freeTimeHours < 0 || ratePerHour < 0) {
      setFormError('Free time and detention rate must be non-negative numbers');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const dispatcherId = await getDispatcherId();
      if (!dispatcherId) {
        setFormError('Failed to get dispatcher information');
        return;
      }

      let coordinates = null;
      if (formData.facility_lat && formData.facility_long) {
        coordinates = {
          lat: parseFloat(formData.facility_lat),
          lng: parseFloat(formData.facility_long)
        };
      } else {
        coordinates = await geocodeAddress(formData.facility_address.trim());
      }

      const insertData: any = {
        load_number: formData.load_number.trim(),
        dispatcher_id: dispatcherId,
        facility_address: formData.facility_address.trim(),
        scheduled_time: new Date(formData.scheduled_time).toISOString(),
        driver_id: formData.driver_id,
        status: 'scheduled',
        free_time_hours: freeTimeHours,
        rate_per_hour: ratePerHour,
      };

      if (coordinates) {
        insertData.facility_lat = coordinates.lat;
        insertData.facility_long = coordinates.lng;
      }

      const { error: insertError } = await supabase
        .from('loads')
        .insert([insertData]);

      if (insertError) throw insertError;

      setFormData({
        load_number: '',
        facility_address: '',
        scheduled_time: '',
        driver_id: '',
        facility_lat: '',
        facility_long: '',
        free_time_hours: '2',
        rate_per_hour: '75',
      });
      setShowModal(false);
      fetchLoads();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add load');
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = loads.filter((load) => {
    const matchesSearch =
      load.facility_address.toLowerCase().includes(search.toLowerCase()) ||
      (load.driver?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || load.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const featuredLoad = filtered.length > 0 ? filtered[0] : null;
  const gridLoads = filtered.slice(1);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight uppercase">Active Loads</h2>
          <p className="text-sm text-gray-500 mt-1">Loading...</p>
        </div>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading loads...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight uppercase">Active Loads</h2>
          <p className="text-sm text-gray-500 mt-1">Error loading data</p>
        </div>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-[#FF6B00] mx-auto mb-3" />
            <p className="text-lg font-semibold text-white mb-2">Failed to Load Data</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => fetchLoads()}
              className="px-4 py-2 bg-[#FF6B00] text-white font-bold rounded-lg hover:bg-[#FF5500] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide uppercase">Active Loads</h2>
            <p className="text-sm text-gray-400 mt-1">{filtered.length} loads tracked</p>
          </div>
          <button
            onClick={handleNewLoadClick}
            className="flex items-center gap-2 px-4 py-3 bg-[#FF6B00] text-white font-bold rounded-lg hover:bg-[#FF5500] active:scale-[0.98] transition-all"
          >
            {!hasActiveSubscription && <Lock className="w-4 h-4" />}
            <Plus className="w-5 h-5" />
            <span>New Load</span>
          </button>
        </div>

        {loads.length === 0 ? (
          <div className="rounded-xl p-12 text-center border border-white/10 bg-[#0F0F0F]">
            <Truck className="w-16 h-16 text-[#FF6B00]/40 mx-auto mb-4" />
            <p className="text-lg font-semibold text-white mb-2">No Loads Yet</p>
            <p className="text-sm text-gray-400 mb-6">Create your first load to start tracking deliveries</p>
            <button
              onClick={handleNewLoadClick}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6B00] text-white font-bold rounded-lg hover:bg-[#FF5500] transition-all"
            >
              <Plus className="w-5 h-5" />
              New Load
            </button>
          </div>
        ) : (
          <>
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search loads or drivers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0F0F0F] border border-white/10 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/30 transition-all"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-3 bg-[#0F0F0F] border border-white/10 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/30 appearance-none cursor-pointer min-w-[160px]"
                >
                  <option value="all">All Status</option>
                  <option value="in_transit">In Transit</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="at_facility">At Facility</option>
                  <option value="delayed">Delayed</option>
                </select>
              </div>
            </div>

            {/* Master Tracking Card */}
            {featuredLoad && (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0F0F0F]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                  {/* Left: Timeline */}
                  <div className="p-8 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-6">Milestone Timeline</h3>
                      <div className="space-y-4">
                        {[
                          { label: 'Dispatched', completed: ['scheduled', 'in_transit', 'at_facility', 'delayed'].includes(featuredLoad.status) },
                          { label: 'In Transit', completed: ['in_transit', 'at_facility', 'delayed'].includes(featuredLoad.status) },
                          { label: 'At Facility', completed: ['at_facility', 'delayed'].includes(featuredLoad.status) },
                          { label: 'Complete', completed: false },
                        ].map((milestone, idx) => (
                          <div key={milestone.label} className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                milestone.completed
                                  ? 'bg-[#FF6B00] text-white'
                                  : 'bg-white/10 text-gray-500 border border-white/20'
                              }`}>
                                {milestone.completed ? '✓' : idx + 1}
                              </div>
                              {idx < 3 && (
                                <div className={`w-0.5 h-8 mt-2 ${
                                  milestone.completed ? 'bg-[#FF6B00]' : 'bg-white/10'
                                }`} />
                              )}
                            </div>
                            <div className="pt-1">
                              <p className={`text-xs font-medium ${
                                milestone.completed ? 'text-white' : 'text-gray-500'
                              }`}>
                                {milestone.label}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Center: Truck Graphic */}
                  <div className="p-8 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col items-center justify-between bg-[#1A1A1A]">
                    <div className="w-full">
                      <TruckGraphic loadId={featuredLoad.id} />
                    </div>
                    <div className="mt-6 text-center w-full">
                      <p className="text-xl font-bold text-[#FF6B00] font-mono">
                        #{featuredLoad.id.slice(0, 6).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">Load Reference</p>
                      {featuredLoad.load_number && (
                        <p className="text-sm text-gray-300 mt-1 font-medium">{featuredLoad.load_number}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Details */}
                  <div className="p-8 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Route Details</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Destination</p>
                          <p className="text-sm text-white truncate">{featuredLoad.facility_address}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Driver</p>
                          <p className="text-sm text-white">{featuredLoad.driver?.name || 'Unassigned'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Scheduled Arrival</p>
                          <p className="text-sm text-white font-mono">{formatTime(featuredLoad.scheduled_time)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Status</p>
                          <div className="mt-1">
                            <StatusBadge status={featuredLoad.status} />
                          </div>
                        </div>
                      </div>
                    </div>
                    {featuredLoad.facility_lat && featuredLoad.facility_long && (
                      <button
                        onClick={() => setSelectedLoad(featuredLoad)}
                        className="mt-6 w-full flex items-center justify-center gap-2 py-2 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-lg text-[#FF6B00] text-xs font-bold hover:bg-[#FF6B00]/20 transition-all"
                      >
                        <Navigation className="w-4 h-4" />
                        View Map
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mini Map Modal */}
            {selectedLoad && (
              <div className="rounded-2xl p-6 border border-white/10 bg-[#0F0F0F]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Live GPS Tracking</h3>
                    <p className="text-xs text-gray-400 mt-1">{selectedLoad.facility_address}</p>
                  </div>
                  <button
                    onClick={() => setSelectedLoad(null)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {selectedLoad.facility_lat && selectedLoad.facility_long ? (
                  <>
                    <div className="h-[400px] w-full rounded-xl overflow-hidden border border-white/10">
                      <LoadMap
                        facilityLat={selectedLoad.facility_lat}
                        facilityLong={selectedLoad.facility_long}
                        facilityName={selectedLoad.facility_address}
                        driverName={selectedLoad.driver?.name}
                      />
                    </div>
                    <div className="mt-4 p-3 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-lg">
                      <p className="text-xs text-[#FF6B00] font-bold">
                        200m Geofence Active — Auto-arrival detection enabled
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="h-[400px] w-full rounded-xl border border-white/10 bg-[#1A1A1A] flex items-center justify-center">
                    <div className="text-center p-8">
                      <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-gray-400 mb-1">Waiting for GPS Coordinates</p>
                      <p className="text-xs text-gray-500">Add facility coordinates to enable live tracking</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Grid of Load Cards */}
            {gridLoads.length > 0 && (
              <>
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">All Loads</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gridLoads.map((load) => (
                    <div
                      key={load.id}
                      className="rounded-xl p-5 group hover:shadow-lg hover:shadow-[#FF6B00]/10 transition-all border border-white/10 bg-[#0F0F0F] hover:border-[#FF6B00]/30"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">Load ID</p>
                          <p className="text-sm font-bold text-[#FF6B00] font-mono">#{load.id.slice(0, 6).toUpperCase()}</p>
                        </div>
                        <StatusBadge status={load.status} />
                      </div>

                      <div className="mb-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Destination</p>
                            <p className="text-sm text-gray-200 line-clamp-2">{load.facility_address}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Driver</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">{load.driver?.name || 'Unassigned'}</p>
                          {load.driver?.phone && (
                            <a
                              href={`tel:${load.driver.phone}`}
                              className="p-1.5 text-gray-400 hover:text-[#FF6B00] hover:bg-[#FF6B00]/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              title="Call driver"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Scheduled</p>
                          <p className="text-xs font-mono text-gray-300">{formatTime(load.scheduled_time).split(' ').pop()}</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Payload</p>
                          <p className="text-xs font-mono text-gray-300">{load.weight ? `${load.weight} lbs` : 'TBD'}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/loads/${load.id}`)}
                        className="w-full py-2.5 px-4 bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] text-xs font-bold rounded-lg hover:bg-[#FF6B00]/20 transition-all"
                      >
                        Check-In / Details
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Truck className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-sm">No loads match your filters.</p>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F0F0F] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-xl font-bold text-white">Create New Load</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormData({
                    load_number: '',
                    facility_address: '',
                    scheduled_time: '',
                    driver_id: '',
                    facility_lat: '',
                    facility_long: '',
                    free_time_hours: '2',
                    rate_per_hour: '75',
                  });
                  setFormError('');
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {formError}
                </div>
              )}

              <div>
                <label htmlFor="load_number" className="block text-sm font-bold text-gray-300 mb-2">
                  Load Number / Reference
                </label>
                <input
                  type="text"
                  id="load_number"
                  value={formData.load_number}
                  onChange={(e) => setFormData({ ...formData, load_number: e.target.value })}
                  placeholder="e.g., LN-12345"
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="facility" className="block text-sm font-bold text-gray-300 mb-2">
                  Facility Address
                </label>
                <input
                  type="text"
                  id="facility"
                  value={formData.facility_address}
                  onChange={(e) => setFormData({ ...formData, facility_address: e.target.value })}
                  placeholder="1234 Warehouse St, City, State ZIP"
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="facility_lat" className="block text-sm font-bold text-gray-300 mb-2">
                    Latitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    id="facility_lat"
                    value={formData.facility_lat}
                    onChange={(e) => setFormData({ ...formData, facility_lat: e.target.value })}
                    placeholder="40.7128"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="facility_long" className="block text-sm font-bold text-gray-300 mb-2">
                    Longitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    id="facility_long"
                    value={formData.facility_long}
                    onChange={(e) => setFormData({ ...formData, facility_long: e.target.value })}
                    placeholder="-74.0060"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                  />
                </div>
              </div>
              {formData.facility_lat && formData.facility_long && (
                <div className="p-3 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-lg">
                  <p className="text-xs text-[#FF6B00] font-bold">
                    GPS tracking and auto-arrival detection will be enabled for this load
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="scheduled" className="block text-sm font-bold text-gray-300 mb-2">
                  Scheduled Arrival Time
                </label>
                <input
                  type="datetime-local"
                  id="scheduled"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="free_time_hours" className="block text-sm font-bold text-gray-300 mb-2">
                    Free Time (hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    id="free_time_hours"
                    value={formData.free_time_hours}
                    onChange={(e) => setFormData({ ...formData, free_time_hours: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                    placeholder="2"
                  />
                  <p className="mt-1 text-xs text-gray-500">Default: 2 hours</p>
                </div>
                <div>
                  <label htmlFor="rate_per_hour" className="block text-sm font-bold text-gray-300 mb-2">
                    Detention Rate ($/hour)
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    id="rate_per_hour"
                    value={formData.rate_per_hour}
                    onChange={(e) => setFormData({ ...formData, rate_per_hour: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                    placeholder="75"
                  />
                  <p className="mt-1 text-xs text-gray-500">Default: $75/hour</p>
                </div>
              </div>

              <div>
                <label htmlFor="driver" className="block text-sm font-bold text-gray-300 mb-2">
                  Assign Driver
                </label>
                <select
                  id="driver"
                  value={formData.driver_id}
                  onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors appearance-none cursor-pointer"
                  required
                >
                  <option value="">Select a driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
                {drivers.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    No drivers available. Add drivers first from the Drivers page.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({
                      load_number: '',
                      facility_address: '',
                      scheduled_time: '',
                      driver_id: '',
                      facility_lat: '',
                      facility_long: '',
                      free_time_hours: '2',
                      rate_per_hour: '75',
                    });
                    setFormError('');
                  }}
                  className="flex-1 px-4 py-3 bg-[#1A1A1A] border border-white/10 text-gray-300 font-bold rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || drivers.length === 0}
                  className="flex-1 px-4 py-3 bg-[#FF6B00] text-white font-bold rounded-lg hover:bg-[#FF5500] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Load
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
