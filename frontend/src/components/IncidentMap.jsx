import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';
import { ExternalLink, MapPin, Video, Eye, Radio } from 'lucide-react';

// Custom SVG marker pin for emergency incidents
const createIncidentPin = (severity) => {
  const colors = {
    Critical: '#dc2626', // Red
    High: '#ea580c',     // Orange
    Medium: '#d97706',   // Amber
    Low: '#16a34a'       // Green
  };
  const color = colors[severity] || '#64748b';

  return L.divIcon({
    className: 'custom-incident-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; transform: translate(-17px, -34px);">
        <svg viewBox="0 0 24 24" width="34" height="34" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
          <path fill="${color}" stroke="#ffffff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="3.5" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32]
  });
};

// Custom SVG marker for CCTV Cameras
const createCameraPin = (status = 'ONLINE', isNearby = false) => {
  const isOnline = status === 'ONLINE';
  const bgColor = isOnline ? (isNearby ? '#0284c7' : '#0369a1') : '#64748b';
  const pulseDot = isOnline ? '#22c55e' : '#ef4444';
  const ringBorder = isNearby ? '#38bdf8' : '#ffffff';

  return L.divIcon({
    className: 'custom-camera-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; transform: translate(-15px, -15px);">
        <div style="background: ${bgColor}; border: 2px solid ${ringBorder}; border-radius: 8px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m22 8-6 4 6 4V8Z"/>
            <rect width="14" height="12" x="2" y="6" rx="2"/>
          </svg>
        </div>
        <span style="position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; border-radius: 50%; background: ${pulseDot}; border: 1.5px solid #fff;"></span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16]
  });
};

// Component to dynamically adjust map center
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
};

const IncidentMap = ({ 
  incidents = [], 
  cameras = [],
  showCameras = true,
  selectedIncident = null, 
  center = [12.9716, 77.5946], 
  zoom = 12,
  height = '460px',
  onSelectIncident = null,
  onSelectCamera = null
}) => {
  // Determine center from selected incident if provided
  const mapCenter = selectedIncident && selectedIncident.latitude && selectedIncident.longitude
    ? [parseFloat(selectedIncident.latitude), parseFloat(selectedIncident.longitude)]
    : center;

  // Identify cameras within 1 KM radius of selected incident
  const nearbyCameraIds = new Set();
  const connectionLines = [];

  if (selectedIncident && selectedIncident.latitude && selectedIncident.longitude && cameras.length > 0) {
    const incLat = parseFloat(selectedIncident.latitude);
    const incLng = parseFloat(selectedIncident.longitude);

    cameras.forEach(cam => {
      const camLat = parseFloat(cam.latitude);
      const camLng = parseFloat(cam.longitude);
      
      // Haversine calculation
      const dLat = (camLat - incLat) * (Math.PI / 180);
      const dLon = (camLng - incLng) * (Math.PI / 180);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(incLat * (Math.PI / 180)) * Math.cos(camLat * (Math.PI / 180)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distKm = 6371 * c;

      if (distKm <= 1.2) {
        nearbyCameraIds.add(cam.id);
        connectionLines.push({
          from: [incLat, incLng],
          to: [camLat, camLng],
          distKm: Math.round(distKm * 100) / 100,
          cam
        });
      }
    });
  }

  return (
    <div style={{ height }} className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController center={mapCenter} zoom={zoom} />

        {/* Selected Incident Coverage Radius Circle (1 KM) */}
        {selectedIncident && selectedIncident.latitude && selectedIncident.longitude && (
          <Circle
            center={[parseFloat(selectedIncident.latitude), parseFloat(selectedIncident.longitude)]}
            radius={1000} // 1000 meters = 1 KM
            pathOptions={{
              color: '#f43f5e',
              fillColor: '#f43f5e',
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: '5, 5'
            }}
          />
        )}

        {/* Proximity lines between selected incident and nearby CCTV cameras */}
        {connectionLines.map((line, idx) => (
          <Polyline
            key={`line-${idx}`}
            positions={[line.from, line.to]}
            pathOptions={{
              color: '#0284c7',
              weight: 2,
              dashArray: '4, 4',
              opacity: 0.8
            }}
          />
        ))}

        {/* Incidents Markers */}
        {incidents.map((incident) => {
          if (!incident.latitude || !incident.longitude) return null;

          return (
            <Marker
              key={`inc-${incident.id}`}
              position={[parseFloat(incident.latitude), parseFloat(incident.longitude)]}
              icon={createIncidentPin(incident.severity)}
              eventHandlers={{
                click: () => {
                  if (onSelectIncident) {
                    onSelectIncident(incident);
                  }
                }
              }}
            >
              <Popup className="custom-popup">
                <div className="p-1 min-w-[220px]">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Incident #{incident.id}
                    </span>
                    <StatusBadge status={incident.status} />
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mb-1 leading-snug">
                    {incident.title}
                  </h4>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{incident.location}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <SeverityBadge severity={incident.severity} size="sm" />
                    <Link
                      to={`/admin/incidents/${incident.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 transition"
                    >
                      <span>Manage</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* CCTV Camera Markers */}
        {showCameras && cameras.map((camera) => {
          if (!camera.latitude || !camera.longitude) return null;
          const isNearby = nearbyCameraIds.has(camera.id);

          return (
            <Marker
              key={`cam-${camera.id}`}
              position={[parseFloat(camera.latitude), parseFloat(camera.longitude)]}
              icon={createCameraPin(camera.status, isNearby)}
              eventHandlers={{
                click: () => {
                  if (onSelectCamera) {
                    onSelectCamera(camera);
                  }
                }
              }}
            >
              <Popup className="custom-popup">
                <div className="p-1 min-w-[210px]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-sky-700 uppercase tracking-wide flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" />
                      {camera.camera_id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      camera.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {camera.status}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-xs mb-1">
                    {camera.name}
                  </h4>

                  <p className="text-[11px] text-slate-500 mb-2">
                    Location: {camera.location}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Protocol: {camera.type}</span>
                    <Link
                      to="/admin/cctv"
                      className="text-sky-600 font-semibold hover:underline flex items-center gap-0.5"
                    >
                      <span>CCTV Fleet</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default IncidentMap;
