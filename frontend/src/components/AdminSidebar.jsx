import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  LayoutDashboard, 
  Boxes, 
  PlusCircle, 
  Home, 
  LogOut, 
  ShieldAlert, 
  Radio, 
  Activity,
  Video
} from 'lucide-react';

const AdminSidebar = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin', label: 'Control Center', icon: LayoutDashboard, end: true },
    { to: '/admin/cctv', label: 'CCTV Monitoring', icon: Video },
    { to: '/admin/resources', label: 'Resource Inventory', icon: Boxes },
    { to: '/report', label: 'Report Incident', icon: PlusCircle },
    { to: '/', label: 'Public Home', icon: Home },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-200">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 text-base leading-tight">CrisisGrid AI</h1>
          <p className="text-xs text-rose-600 font-medium">Control Center Admin</p>
        </div>
      </div>

      {/* Realtime Live Status Indicator */}
      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 flex items-center gap-1.5 font-medium">
          <Radio className="w-3.5 h-3.5 text-slate-400" />
          Network Sync:
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
          <span className={isConnected ? 'text-emerald-700' : 'text-amber-700'}>
            {isConnected ? 'Connected' : 'Connecting'}
          </span>
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-rose-50 text-rose-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Admin Profile & Logout Footer */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || 'Administrator'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@crisisgrid.com'}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-lg transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
