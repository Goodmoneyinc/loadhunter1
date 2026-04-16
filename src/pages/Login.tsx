import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          const { error: insertError } = await supabase
            .from('dispatchers')
            .insert([
              {
                user_id: data.user.id,
                company_name: companyName,
              },
            ]);

          if (insertError) throw insertError;
        }

        navigate('/loads');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        navigate('/loads');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-2" style={{ background: 'transparent' }}>
            <img
              src="/Adobe_Express_-_file.png"
              alt="LoadHunters"
              className="h-40 w-auto object-contain"
              style={{ display: 'block', margin: '0 auto', background: 'transparent' }}
            />
          </div>
        </div>

        <div className="bg-[#0F0F0F] rounded-xl border border-white/10 shadow-2xl p-8 space-y-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError('');
              }}
              className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-lg transition-all uppercase tracking-wide ${
                !isSignUp
                  ? 'bg-[#FF6B00] text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError('');
              }}
              className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-lg transition-all uppercase tracking-wide ${
                isSignUp
                  ? 'bg-[#FF6B00] text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="company" className="block text-sm font-semibold text-gray-300 mb-2">
                  Company Name
                </label>
                <input
                  id="company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required={isSignUp}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
                  placeholder="Enter your company name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
              {isSignUp && (
                <p className="text-xs text-gray-500 mt-1.5">Must be at least 6 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#FF6B00] text-white font-bold rounded-lg hover:bg-[#FF5500] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                </>
              ) : (
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
              )}
            </button>
          </form>

          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-center text-gray-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-[#FF6B00] hover:text-[#FF5500] font-bold transition-colors"
              >
                {isSignUp ? 'Sign in here' : 'Sign up here'}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-8">
          Secure authentication powered by Supabase
        </p>
      </div>
    </div>
  );
}
