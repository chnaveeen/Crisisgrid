import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

const SeverityBadge = ({ severity, size = 'md' }) => {
  const sev = severity || 'Medium';

  const configs = {
    Critical: {
      bg: 'bg-red-50 border-red-200 text-red-700',
      dot: 'bg-red-500',
      icon: AlertCircle
    },
    High: {
      bg: 'bg-orange-50 border-orange-200 text-orange-700',
      dot: 'bg-orange-500',
      icon: AlertTriangle
    },
    Medium: {
      bg: 'bg-amber-50 border-amber-200 text-amber-700',
      dot: 'bg-amber-500',
      icon: Info
    },
    Low: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      dot: 'bg-emerald-500',
      icon: CheckCircle2
    }
  };

  const config = configs[sev] || configs.Medium;
  const Icon = config.icon;

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5 gap-1' 
    : 'text-xs md:text-sm px-2.5 py-1 gap-1.5';

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${config.bg} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {sev}
    </span>
  );
};

export default SeverityBadge;
