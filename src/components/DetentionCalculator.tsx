import { useState, useEffect } from 'react';
import { DollarSign, Truck, Clock, TrendingDown, ChevronRight } from 'lucide-react';

interface Props {
  onScrollToPricing?: () => void;
}

export default function DetentionCalculator({ onScrollToPricing }: Props) {
  const [trucks, setTrucks] = useState<number>(5);
  const [waitTime, setWaitTime] = useState<number>(4);
  const [hourlyRate, setHourlyRate] = useState<number>(75);
  const [lostRevenue, setLostRevenue] = useState<number>(0);
  const [animated, setAnimated] = useState<number>(0);

  useEffect(() => {
    const billableHours = Math.max(0, waitTime - 2);
    const monthly = trucks * billableHours * hourlyRate * 20;
    setLostRevenue(monthly);
  }, [trucks, waitTime, hourlyRate]);

  useEffect(() => {
    if (lostRevenue === 0) {
      setAnimated(0);
      return;
    }
    const duration = 600;
    const steps = 40;
    const increment = lostRevenue / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= lostRevenue) {
        setAnimated(lostRevenue);
        clearInterval(interval);
      } else {
        setAnimated(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [lostRevenue]);

  const handleScrollToPricing = () => {
    if (onScrollToPricing) {
      onScrollToPricing();
      return;
    }
    const el = document.getElementById('pricing-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#FF6B00]/30">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #FF6B00 1px, transparent 1px),
            linear-gradient(to bottom, #FF6B00 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #FF6B00 1px, transparent 1px),
            linear-gradient(to bottom, #FF6B00 1px, transparent 1px)
          `,
          backgroundSize: '8px 8px',
        }}
      />

      <div className="relative bg-[#0A0A0A]/95 backdrop-blur-sm">
        <div className="px-6 py-5 border-b border-[#FF6B00]/20 bg-[#FF6B00]/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/20 border border-[#FF6B00]/30 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-[#FF6B00]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-widest">
                Detention Revenue Recovery
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Calculate how much you're losing without automated tracking
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-widest">
                <Truck className="w-3.5 h-3.5 text-[#FF6B00]" />
                Number of Trucks
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={trucks}
                  onChange={(e) => setTrucks(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #FF6B00 ${(trucks / 50) * 100}%, #2a2a2a ${(trucks / 50) * 100}%)`,
                  }}
                />
                <div className="w-16 px-3 py-2 bg-[#1A1A1A] border border-[#FF6B00]/30 rounded-lg text-center">
                  <span className="text-sm font-bold text-[#FF6B00]">{trucks}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5 text-[#FF6B00]" />
                Avg. Dock Wait Time (hours)
                <span className="text-[10px] font-normal text-gray-500 normal-case tracking-normal ml-1">(2hr free time)</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={12}
                  step={0.5}
                  value={waitTime}
                  onChange={(e) => setWaitTime(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #FF6B00 ${((waitTime - 1) / 11) * 100}%, #2a2a2a ${((waitTime - 1) / 11) * 100}%)`,
                  }}
                />
                <div className="w-16 px-3 py-2 bg-[#1A1A1A] border border-[#FF6B00]/30 rounded-lg text-center">
                  <span className="text-sm font-bold text-[#FF6B00]">{waitTime}h</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-widest">
                <DollarSign className="w-3.5 h-3.5 text-[#FF6B00]" />
                Avg. Hourly Detention Rate
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={25}
                  max={200}
                  step={5}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #FF6B00 ${((hourlyRate - 25) / 175) * 100}%, #2a2a2a ${((hourlyRate - 25) / 175) * 100}%)`,
                  }}
                />
                <div className="w-16 px-3 py-2 bg-[#1A1A1A] border border-[#FF6B00]/30 rounded-lg text-center">
                  <span className="text-sm font-bold text-[#FF6B00]">${hourlyRate}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5">
              <div className="text-xs text-gray-500 space-y-1">
                <p className="flex gap-2">
                  <span className="text-[#FF6B00] font-mono">Formula:</span>
                  <span>Trucks × (Wait − 2h) × Rate × 20 days</span>
                </p>
                <p className="flex gap-2">
                  <span className="text-[#FF6B00] font-mono">Your numbers:</span>
                  <span>
                    {trucks} × {Math.max(0, waitTime - 2)}h × ${hourlyRate} × 20 days
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="relative w-full max-w-xs">
              <div className="absolute -inset-4 rounded-3xl bg-[#FF6B00]/5 blur-xl" />
              <div className="relative rounded-2xl border border-[#FF6B00]/40 bg-[#0F0F0F] p-8 text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                  Estimated Monthly Lost Revenue
                </p>

                <div className="relative">
                  <div className="text-5xl font-black text-[#FF6B00] font-mono leading-none tabular-nums">
                    ${animated.toLocaleString()}
                  </div>
                  {lostRevenue > 0 && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FF6B00] animate-ping" />
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-3">per month left on the table</p>

                <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-3 text-left">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Per Year</p>
                    <p className="text-sm font-bold text-white font-mono">
                      ${(lostRevenue * 12).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Per Truck/Mo</p>
                    <p className="text-sm font-bold text-white font-mono">
                      ${trucks > 0 ? Math.round(lostRevenue / trucks).toLocaleString() : '0'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleScrollToPricing}
              className="mt-6 w-full max-w-xs flex items-center justify-center gap-2 px-6 py-4 bg-[#FF6B00] text-white font-black rounded-xl hover:bg-[#FF5500] active:scale-[0.98] transition-all uppercase tracking-wide text-sm shadow-lg shadow-[#FF6B00]/30 hover:shadow-[#FF6B00]/50"
            >
              Stop the Bleed — Automate Tracking
              <ChevronRight className="w-4 h-4" />
            </button>

            <p className="mt-3 text-[10px] text-gray-500 text-center max-w-xs">
              LoadHunters automatically tracks dock arrival times, starts detention clocks, and generates invoices — so you capture every dollar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
