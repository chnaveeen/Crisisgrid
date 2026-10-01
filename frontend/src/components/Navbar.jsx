import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut, User, LayoutDashboard, PlusCircle, ShieldCheck } from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-200 group-hover:bg-rose-700 transition">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                CrisisGrid <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-md font-semibold">AI</span>
              </span>
              <p className="text-[11px] text-slate-500 hidden sm:block">Emergency Coordination</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm shadow-rose-200 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Emergency</span>
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {isAdmin ? (
                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    <span>Control Center</span>
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>My Dashboard</span>
                  </Link>
                )}

                <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

                {/* User Info & Logout */}
                <div className="flex items-center gap-2 pl-1">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-medium text-xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-none">{user?.name || 'User'}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{user?.role || 'Citizen'}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                >
                  Log In
                </Link>
                <Link
                  to="/admin"
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-500" />
                  <span>Control Center</span>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
