import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import { cameraService } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { 
  Video, 
  Plus, 
  Camera, 
  Trash2, 
  Edit3, 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Filter, 
  ExternalLink,
  Eye,
  ShieldCheck,
  Sparkles,
  Layers,
  Zap
} from 'lucide-react';

const CAMERA_TYPES = ['Mock', 'IP', 'RTSP', 'Snapshot', 'MJPEG'];

const CctvMonitoringPage = () => {
  const [cameras, setCameras] = useState([]);
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, totalEvidence: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [snapshotModalData, setSnapshotModalData] = useState(null);
  const [capturingId, setCapturingId] = useState(null);
  const [detectingId, setDetectingId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    camera_id: '',
    name: '',
    type: 'Mock',
    latitude: '12.9716',
    longitude: '77.5946',
    location: '',
    status: 'ONLINE',
    stream_url: '',
    snapshot_url: ''
  });

  const { socket } = useSocket();

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time socket events for CCTV
  useEffect(() => {
    if (!socket) return;

    const handleCameraUpdated = () => {
      fetchData();
    };

    const handleEvidenceCaptured = (ev) => {
      setFeedback({
        type: 'success',
        message: `Real-time Evidence Captured: ${ev.cameraId} (${ev.cameraName}) at ${ev.distance} KM`
      });
      fetchData();
    };

    socket.on('cctv:camera-updated', handleCameraUpdated);
    socket.on('cctv:camera-deleted', handleCameraUpdated);
    socket.on('cctv:evidence-captured', handleEvidenceCaptured);

    return () => {
      socket.off('cctv:camera-updated', handleCameraUpdated);
      socket.off('cctv:camera-deleted', handleCameraUpdated);
      socket.off('cctv:evidence-captured', handleEvidenceCaptured);
    };
  }, [socket]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [camsRes, statsRes] = await Promise.all([
        cameraService.getAll(),
        cameraService.getStats()
      ]);
      setCameras(camsRes.data || []);
      setStats(statsRes.data || { total: 0, online: 0, offline: 0, totalEvidence: 0 });
    } catch (err) {
      console.error('Failed to load CCTV data:', err);
      setFeedback({ type: 'error', message: 'Unable to load CCTV cameras.' });
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCamera(null);
    setFormData({
      camera_id: `CCTV-${String(cameras.length + 1).padStart(3, '0')}`,
      name: '',
      type: 'Mock',
      latitude: '12.9716',
      longitude: '77.5946',
      location: '',
      status: 'ONLINE',
      stream_url: '',
      snapshot_url: ''
    });
    setShowAddModal(true);
  };

  const openEditModal = (cam) => {
    setEditingCamera(cam);
    setFormData({
      camera_id: cam.camera_id,
      name: cam.name,
      type: cam.type,
      latitude: cam.latitude.toString(),
      longitude: cam.longitude.toString(),
      location: cam.location,
      status: cam.status,
      stream_url: cam.stream_url || '',
      snapshot_url: cam.snapshot_url || ''
    });
    setShowAddModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCamera) {
        await cameraService.update(editingCamera.id, formData);
        setFeedback({ type: 'success', message: `Camera ${formData.camera_id} updated successfully.` });
      } else {
        await cameraService.create(formData);
        setFeedback({ type: 'success', message: `Camera ${formData.camera_id} registered into grid.` });
      }
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Operation failed.' });
    }
  };

  const handleDelete = async (id, camId) => {
    if (!window.confirm(`Are you sure you want to delete camera ${camId}?`)) return;
    try {
      await cameraService.delete(id);
      setFeedback({ type: 'success', message: `Camera ${camId} removed from surveillance fleet.` });
      fetchData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete camera.' });
    }
  };

  // Trigger manual snapshot
  const handleTriggerSnapshot = async (cam) => {
    try {
      setCapturingId(cam.id);
      setFeedback({ type: '', message: '' });
      const res = await cameraService.triggerSnapshot(cam.id);
      setSnapshotModalData({
        camera: cam,
        snapshot: res.data.snapshot
      });
      setFeedback({ type: 'success', message: `Fresh snapshot captured from ${cam.camera_id}.` });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Snapshot capture failed.' });
    } finally {
      setCapturingId(null);
    }
  };

  // Trigger autonomous CCTV emergency detection simulation
  const handleTriggerDetection = async (cam) => {
    try {
      setDetectingId(cam.id);
      setFeedback({ type: '', message: '' });
      const res = await cameraService.triggerDetection(cam.id);
      const inc = res.data?.incident;
      setFeedback({
        type: 'success',
        message: `🚨 Emergency Detected on ${cam.camera_id}! Incident ${inc?.incident_id || '#' + inc?.id} created & alerted to Control Room.`
      });
      fetchData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'CCTV auto-detection failed.' });
    } finally {
      setDetectingId(null);
    }
  };

  // Filtered cameras
  const filteredCameras = cameras.filter(cam => {
    const matchesSearch = cam.camera_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cam.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || cam.status === filterStatus;
    const matchesType = filterType === 'ALL' || cam.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-2 text-sky-700 font-bold text-xs uppercase tracking-wider mb-0.5">
              <Video className="w-3.5 h-3.5 text-sky-600" />
              <span>Surveillance Grid Management</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">CCTV Camera Integration</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              title="Refresh Grid"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Register Camera</span>
            </button>
          </div>
        </header>

        {/* Feedback Alert */}
        {feedback.message && (
          <div className={`mx-6 mt-4 p-3.5 rounded-xl text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback({ type: '', message: '' })} className="font-bold text-base">&times;</button>
          </div>
        )}

        <div className="p-6 space-y-6">
          
          {/* Top 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Cameras</span>
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Video className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{stats.total}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Surveillance nodes deployed</p>
            </div>

            <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Online Feeds</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-emerald-600 mt-2">{stats.online}</p>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Active & dispatch-ready</p>
            </div>

            <div className="bg-white rounded-xl border border-red-200 bg-red-50/20 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Offline Cameras</span>
                <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-red-600 mt-2">{stats.offline}</p>
              <p className="text-[11px] text-red-600/80 mt-0.5">Auto-skipped during incidents</p>
            </div>

            <div className="bg-white rounded-xl border border-sky-200 bg-sky-50/20 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Captured Evidence</span>
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-sky-700 mt-2">{stats.totalEvidence}</p>
              <p className="text-[11px] text-sky-600/80 mt-0.5">Incident snapshots archived</p>
            </div>

          </div>

          {/* Academic Simulation Architecture Notice */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Academic Demonstration Mode:</strong>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Cameras labeled as <span className="font-semibold bg-amber-100 px-1.5 py-0.5 rounded">Mock</span> use our genuine 
                <code className="mx-1 font-mono">CameraProvider</code> adapter to generate simulated 1080p surveillance frames with GPS watermarks. 
                Real IP/RTSP streams can be plugged in seamlessly via their respective stream URLs.
              </p>
            </div>
          </div>

          {/* Camera Table with Search & Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            
            {/* Filter controls */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by ID, name, sector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Status:</span>
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ONLINE">ONLINE</option>
                  <option value="OFFLINE">OFFLINE</option>
                </select>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Protocols</option>
                  {CAMERA_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Camera ID</th>
                    <th className="py-3 px-4">Name & Location</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Coordinates</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Loading CCTV camera fleet...
                      </td>
                    </tr>
                  ) : filteredCameras.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No cameras found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCameras.map((cam) => {
                      const isOnline = cam.status === 'ONLINE';

                      return (
                        <tr key={cam.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-bold text-sky-800 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200">
                              <Video className="w-4 h-4" />
                            </div>
                            <span>{cam.camera_id}</span>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="font-bold text-slate-900 truncate">{cam.name}</p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{cam.location}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {cam.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                            {Number(cam.latitude).toFixed(4)}, {Number(cam.longitude).toFixed(4)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                              {cam.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleTriggerDetection(cam)}
                                disabled={!isOnline || detectingId === cam.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md transition disabled:opacity-40 border border-amber-200"
                                title="Simulate Autonomous AI Incident Detection on this Camera"
                              >
                                <Zap className="w-3.5 h-3.5 text-amber-600" />
                                <span>{detectingId === cam.id ? 'Detecting...' : 'AI Detect'}</span>
                              </button>
                              <button
                                onClick={() => handleTriggerSnapshot(cam)}
                                disabled={!isOnline || capturingId === cam.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-md transition disabled:opacity-40"
                                title="Test Live Snapshot Capture"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span>{capturingId === cam.id ? 'Capturing...' : 'Snapshot'}</span>
                              </button>
                              <button
                                onClick={() => openEditModal(cam)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                                title="Edit Camera"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(cam.id, cam.camera_id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                                title="Delete Camera"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        {/* Snapshot Result Modal */}
        {snapshotModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span className="font-bold text-sm">
                    Live Snapshot: {snapshotModalData.camera.camera_id} ({snapshotModalData.camera.name})
                  </span>
                </div>
                <button
                  onClick={() => setSnapshotModalData(null)}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="p-4 bg-slate-950 flex-1 overflow-auto flex items-center justify-center">
                <img
                  src={snapshotModalData.snapshot.filePath}
                  alt="CCTV Snapshot"
                  className="w-full max-h-[460px] object-contain rounded-lg shadow-md border border-slate-800"
                />
              </div>

              <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-800">
                    Location: {snapshotModalData.camera.location}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Timestamp: {snapshotModalData.snapshot.capturedAt} • File: {snapshotModalData.snapshot.fileName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {snapshotModalData.snapshot.simulated && (
                    <span className="text-[11px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                      Simulated Frame
                    </span>
                  )}
                  <button
                    onClick={() => setSnapshotModalData(null)}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Add/Edit Camera Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                {editingCamera ? `Edit Camera ${formData.camera_id}` : 'Register New CCTV Camera'}
              </h3>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Camera ID *</label>
                    <input
                      type="text"
                      value={formData.camera_id}
                      onChange={(e) => setFormData({ ...formData, camera_id: e.target.value })}
                      placeholder="CCTV-010"
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-sky-500 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Protocol / Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                    >
                      {CAMERA_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Camera Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ward 4 High-Street Crossing Cam"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-sky-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Physical Location / Landmark *</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Riverside Road Sector 4 Junction"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-sky-500 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Latitude *</label>
                    <input
                      type="text"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Longitude *</label>
                    <input
                      type="text"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                  >
                    <option value="ONLINE">ONLINE</option>
                    <option value="OFFLINE">OFFLINE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Snapshot / Stream URL (Optional)</label>
                  <input
                    type="text"
                    value={formData.snapshot_url}
                    onChange={(e) => setFormData({ ...formData, snapshot_url: e.target.value, stream_url: e.target.value })}
                    placeholder="http://192.168.1.100/snapshot.jpg or rtsp://..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-sm transition"
                  >
                    {editingCamera ? 'Save Changes' : 'Register Camera'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CctvMonitoringPage;
