import React from 'react';

const StatusBadge = ({ status }) => {
  const currentStatus = status || 'Reported';

  const configs = {
    Reported: 'bg-slate-100 text-slate-700 border-slate-200',
    Assigned: 'bg-blue-50 text-blue-700 border-blue-200',
    'In Progress': 'bg-purple-50 text-purple-700 border-purple-200',
    Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };

  const badgeClass = configs[currentStatus] || configs.Reported;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
      {currentStatus}
    </span>
  );
};

export default StatusBadge;
