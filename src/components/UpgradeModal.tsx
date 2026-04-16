import { X, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  currentPlan?: string;
  currentCount?: number;
  limit?: number;
}

export default function UpgradeModal({ isOpen, onClose, message, currentPlan, currentCount, limit }: UpgradeModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    navigate('/billing');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl w-full max-w-lg shadow-2xl shadow-electric-violet/30 border border-electric-violet/30 overflow-hidden">
        <div className="relative bg-gradient-to-br from-electric-violet/20 to-electric-cyan/20 p-6 border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-electric-violet to-electric-cyan flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Upgrade Required</h3>
              <p className="text-sm text-slate-300">Unlock more capacity</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-sm text-orange-200 leading-relaxed">{message}</p>
          </div>

          {currentPlan && limit && currentCount !== undefined && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                <span className="text-sm text-slate-400">Current Plan</span>
                <span className="text-sm font-semibold text-white uppercase">{currentPlan}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                <span className="text-sm text-slate-400">Trucks Used</span>
                <span className="text-sm font-bold text-electric-cyan font-mono">{currentCount} / {limit}</span>
              </div>

              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                  style={{ width: `${(currentCount / limit) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Upgrade to get:</p>
            <ul className="space-y-2">
              {[
                'More truck capacity',
                'Advanced detention tracking',
                'Priority support',
                'Custom reporting'
              ].map((benefit, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-electric-cyan"></div>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-slate-300 font-semibold rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-electric-violet to-electric-cyan text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-violet/50 transition-all shadow-lg shadow-electric-violet/30 flex items-center justify-center gap-2"
            >
              <span>View Plans</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
