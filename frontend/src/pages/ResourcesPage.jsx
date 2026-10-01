import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import { resourceService } from '../services/api';
import { 
  Boxes, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Truck,
  Flame,
  Shield,
  HeartPulse,
  Ship
} from 'lucide-react';

const RESOURCE_TYPES = ['Ambulance', 'Fire Truck', 'Rescue Team', 'Medical Kit', 'Boat'];

const getTypeIcon = (type) => {
  switch (type) {
    case 'Fire Truck': return Flame;
    case 'Ambulance': return HeartPulse;
    case 'Boat': return Ship;
    case 'Rescue Team': return Shield;
    default: return Boxes;
  }
};

const ResourcesPage = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Ambulance',
    quantity: 1,
    available: 1,
    location: '',
    status: 'Available'
  });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const res = await resourceService.getAll();
      setResources(res.data || []);
    } catch (err) {
      console.error('Failed to load resources:', err);
      setFeedback({ type: 'error', message: 'Failed to fetch resources.' });
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      type: 'Ambulance',
      quantity: 1,
      available: 1,
      location: '',
      status: 'Available'
    });
    setShowModal(true);
  };

  const openEditModal = (res) => {
    setEditingId(res.id);
    setFormData({
      name: res.name,
      type: res.type,
      quantity: res.quantity,
      available: res.available,
      location: res.location,
      status: res.status
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.location.trim()) {
      setFeedback({ type: 'error', message: 'Please provide both name and base location.' });
      return;
    }

    try {
      if (editingId) {
        await resourceService.update(editingId, formData);
        setFeedback({ type: 'success', message: `Resource "${formData.name}" updated successfully.` });
      } else {
        await resourceService.create(formData);
        setFeedback({ type: 'success', message: `New resource "${formData.name}" added to inventory.` });
      }
      setShowModal(false);
      fetchResources();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Operation failed.' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete resource "${name}"?`)) return;
    try {
      await resourceService.delete(id);
      setFeedback({ type: 'success', message: `Resource "${name}" removed.` });
      fetchResources();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete resource.' });
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Emergency Resource Inventory</h1>
            <p className="text-xs text-slate-500">Fleet management, responder units, and active operational status</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchResources}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Resource</span>
            </button>
          </div>
        </header>

        {/* Feedback alert */}
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
            <button onClick={() => setFeedback({ type: '', message: '' })} className="font-bold">&times;</button>
          </div>
        )}

        {/* Resource Grid / Table */}
        <div className="p-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Fleet: {resources.length} Units
              </span>
              <span className="text-xs text-slate-400">
                Available units are instantly dispatchable to active incidents
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Resource</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Total Qty</th>
                    <th className="py-3 px-4">Available</th>
                    <th className="py-3 px-4">Base Station / Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Loading resources...
                      </td>
                    </tr>
                  ) : resources.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No resources registered yet. Click "Add Resource" to create one.
                      </td>
                    </tr>
                  ) : (
                    resources.map((res) => {
                      const Icon = getTypeIcon(res.type);
                      const isAvailable = res.status === 'Available' && res.available > 0;

                      return (
                        <tr key={res.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-rose-600" />
                            </div>
                            <span>{res.name}</span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">
                            {res.type}
                          </td>
                          <td className="py-3.5 px-4 font-medium">
                            {res.quantity}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                              res.available > 0 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {res.available} ready
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {res.location}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              res.status === 'Available' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : res.status === 'Busy' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-slate-100 text-slate-700'
                            }`}>
                              {res.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => openEditModal(res)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                                title="Edit Resource"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(res.id, res.name)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                                title="Delete Resource"
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

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                {editingId ? 'Edit Resource' : 'Add New Emergency Resource'}
              </h3>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Resource Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. ALS Ambulance Unit 5"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Resource Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 text-slate-900"
                    >
                      {RESOURCE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 text-slate-900"
                    >
                      <option value="Available">Available</option>
                      <option value="Busy">Busy</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Total Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => {
                        const qty = parseInt(e.target.value, 10) || 1;
                        setFormData({ 
                          ...formData, 
                          quantity: qty,
                          available: editingId ? Math.min(formData.available, qty) : qty 
                        });
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                    />
                  </div>

                  {editingId && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Available Count</label>
                      <input
                        type="number"
                        min="0"
                        max={formData.quantity}
                        value={formData.available}
                        onChange={(e) => setFormData({ ...formData, available: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Station / Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Central Station Base"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-sm transition"
                  >
                    {editingId ? 'Save Changes' : 'Create Resource'}
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

export default ResourcesPage;
