import React from 'react';

function PredictionCard({ prediction }) {
  if (!prediction || !prediction.burst) return null;

  const burstConfig = {
    extreme: { color: '#ff4757', bg: 'rgba(255, 71, 87, 0.1)', label: '极高', icon: '🔥' },
    high: { color: '#ff6b35', bg: 'rgba(255, 107, 53, 0.1)', label: '高', icon: '⚡' },
    medium: { color: '#ffa502', bg: 'rgba(255, 165, 2, 0.1)', label: '中', icon: '📈' },
    low: { color: '#2ed573', bg: 'rgba(46, 213, 115, 0.1)', label: '低', icon: '📊' },
    normal: { color: '#747d8c', bg: 'rgba(116, 125, 140, 0.1)', label: '平稳', icon: '➡️' },
  };

  const trendConfig = {
    rising_rapidly: { label: '快速上升', icon: '📈', color: '#ff4757' },
    rising: { label: '上升', icon: '↗️', color: '#ff6b35' },
    rising_slightly: { label: '略有上升', icon: '↗️', color: '#ffa502' },
    stable: { label: '平稳', icon: '➡️', color: '#747d8c' },
    falling_slightly: { label: '略有下降', icon: '↘️', color: '#5352ed' },
    falling: { label: '下降', icon: '📉', color: '#3742fa' },
    falling_rapidly: { label: '快速下降', icon: '📉', color: '#2f3542' },
  };

  const burst = prediction.burst;
  const trend = prediction.trend;
  const current = prediction.current;
  const burstStyle = burstConfig[burst.level] || burstConfig.normal;
  const trendStyle = trendConfig[trend.direction] || trendConfig.stable;

  return (
    <div className="prediction-card">
      <div className="prediction-header">
        <h4>🔮 话题热度预测</h4>
        <span className="confidence-badge">置信度 {prediction.confidence}%</span>
      </div>

      {burst.warning && (
        <div className="burst-warning" style={{ backgroundColor: burstStyle.bg, borderColor: burstStyle.color }}>
          <span className="burst-icon">{burstStyle.icon}</span>
          <div className="burst-text">
            <strong style={{ color: burstStyle.color }}>爆发预警：{burstStyle.label}</strong>
            <p>{burst.description}</p>
          </div>
        </div>
      )}

      <div className="prediction-metrics">
        <div className="metric-item">
          <span className="metric-label">趋势方向</span>
          <span className="metric-value" style={{ color: trendStyle.color }}>
            {trendStyle.icon} {trendStyle.label}
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">变化幅度</span>
          <span className="metric-value" style={{ color: trend.changePercent >= 0 ? '#ff4757' : '#3742fa' }}>
            {trend.changePercent >= 0 ? '+' : ''}{trend.changePercent}%
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">当前小时</span>
          <span className="metric-value">{current.value}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">24h均值</span>
          <span className="metric-value">{current.average}</span>
        </div>
      </div>

      {prediction.predicted && prediction.predicted.length > 0 && (
        <div className="prediction-hours">
          <div className="prediction-hours-title">
            未来 {prediction.predictionHours} 小时预测
          </div>
          <div className="prediction-hours-bars">
            {prediction.predicted.map((item, idx) => {
              const maxValue = Math.max(...prediction.predicted.map(p => p.count), current.value);
              const heightPercent = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
              const hour = new Date(item.time).getHours();
              return (
                <div key={idx} className="prediction-hour-bar">
                  <div className="bar-container">
                    <div
                      className="bar-fill"
                      style={{ height: `${Math.max(5, heightPercent)}%` }}
                      title={`${item.count} 帖`}
                    />
                  </div>
                  <span className="hour-label">{hour.toString().padStart(2, '0')}时</span>
                  <span className="count-label">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="prediction-footer">
        <span className="burst-score">
          爆发评分: <strong style={{ color: burstStyle.color }}>{burst.score.toFixed(2)}</strong>
        </span>
      </div>
    </div>
  );
}

export default PredictionCard;
