import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { incidentService } from '../services/api';
import Navbar from '../components/Navbar';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { 
  PlusCircle, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  ExternalLink,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

const CitizenDashboard = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyIncidents();
  }, [user]);

  const fetchMyIncidents = async () => {
    try {
      setLoading(true);
      // Fetch incidents created by this user, or all if none
      const res = await incidentService.getAll(user?.id ? { created_by: user.id } : {});
      setIncidents(res.data || []);
    } catch (err) {
      console.error('Error fetching citizen incidents:', err);
      setError('Failed to load recent reports. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  // Compute metrics
  const totalReports = incidents.length;
  const pendingReports = incidents.filter(i => i.status !== 'Resolved').length;
  const resolvedReports = incidents.filter(i => i.status === 'Resolved').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-rose-600 font-semibold text-xs mb-1 uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4" />
              Citizen Emergency Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Welcome back, {user?.name || 'Citizen'}!
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track your reported incidents, review AI triage recommendations, and monitor dispatch updates.
            </p>
          </div>

          <Link
            to="/report"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-rose-200 hover:shadow-lg hover:shadow-rose-300 transition shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report New Emergency</span>
          </Link>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Reports
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 mt-3">{totalReports}</p>
            <p className="text-xs text-slate-500 mt-1">Incidents recorded in grid</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending / Active
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-amber-600 mt-3">{pendingReports}</p>
            <p className="text-xs text-slate-500 mt-1">Currently under dispatch or active</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Resolved
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-emerald-600 mt-3">{resolvedReports}</p>
            <p className="text-xs text-slate-500 mt-1">Completed emergency operations</p>
          </div>

        </div>

        {/* My Reports Table / Cards */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Emergency Reports</h2>
              <p className="text-xs text-slate-500">Live timeline of submissions</p>
            </div>
            <button
              onClick={fetchMyIncidents}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg transition"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm">Loading incident reports...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600 text-sm">
              <p>{error}</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">No Emergency Reports Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You haven't submitted any incident reports. Click below to file an emergency report.
              </p>
              <Link
                to="/report"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Report Emergency</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {incidents.map((incident) => (
                <div key={incident.id} className="p-5 hover:bg-slate-50/75 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-400">#{incident.id}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                        {incident.type}
                      </span>
                      <SeverityBadge severity={incident.severity} size="sm" />
                      <StatusBadge status={incident.status} />
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {incident.title}
                    </h3>

                    {incident.ai_summary && (
                      <p className="text-xs text-slate-600 mt-1.5 flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span><strong className="text-slate-700">AI Summary:</strong> {incident.ai_summary}</span>
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {incident.location}
                      </span>
                      <span>•</span>
                      <span>Reported: {new Date(incident.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/admin/incidents/${incident.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-lg transition"
                    >
                      <span>View Details</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </main>
    </div>
  );
};

export default CitizenDashboard;
