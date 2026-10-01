import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SeverityBadge from '../components/SeverityBadge';
import { incidentService, aiService } from '../services/api';
import { 
  ShieldAlert, 
  Sparkles, 
  MapPin, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Compass, 
  ArrowRight,
  Boxes,
  RotateCcw
} from 'lucide-react';

const PRESET_LOCATIONS = [
  { name: 'Riverside Colony, Ward 4', lat: 12.9715987, lng: 77.5945627 },
  { name: 'Techno Park Sector 2', lat: 12.9823410, lng: 77.6082120 },
  { name: 'Express Highway Mile 14', lat: 12.9554320, lng: 77.5812980 },
  { name: 'Downtown Central Market', lat: 12.9780000, lng: 77.5990000 },
  { name: 'Pine Hill Mountain Ridge', lat: 13.0124500, lng: 77.5543200 }
];

const ReportEmergencyPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Auto-Detect',
    severity: 'Auto-Detect',
    location: '',
    latitude: '12.9716',
    longitude: '77.5946'
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      location: preset.name,
      latitude: preset.lat.toString(),
      longitude: preset.lng.toString()
    }));
  };

  // Preview AI analysis in real time
  const handlePreviewAI = async () => {
    if (!formData.description.trim()) {
      setError('Please provide an incident description to test AI analysis.');
      return;
    }
    try {
      setError('');
      setAnalyzing(true);
      const res = await aiService.analyze(formData.description);
      setAiPreview(res.data);
    } catch (err) {
      setError(err.message || 'AI service preview failed. Fallback will still work on submission.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      setError('Please fill out the incident title, description, and location.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await incidentService.create({
        title: formData.title,
        description: formData.description,
        type: formData.type === 'Auto-Detect' ? null : formData.type,
        severity: formData.severity === 'Auto-Detect' ? null : formData.severity,
        location: formData.location,
        latitude: parseFloat(formData.latitude) || 12.9716,
        longitude: parseFloat(formData.longitude) || 77.5946
      });

      setSubmissionResult(res.data);
    } catch (err) {
      console.error('Submission failed:', err);
      setError(err.message || 'Unable to submit incident. Please check server connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Title Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Emergency Reporting Grid</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Report an Emergency Incident
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Provide details of the crisis. Our AI engine will triage the situation, assess severity, and recommend first responder resources.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Successful Submission Result Card */}
        {submissionResult ? (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-3 text-emerald-700 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Emergency Dispatched to Control Grid</h2>
                <p className="text-xs text-slate-500">Incident #{submissionResult.id} recorded with initial status: {submissionResult.status}</p>
              </div>
            </div>

            {/* AI Assessment Breakdown Card */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 mt-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="flex items-center gap-2 text-xs font-bold text-rose-700 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-rose-600" />
                  AI Triage Analysis Result
                </span>
                <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                  {submissionResult.aiSource || 'AI Engine'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500">Detected Type:</span>
                  <p className="font-bold text-slate-900 text-base">{submissionResult.type}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500">Assessed Severity:</span>
                  <div className="mt-0.5">
                    <SeverityBadge severity={submissionResult.severity} />
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500">AI Incident Summary:</span>
                <p className="text-sm text-slate-700 mt-1 font-medium bg-white p-3 rounded-lg border border-slate-200">
                  {submissionResult.ai_summary}
                </p>
              </div>

              {/* Recommended Resources */}
              <div>
                <span className="text-xs font-semibold text-slate-500 block mb-2">
                  AI Recommended Resources:
                </span>
                <div className="flex flex-wrap gap-2">
                  {submissionResult.recommendedResources && submissionResult.recommendedResources.length > 0 ? (
                    submissionResult.recommendedResources.map((res, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs"
                      >
                        <Boxes className="w-3.5 h-3.5 text-rose-600" />
                        {res.type} × {res.quantity}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">Standard first responder response units recommended.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Next Steps Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <Link
                to={`/admin/incidents/${submissionResult.id}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition"
              >
                <span>View in Control Center</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => {
                  setSubmissionResult(null);
                  setAiPreview(null);
                  setFormData({
                    title: '',
                    description: '',
                    type: 'Auto-Detect',
                    severity: 'Auto-Detect',
                    location: '',
                    latitude: '12.9716',
                    longitude: '77.5946'
                  });
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Report Another Incident</span>
              </button>
            </div>
          </div>
        ) : (
          /* Incident Report Form */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Incident Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Flash Flooding at Riverside Colony"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 transition"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Detailed Emergency Description <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handlePreviewAI}
                    disabled={analyzing || !formData.description.trim()}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{analyzing ? 'Analyzing...' : 'Preview AI Triage'}</span>
                  </button>
                </div>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe what is happening, e.g. Water level has increased rapidly and houses are flooded. Residents are stranded on rooftops."
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 transition"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  AI will read this description to automatically detect emergency category, calculate severity level, and prescribe response units.
                </p>
              </div>

              {/* Live AI Preview Box if requested */}
              {aiPreview && (
                <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl text-xs space-y-2.5">
                  <div className="flex items-center justify-between font-bold text-rose-800">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                      Live AI Triage Prediction
                    </span>
                    <span className="font-mono text-[10px] bg-rose-100 px-2 py-0.5 rounded text-rose-800">
                      {aiPreview.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span><strong>Type:</strong> {aiPreview.type}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <strong>Severity:</strong>
                      <SeverityBadge severity={aiPreview.severity} size="sm" />
                    </span>
                  </div>
                  <p className="text-slate-700"><strong>Summary:</strong> {aiPreview.summary}</p>
                  <div>
                    <strong className="text-slate-700">Recommended Resources:</strong>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {aiPreview.recommendedResources?.map((r, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white border border-rose-200 rounded text-slate-800 font-medium text-[11px]">
                          {r.type} × {r.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Overrides for Type & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Incident Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 transition"
                  >
                    <option value="Auto-Detect">Auto-Detect via AI (Recommended)</option>
                    <option value="Flood">Flood</option>
                    <option value="Fire">Fire</option>
                    <option value="Accident">Accident</option>
                    <option value="Medical">Medical</option>
                    <option value="Landslide">Landslide</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Severity (Optional)
                  </label>
                  <select
                    name="severity"
                    value={formData.severity}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 transition"
                  >
                    <option value="Auto-Detect">Auto-Detect via AI (Recommended)</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Location & Coordinates */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Location & Landmark <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5" /> 1-Click Presets:
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {PRESET_LOCATIONS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>

                <div className="relative mb-3">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Enter street name, building, or landmark"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Latitude
                    </label>
                    <input
                      type="text"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Longitude
                    </label>
                    <input
                      type="text"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-rose-200 hover:shadow-lg hover:shadow-rose-300 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing & Submitting Emergency...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze & Submit Emergency</span>
                  </>
                )}
              </button>

            </form>
          </div>
        )}

      </main>
    </div>
  );
};

export default ReportEmergencyPage;
