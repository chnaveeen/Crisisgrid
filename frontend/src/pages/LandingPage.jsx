import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { 
  ShieldAlert, 
  Sparkles, 
  ArrowRight, 
  Flame, 
  Waves, 
  Ambulance, 
  Activity, 
  ShieldCheck, 
  Radio, 
  CheckCircle2 
} from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              
              {/* Emergency Platform Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold mb-6 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                <span>CrisisGrid AI Platform</span>
                <span className="text-rose-400">|</span>
                <span className="flex items-center gap-1 font-medium text-rose-800">
                  <Sparkles className="w-3.5 h-3.5" /> Fast AI Triage
                </span>
              </div>

              {/* Title & Tagline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
                AI-Powered Emergency <br />
                <span className="text-rose-600">Resource Coordination</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-10">
                Instantly report disaster incidents, evaluate crisis severity with real-time AI,
                and dispatch life-saving first responder units from a unified control grid.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/report"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-base font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 hover:shadow-lg hover:shadow-rose-300 transition"
                >
                  <ShieldAlert className="w-5 h-5" />
                  <span>Report Emergency</span>
                </Link>

                <Link
                  to="/admin"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-sm transition"
                >
                  <ShieldCheck className="w-5 h-5 text-rose-600" />
                  <span>Control Center</span>
                </Link>

                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition"
                >
                  <span>Login</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

            </div>

            {/* Quick Demo Preview Card */}
            <div className="mt-14 max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <Radio className="w-5 h-5 text-rose-600 animate-pulse" />
                    How CrisisGrid AI Coordinates Response
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    End-to-end rapid incident handling lifecycle for citizens & emergency controllers
                  </p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  System Operational
                </span>
              </div>

              {/* 4 Step Workflow Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm mb-3">
                    1
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">Citizen Reports</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Submit incident details, location coordinates, and situational description in seconds.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm mb-3">
                    2
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">AI Classification</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    AI analyzes emergency text, determines severity score, and generates concise situation summary.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm mb-3">
                    3
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">Control Center</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Incidents appear immediately on live map and table via real-time WebSocket broadcast.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm mb-3">
                    4
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">Resource Dispatch</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Operators review AI-recommended units (Ambulances, Fire Trucks, Boats) and dispatch with 1 click.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>CrisisGrid AI — AI-Powered Emergency Resource Coordination Platform &copy; {new Date().getFullYear()}</p>
        <p className="mt-1 text-slate-400">Built with React, Express, MySQL, Leaflet & Socket.IO</p>
      </footer>
    </div>
  );
};

export default LandingPage;
