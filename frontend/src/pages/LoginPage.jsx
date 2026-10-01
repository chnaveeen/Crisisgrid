import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { ShieldAlert, LogIn, KeyRound, Mail, AlertCircle, Sparkles, UserCheck } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      const user = await login(email, password);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (role) => {
    if (role === 'admin') {
      setEmail('admin@crisisgrid.com');
      setPassword('admin123');
    } else {
      setEmail('citizen@crisisgrid.com');
      setPassword('citizen123');
    }
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          
          {/* Card Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-rose-600 text-white mx-auto flex items-center justify-center shadow-md shadow-rose-200 mb-3">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">Sign In to CrisisGrid</h2>
              <p className="text-xs text-slate-500 mt-1">
                Access your emergency dashboard or administrator control grid
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@crisisgrid.com"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 placeholder:text-slate-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 placeholder:text-slate-400 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-rose-200 hover:shadow-lg hover:shadow-rose-300 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              </button>
            </form>

            {/* 1-Click Demo Login Fillers */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                <span>Quick Demo Accounts (1-Click Fill)</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('admin')}
                  className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-200 transition flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-rose-600" />
                  <span>Fill Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('citizen')}
                  className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-200 transition flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Fill Citizen</span>
                </button>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 text-center">
                Admin: admin@crisisgrid.com / admin123 • Citizen: citizen@crisisgrid.com / citizen123
              </div>
            </div>

          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Need to report without an account?{' '}
            <Link to="/report" className="font-semibold text-rose-600 hover:underline">
              Submit an Emergency Report directly
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
