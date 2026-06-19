import React from 'react';

function StatCard({ label, value, change, changeLabel = '较上小时', color = 'primary' }) {
  const isPositive = change >= 0;

  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="label">{label}</div>
      <div className="value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {change !== undefined && (
        <div className={`change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '↑' : '↓'} {Math.abs(change)}% {changeLabel}
        </div>
      )}
    </div>
  );
}

export default StatCard;
