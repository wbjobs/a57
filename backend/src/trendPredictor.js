class TrendPredictor {
  constructor(options = {}) {
    this.historyHours = options.historyHours || 24;
    this.predictHours = options.predictHours || 6;
    this.burstThreshold = options.burstThreshold || 2.0;
    this.emaAlpha = options.emaAlpha || 0.3;
  }

  predict(hourlyData) {
    if (!hourlyData || hourlyData.length < 3) {
      return this._emptyPrediction();
    }

    const counts = hourlyData.map(h => h.count);
    const times = hourlyData.map(h => h.time);

    const lastValue = counts[counts.length - 1];
    const avgValue = counts.reduce((a, b) => a + b, 0) / counts.length;

    const sma = this._simpleMovingAverage(counts, 3);
    const ema = this._exponentialMovingAverage(counts, this.emaAlpha);

    const recentSlope = this._calculateSlope(counts.slice(-6));
    const overallSlope = this._calculateSlope(counts);

    const predicted = this._predictNextHours(counts, ema, recentSlope);

    const burstScore = this._calculateBurstScore(counts, sma, recentSlope);
    const burstLevel = this._getBurstLevel(burstScore);

    const trend = this._getTrendDirection(recentSlope, overallSlope, avgValue);

    const predictedTimes = this._generatePredictedTimes(
      times[times.length - 1],
      this.predictHours
    );

    const predictedData = predicted.map((value, i) => ({
      time: predictedTimes[i],
      count: Math.max(0, Math.round(value)),
    }));

    return {
      predicted: predictedData,
      current: {
        value: lastValue,
        average: Math.round(avgValue),
        sma: Math.round(sma[sma.length - 1] || lastValue),
        ema: Math.round(ema[ema.length - 1] || lastValue),
      },
      trend: {
        direction: trend.direction,
        strength: trend.strength,
        changePercent: trend.changePercent,
        hourlyGrowth: recentSlope,
      },
      burst: {
        level: burstLevel,
        score: burstScore,
        warning: burstScore >= this.burstThreshold,
        description: this._getBurstDescription(burstLevel, burstScore),
      },
      confidence: this._calculateConfidence(counts.length),
      predictionHours: this.predictHours,
    };
  }

  _emptyPrediction() {
    return {
      predicted: [],
      current: { value: 0, average: 0, sma: 0, ema: 0 },
      trend: { direction: 'stable', strength: 0, changePercent: 0, hourlyGrowth: 0 },
      burst: { level: 'normal', score: 0, warning: false, description: '数据不足，无法预测' },
      confidence: 0,
      predictionHours: this.predictHours,
    };
  }

  _simpleMovingAverage(data, window) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = data.slice(start, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
    }
    return result;
  }

  _exponentialMovingAverage(data, alpha) {
    if (data.length === 0) return [];
    const result = [data[0]];
    for (let i = 1; i < data.length; i++) {
      result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
    }
    return result;
  }

  _calculateSlope(data) {
    if (data.length < 2) return 0;
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope || 0;
  }

  _predictNextHours(counts, ema, slope) {
    const predictions = [];
    const lastEma = ema[ema.length - 1] || counts[counts.length - 1];
    const avgValue = counts.reduce((a, b) => a + b, 0) / counts.length;

    const recentAvg = counts.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, counts.length);
    const growthRate = avgValue > 0 ? (recentAvg - avgValue) / avgValue : 0;

    for (let i = 0; i < this.predictHours; i++) {
      const decayFactor = Math.exp(-i * 0.15);
      const trendComponent = slope * (i + 1) * 0.5;
      const meanReversion = (avgValue - lastEma) * (1 - decayFactor) * 0.3;
      const growthComponent = lastEma * growthRate * decayFactor * 0.5;

      let predicted = lastEma + trendComponent + meanReversion + growthComponent;
      predicted = Math.max(0, predicted);

      predictions.push(predicted);
    }

    return predictions;
  }

  _calculateBurstScore(counts, sma, slope) {
    if (counts.length < 4) return 0;

    const lastValue = counts[counts.length - 1];
    const avgValue = counts.reduce((a, b) => a + b, 0) / counts.length;

    const recent3Avg = counts.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const earlierAvg = counts.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, counts.length - 3);

    const ratioToAvg = avgValue > 0 ? lastValue / avgValue : 1;
    const recentRatio = earlierAvg > 0 ? recent3Avg / earlierAvg : 1;

    const recentSlope = slope;
    const slopeScore = avgValue > 0 ? Math.max(0, recentSlope / avgValue * 10) : 0;

    const accelerationScore = this._calculateAcceleration(counts);

    const burstScore = (ratioToAvg - 1) * 0.3
      + (recentRatio - 1) * 0.4
      + slopeScore * 0.2
      + accelerationScore * 0.1;

    return Math.max(0, burstScore);
  }

  _calculateAcceleration(counts) {
    if (counts.length < 6) return 0;

    const firstHalf = counts.slice(0, Math.floor(counts.length / 2));
    const secondHalf = counts.slice(Math.floor(counts.length / 2));

    const firstSlope = this._calculateSlope(firstHalf);
    const secondSlope = this._calculateSlope(secondHalf);

    const avgValue = counts.reduce((a, b) => a + b, 0) / counts.length;
    const acceleration = avgValue > 0 ? (secondSlope - firstSlope) / avgValue * 5 : 0;

    return Math.max(0, acceleration);
  }

  _getBurstLevel(score) {
    if (score >= 3.0) return 'extreme';
    if (score >= 2.0) return 'high';
    if (score >= 1.0) return 'medium';
    if (score >= 0.5) return 'low';
    return 'normal';
  }

  _getBurstDescription(level, score) {
    const descriptions = {
      extreme: '热度急剧攀升，即将爆发！',
      high: '热度快速增长，有爆发迹象',
      medium: '热度有所上升，持续关注',
      low: '热度温和增长',
      normal: '热度平稳，无明显爆发迹象',
    };
    return descriptions[level] || descriptions.normal;
  }

  _getTrendDirection(recentSlope, overallSlope, avgValue) {
    const changePercent = avgValue > 0 ? (recentSlope / avgValue) * 100 : 0;

    let direction = 'stable';
    let strength = 0;

    if (recentSlope > 0) {
      if (changePercent > 30) { direction = 'rising_rapidly'; strength = 3; }
      else if (changePercent > 10) { direction = 'rising'; strength = 2; }
      else { direction = 'rising_slightly'; strength = 1; }
    } else if (recentSlope < 0) {
      if (changePercent < -30) { direction = 'falling_rapidly'; strength = 3; }
      else if (changePercent < -10) { direction = 'falling'; strength = 2; }
      else { direction = 'falling_slightly'; strength = 1; }
    }

    return {
      direction,
      strength,
      changePercent: Math.round(changePercent * 10) / 10,
    };
  }

  _generatePredictedTimes(lastTimeStr, hours) {
    const times = [];
    const lastTime = new Date(lastTimeStr);
    for (let i = 0; i < hours; i++) {
      const next = new Date(lastTime);
      next.setHours(next.getHours() + i + 1);
      times.push(next.toISOString());
    }
    return times;
  }

  _calculateConfidence(dataLength) {
    if (dataLength >= 24) return 100;
    if (dataLength >= 12) return 80;
    if (dataLength >= 6) return 60;
    if (dataLength >= 3) return 40;
    return 20;
  }
}

module.exports = TrendPredictor;
