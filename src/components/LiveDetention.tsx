import { Clock, DollarSign, AlertTriangle } from 'lucide-react';
import { useDetentionEngine } from '../hooks/useDetentionEngine';

function formatTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.floor(((hours - h) * 60 - m) * 60);
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export default function LiveDetention() {
  const { activeDetentions, totalLiveRevenue, loading } = useDetentionEngine();

  if (loading) {
    return (
      <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0F0F0F]">
        <div className="px-5 py-4 border-b border-white/10 bg-[#1A1A1A]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FF6B00]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Live Detention</h3>
          </div>
        </div>
        <div className="px-5 py-8 text-center text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0F0F0F]">
      <div className="px-5 py-4 border-b border-white/10 bg-[#1A1A1A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Clock className="w-4 h-4 text-[#FF6B00]" />
              {activeDetentions.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF6B00] rounded-full animate-ping" />
              )}
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Live Detention</h3>
          </div>
          {activeDetentions.length > 0 && (
            <span className="text-xs font-bold text-[#FF6B00] bg-[#FF6B00]/10 px-2 py-0.5 rounded-full">
              {activeDetentions.length} active
            </span>
          )}
        </div>
      </div>

      {activeDetentions.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No active detention events</p>
          <p className="text-xs text-gray-600 mt-1">Detention starts 2 hours after facility arrival</p>
        </div>
      ) : (
        <div>
          <div className="px-5 py-4 border-b border-white/5 bg-[#FF6B00]/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#FF6B00]" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total Live Revenue</span>
              </div>
              <span className="text-2xl font-black text-[#FF6B00] font-mono tabular-nums">
                ${totalLiveRevenue.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
            {activeDetentions.map(d => (
              <div key={d.detentionId} className="px-5 py-3 hover:bg-white/5 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{d.facilityAddress}</p>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">Load: {d.loadNumber}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-[#FF6B00] font-mono tabular-nums">${d.revenue.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] text-gray-400 font-mono tabular-nums">{formatTime(d.elapsedHours)}</span>
                  </div>
                  {d.billableHours > 0 ? (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-[#FF6B00]" />
                      <span className="text-[10px] text-[#FF6B00] font-bold font-mono tabular-nums">
                        {formatTime(d.billableHours)} billable
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-500">Free time remaining</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
