const config = require('./config');
const memoryStore = require('./memoryStore');
const es = require('./elasticsearch');

class AggregationEngine {
  constructor() {
    this.recentPosts = [];
    this.maxRecentPosts = 1000;
    this.listeners = [];
    this.lastStatsTime = null;
    this.statsInterval = 2000;
    this.intervalId = null;
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this._emitStats(), this.statsInterval);
    console.log('[AggregationEngine] 聚合引擎已启动');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[AggregationEngine] 聚合引擎已停止');
  }

  async processPost(post) {
    memoryStore.addPost(post);

    if (es.isReady()) {
      es.indexPost(post).catch(err => {
        console.error('[AggregationEngine] ES索引失败:', err.message);
      });
    }

    this.recentPosts.unshift(post);
    if (this.recentPosts.length > this.maxRecentPosts) {
      this.recentPosts.pop();
    }

    this._notifyNewPost(post);
  }

  _notifyNewPost(post) {
    this.listeners.forEach(listener => {
      try {
        if (listener.onPost) {
          listener.onPost(post);
        }
      } catch (error) {
        console.error('[AggregationEngine] 通知监听器失败:', error.message);
      }
    });
  }

  _emitStats() {
    const stats = this.getRealtimeStats();
    this.listeners.forEach(listener => {
      try {
        if (listener.onStats) {
          listener.onStats(stats);
        }
      } catch (error) {
        console.error('[AggregationEngine] 发送统计数据失败:', error.message);
      }
    });
  }

  getRealtimeStats() {
    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const hourlyStats = memoryStore.getHourlyStats(startTime, now);
    const topKeywords = memoryStore.getTopKeywords(config.aggregation.topKeywords);
    const relatedTags = memoryStore.getRelatedTags(config.topic, config.aggregation.topRelatedTags);
    const tagNetwork = memoryStore.getTagNetwork(config.topic, config.aggregation.topRelatedTags);
    const recentPosts = memoryStore.getRecentPosts(20);
    const totalCount = memoryStore.getTotalCount();

    const currentHour = new Date(now);
    currentHour.setMinutes(0, 0, 0);
    const currentHourStr = currentHour.toISOString();
    const currentHourCount = memoryStore.hourlyStats.get(currentHourStr) || 0;

    const lastHour = new Date(currentHour.getTime() - 60 * 60 * 1000);
    const lastHourStr = lastHour.toISOString();
    const lastHourCount = memoryStore.hourlyStats.get(lastHourStr) || 0;

    const growthRate = lastHourCount > 0
      ? ((currentHourCount - lastHourCount) / lastHourCount * 100).toFixed(1)
      : currentHourCount > 0 ? 100 : 0;

    return {
      topic: config.topic,
      timestamp: now.toISOString(),
      totalCount,
      currentHourCount,
      lastHourCount,
      growthRate,
      hourlyStats,
      topKeywords,
      relatedTags,
      tagNetwork,
      recentPosts,
      postsPerMinute: Math.round(currentHourCount / 60),
    };
  }

  async getHistoricalStats(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (es.isReady()) {
      const [hourlyStats, topKeywords, relatedTags] = await Promise.all([
        es.getHourlyStats(start, end, config.topic),
        es.getTopKeywords(start, end, config.topic, config.aggregation.topKeywords),
        es.getRelatedTags(start, end, config.topic, config.aggregation.topRelatedTags),
      ]);

      if (hourlyStats && topKeywords && relatedTags) {
        return {
          hourlyStats,
          topKeywords,
          relatedTags,
          source: 'elasticsearch',
        };
      }
    }

    return {
      hourlyStats: memoryStore.getHourlyStats(start, end),
      topKeywords: memoryStore.getTopKeywords(config.aggregation.topKeywords),
      relatedTags: memoryStore.getRelatedTags(config.topic, config.aggregation.topRelatedTags),
      source: 'memory',
    };
  }
}

const aggregationEngine = new AggregationEngine();

module.exports = aggregationEngine;
