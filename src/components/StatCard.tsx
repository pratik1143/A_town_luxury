import React, { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  isDecimal?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix = '',
  suffix = '',
  icon: Icon,
  change,
  changeType = 'neutral',
  isDecimal = false,
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  // Counter intro animation
  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setDisplayValue(0);
      return;
    }
    
    // Animation duration 1s
    const duration = 1000;
    const incrementTime = 25;
    const steps = duration / incrementTime;
    const stepValue = end / steps;
    
    const timer = setInterval(() => {
      start += stepValue;
      if (start >= end) {
        clearInterval(timer);
        setDisplayValue(end);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  const formatValue = (val: number) => {
    if (isDecimal) {
      return val.toFixed(2);
    }
    return val.toLocaleString();
  };

  const getChangeBadgeColor = () => {
    if (changeType === 'positive') return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (changeType === 'negative') return 'text-red-400 bg-red-500/10 border-red-500/20';
    return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  };

  return (
    <div className="rounded-2xl glass-panel p-6 border border-white/5 shadow-glass flex flex-col justify-between space-y-4 hover:border-luxury-gold/20 transition-all duration-300">
      
      {/* Header Info */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
            {title}
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold font-mono text-white mt-1">
            {prefix}
            {formatValue(displayValue)}
            {suffix}
          </h2>
        </div>
        <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl text-luxury-gold shadow-inner">
          <Icon size={18} />
        </div>
      </div>

      {/* Footer Info */}
      {change && (
        <div className="flex items-center space-x-2 pt-2 border-t border-white/5">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getChangeBadgeColor()}`}>
            {change}
          </span>
          <span className="text-[10px] text-zinc-500 tracking-wider">
            Vs previous audit
          </span>
        </div>
      )}
    </div>
  );
};
