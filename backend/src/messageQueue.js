class MessageQueue {
  constructor(options = {}) {
    this.queue = [];
    this.batchSize = options.batchSize || 100;
    this.maxQueueSize = options.maxQueueSize || 50000;
    this.processInterval = options.processInterval || 100;
    this.handlers = [];
    this.isProcessing = false;
    this.timer = null;
    this.stats = {
      received: 0,
      processed: 0,
      dropped: 0,
      peakQueueSize: 0,
    };
  }

  addHandler(handler) {
    this.handlers.push(handler);
  }

  push(message) {
    this.stats.received++;
    if (this.queue.length >= this.maxQueueSize) {
      this.stats.dropped++;
      return false;
    }
    this.queue.push(message);
    if (this.queue.length > this.stats.peakQueueSize) {
      this.stats.peakQueueSize = this.queue.length;
    }
    return true;
  }

  pushBatch(messages) {
    let added = 0;
    for (const msg of messages) {
      if (this.push(msg)) added++;
    }
    return added;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this._processBatch(), this.processInterval);
    console.log('[MessageQueue] 已启动，批量大小:', this.batchSize, '处理间隔:', this.processInterval + 'ms');
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[MessageQueue] 已停止');
  }

  async _processBatch() {
    if (this.isProcessing || this.queue.length === 0) return;
    if (this.handlers.length === 0) {
      this.queue = [];
      return;
    }

    this.isProcessing = true;
    const batch = this.queue.splice(0, Math.min(this.batchSize, this.queue.length));

    try {
      await Promise.all(
        this.handlers.map(handler => handler(batch))
      );
      this.stats.processed += batch.length;
    } catch (error) {
      console.error('[MessageQueue] 处理批次失败:', error.message);
    } finally {
      this.isProcessing = false;
    }
  }

  getStats() {
    return {
      ...this.stats,
      currentQueueSize: this.queue.length,
      utilization: ((this.stats.received - this.stats.dropped) / this.stats.received * 100).toFixed(2) + '%',
    };
  }

  clear() {
    this.queue = [];
    this.stats = {
      received: 0,
      processed: 0,
      dropped: 0,
      peakQueueSize: 0,
    };
  }
}

module.exports = MessageQueue;
