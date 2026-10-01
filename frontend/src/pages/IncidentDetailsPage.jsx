import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { incidentService, resourceService, cameraService } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  User, 
  Sparkles, 
  Boxes, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Truck,
  RotateCcw,
  Video,
  Camera,
  Eye,
  ShieldCheck,
  Download,
  ExternalLink,
  Radio
} from 'lucide-react';

const IncidentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [incident, setIncident] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [assignQuantity, setAssignQuantity] = useState(1);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // CCTV Inspection state
  const [activeEvidenceModal, setActiveEvidenceModal] = useState(null);
  const [openCameraModal, setOpenCameraModal] = useState(null);
  const [capturingCamId, setCapturingCamId] = useState(null);

  useEffect(() => {
    fetchIncidentAndResources();
  }, [id]);

  // Listen to Socket.IO updates for this incident
  useEffect(() => {
    if (!socket) return;

    const handleIncidentUpdated = (updated) => {
      if (updated.id === Number(id)) {
        setIncident(prev => prev ? { ...prev, ...updated } : prev);
      }
    };

    const handleEvidenceCaptured = (ev) => {
      if (ev.numericIncidentId === Number(id)) {
        console.log('[Incident Details] Real-time CCTV evidence arrived:', ev);
        fetchIncidentAndResources();
      }
    };

    socket.on('incidentUpdated', handleIncidentUpdated);
    socket.on('cctv:evidence-captured', handleEvidenceCaptured);
    socket.on('cctv:incident-evidence', handleEvidenceCaptured);

    return () => {
      socket.off('incidentUpdated', handleIncidentUpdated);
      socket.off('cctv:evidence-captured', handleEvidenceCaptured);
      socket.off('cctv:incident-evidence', handleEvidenceCaptured);
    };
  }, [socket, id]);

  const handleCaptureFromCamera = async (cam) => {
    try {
      setCapturingCamId(cam.camera_id);
      setFeedback({ type: '', message: '' });
      await cameraService.triggerSnapshot(cam.camera_db_id || cam.camera_id, id);
      setFeedback({
        type: 'success',
        message: `Fresh CCTV evidence captured from ${cam.camera_id} and archived to Incident #${id}.`
      });
      await fetchIncidentAndResources();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'CCTV snapshot capture failed.' });
    } finally {
      setCapturingCamId(null);
    }
  };

  const fetchIncidentAndResources = async () => {
    try {
      setLoading(true);
      const [incRes, resRes] = await Promise.all([
        incidentService.getById(id),
        resourceService.getAll()
      ]);
      setIncident(incRes.data);
      setResources(resRes.data || []);
      // Set default resource selection if available
      const firstAvail = resRes.data?.find(r => r.available > 0);
      if (firstAvail) {
        setSelectedResourceId(firstAvail.id.toString());
      }
    } catch (err) {
      console.error('Failed to load incident details:', err);
      setFeedback({ type: 'error', message: 'Unable to load incident details.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Resource Assignment
  const handleAssignResource = async (e) => {
    e.preventDefault();
    if (!selectedResourceId) {
      setFeedback({ type: 'error', message: 'Please select an available resource to assign.' });
      return;
    }

    try {
      setAssigning(true);
      setFeedback({ type: '', message: '' });

      const res = await resourceService.assign(id, {
        resourceId: parseInt(selectedResourceId, 10),
        quantity: parseInt(assignQuantity, 10) || 1
      });

      setFeedback({ type: 'success', message: res.message });
      // Refresh incident details and available resources
      await fetchIncidentAndResources();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Resource assignment failed. Please check available quantity.'
      });
    } finally {
      setAssigning(false);
    }
  };

  // Handle Automatic Resource Generation According to Incident
  const handleAutoDispatchResources = async () => {
    try {
      setAssigning(true);
      setFeedback({ type: '', message: '' });
      const res = await incidentService.autoDispatchResources(id);
      setFeedback({
        type: 'success',
        message: res.message || 'Resources successfully generated and dispatched according to incident requirements.'
      });
      await fetchIncidentAndResources();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Auto-dispatch failed. Please try manual assignment.'
      });
    } finally {
      setAssigning(false);
    }
  };

  // Handle Status Update
  const handleStatusChange = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      setFeedback({ type: '', message: '' });

      const res = await incidentService.updateStatus(id, newStatus);
      setIncident(prev => ({ ...prev, status: newStatus }));
      setFeedback({ type: 'success', message: `Incident status updated to "${newStatus}".` });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update incident status.' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-100">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex h-screen bg-slate-100">
        <AdminSidebar />
        <div className="flex-1 p-8 text-center">
          <p className="text-slate-500">Incident #{id} was not found.</p>
          <Link to="/admin" className="mt-4 inline-block text-sm text-rose-600 font-semibold hover:underline">
            Return to Control Center
          </Link>
        </div>
      </div>
    );
  }

  const selectedResourceObj = resources.find(r => r.id.toString() === selectedResourceId);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header navigation */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">INCIDENT #{incident.id}</span>
                {incident.detection_source === 'CCTV_AUTO_DETECTION' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300">
                    CCTV AI DETECTED
                  </span>
                )}
                <StatusBadge status={incident.status} />
              </div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight truncate max-w-xl">
                {incident.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SeverityBadge severity={incident.severity} />
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback.message && (
          <div className={`mx-6 mt-4 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="p-6 space-y-6 max-w-6xl">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Incident Details & AI Assessment (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Incident Details Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Incident Overview
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    Category: {incident.type}
                  </span>
                </div>

                {/* Autonomous CCTV Banner if source is CCTV */}
                {incident.detection_source === 'CCTV_AUTO_DETECTION' && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-900">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                      <Radio className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Autonomous CCTV Vision Detection</span>
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">
                          {incident.detection_camera_code || 'SURVEILLANCE AI'}
                        </span>
                      </div>
                      <p className="text-amber-800/80 text-[11px] mt-0.5">
                        This incident was detected automatically by computer vision surveillance camera{' '}
                        <strong>{incident.detection_camera_code}</strong> ({incident.detection_camera_name || 'Grid Node'}) without waiting for a citizen or admin report.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">Detailed Description</h3>
                  <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    {incident.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                    <div>
                      <strong className="text-slate-800">Location:</strong>
                      <p className="text-slate-600">{incident.location}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        ({Number(incident.latitude).toFixed(4)}, {Number(incident.longitude).toFixed(4)})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <strong className="text-slate-800">Reported Time:</strong>
                      <p>{new Date(incident.created_at).toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">Reporter: {incident.reporter_name || 'Anonymous Citizen'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Recommendation Card */}
              <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-rose-600" />
                    <span>AI Triage & Resource Recommendation</span>
                  </div>
                  <span className="text-[10px] bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded font-mono">
                    {incident.aiSource || 'AI Engine'}
                  </span>
                </div>

                {/* AI Summary */}
                <div>
                  <span className="text-xs font-semibold text-slate-500 block mb-1">AI Executive Summary:</span>
                  <p className="text-xs text-slate-700 bg-rose-50/40 p-3 rounded-xl border border-rose-100 font-medium">
                    {incident.ai_summary || 'Analysis computed by emergency decision engine.'}
                  </p>
                </div>

                {/* Recommended Resources Badges */}
                <div>
                  <span className="text-xs font-semibold text-slate-500 block mb-2">
                    Recommended Resources by AI:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {incident.recommendedResources && incident.recommendedResources.length > 0 ? (
                      incident.recommendedResources.map((res, i) => (
                        <div
                          key={i}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center"
                        >
                          <Boxes className="w-4 h-4 text-rose-600 mx-auto mb-1" />
                          <p className="text-xs font-bold text-slate-900">{res.type}</p>
                          <p className="text-[11px] text-rose-600 font-semibold mt-0.5">× {res.quantity} required</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 col-span-4">Standard first-responder units advised.</p>
                    )}
                  </div>
                </div>

                {/* Quick Auto-Dispatch Button */}
                <div className="pt-3 border-t border-rose-100 flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-xs text-slate-500">
                    Auto-allocate nearest available fleet units matching AI requirements:
                  </p>
                  <button
                    type="button"
                    onClick={handleAutoDispatchResources}
                    disabled={assigning || incident.status === 'Resolved'}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 rounded-xl transition shadow-md shadow-rose-950/20 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>{assigning ? 'Dispatching...' : '⚡ Generate & Dispatch Resources According to Incident'}</span>
                  </button>
                </div>
              </div>

              {/* Currently Assigned Resources Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-slate-600" />
                  Currently Assigned Emergency Units ({incident.assignedResources?.length || 0})
                </h3>

                {(!incident.assignedResources || incident.assignedResources.length === 0) ? (
                  <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                    No emergency units have been assigned to this incident yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {incident.assignedResources.map((assigned) => (
                      <div key={assigned.assignment_id} className="p-3 bg-white flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{assigned.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {assigned.type} • Origin: {assigned.location}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200">
                            Quantity: {assigned.assigned_quantity}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Assigned {new Date(assigned.assigned_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nearby CCTV Cameras Section */}
              <div className="bg-white rounded-2xl border border-sky-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-sky-100">
                  <div className="flex items-center gap-2 text-sky-800 font-bold text-sm">
                    <Video className="w-4 h-4 text-sky-600" />
                    <span>Nearby CCTV Cameras ({incident.nearbyCameras?.length || 0})</span>
                  </div>
                  <span className="text-[11px] bg-sky-50 text-sky-700 font-semibold px-2 py-0.5 rounded border border-sky-200">
                    Radius: 1.0 KM
                  </span>
                </div>

                {(!incident.nearbyCameras || incident.nearbyCameras.length === 0) ? (
                  <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                    No CCTV cameras located within 1.0 KM radius of this incident.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {incident.nearbyCameras.map((cam, idx) => {
                      const isOnline = cam.camera_status === 'ONLINE';

                      return (
                        <div key={idx} className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50 transition">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200">
                              <Video className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{cam.camera_id}</span>
                                <span className="text-slate-400">•</span>
                                <span className="font-semibold text-slate-700">{cam.camera_name}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Sector: {cam.camera_location} • Protocol: {cam.camera_type}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 sm:self-center">
                            <span className="font-mono font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                              {cam.distance_km} KM
                            </span>

                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                              {cam.camera_status}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleCaptureFromCamera(cam)}
                              disabled={!isOnline || capturingCamId === cam.camera_id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md text-[11px] transition shadow-xs disabled:opacity-40"
                              title="Trigger manual snapshot from this camera"
                            >
                              <Camera className="w-3 h-3" />
                              <span>{capturingCamId === cam.camera_id ? 'Capturing...' : 'Capture'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CCTV Surveillance Evidence Gallery */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <Camera className="w-4 h-4 text-sky-600" />
                    <span>CCTV Surveillance Evidence ({incident.cctvEvidence?.length || 0})</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Archived visual verification records
                  </span>
                </div>

                {(!incident.cctvEvidence || incident.cctvEvidence.length === 0) ? (
                  <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                    No CCTV evidence files archived yet for this incident.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {incident.cctvEvidence.map((ev, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-sm flex flex-col group"
                      >
                        <div 
                          className="relative aspect-video bg-black overflow-hidden flex items-center justify-center cursor-pointer"
                          onClick={() => setActiveEvidenceModal(ev)}
                        >
                          <img
                            src={ev.file_path}
                            alt={`CCTV evidence ${ev.camera_id}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-[10px] text-emerald-400 font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>{ev.camera_id}</span>
                          </div>

                          <div className="absolute top-2 right-2 bg-amber-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">
                            DEMO CCTV FOOTAGE
                          </div>

                          <div className="absolute inset-0 bg-sky-950/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <span className="bg-black/75 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                              <Eye className="w-3.5 h-3.5" /> Enlarge Frame
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-900 border-t border-slate-800 text-xs text-slate-300 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-white text-xs truncate max-w-[170px]">{ev.camera_name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Captured: {ev.captured_at}</p>
                            </div>
                            <span className="font-mono text-sky-400 text-xs font-semibold bg-sky-950/70 px-2 py-0.5 rounded border border-sky-800">
                              {ev.distance_km ? `${ev.distance_km} KM` : 'On-Site'}
                            </span>
                          </div>

                          {/* Pre/Post-Event Window */}
                          <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                            <span>Window:</span>
                            <span className="text-sky-300 font-semibold">
                              {ev.capture_start_time ? String(ev.capture_start_time).substring(11, 19) : '19:10:22'} → {ev.captured_at ? String(ev.captured_at).substring(11, 19) : '19:10:32'} → {ev.capture_end_time ? String(ev.capture_end_time).substring(11, 19) : '19:10:52'}
                            </span>
                          </div>

                          {/* Requested Action Buttons */}
                          <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setActiveEvidenceModal(ev)}
                              className="flex-1 min-w-[90px] inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[10px] transition shadow-xs"
                            >
                              <Eye className="w-3 h-3" />
                              <span>VIEW FULL FOOTAGE</span>
                            </button>

                            <a
                              href={ev.file_path}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-lg text-[10px] border border-slate-700 transition"
                              title="Download evidence image"
                            >
                              <Download className="w-3 h-3" />
                              <span>DOWNLOAD</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => setOpenCameraModal(ev)}
                              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-sky-950 hover:bg-sky-900 text-sky-300 font-semibold rounded-lg text-[10px] border border-sky-800 transition"
                              title="Open live camera feed"
                            >
                              <Radio className="w-3 h-3" />
                              <span>OPEN CAM</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Right Col: Dispatch Actions & Status Flow (1 col) */}
            <div className="space-y-6">
              
              {/* Assign Resources Panel */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4 pb-3 border-b border-slate-100">
                  <Boxes className="w-4 h-4 text-rose-600" />
                  <span>Assign Resources</span>
                </div>

                <form onSubmit={handleAssignResource} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Select Available Resource
                    </label>
                    <select
                      value={selectedResourceId}
                      onChange={(e) => setSelectedResourceId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
                    >
                      {resources.map((r) => (
                        <option 
                          key={r.id} 
                          value={r.id} 
                          disabled={r.available <= 0}
                        >
                          {r.name} ({r.type}) — {r.available} avail
                        </option>
                      ))}
                    </select>
                    {selectedResourceObj && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Located at: <strong className="text-slate-700">{selectedResourceObj.location}</strong> ({selectedResourceObj.available} available)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Quantity to Dispatch
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedResourceObj ? selectedResourceObj.available : 1}
                      value={assignQuantity}
                      onChange={(e) => setAssignQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={assigning || !selectedResourceObj || selectedResourceObj.available <= 0}
                    className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-sm shadow-rose-200 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{assigning ? 'Assigning...' : 'Confirm Assignment'}</span>
                  </button>
                </form>
              </div>

              {/* Status Progression Panel */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
                  Update Operational Status
                </h4>

                <p className="text-xs text-slate-500">
                  Current Status: <strong className="text-slate-800">{incident.status}</strong>
                </p>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleStatusChange('In Progress')}
                    disabled={updatingStatus || incident.status === 'In Progress'}
                    className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs border border-indigo-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Mark as In Progress</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange('Resolved')}
                    disabled={updatingStatus || incident.status === 'Resolved'}
                    className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl text-xs border border-emerald-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark as Resolved</span>
                  </button>

                  {incident.status !== 'Reported' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange('Reported')}
                      disabled={updatingStatus}
                      className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-xl text-xs border border-slate-200 transition flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Revert to Reported</span>
                    </button>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* CCTV Evidence Inspection Modal */}
      {activeEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 text-white">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-sm">
                  CCTV Evidence Dossier: {activeEvidenceModal.camera_id} ({activeEvidenceModal.camera_name})
                </span>
              </div>
              <button
                onClick={() => setActiveEvidenceModal(null)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-4 bg-black flex-1 overflow-auto flex items-center justify-center min-h-[350px]">
              <img
                src={activeEvidenceModal.file_path}
                alt="CCTV Evidence Snapshot"
                className="w-full max-h-[500px] object-contain rounded-lg border border-slate-800 shadow-xl"
              />
            </div>

            {/* Time Window Strip */}
            <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px]">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  Capture Window: <strong className="text-sky-300">{activeEvidenceModal.capture_start_time ? String(activeEvidenceModal.capture_start_time).substring(11, 19) : '19:10:22'}</strong> → <strong className="text-white">{activeEvidenceModal.captured_at ? String(activeEvidenceModal.captured_at).substring(11, 19) : '19:10:32'}</strong> → <strong className="text-sky-300">{activeEvidenceModal.capture_end_time ? String(activeEvidenceModal.capture_end_time).substring(11, 19) : '19:10:52'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-700/60 font-semibold px-2 py-0.5 rounded">
                  DEMO CCTV FOOTAGE — Simulated Evidence
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white">
              <div>
                <p className="font-bold text-white">
                  Incident Associated: #{id} • Proximity: {activeEvidenceModal.distance_km ? `${activeEvidenceModal.distance_km} KM` : 'On-Site'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Sector: {activeEvidenceModal.camera_location || 'Metro Grid'} • Protocol: {activeEvidenceModal.camera_type || 'MOCK_HLS'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpenCameraModal(activeEvidenceModal)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg transition"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>OPEN CAMERA</span>
                </button>

                <a
                  href={activeEvidenceModal.file_path}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg border border-slate-700 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>DOWNLOAD EVIDENCE</span>
                </a>

                <button
                  onClick={() => setActiveEvidenceModal(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Live / Simulated Camera Feed Modal */}
      {openCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="font-bold text-sm">
                  Active Camera Feed: {openCameraModal.camera_id} ({openCameraModal.camera_name})
                </span>
              </div>
              <button
                onClick={() => setOpenCameraModal(null)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-4 bg-black flex flex-col items-center justify-center aspect-video relative">
              <img
                src={openCameraModal.file_path || openCameraModal.snapshot_url}
                alt="Camera Live Stream"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-black/80 text-emerald-400 font-mono text-[10px] px-2 py-1 rounded flex items-center gap-1.5 border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>LIVE FEED • 1080p @ 25 FPS</span>
              </div>
              <div className="absolute bottom-3 right-3 bg-amber-500/90 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow">
                DEMO CCTV FOOTAGE
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Stream Reference:</span>
                <span className="font-mono text-sky-400 truncate max-w-[320px]">
                  {openCameraModal.stream_reference || openCameraModal.stream_url || `rtsp://demo.crisisgrid.internal/live/${openCameraModal.camera_id?.toLowerCase()}`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Location Sector:</span>
                <span className="text-white font-medium">{openCameraModal.camera_location || 'Metro Grid'}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">
                Encrypted Control Center Surveillance Link
              </span>
              <button
                type="button"
                onClick={() => setOpenCameraModal(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition"
              >
                Close Feed
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default IncidentDetailsPage;
