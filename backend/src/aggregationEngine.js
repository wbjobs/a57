const config = require('./config');
const es = require('./elasticsearch');
const MessageQueue = require('./messageQueue');
const topicManager = require('./topicManager');

class AggregationEngine {
  constructor() {
    this.listeners = [];
    this.statsInterval = 2000;
    this.intervalId = null;

    this.messageQueue = new MessageQueue({
      batchSize: 500,
      maxQueueSize: 200000,
      processInterval: 20,
    });

    this.esBatchQueue = [];
    this.esBatchSize = 50;
    this.esBatchInterval = null;
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  start() {
    if (this.intervalId) return;

    topicManager.start();

    this.messageQueue.addHandler(async (batch) => {
      await this._processBatch(batch);
    });
    this.messageQueue.start();

    this.intervalId = setInterval(() => this._emitStats(), this.statsInterval);

    this.esBatchInterval = setInterval(() => this._flushEsBatch(), 5000);

    console.log('[AggregationEngine] 高性能聚合引擎已启动 (消息队列 + 滑动窗口 + 话题管理)');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.esBatchInterval) {
      clearInterval(this.esBatchInterval);
      this.esBatchInterval = null;
    }
    this.messageQueue.stop();
    topicManager.stop();
    console.log('[AggregationEngine] 已停止');
  }

  ingestPost(post) {
    return this.messageQueue.push(post);
  }

  ingestPosts(posts) {
    return this.messageQueue.pushBatch(posts);
  }

  async _processBatch(posts) {
    topicManager.addPostsBatch(posts);

    if (es.isReady()) {
      this.esBatchQueue.push(...posts);
      if (this.esBatchQueue.length >= this.esBatchSize) {
        this._flushEsBatch().catch(err => {
          console.error('[AggregationEngine] ES批量写入失败:', err.message);
        });
      }
    }

    if (posts.length > 0) {
      this._notifyNewPosts(posts.slice(-5));
    }
  }

  async _flushEsBatch() {
    if (!es.isReady() || this.esBatchQueue.length === 0) return;

    const batch = this.esBatchQueue.splice(0, this.esBatchSize);
    try {
      const operations = [];
      for (const post of batch) {
        operations.push({ index: { _id: post.postId } });
        operations.push({
          ...post,
          timestamp: new Date(post.timestamp),
        });
      }
      await es.client.bulk({
        index: 'social_posts',
        operations,
      });
    } catch (error) {
      console.error('[AggregationEngine] ES批量索引失败:', error.message);
      this.esBatchQueue.unshift(...batch);
      if (this.esBatchQueue.length > 5000) {
        this.esBatchQueue = this.esBatchQueue.slice(-500);
      }
    }
  }

  _notifyNewPosts(posts) {
    for (const post of posts) {
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

  getRealtimeStats(topic) {
    const targetTopic = topic || config.topic;
    const stats = topicManager.getStats(targetTopic);
    const queueStats = this.messageQueue.getStats();

    return {
      ...stats,
      performance: {
        queueSize: queueStats.currentQueueSize,
        queueDropped: queueStats.dropped,
        queuePeak: queueStats.peakQueueSize,
        processed: queueStats.processed,
        activeTopics: topicManager.getAllTopics().length,
      },
    };
  }

  getAllStats() {
    const allStats = topicManager.getAllStats();
    const queueStats = this.messageQueue.getStats();

    return {
      topics: allStats,
      performance: {
        queueSize: queueStats.currentQueueSize,
        queueDropped: queueStats.dropped,
        queuePeak: queueStats.peakQueueSize,
        processed: queueStats.processed,
        activeTopics: topicManager.getAllTopics().length,
      },
    };
  }

  getPrediction(topic) {
    return topicManager.getPrediction(topic || config.topic);
  }

  compareTopics(topic1, topic2) {
    return topicManager.compareTopics(topic1, topic2);
  }

  getAvailableTopics() {
    return topicManager.getAllTopics();
  }

  async getHistoricalStats(startTime, endTime, topic) {
    const targetTopic = topic || config.topic;
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (es.isReady()) {
      try {
        const [hourlyStats, topKeywords, relatedTags] = await Promise.all([
          es.getHourlyStats(start, end, targetTopic),
          es.getTopKeywords(start, end, targetTopic, config.aggregation.topKeywords),
          es.getRelatedTags(start, end, targetTopic, config.aggregation.topRelatedTags),
        ]);

        if (hourlyStats && topKeywords && relatedTags) {
          return {
            hourlyStats,
            topKeywords,
            relatedTags,
            source: 'elasticsearch',
          };
        }
      } catch (error) {
        console.error('[AggregationEngine] ES查询失败，降级到内存聚合:', error.message);
      }
    }

    return null;
  }
}

const aggregationEngine = new AggregationEngine();

module.exports = aggregationEngine;
