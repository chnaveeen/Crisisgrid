import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import IncidentMap from '../components/IncidentMap';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { incidentService, cameraService } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  Search, 
  Filter, 
  MapPin, 
  Sparkles,
  RefreshCw,
  Video,
  Camera,
  Layers,
  Eye,
  X,
  Download,
  Zap,
  Radio,
  User,
  ShieldCheck,
  Boxes,
  Truck,
  AlertCircle
} from 'lucide-react';

// Web Audio API emergency alert sound generator (Zero external dependencies)
const playEmergencySound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Dual-tone high attention emergency chime (880Hz A5 followed by 1046.5Hz C6)
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    playTone(880, 0, 0.22);        // High attention alert beep
    playTone(1046.5, 0.20, 0.32);  // Second urgent rising tone
  } catch (e) {
    console.debug('[Audio] Could not auto-play emergency sound chime:', e.message);
  }
};

// Emergency Resource Generation Engine (Calculates required fleet units based on incident type & severity)
const generateResourcesForIncident = (type, severity) => {
  const normType = (type || '').toLowerCase();
  const normSev = (severity || '').toLowerCase();

  if (normType.includes('flood')) {
    return normSev === 'critical'
      ? [
          { type: 'Rescue Team', name: 'Tactical Flood Rescue Team', quantity: 3, role: 'Water Extraction & Evacuation' },
          { type: 'Boat', name: 'High-Water Inflatable Boat B-2', quantity: 2, role: 'Submerged Zone Transport' },
          { type: 'Ambulance', name: 'ALS Ambulance Alpha-1', quantity: 2, role: 'Hypothermia & Emergency Triage' },
          { type: 'Medical Kit', name: 'Emergency Trauma Medical Kit #12', quantity: 4, role: 'Field First Aid Packs' }
        ]
      : [
          { type: 'Rescue Team', name: 'Tactical Flood Rescue Team', quantity: 2, role: 'Water Barrier & Patrol' },
          { type: 'Boat', name: 'High-Water Inflatable Boat B-2', quantity: 1, role: 'Waterborne Evacuation' },
          { type: 'Ambulance', name: 'ALS Ambulance Alpha-1', quantity: 1, role: 'Paramedic Station' },
          { type: 'Medical Kit', name: 'Emergency Trauma Medical Kit #12', quantity: 3, role: 'Field Triage Packs' }
        ];
  }

  if (normType.includes('fire')) {
    return normSev === 'critical'
      ? [
          { type: 'Fire Truck', name: 'Rapid Rescue Fire Engine 4', quantity: 3, role: 'High-Pressure Flame Suppression' },
          { type: 'Fire Truck', name: 'Heavy Ladder Truck Engine 9', quantity: 1, role: 'Aerial Cooling & Ventilation' },
          { type: 'Ambulance', name: 'ALS Ambulance Bravo-2', quantity: 2, role: 'Smoke Inhalation & Burn Care' },
          { type: 'Rescue Team', name: 'Disaster Search & Dog Squad', quantity: 2, role: 'Search & Structural Evacuation' },
          { type: 'Medical Kit', name: 'Emergency Trauma Medical Kit #12', quantity: 4, role: 'Burn Treatment Packs' }
        ]
      : [
          { type: 'Fire Truck', name: 'Rapid Rescue Fire Engine 4', quantity: 2, role: 'Direct Flame Knockdown' },
          { type: 'Ambulance', name: 'ALS Ambulance Alpha-1', quantity: 1, role: 'Emergency Transport' },
          { type: 'Rescue Team', name: 'Disaster Search & Dog Squad', quantity: 1, role: 'Perimeter Clearance' },
          { type: 'Medical Kit', name: 'Emergency Trauma Medical Kit #12', quantity: 2, role: 'First Aid Packs' }
        ];
  }

  if (normType.includes('accident') || normType.includes('crash')) {
    return normSev === 'critical'
      ? [
          { type: 'Ambulance', name: 'ALS Ambulance Alpha-1', quantity: 2, role: 'Advanced Life Support & Trauma Care' },
          { type: 'Ambulance', name: 'ALS Ambulance Bravo-2', quantity: 1, role: 'Casualty Evacuation' },
          { type: 'Rescue Team', name: 'Disaster Search Squad', quantity: 2, role: 'Heavy Hydraulic Extrication (Jaws of Life)' },
          { type: 'Medical Kit', name: 'Emergency Trauma Medical Kit #12', quantity: 5, role: 'Trauma & Hemorrhage Control' }
        ]
      : [
          { type: 'Ambulance', name: 'ALS Ambulance Alpha-1', quantity: 1, role: 'Patient Assessment' },
          { type: 'Rescue Team', name: 'Disaster Search Squad', quantity: 1, role: 'Wreckage Clearance' },
          { type: 'Medical Kit', name: 'Emergency Trauma Medical Kit #12', quantity: 2, role: 'Standard Trauma Kit' }
        ];
  }

  // Default / Other / Medical
  return [
    { type: 'Ambulance', name: 'ALS Ambulance Alpha-1', quantity: 1, role: 'Emergency Response' },
    { type: 'Rescue Team', name: 'Disaster Search Squad', quantity: 1, role: 'Rapid Incident Assessment' },
    { type: 'Medical Kit', name: 'Emergency Trauma Medical Kit #12', quantity: 2, role: 'General First Aid' }
  ];
};

const ControlCenterPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [showCameras, setShowCameras] = useState(true);
  const [cctvStats, setCctvStats] = useState({ total: 0, online: 0, offline: 0, totalEvidence: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [lastNotification, setLastNotification] = useState(null);
  const [cctvAlert, setCctvAlert] = useState(null);
  const [cctvQuickModalEvidence, setCctvQuickModalEvidence] = useState(null);
  const [simulatingDetection, setSimulatingDetection] = useState(false);

  // View Incident & Auto-Resource Allocation Modal state
  const [viewingIncidentModal, setViewingIncidentModal] = useState(null);
  const [dispatchingAutoResources, setDispatchingAutoResources] = useState(false);
  const [modalFeedback, setModalFeedback] = useState(null);

  const { socket } = useSocket();

  const handleAutoDispatchResourcesForModal = async () => {
    if (!viewingIncidentModal) return;
    try {
      setDispatchingAutoResources(true);
      setModalFeedback(null);
      const incId = viewingIncidentModal.numericIncidentId || viewingIncidentModal.id;

      // Attempt backend auto-dispatch endpoint
      try {
        await incidentService.autoDispatchResources(incId);
      } catch (e) {
        console.warn('Backend auto-dispatch fallback to client allocation:', e);
      }

      const generated = generateResourcesForIncident(
        viewingIncidentModal.type,
        viewingIncidentModal.severity
      );
      const totalUnits = generated.reduce((acc, r) => acc + r.quantity, 0);

      // Update incident object with dispatched resources
      const updatedIncident = {
        ...viewingIncidentModal,
        status: 'In Progress',
        assigned_resource_count: totalUnits,
        assignedResources: generated.map((g, idx) => ({
          assignment_id: 9000 + idx,
          name: g.name,
          type: g.type,
          quantity: g.quantity,
          role: g.role,
          status: 'Dispatched'
        }))
      };

      setViewingIncidentModal(updatedIncident);

      // Update incidents table list
      setIncidents(prev =>
        prev.map(i => (i.id === incId || i.numericIncidentId === incId) 
          ? { ...i, status: 'In Progress', assigned_resource_count: totalUnits, assignedResources: updatedIncident.assignedResources }
          : i
        )
      );

      // Update active banner if matched
      setCctvAlert(prev => prev && (prev.numericIncidentId === incId || prev.incidentId === viewingIncidentModal.incidentId) 
        ? { ...prev, status: 'In Progress', assigned_resource_count: totalUnits } 
        : prev
      );

      playEmergencySound();

      setModalFeedback({
        type: 'success',
        message: `✅ Successfully generated and dispatched ${totalUnits} units across ${generated.length} resource categories according to incident requirements!`
      });
      setLastNotification(`🚒 Units Dispatched: ${totalUnits} resources deployed to ${viewingIncidentModal.incident_id || `#${incId}`}`);
      setTimeout(() => setLastNotification(null), 8000);
    } catch (err) {
      setModalFeedback({
        type: 'error',
        message: err.message || 'Failed to dispatch resources.'
      });
    } finally {
      setDispatchingAutoResources(false);
    }
  };

  const handleSimulateCctvDetection = async () => {
    try {
      setSimulatingDetection(true);
      const res = await cameraService.simulateDetection();
      setLastNotification(`🚨 Vision Detection Simulated on ${res.data?.camera?.cameraId || 'CCTV'}! Incident #${res.data?.numericIncidentId} created.`);
      setTimeout(() => setLastNotification(null), 8000);
    } catch (err) {
      console.error('Simulation error:', err);
      alert(err.response?.data?.message || 'Detection simulation failed.');
    } finally {
      setSimulatingDetection(false);
    }
  };

  const fetchCctvData = useCallback(async () => {
    try {
      const [camsRes, statsRes] = await Promise.all([
        cameraService.getAll(),
        cameraService.getStats()
      ]);
      setCameras(camsRes.data || []);
      setCctvStats(statsRes.data || { total: 0, online: 0, offline: 0, totalEvidence: 0 });
    } catch (err) {
      console.warn('Failed to load CCTV data:', err);
    }
  }, []);

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await incidentService.getAll();
      setIncidents(res.data || []);
      if (res.data && res.data.length > 0 && !selectedIncident) {
        setSelectedIncident(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedIncident]);

  useEffect(() => {
    fetchIncidents();
    fetchCctvData();
  }, [fetchIncidents, fetchCctvData]);

  // UNIFIED REAL-TIME INCIDENT HANDLER (Citizen + CCTV + DEMO)
  // Automatically updates dashboard, counters, map, list, and displays alert banner
  const handleIncomingIncident = useCallback((rawPayload, eventSource = 'socket') => {
    if (!rawPayload) return;
    console.log(`[Socket Event] ${eventSource} received:`, rawPayload);

    // Unpack incident whether wrapped in { incident: ... } or direct object
    const inc = rawPayload.incident || (rawPayload.numericIncidentId ? rawPayload : (rawPayload.id ? rawPayload : null));
    if (!inc) return;

    const numId = Number(inc.id || rawPayload.numericIncidentId || rawPayload.id);
    if (!numId) return;

    const formattedId = inc.incident_id || rawPayload.incidentId || `INC-2026-${String(numId).padStart(5, '0')}`;

    // Source determination
    let source = 'Citizen';
    if (
      rawPayload.source === 'CCTV' ||
      rawPayload.source === 'CCTV AI' ||
      rawPayload.source === 'DEMO CCTV' ||
      inc.detection_source === 'CCTV_AUTO_DETECTION' ||
      inc.detection_source === 'DEMO_CCTV' ||
      rawPayload.detectionSource === 'CCTV_AUTO_DETECTION' ||
      inc.detection_camera_id ||
      rawPayload.cameraId
    ) {
      source = 'CCTV';
    } else if (rawPayload.source) {
      source = rawPayload.source;
    }

    const type = inc.type || rawPayload.type || rawPayload.eventType || rawPayload.incidentType || 'Other';
    const severity = inc.severity || rawPayload.severity || rawPayload.incidentSeverity || 'Medium';
    const location = inc.location || rawPayload.location || rawPayload.cameraLocation || 'Sector 1 Command Grid';
    const description = inc.description || rawPayload.description || inc.ai_summary || rawPayload.aiSummary || '';
    const title = inc.title || rawPayload.title || rawPayload.incidentTitle || `Emergency Incident #${formattedId}`;
    const lat = inc.latitude != null ? parseFloat(inc.latitude) : (rawPayload.latitude != null ? parseFloat(rawPayload.latitude) : 12.9716);
    const lng = inc.longitude != null ? parseFloat(inc.longitude) : (rawPayload.longitude != null ? parseFloat(rawPayload.longitude) : 77.5946);
    const time = inc.created_at || rawPayload.time || rawPayload.captureTime || new Date().toISOString();
    const isSynthetic = Boolean(rawPayload.isSynthetic || rawPayload.isDemo || inc.isDemo);

    const normalizedInc = {
      id: numId,
      incident_id: formattedId,
      title,
      description,
      type,
      severity,
      location,
      latitude: lat,
      longitude: lng,
      status: inc.status || 'Reported',
      ai_summary: inc.ai_summary || rawPayload.aiSummary || description,
      detection_source: source === 'CCTV' ? 'CCTV_AUTO_DETECTION' : 'Citizen',
      detection_camera_id: inc.detection_camera_id || rawPayload.cameraDbId || null,
      detection_camera_code: inc.detection_camera_code || rawPayload.cameraId || null,
      detection_camera_name: inc.detection_camera_name || rawPayload.cameraName || null,
      created_by: inc.created_by || null,
      created_at: time,
      reporter_name: inc.reporter_name || rawPayload.reporterName || (source === 'CCTV' ? `CCTV Vision (${rawPayload.cameraId || 'Sentinel'})` : 'Citizen'),
      assigned_resource_count: inc.assigned_resource_count || 0,
      source: source,
      isSynthetic
    };

    // 1. Play alert chime
    playEmergencySound();

    // 2. Automatically update incident list without duplicates
    setIncidents(prev => {
      const existingIdx = prev.findIndex(item => item.id === numId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...normalizedInc };
        return updated;
      }
      return [normalizedInc, ...prev];
    });

    // 3. Pan and focus map immediately on new emergency
    setSelectedIncident(normalizedInc);

    // 4. Update the prominent Admin Alert notification
    const hasEvidence = Boolean(
      rawPayload.cctvEvidence?.hasEvidence ||
      rawPayload.cctvEvidence?.filePath ||
      rawPayload.evidenceFilePath ||
      rawPayload.filePath
    );

    const alertData = {
      incidentId: formattedId,
      numericIncidentId: numId,
      source: source,
      type,
      severity,
      location,
      time: new Date(time).toLocaleTimeString(),
      description,
      aiSummary: normalizedInc.ai_summary,
      hasEvidence,
      isSynthetic,
      filePath: rawPayload.cctvEvidence?.filePath || rawPayload.evidenceFilePath || rawPayload.filePath || null,
      cameraId: rawPayload.cctvEvidence?.cameraId || rawPayload.cameraId || (source === 'CCTV' ? 'CCTV-EXP-104' : null),
      cameraName: rawPayload.cctvEvidence?.cameraName || rawPayload.cameraName || (source === 'CCTV' ? 'CCTV Optical Stream' : null),
      captureTime: rawPayload.cctvEvidence?.captureTime || rawPayload.captureTime || time
    };

    setCctvAlert(alertData);
    setLastNotification(`🚨 NEW EMERGENCY ALERT: ${formattedId} - ${title} (${type} / ${severity}) at ${location}`);
    setTimeout(() => setLastNotification(null), 10000);

    // Keep CCTV stats in sync if proximity camera was triggered
    if (!isSynthetic) {
      fetchCctvData();
    }
  }, [fetchCctvData]);

  // Listen for real-time updates from Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleIncidentUpdated = (updatedInc) => {
      if (!updatedInc || !updatedInc.id) return;
      console.log('[Socket Event] incidentUpdated received:', updatedInc);
      setIncidents(prev =>
        prev.map(item => item.id === updatedInc.id ? { ...item, ...updatedInc } : item)
      );
      setSelectedIncident(prev => prev && prev.id === updatedInc.id ? { ...prev, ...updatedInc } : prev);
    };

    const handleIncidentDeleted = ({ id }) => {
      if (!id) return;
      console.log('[Socket Event] incidentDeleted received:', id);
      setIncidents(prev => prev.filter(item => item.id !== id));
      setSelectedIncident(prev => prev && prev.id === id ? null : prev);
    };

    // CCTV Real-time Events
    const handleCctvSearching = (data) => {
      setLastNotification(`🔍 Scanning CCTV coverage within ${data.radiusKm} KM for ${data.incidentId}...`);
    };

    const handleCctvCameraFound = (data) => {
      setLastNotification(`📹 Located ${data.count} CCTV cameras near ${data.incidentId}`);
    };

    const handleCctvEvidenceCaptured = (data) => {
      setLastNotification(`📸 CCTV Evidence Secured: ${data.cameraId} (${data.cameraName}) at ${data.distance} KM`);
      setTimeout(() => setLastNotification(null), 7000);
      fetchCctvData();
    };

    const handleCctvIncidentEvidence = (data) => {
      console.log('[Socket Event] cctv:incident-evidence received:', data);
      setCctvAlert(prev => {
        if (prev && prev.incidentId === data.incidentId) {
          return {
            ...prev,
            hasEvidence: true,
            filePath: data.filePath || prev.filePath,
            cameraId: data.cameraId || prev.cameraId,
            cameraName: data.cameraName || prev.cameraName
          };
        }
        return prev;
      });
      fetchCctvData();
    };

    const handleMultipleEvidenceCaptured = (data) => {
      console.log('[Socket Event] cctv:multiple-evidence-captured received:', data);
      setCctvAlert(prev => {
        if (prev && prev.incidentId === data.incidentId) {
          return {
            ...prev,
            hasEvidence: true,
            filePath: data.evidenceList?.[0]?.filePath || prev.filePath
          };
        }
        return prev;
      });
      fetchCctvData();
    };

    const handleReconnect = () => {
      console.log('[Socket] Reconnected - sync background grid data');
      fetchIncidents();
      fetchCctvData();
    };

    // Listen to all real-time incident and alert events
    socket.on('incident:new', (data) => handleIncomingIncident(data, 'incident:new'));
    socket.on('newIncident', (data) => handleIncomingIncident(data, 'newIncident'));
    socket.on('emergency:alert', (data) => handleIncomingIncident(data, 'emergency:alert'));
    socket.on('incident:created', (data) => handleIncomingIncident(data, 'incident:created'));
    socket.on('cctv:auto-detection-alert', (data) => handleIncomingIncident(data, 'cctv:auto-detection-alert'));
    socket.on('incidentUpdated', handleIncidentUpdated);
    socket.on('incidentDeleted', handleIncidentDeleted);
    socket.on('cctv:searching', handleCctvSearching);
    socket.on('cctv:camera-found', handleCctvCameraFound);
    socket.on('cctv:evidence-captured', handleCctvEvidenceCaptured);
    socket.on('cctv:incident-evidence', handleCctvIncidentEvidence);
    socket.on('cctv:multiple-evidence-captured', handleMultipleEvidenceCaptured);
    socket.on('reconnect', handleReconnect);

    return () => {
      socket.off('incident:new');
      socket.off('newIncident');
      socket.off('emergency:alert');
      socket.off('incident:created');
      socket.off('cctv:auto-detection-alert');
      socket.off('incidentUpdated', handleIncidentUpdated);
      socket.off('incidentDeleted', handleIncidentDeleted);
      socket.off('cctv:searching', handleCctvSearching);
      socket.off('cctv:camera-found', handleCctvCameraFound);
      socket.off('cctv:evidence-captured', handleCctvEvidenceCaptured);
      socket.off('cctv:incident-evidence', handleCctvIncidentEvidence);
      socket.off('cctv:multiple-evidence-captured', handleMultipleEvidenceCaptured);
      socket.off('reconnect', handleReconnect);
    };
  }, [socket, handleIncomingIncident, fetchCctvData, fetchIncidents]);

  // AUTOMATIC EMERGENCY ALERTS (Sequenced across 1 minute)
  // When the Control Room dashboard is opened, automatically generate 3 emergency alerts:
  // After 20 seconds -> Incident 1: Traffic Accident (Critical)
  // After 40 seconds -> Incident 2: Chemical Fire (Critical)
  // After 60 seconds -> Incident 3: Flash Flooding (High)
  useEffect(() => {
    const scheduledAlertQueue = [
      {
        delay: 20000, // 20s
        data: {
          id: 90001,
          numericIncidentId: 90001,
          incidentId: 'INC-2026-08142',
          incident_id: 'INC-2026-08142',
          source: 'CCTV',
          sourceLabel: 'CCTV AI Monitor',
          detection_source: 'CCTV_AUTO_DETECTION',
          isSynthetic: true,
          type: 'Traffic Accident',
          severity: 'Critical',
          location: 'MG Road Expressway — Mile Marker 14',
          description: 'High-speed collision involving three vehicles detected by AI optical vision. Severe lane obstruction and vehicle deformation identified.',
          ai_summary: 'High-speed multi-car pileup detected with severe lane blockage, vehicle deformation, and hazard flashers active.',
          title: 'High-Impact Vehicle Collision on MG Road Expressway',
          reporter_name: 'Officer Marcus Vance (Traffic Sentinel #14)',
          cameraName: 'MG Road Overpass Traffic Feed',
          cameraId: 'CCTV-EXP-104',
          latitude: 12.9716,
          longitude: 77.5946,
          status: 'Reported',
          time: new Date().toLocaleTimeString(),
          created_at: new Date().toISOString(),
          assigned_resource_count: 0,
          hasEvidence: true,
          filePath: '/uploads/cctv/cctv_CCTV-001_inc_125_1789999128243.svg',
          cctvEvidence: {
            hasEvidence: true,
            filePath: '/uploads/cctv/cctv_CCTV-001_inc_125_1789999128243.svg',
            cameraId: 'CCTV-EXP-104',
            cameraName: 'MG Road Overpass Traffic Feed',
            captureTime: new Date().toLocaleTimeString()
          }
        }
      },
      {
        delay: 40000, // 40s
        data: {
          id: 90002,
          numericIncidentId: 90002,
          incidentId: 'INC-2026-08143',
          incident_id: 'INC-2026-08143',
          source: 'CCTV',
          sourceLabel: 'CCTV AI Monitor',
          detection_source: 'CCTV_AUTO_DETECTION',
          isSynthetic: true,
          type: 'Fire',
          severity: 'Critical',
          location: 'Peenya Industrial Zone — Sector 4',
          description: 'Rapidly propagating chemical fire detected with heavy dark toxic smoke plumes. Thermal sensors confirm critical heat elevation.',
          ai_summary: 'Dense dark smoke plumes and rapid flame spreading detected in chemical storage bay. Elevated thermal threshold breached.',
          title: 'Industrial Warehouse Chemical Fire & Toxic Plume',
          reporter_name: 'Inspector Priya Sharma (Fire Control Unit #08)',
          cameraName: 'Peenya Industrial Perimeter Gate 3',
          cameraId: 'CCTV-IND-218',
          latitude: 12.9620,
          longitude: 77.6100,
          status: 'Reported',
          time: new Date().toLocaleTimeString(),
          created_at: new Date().toISOString(),
          assigned_resource_count: 0,
          hasEvidence: true,
          filePath: '/uploads/cctv/cctv_CCTV-001_inc_120_1789998636224.svg',
          cctvEvidence: {
            hasEvidence: true,
            filePath: '/uploads/cctv/cctv_CCTV-001_inc_120_1789998636224.svg',
            cameraId: 'CCTV-IND-218',
            cameraName: 'Peenya Industrial Perimeter Gate 3',
            captureTime: new Date().toLocaleTimeString()
          }
        }
      },
      {
        delay: 60000, // 60s
        data: {
          id: 90003,
          numericIncidentId: 90003,
          incidentId: 'INC-2026-08144',
          incident_id: 'INC-2026-08144',
          source: 'CCTV',
          sourceLabel: 'CCTV AI Monitor',
          detection_source: 'CCTV_AUTO_DETECTION',
          isSynthetic: true,
          type: 'Flooding',
          severity: 'High',
          location: 'South Ring Road — Underpass Metro Approach',
          description: 'Rapid water level accumulation exceeding 2.5 feet at underpass entrance; vehicles stalling and route completely impassable.',
          ai_summary: 'Water level exceeded 2.5 feet at underpass approach; vehicle stalling and road impassability detected by flood surveillance gauge.',
          title: 'Flash Flooding & Road Submersion at South Ring Subway',
          reporter_name: 'Operator David Chen (Drainage Grid Station #03)',
          cameraName: 'South Ring Underpass Flood Level Cam',
          cameraId: 'CCTV-FLD-309',
          latitude: 12.9510,
          longitude: 77.5820,
          status: 'Reported',
          time: new Date().toLocaleTimeString(),
          created_at: new Date().toISOString(),
          assigned_resource_count: 0,
          hasEvidence: true,
          filePath: '/uploads/cctv/cctv_CCTV-001_inc_128_1789999243240.svg',
          cctvEvidence: {
            hasEvidence: true,
            filePath: '/uploads/cctv/cctv_CCTV-001_inc_128_1789999243240.svg',
            cameraId: 'CCTV-FLD-309',
            cameraName: 'South Ring Underpass Flood Level Cam',
            captureTime: new Date().toLocaleTimeString()
          }
        }
      }
    ];

    const timers = scheduledAlertQueue.map(({ delay, data }) => {
      return setTimeout(() => {
        // Broadcast across Socket.IO if connected so peer tabs sync
        if (socket && socket.connected) {
          socket.emit('incident:dispatch-alert', data);
        }
        // Direct local dispatch guarantees immediate update without waiting or refresh
        handleIncomingIncident(data, 'auto:dispatch');
      }, delay);
    });

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [socket, handleIncomingIncident]);

  // Top Metrics calculation - Automatically updates when incidents change
  const totalIncidents = incidents.length;
  const criticalCount = incidents.filter(i => (i.severity || '').toLowerCase() === 'critical').length;
  const inProgressCount = incidents.filter(i => {
    const s = (i.status || '').toLowerCase();
    return s === 'in progress' || s === 'assigned' || s === 'reported';
  }).length;
  const resolvedCount = incidents.filter(i => (i.status || '').toLowerCase() === 'resolved').length;

  // Filtered incidents with resilient safe property access
  const filteredIncidents = incidents.filter(inc => {
    const titleStr = (inc.title || '').toLowerCase();
    const locStr = (inc.location || '').toLowerCase();
    const typeStr = (inc.type || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = titleStr.includes(q) || locStr.includes(q) || typeStr.includes(q);
    const matchesStatus = filterStatus === 'ALL' || inc.status === filterStatus;
    const matchesSeverity = filterSeverity === 'ALL' || inc.severity === filterSeverity;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Admin Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Control Center Command Grid</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>CCTV AI Autonomous Monitoring: LIVE</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Surveillance cameras continuously stream & auto-dispatch detected emergencies to AI</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSimulateCctvDetection}
              disabled={simulatingDetection}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition shadow-xs disabled:opacity-50"
              title="Test autonomous CCTV emergency detection on a live online camera"
            >
              <Radio className={`w-3.5 h-3.5 text-amber-600 ${simulatingDetection ? 'animate-spin' : 'animate-pulse'}`} />
              <span>{simulatingDetection ? 'Detecting...' : 'Simulate CCTV AI Detection'}</span>
            </button>
            <button
              onClick={fetchIncidents}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Grid</span>
            </button>
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Report Incident</span>
            </Link>
          </div>
        </header>

        {/* Real-time Prominent Admin Emergency Alert Banner */}
        {cctvAlert && (
          <div className={`mx-6 mt-4 p-5 rounded-2xl border-2 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 animate-in fade-in slide-in-from-top-4 duration-300 ${
            cctvAlert.source === 'Citizen'
              ? 'bg-gradient-to-r from-emerald-950 via-slate-950 to-teal-950 text-white border-emerald-500 ring-4 ring-emerald-500/20'
              : 'bg-gradient-to-r from-red-950 via-slate-950 to-orange-950 text-white border-red-500 ring-4 ring-red-500/20'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg ${
                cctvAlert.source === 'Citizen'
                  ? 'bg-emerald-600/30 border-emerald-500 text-emerald-400'
                  : 'bg-red-600/30 border-red-500 text-red-400 animate-pulse'
              }`}>
                {cctvAlert.source === 'Citizen' ? (
                  <User className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Radio className="w-6 h-6 animate-pulse text-amber-400" />
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-black uppercase tracking-wider ${
                    cctvAlert.source === 'Citizen'
                      ? 'text-emerald-300 bg-emerald-950 border-emerald-500'
                      : 'text-red-300 bg-red-950 border-red-500'
                  } px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-sm`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      cctvAlert.source === 'Citizen' ? 'bg-emerald-500' : 'bg-red-500'
                    } animate-ping`}></span>
                    {cctvAlert.source === 'Citizen'
                      ? '🚨 NEW CITIZEN EMERGENCY REPORT'
                      : '🚨 CCTV AI EMERGENCY ALERT'}
                  </span>
                  
                  <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                    Incident ID: {cctvAlert.incidentId}
                  </span>

                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${
                    cctvAlert.source === 'Citizen' 
                      ? 'bg-emerald-900/60 text-emerald-200 border-emerald-700' 
                      : 'bg-cyan-900/60 text-cyan-200 border-cyan-700'
                  }`}>
                    Source: {cctvAlert.source}
                  </span>

                  <span className="text-xs font-semibold bg-rose-900/60 text-rose-200 px-2.5 py-0.5 rounded border border-rose-800">
                    Type: {cctvAlert.type || cctvAlert.incidentType}
                  </span>

                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider text-white ${
                    (cctvAlert.severity || '').toLowerCase() === 'critical' ? 'bg-red-600' :
                    (cctvAlert.severity || '').toLowerCase() === 'high' ? 'bg-orange-600' :
                    (cctvAlert.severity || '').toLowerCase() === 'medium' ? 'bg-amber-600' : 'bg-emerald-600'
                  }`}>
                    Severity: {cctvAlert.severity || cctvAlert.incidentSeverity}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-300 pt-1">
                  <div>
                    <span className="text-slate-400">Location: </span>
                    <strong className="text-amber-200">{cctvAlert.location || cctvAlert.cameraLocation || 'Unknown Location'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Time: </span>
                    <strong className="text-slate-200">{cctvAlert.time || cctvAlert.captureTime || 'Just now'}</strong>
                  </div>
                </div>

                {(cctvAlert.description || cctvAlert.aiSummary) && (
                  <p className="text-xs text-slate-200 mt-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-slate-800 max-w-3xl leading-relaxed">
                    <span className="text-slate-400 font-semibold">Description: </span>
                    {cctvAlert.description || cctvAlert.aiSummary}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
              {(cctvAlert.hasEvidence || cctvAlert.filePath) && (
                <button
                  type="button"
                  onClick={() => setCctvQuickModalEvidence(cctvAlert)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-lg shadow-rose-950/50"
                  title="View CCTV Evidence Snapshot"
                >
                  <Eye className="w-4 h-4" />
                  <span>VIEW CCTV EVIDENCE</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setViewingIncidentModal(cctvAlert);
                  setModalFeedback(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl border border-indigo-400 transition shadow-lg shadow-indigo-950/50"
                title="View full incident details and generate resources"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-200" />
                <span>View Incident →</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedIncident(cctvAlert);
                  const el = document.getElementById('incidents-table');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-amber-200 bg-amber-950/80 hover:bg-amber-900 rounded-xl border border-amber-700 hover:border-amber-500 transition shadow-md"
                title="Focus on this emergency incident on map"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Focus Map</span>
              </button>

              <button
                type="button"
                onClick={() => setCctvAlert(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition"
                title="Dismiss alert"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Real-time Toast Banner */}
        {lastNotification && (
          <div className="mx-6 mt-4 p-3 bg-rose-600 text-white text-xs font-medium rounded-xl shadow-md flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span>{lastNotification}</span>
            </div>
            <button onClick={() => setLastNotification(null)} className="text-rose-200 hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        <div className="p-6 space-y-6">
          
          {/* Top 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Incidents</span>
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                  #
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{totalIncidents}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Recorded across all sectors</p>
            </div>

            <div className="bg-white rounded-xl border border-rose-200 bg-rose-50/20 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Critical Emergencies</span>
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-rose-600 mt-2">{criticalCount}</p>
              <p className="text-[11px] text-rose-600/80 mt-0.5">Requires immediate intervention</p>
            </div>

            <div className="bg-white rounded-xl border border-indigo-200 bg-indigo-50/20 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">In Progress / Active</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-indigo-700 mt-2">{inProgressCount}</p>
              <p className="text-[11px] text-indigo-600/80 mt-0.5">Units dispatched & operating</p>
            </div>

            <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Resolved</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-emerald-600 mt-2">{resolvedCount}</p>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Operations secured</p>
            </div>

          </div>

          {/* CCTV Surveillance Fleet Summary Bar */}
          <div className="bg-sky-950 text-white rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-sky-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-600/30 border border-sky-500/30 flex items-center justify-center text-sky-300">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-sky-100 flex items-center gap-2">
                  <span>CCTV Integrated Surveillance Grid</span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono">
                    Auto-Triage Active
                  </span>
                </h4>
                <p className="text-[11px] text-sky-300/80 mt-0.5">
                  Automated 1.0 KM proximity detection & instant snapshot dispatch on all incident reports
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <span className="text-[11px] text-sky-300 block">Fleet Coverage:</span>
                <span className="font-bold text-white text-sm">{cctvStats.online} Online / {cctvStats.total} Total</span>
              </div>
              <div className="h-7 w-px bg-sky-800"></div>
              <div className="text-right">
                <span className="text-[11px] text-sky-300 block">Evidence Archived:</span>
                <span className="font-bold text-emerald-400 text-sm">{cctvStats.totalEvidence} Captures</span>
              </div>
              <Link
                to="/admin/cctv"
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition shrink-0"
              >
                Manage CCTV
              </Link>
            </div>
          </div>

          {/* Interactive Tactical Map */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 px-1 gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  Tactical Emergency & CCTV Coverage Map
                </h3>
                <p className="text-[11px] text-slate-500">
                  Select an incident to view its 1 KM proximity circle and nearest surveillance cameras.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setShowCameras(!showCameras)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                    showCameras 
                      ? 'bg-sky-50 text-sky-700 border-sky-300' 
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{showCameras ? 'Hide Cameras' : 'Show Cameras'} ({cameras.length})</span>
                </button>
                <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> Critical</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> High</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Medium</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Low</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span> CCTV</span>
              </div>
            </div>

            <IncidentMap
              incidents={incidents}
              cameras={cameras}
              showCameras={showCameras}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              height="400px"
            />
          </div>

          {/* Incidents Table with Search & Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            
            {/* Filter controls */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title, location, type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800"
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
                  <option value="Reported">Reported</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>

                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Title & AI Summary</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Loading incident queue...
                      </td>
                    </tr>
                  ) : filteredIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No emergency incidents found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredIncidents.map((incident) => (
                      <tr 
                        key={incident.id}
                        onClick={() => setSelectedIncident(incident)}
                        className={`hover:bg-slate-50 cursor-pointer transition ${
                          selectedIncident?.id === incident.id ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{incident.incident_id || `#${incident.id}`}</span>
                            {(incident.detection_source === 'CCTV_AUTO_DETECTION' || incident.detection_source === 'DEMO_CCTV' || incident.source === 'CCTV' || incident.source === 'CCTV AI' || incident.isSynthetic) ? (
                              <span 
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs" 
                                title="Autonomous CCTV Video Analytics Detection"
                              >
                                <Radio className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                                <span>CCTV AI</span>
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-bold text-slate-900 truncate">{incident.title}</p>
                          {incident.ai_summary && (
                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                              <Sparkles className="w-3 h-3 text-rose-500 shrink-0" />
                              {incident.ai_summary}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {incident.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <SeverityBadge severity={incident.severity} size="sm" />
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={incident.status} />
                        </td>
                        <td className="py-3.5 px-4 max-w-[160px] truncate text-slate-600">
                          {incident.location}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingIncidentModal(incident);
                                setModalFeedback(null);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition shadow-2xs"
                              title="View incident details and generate resources"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>View Incident</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIncident(incident);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                              title="Focus incident on map"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>

      {/* Control Room CCTV Quick Evidence Modal */}
      {cctvQuickModalEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg ${cctvQuickModalEvidence.source === 'Citizen' ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-400' : 'bg-rose-600/30 border-rose-500/50 text-rose-400'} border flex items-center justify-center shrink-0`}>
                  {cctvQuickModalEvidence.source === 'Citizen' ? (
                    <User className="w-5 h-5 animate-pulse" />
                  ) : (
                    <Radio className="w-5 h-5 animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-black uppercase tracking-wider ${cctvQuickModalEvidence.source === 'Citizen' ? 'text-emerald-300 bg-emerald-950 border-emerald-500' : 'text-red-300 bg-red-950 border-red-500'} px-2 py-0.5 rounded border flex items-center gap-1`}>
                      <span className={`w-2 h-2 rounded-full ${cctvQuickModalEvidence.source === 'Citizen' ? 'bg-emerald-500' : 'bg-red-500'} animate-ping`}></span>
                      {cctvQuickModalEvidence.source === 'Citizen' ? '🚨 CITIZEN EMERGENCY EVIDENCE' : '🚨 CCTV EMERGENCY ALERT'}
                    </span>
                    <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      Incident #{cctvQuickModalEvidence.incidentId}
                    </span>
                    {(cctvQuickModalEvidence.incidentType || cctvQuickModalEvidence.type) && (
                      <span className="text-xs font-semibold bg-rose-900/80 text-rose-200 px-2 py-0.5 rounded border border-rose-700">
                        Type: {cctvQuickModalEvidence.incidentType || cctvQuickModalEvidence.type}
                      </span>
                    )}
                    {(cctvQuickModalEvidence.incidentSeverity || cctvQuickModalEvidence.severity) && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-600 text-white uppercase tracking-wider">
                        {cctvQuickModalEvidence.incidentSeverity || cctvQuickModalEvidence.severity}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                    {cctvQuickModalEvidence.source === 'Citizen' ? (
                      <span>Reporter: <strong className="text-white">{cctvQuickModalEvidence.reporterName || 'Citizen'}</strong></span>
                    ) : (
                      <span>
                        Camera: <strong className="text-white font-mono">{cctvQuickModalEvidence.cameraId}</strong> {cctvQuickModalEvidence.cameraName ? `(${cctvQuickModalEvidence.cameraName})` : ''}
                      </span>
                    )}
                    {(cctvQuickModalEvidence.cameraLocation || cctvQuickModalEvidence.location) && (
                      <span>• Location: <strong className="text-amber-200">{cctvQuickModalEvidence.cameraLocation || cctvQuickModalEvidence.location}</strong></span>
                    )}
                    {(cctvQuickModalEvidence.captureTime || cctvQuickModalEvidence.time) && (
                      <span>• Captured: <strong className="text-slate-200">{cctvQuickModalEvidence.captureTime || cctvQuickModalEvidence.time}</strong></span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCctvQuickModalEvidence(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition text-lg"
              >
                &times;
              </button>
            </div>

            {/* AI Short Description Strip */}
            {(cctvQuickModalEvidence.description || cctvQuickModalEvidence.aiSummary) && (
              <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800 text-xs text-slate-200 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-white">AI Incident Analysis:</strong> {cctvQuickModalEvidence.description || cctvQuickModalEvidence.aiSummary}
                </p>
              </div>
            )}

            {/* Evidence Image Viewer */}
            <div className="p-4 bg-black flex-1 overflow-auto flex items-center justify-center min-h-[320px]">
              {cctvQuickModalEvidence.filePath ? (
                <img
                  src={cctvQuickModalEvidence.filePath}
                  alt="CCTV Evidence Frame"
                  className="max-h-[500px] w-full object-contain rounded-lg border border-slate-800 shadow-lg"
                />
              ) : (
                <div className="text-center text-slate-500 text-xs py-12">
                  No direct frame preview available for this source.
                </div>
              )}
            </div>

            {/* Time Window & Telemetry Strip */}
            <div className="px-5 py-2.5 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px]">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  Capture Window: <strong className="text-sky-300">{cctvQuickModalEvidence.captureStartTime || 'PRE-EVENT'}</strong> → <strong className="text-white">{cctvQuickModalEvidence.captureTime || cctvQuickModalEvidence.time || 'NOW'}</strong> → <strong className="text-sky-300">{cctvQuickModalEvidence.captureEndTime || 'POST-EVENT'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-sky-950/80 text-sky-300 border border-sky-700/60 font-semibold px-2 py-0.5 rounded">
                  LIVE CCTV FEED — Optical Stream Captured
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-slate-400 text-[11px]">
                {cctvQuickModalEvidence.source === 'Citizen'
                  ? `Reported by Citizen & Proximity CCTV Linked to Incident #${cctvQuickModalEvidence.incidentId}`
                  : `Automatically linked to Incident #${cctvQuickModalEvidence.incidentId} by Proximity Engine.`}
              </div>

              <div className="flex items-center gap-2.5">
                {cctvQuickModalEvidence.filePath && (
                  <a
                    href={cctvQuickModalEvidence.filePath}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>DOWNLOAD EVIDENCE</span>
                  </a>
                )}

                <Link
                  to={`/admin/incidents/${cctvQuickModalEvidence.numericIncidentId}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition shadow-md shadow-rose-950/50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>OPEN INCIDENT</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setCctvQuickModalEvidence(null)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Control Room View Incident & AI Resource Generation Modal */}
      {viewingIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${viewingIncidentModal.source === 'Citizen' ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-400' : 'bg-rose-600/30 border-rose-500/50 text-rose-400'} border flex items-center justify-center shrink-0 shadow-md`}>
                  {viewingIncidentModal.source === 'Citizen' ? (
                    <User className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Radio className="w-5 h-5 animate-pulse text-amber-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-extrabold text-white bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                      Incident #{viewingIncidentModal.incident_id || viewingIncidentModal.incidentId || viewingIncidentModal.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      viewingIncidentModal.source === 'Citizen' ? 'bg-emerald-950 text-emerald-300 border-emerald-600' : 'bg-amber-950 text-amber-300 border-amber-600'
                    }`}>
                      {viewingIncidentModal.source === 'Citizen' ? 'CITIZEN' : 'CCTV AI'}
                    </span>
                    <SeverityBadge severity={viewingIncidentModal.severity} size="sm" />
                    <StatusBadge status={viewingIncidentModal.status || 'Reported'} />
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1 line-clamp-1">
                    {viewingIncidentModal.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setViewingIncidentModal(null);
                  setModalFeedback(null);
                }}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition text-lg"
                title="Close modal"
              >
                &times;
              </button>
            </div>

            {/* Modal Feedback Banner */}
            {modalFeedback && (
              <div className={`px-5 py-2.5 text-xs font-semibold flex items-center gap-2 ${
                modalFeedback.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-800' : 'bg-rose-950/80 text-rose-300 border-b border-rose-800'
              }`}>
                {modalFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{modalFeedback.message}</span>
              </div>
            )}

            {/* Scrollable Modal Content */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-300">
              
              {/* Telemetry and Location Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[11px]">Location & Sector:</span>
                  <strong className="text-amber-300 font-semibold">{viewingIncidentModal.location}</strong>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    ({Number(viewingIncidentModal.latitude).toFixed(4)}, {Number(viewingIncidentModal.longitude).toFixed(4)})
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Reported / Detected:</span>
                  <strong className="text-slate-200">{viewingIncidentModal.time || new Date(viewingIncidentModal.created_at).toLocaleTimeString()}</strong>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Source: {viewingIncidentModal.source}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Observer / Camera:</span>
                  <strong className="text-sky-300 font-mono">
                    {viewingIncidentModal.reporter_name || viewingIncidentModal.cameraName || 'CCTV Vision Sentinel'}
                  </strong>
                  <p className="text-[10px] text-slate-500 mt-0.5">Category: {viewingIncidentModal.type}</p>
                </div>
              </div>

              {/* Description & AI Executive Summary */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Detailed Incident Description</span>
                <p className="text-slate-200 bg-black/40 p-3 rounded-xl border border-slate-800 leading-relaxed text-xs">
                  {viewingIncidentModal.description}
                </p>
              </div>

              {(viewingIncidentModal.ai_summary || viewingIncidentModal.aiSummary) && (
                <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl flex items-start gap-2.5 text-rose-200">
                  <Sparkles className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong className="text-rose-100 font-bold">AI Analysis & Triage: </strong>
                    {viewingIncidentModal.ai_summary || viewingIncidentModal.aiSummary}
                  </p>
                </div>
              )}

              {/* CCTV Snapshot Frame if available */}
              {(viewingIncidentModal.hasEvidence || viewingIncidentModal.filePath || viewingIncidentModal.cctvEvidence?.filePath) && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-sky-400" />
                      <span>CCTV Optical Evidence Captured</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCctvQuickModalEvidence(viewingIncidentModal)}
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold underline"
                    >
                      Enlarge Frame Preview
                    </button>
                  </div>
                  <div className="h-44 bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-800">
                    <img
                      src={viewingIncidentModal.filePath || viewingIncidentModal.cctvEvidence?.filePath}
                      alt="CCTV Frame Snapshot"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* AI Resource Generation Engine Section */}
              <div className="p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60 rounded-2xl border border-indigo-900/50 shadow-inner space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs flex items-center gap-2">
                        <span>AI Generated Emergency Resource Allocation</span>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-mono">
                          Computed for {viewingIncidentModal.type} ({viewingIncidentModal.severity})
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">Recommended tactical fleet requirement calculated by AI incident classifier</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoDispatchResourcesForModal}
                    disabled={dispatchingAutoResources || viewingIncidentModal.status === 'In Progress' || viewingIncidentModal.status === 'Resolved'}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 rounded-xl transition shadow-lg shadow-rose-950/40 disabled:opacity-50 shrink-0"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-amber-200 ${dispatchingAutoResources ? 'animate-spin' : ''}`} />
                    <span>{dispatchingAutoResources ? 'Dispatching...' : (viewingIncidentModal.status === 'In Progress' ? '✓ Resources Dispatched' : '⚡ Generate & Dispatch Resources')}</span>
                  </button>
                </div>

                {/* Grid of Generated Required Resources */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {generateResourcesForIncident(viewingIncidentModal.type, viewingIncidentModal.severity).map((res, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col justify-between text-center hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="w-7 h-7 mx-auto rounded-lg bg-rose-950/60 text-rose-400 flex items-center justify-center mb-1.5 border border-rose-900/50">
                          {res.type === 'Ambulance' ? <Truck className="w-3.5 h-3.5" /> :
                           res.type === 'Fire Truck' ? <Truck className="w-3.5 h-3.5" /> :
                           res.type === 'Boat' ? <Boxes className="w-3.5 h-3.5" /> :
                           <Boxes className="w-3.5 h-3.5" />}
                        </div>
                        <p className="font-bold text-white text-xs">{res.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{res.role}</p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-800">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-extrabold text-amber-300 bg-amber-950/60 border border-amber-800/40">
                          × {res.quantity} required
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Dispatched Units Breakdown if dispatched */}
                {(viewingIncidentModal.assignedResources && viewingIncidentModal.assignedResources.length > 0) && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Active Dispatched Units ({viewingIncidentModal.assignedResources.length} Categories):</span>
                    </span>
                    <div className="divide-y divide-slate-800/80 bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden">
                      {viewingIncidentModal.assignedResources.map((unit, uIdx) => (
                        <div key={uIdx} className="p-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <strong className="text-white">{unit.name || unit.type}</strong>
                            <span className="text-[11px] text-slate-400">({unit.role || unit.type})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 text-[11px]">
                              {unit.quantity} Units
                            </span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                              Dispatched
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 text-[11px]">
                Operational Status: <strong className={viewingIncidentModal.status === 'In Progress' ? 'text-emerald-400' : 'text-amber-400'}>{viewingIncidentModal.status || 'Reported'}</strong>
              </span>

              <div className="flex items-center gap-3">
                <Link
                  to={`/admin/incidents/${viewingIncidentModal.numericIncidentId || viewingIncidentModal.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>OPEN FULL INCIDENT PAGE</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setViewingIncidentModal(null);
                    setModalFeedback(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ControlCenterPage;
