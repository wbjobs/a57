const config = require('./config');
const SlidingWindowAggregator = require('./slidingWindowAggregator');
const TrendPredictor = require('./trendPredictor');

class TopicManager {
  constructor() {
    this.topics = new Map();
    this.predictors = new Map();
    this.defaultTopic = config.topic;
    this.predictorOptions = {
      historyHours: 24,
      predictHours: 6,
      burstThreshold: 2.0,
    };
  }

  ensureTopic(topic) {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new SlidingWindowAggregator({
        windowHours: 24,
        maxRecentPosts: 200,
      }));
      this.predictors.set(topic, new TrendPredictor(this.predictorOptions));
      console.log('[TopicManager] 新增追踪话题:', topic);
    }
    return this.topics.get(topic);
  }

  addPostsBatch(posts) {
    const byTopic = new Map();

    for (const post of posts) {
      const topic = post.topic || this.defaultTopic;
      if (!byTopic.has(topic)) {
        byTopic.set(topic, []);
      }
      byTopic.get(topic).push(post);
    }

    for (const [topic, topicPosts] of byTopic) {
      const aggregator = this.ensureTopic(topic);
      aggregator.addPostsBatch(topicPosts);
    }

    return posts.length;
  }

  getStats(topic) {
    const t = topic || this.defaultTopic;
    const aggregator = this.ensureTopic(t);

    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const hourlyStats = aggregator.getHourlyStats(startTime, now);
    const topKeywords = aggregator.getTopKeywords(50);
    const relatedTags = aggregator.getRelatedTags(t, 30);
    const tagNetwork = aggregator.getTagNetwork(t, 30);
    const recentPosts = aggregator.getRecentPosts(20);
    const totalCount = aggregator.getTotalCount();
    const currentHourCount = aggregator.getCurrentHourCount();
    const lastHourCount = aggregator.getLastHourCount();

    const growthRate = lastHourCount > 0
      ? ((currentHourCount - lastHourCount) / lastHourCount * 100)
      : currentHourCount > 0 ? 100 : 0;

    const predictor = this.predictors.get(t);
    const prediction = predictor ? predictor.predict(hourlyStats) : null;

    return {
      topic: t,
      timestamp: now.toISOString(),
      totalCount,
      currentHourCount,
      lastHourCount,
      growthRate: parseFloat(growthRate.toFixed(1)),
      hourlyStats,
      topKeywords,
      relatedTags,
      tagNetwork,
      recentPosts,
      postsPerMinute: Math.round(currentHourCount / 60),
      prediction,
    };
  }

  getPrediction(topic) {
    const t = topic || this.defaultTopic;
    const aggregator = this.ensureTopic(t);
    const predictor = this.predictors.get(t);

    if (!predictor) return null;

    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const hourlyStats = aggregator.getHourlyStats(startTime, now);

    return predictor.predict(hourlyStats);
  }

  getAllTopics() {
    return Array.from(this.topics.keys());
  }

  getAllStats() {
    const result = {};
    for (const topic of this.topics.keys()) {
      result[topic] = this.getStats(topic);
    }
    return result;
  }

  compareTopics(topic1, topic2) {
    const stats1 = this.getStats(topic1);
    const stats2 = this.getStats(topic2);
    return {
      topic1: stats1,
      topic2: stats2,
      comparison: this._compareStats(stats1, stats2),
    };
  }

  _compareStats(stats1, stats2) {
    const totalRatio = stats2.totalCount > 0
      ? (stats1.totalCount / stats2.totalCount).toFixed(2)
      : 0;

    const currentHourRatio = stats2.currentHourCount > 0
      ? (stats1.currentHourCount / stats2.currentHourCount).toFixed(2)
      : 0;

    const keywords1 = new Set(stats1.topKeywords.map(k => k.word));
    const keywords2 = new Set(stats2.topKeywords.map(k => k.word));
    const commonKeywords = [...keywords1].filter(k => keywords2.has(k));

    const tags1 = new Set(stats1.relatedTags.map(t => t.tag));
    const tags2 = new Set(stats2.relatedTags.map(t => t.tag));
    const commonTags = [...tags1].filter(t => tags2.has(t));

    return {
      totalRatio: parseFloat(totalRatio),
      currentHourRatio: parseFloat(currentHourRatio),
      commonKeywords: commonKeywords.slice(0, 20),
      commonTags: commonTags.slice(0, 15),
      leader: stats1.totalCount > stats2.totalCount ? stats1.topic : stats2.topic,
      gap: Math.abs(stats1.totalCount - stats2.totalCount),
    };
  }

  start() {
    this.ensureTopic(this.defaultTopic);
    console.log('[TopicManager] 话题管理器已启动，默认话题:', this.defaultTopic);
  }

  stop() {
    for (const aggregator of this.topics.values()) {
      aggregator.stop();
    }
    console.log('[TopicManager] 已停止');
  }
}

const topicManager = new TopicManager();

module.exports = topicManager;
