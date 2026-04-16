import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageSquare, Truck, Loader2, Plus, X, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getDispatcherId } from '../lib/dispatcher';
import { useSubscription } from '../hooks/useSubscription';
import UpgradeModal from '../components/UpgradeModal';

interface Driver {
  id: string;
  name: string;
  phone: string;
  truck_id?: string | null;
  activeLoads?: number;
  activeLoadId?: string;
}

interface LoadData {
  id: string;
  driver_id: string;
  status: string;
  load_number?: string;
}

export default function Drivers() {
  const navigate = useNavigate();
  const { hasActiveSubscription, canAddTruck } = useSubscription();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', truck_id: '' });
  const [error, setError] = useState('');
  const [loadsMap, setLoadsMap] = useState<Map<string, LoadData>>(new Map());
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [limitInfo, setLimitInfo] = useState<{ currentCount?: number; limit?: number; plan?: string }>({});
  const [createdById, setCreatedById] = useState<string | null>(null);

  useEffect(() => {
    if (showModal) {
      resolveCreatedBy();
    }
  }, [showModal]);

  async function resolveCreatedBy() {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .maybeSingle();

      if (profile?.id) {
        setCreatedById(profile.id);
        return;
      }
    } catch {
    }

    const { data: { user } } = await supabase.auth.getUser();
    setCreatedById(user?.id ?? null);
  }

  async function handleAddDriverClick() {
    console.log('Add Driver Clicked', { hasActiveSubscription });

    if (!hasActiveSubscription) {
      navigate('/billing');
      return;
    }

    const checkResult = await canAddTruck();
    console.log('canAddTruck result:', checkResult);

    if (!checkResult.allowed) {
      if (checkResult.reason === 'limit_reached') {
        const planName = checkResult.plan?.toLowerCase() === 'solo' ? 'Solo' : 'Growth';
        const nextPlan = checkResult.plan?.toLowerCase() === 'solo' ? 'Growth' : 'Enterprise';
        setUpgradeMessage(
          `You've reached your ${planName} plan limit of ${checkResult.limit} trucks. Upgrade to ${nextPlan} to add more trucks.`
        );
        setLimitInfo({
          currentCount: checkResult.currentCount,
          limit: checkResult.limit,
          plan: planName
        });
        setShowUpgradeModal(true);
      }
      return;
    }

    setShowModal(true);
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      const { data: driversData } = await supabase
        .from('drivers')
        .select('*')
        .order('name', { ascending: true });

      const { data: loadsData } = await supabase
        .from('loads')
        .select('id, driver_id, status, load_number')
        .neq('status', 'completed');

      const loadCountMap = new Map<string, number>();
      const loadFirstMap = new Map<string, LoadData>();
      const newLoadsMap = new Map<string, LoadData>();

      if (loadsData) {
        for (const load of loadsData) {
          if (load.driver_id) {
            loadCountMap.set(load.driver_id, (loadCountMap.get(load.driver_id) || 0) + 1);
            if (!loadFirstMap.has(load.driver_id)) {
              loadFirstMap.set(load.driver_id, load);
            }
            newLoadsMap.set(load.driver_id, load);
          }
        }
      }

      const driversWithCounts = (driversData || []).map((driver) => ({
        id: driver.id,
        name: driver.name || '',
        phone: driver.phone || '',
        truck_id: driver.truck_id || null,
        activeLoads: loadCountMap.get(driver.id) || 0,
        activeLoadId: loadFirstMap.get(driver.id)?.id,
      }));

      setDrivers(driversWithCounts);
      setLoadsMap(newLoadsMap);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('Name and phone number are required');
      return;
    }

    const e164Regex = /^\+?[1-9]\d{6,14}$|^\(\d{3}\)\s?\d{3}-\d{4}$|^\d{10,11}$/;
    const digitsOnly = formData.phone.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      setError('Enter a valid phone number');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const dispatcherId = await getDispatcherId();
      if (!dispatcherId) {
        setError('Failed to get dispatcher information');
        return;
      }

      const insertPayload: Record<string, string> = {
        dispatcher_id: dispatcherId,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
      };
      if (formData.truck_id.trim()) {
        insertPayload.truck_id = formData.truck_id.trim();
      }
      if (createdById) {
        insertPayload.created_by = createdById;
      }

      const { error: insertError } = await supabase
        .from('drivers')
        .insert([insertPayload]);

      if (insertError) throw insertError;

      setFormData({ name: '', phone: '', truck_id: '' });
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      const msg = err.message || 'Failed to add driver';
      console.error('Driver insert error:', err);
      alert(`DB Error: ${msg}`);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const totalDrivers = drivers.length;
  const activeLoadsTotal = drivers.reduce((sum, d) => sum + (d.activeLoads || 0), 0);
  const availableForDispatch = drivers.filter(d => (d.activeLoads || 0) === 0).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-extra-wide uppercase">Driver Fleet</h2>
          <p className="text-sm text-slate-400 mt-1">Loading...</p>
        </div>
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-extra-wide uppercase">Driver Fleet</h2>
            <p className="text-sm text-slate-400 mt-1">Real-time driver management and load assignment</p>
          </div>
          <button
            onClick={handleAddDriverClick}
            className="flex items-center gap-2 px-5 py-3 bg-[#FF6B00] text-white font-bold rounded-lg hover:bg-[#FF5500] active:scale-[0.98] transition-all"
          >
            {!hasActiveSubscription && <Lock className="w-4 h-4" />}
            <Plus className="w-5 h-5" />
            <span>Add Driver</span>
          </button>
        </div>

        {/* Fleet Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Drivers', value: totalDrivers, icon: Truck, color: 'from-orange-600 to-orange-400' },
            { label: 'Active Loads', value: activeLoadsTotal, icon: Phone, color: 'from-blue-600 to-cyan-500' },
            { label: 'Detention Events', value: 0, icon: MessageSquare, color: 'from-orange-600 to-red-500' },
            { label: 'Available for Dispatch', value: availableForDispatch, icon: Plus, color: 'from-green-600 to-emerald-500' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl p-5 border border-white/10 bg-[#0F0F0F] hover:bg-[#1A1A1A] transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg bg-gradient-to-br ${stat.color} bg-opacity-10`}>
                  <stat.icon className="w-5 h-5 text-white opacity-70" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white font-mono mb-1">{stat.value}</p>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Driver Grid */}
        {drivers.length === 0 ? (
          <div className="rounded-2xl p-16 text-center border border-white/10 bg-[#0F0F0F]">
            <div className="w-16 h-16 rounded-2xl bg-[#FF6B00]/10 flex items-center justify-center mx-auto mb-4 border border-[#FF6B00]/20">
              <Truck className="w-8 h-8 text-[#FF6B00]/60" />
            </div>
            <p className="text-lg font-semibold text-white mb-2">No Drivers Yet</p>
            <p className="text-sm text-gray-400 mb-6">Add your first driver to start managing your fleet</p>
            <button
              onClick={handleAddDriverClick}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6B00] text-white font-bold rounded-lg hover:bg-[#FF5500] transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Driver
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map((driver) => {
              const initials = driver.name.split(' ').map((n) => n[0]).join('');
              const loadNumber = loadsMap.get(driver.id)?.load_number || (driver.activeLoadId ? `#${driver.activeLoadId.slice(0, 4).toUpperCase()}` : null);
              const loadProgress = driver.activeLoads ? 10 : 0;

              return (
                <div
                  key={driver.id}
                  className="rounded-2xl overflow-hidden border border-white/10 bg-[#0F0F0F] hover:border-[#FF6B00]/30 hover:shadow-lg hover:shadow-[#FF6B00]/10 transition-all group relative"
                >
                  {/* Action Icons - Floating */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button className="p-2.5 rounded-lg bg-white/10 hover:bg-[#FF6B00]/20 border border-white/10 transition-all" title="Call driver">
                      <Phone className="w-4 h-4 text-[#FF6B00]" />
                    </button>
                    <button className="p-2.5 rounded-lg bg-white/10 hover:bg-[#FF6B00]/20 border border-white/10 transition-all" title="Message driver">
                      <MessageSquare className="w-4 h-4 text-[#FF6B00]" />
                    </button>
                  </div>

                  {/* Header with Isometric Truck and Info */}
                  <div className="px-6 py-5 border-b border-white/10 bg-white/5">
                    <div className="flex items-start gap-4">
                      {/* Truck Icon Container */}
                      <div className="w-16 h-16 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center flex-shrink-0 border border-[#FF6B00]/20">
                        <Truck className="w-8 h-8 text-[#FF6B00]" />
                      </div>

                      {/* Driver Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 rounded-full bg-[#FF6B00] flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">{initials}</span>
                          </div>
                          <p className="text-sm font-semibold text-white truncate">{driver.name}</p>
                        </div>
                        <p className="text-xs text-slate-400 font-mono">{driver.phone}</p>
                        {driver.truck_id && (
                          <p className="text-[10px] text-[#FF6B00]/70 font-mono mt-0.5">{driver.truck_id}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Load Info */}
                  <div className="px-6 py-5 space-y-4">
                    {driver.activeLoads ? (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Active Load</p>
                            <p className="text-xs font-bold text-[#FF6B00]">{loadNumber}</p>
                          </div>
                          <p className="text-sm text-gray-300">
                            {driver.activeLoads} load{driver.activeLoads !== 1 ? 's' : ''} assigned
                          </p>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Load Progress</p>
                            <p className="text-xs font-bold text-[#FF6B00]">{loadProgress}%</p>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                            <div
                              className="h-full bg-[#FF6B00] transition-all duration-300"
                              style={{ width: `${loadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="py-6 text-center">
                        <p className="text-sm text-slate-400">Ready for assignment</p>
                        <div className="mt-3 w-2 h-2 rounded-full bg-green-500 mx-auto"></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        message={upgradeMessage}
        currentPlan={limitInfo.plan}
        currentCount={limitInfo.currentCount}
        limit={limitInfo.limit}
      />

      {/* Add Driver Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F0F0F] rounded-2xl w-full max-w-md shadow-2xl border border-white/10">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-xl font-bold text-white">Add New Driver</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormData({ name: '', phone: '', truck_id: '' });
                  setError('');
                  setCreatedById(null);
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-300 mb-2">
                  Driver Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Smith"
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-bold text-gray-300 mb-2">
                  Phone Number <span className="text-gray-500 font-normal">(E.164 or US format)</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+15551234567 or (555) 123-4567"
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="truck_id" className="block text-sm font-bold text-gray-300 mb-2">
                  Truck ID <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="truck_id"
                  value={formData.truck_id}
                  onChange={(e) => setFormData({ ...formData, truck_id: e.target.value })}
                  placeholder="e.g., UNIT-42 or TRK-7"
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ name: '', phone: '', truck_id: '' });
                    setError('');
                    setCreatedById(null);
                  }}
                  className="flex-1 px-4 py-3 bg-[#1A1A1A] border border-white/10 text-gray-300 font-bold rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-[#FF6B00] text-white font-bold rounded-lg hover:bg-[#FF5500] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Driver
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
