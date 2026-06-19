const config = require('./config');

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
  'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than',
  'too', 'very', 'just', 'because', 'if', 'when', 'where', 'how', 'what',
  'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'it', 'its',
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
  'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself', 'they', 'them', 'their', 'theirs',
  'themselves', 'am',
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都',
  '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你',
  '会', '着', '没有', '看', '好', '自己', '这', '那', '他', '她',
  '它', '们', '而', '与', '或', '等', '及', '以', '但', '还',
  '又', '再', '被', '把', '让', '给', '从', '向', '对', '比',
  '今天', '真的', '一下', '可以', '什么', '怎么', '为什么', '这个',
  '那个', '这些', '那些', '这样', '那样', '大家', '我们', '你们',
  '他们', '它们', '自己', '一起', '已经', '还是', '因为', '所以',
  '但是', '而且', '或者', '虽然', '如果', '那么', '然后', '就是',
]);

const TAG_REGEX = /#\w+/g;
const WORD_REGEX = /[a-zA-Z]+/g;
const CHINESE_REGEX = /[\u4e00-\u9fa5]{2,}/g;

class SlidingWindowAggregator {
  constructor(options = {}) {
    this.windowHours = options.windowHours || 24;
    this.maxRecentPosts = options.maxRecentPosts || 500;

    this.hourlyBuckets = new Map();
    this.keywordCounts = new Map();
    this.tagCounts = new Map();
    this.tagCoOccurrence = new Map();

    this.recentPosts = [];
    this.totalCount = 0;

    this.cachedTopKeywords = [];
    this.cachedTopTags = [];
    this.cachedTagNetwork = null;
    this.cacheDirty = true;
    this.lastCacheTime = 0;
    this.cacheTtl = 2000;

    this.cleanupInterval = null;
  }

  start() {
    this.cleanupInterval = setInterval(() => this._cleanupOldData(), 60 * 1000);
    console.log('[SlidingWindowAggregator] 滑动窗口聚合引擎已启动，窗口大小:', this.windowHours + 'h');
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('[SlidingWindowAggregator] 已停止');
  }

  addPostsBatch(posts) {
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);
    const currentHourStr = currentHour.toISOString();

    let keywordIncrements = new Map();
    let tagIncrements = new Map();
    let coOccurrenceIncrements = new Map();

    for (const post of posts) {
      this.totalCount++;

      const hourKey = new Date(post.timestamp);
      hourKey.setMinutes(0, 0, 0);
      const hourStr = hourKey.toISOString();
      this.hourlyBuckets.set(hourStr, (this.hourlyBuckets.get(hourStr) || 0) + 1);

      const words = this._extractWordsFast(post.content);
      for (const word of words) {
        keywordIncrements.set(word, (keywordIncrements.get(word) || 0) + 1);
      }

      for (const tag of post.tags) {
        tagIncrements.set(tag, (tagIncrements.get(tag) || 0) + 1);
      }

      const topicTag = post.topic;
      const otherTags = post.tags.filter(t => t !== topicTag);
      for (const tag of otherTags) {
        const key = `${topicTag}|${tag}`;
        coOccurrenceIncrements.set(key, (coOccurrenceIncrements.get(key) || 0) + 1);
      }

      if (otherTags.length > 1) {
        for (let i = 0; i < otherTags.length; i++) {
          for (let j = i + 1; j < otherTags.length; j++) {
            const key = otherTags[i] < otherTags[j]
              ? `${otherTags[i]}|${otherTags[j]}`
              : `${otherTags[j]}|${otherTags[i]}`;
            coOccurrenceIncrements.set(key, (coOccurrenceIncrements.get(key) || 0) + 1);
          }
        }
      }

      this.recentPosts.push(post);
    }

    if (this.recentPosts.length > this.maxRecentPosts) {
      this.recentPosts = this.recentPosts.slice(-this.maxRecentPosts);
    }

    for (const [word, count] of keywordIncrements) {
      this.keywordCounts.set(word, (this.keywordCounts.get(word) || 0) + count);
    }
    for (const [tag, count] of tagIncrements) {
      this.tagCounts.set(tag, (this.tagCounts.get(tag) || 0) + count);
    }
    for (const [key, count] of coOccurrenceIncrements) {
      this.tagCoOccurrence.set(key, (this.tagCoOccurrence.get(key) || 0) + count);
    }

    this.cacheDirty = true;

    return posts.length;
  }

  _extractWordsFast(content) {
    const words = [];

    const englishWords = content.match(WORD_REGEX);
    if (englishWords) {
      for (const w of englishWords) {
        const lower = w.toLowerCase();
        if (lower.length >= 2 && !STOP_WORDS.has(lower)) {
          words.push(lower);
        }
      }
    }

    const chineseWords = content.match(CHINESE_REGEX);
    if (chineseWords) {
      for (const w of chineseWords) {
        if (!STOP_WORDS.has(w)) {
          words.push(w);
        }
      }
    }

    return words;
  }

  _cleanupOldData() {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - this.windowHours);
    cutoff.setMinutes(0, 0, 0);
    const cutoffStr = cutoff.toISOString();

    let removedHours = 0;
    for (const hourKey of this.hourlyBuckets.keys()) {
      if (hourKey < cutoffStr) {
        this.hourlyBuckets.delete(hourKey);
        removedHours++;
      }
    }

    if (removedHours > 0) {
      console.log('[SlidingWindowAggregator] 清理过期数据，移除了', removedHours, '个小时桶');
      this.cacheDirty = true;
    }
  }

  getHourlyStats(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const result = [];
    let current = new Date(start);
    current.setMinutes(0, 0, 0);

    while (current <= end) {
      const hourStr = current.toISOString();
      result.push({
        time: hourStr,
        count: this.hourlyBuckets.get(hourStr) || 0,
      });
      current.setHours(current.getHours() + 1);
    }
    return result;
  }

  getTopKeywords(size = 50) {
    this._refreshCache();
    return this.cachedTopKeywords.slice(0, size);
  }

  getRelatedTags(topic, size = 30) {
    this._refreshCache();
    return this.cachedTopTags
      .filter(t => t.tag !== topic)
      .slice(0, size);
  }

  getTagNetwork(topic, size = 30) {
    this._refreshCache();
    if (!this.cachedTagNetwork || this.cachedTagNetwork.topic !== topic || this.cachedTagNetwork.size !== size) {
      this.cachedTagNetwork = this._buildTagNetwork(topic, size);
    }
    return this.cachedTagNetwork.data;
  }

  _refreshCache() {
    const now = Date.now();
    if (!this.cacheDirty && (now - this.lastCacheTime) < this.cacheTtl) {
      return;
    }

    const keywordArr = [];
    for (const [word, count] of this.keywordCounts) {
      keywordArr.push({ word, count, score: count });
    }
    keywordArr.sort((a, b) => b.count - a.count);
    this.cachedTopKeywords = keywordArr.slice(0, 200);

    const tagArr = [];
    for (const [tag, count] of this.tagCounts) {
      tagArr.push({ tag, count });
    }
    tagArr.sort((a, b) => b.count - a.count);
    this.cachedTopTags = tagArr.slice(0, 100);

    this.cachedTagNetwork = null;

    this.cacheDirty = false;
    this.lastCacheTime = now;
  }

  _buildTagNetwork(topic, size) {
    const relatedTags = this.getRelatedTags(topic, size);
    const nodes = [
      { id: topic, name: topic, value: this.tagCounts.get(topic) || 0, category: 0 },
    ];
    const links = [];

    const tagSet = new Set([topic]);

    for (const item of relatedTags) {
      nodes.push({
        id: item.tag,
        name: item.tag,
        value: item.count,
        category: 1,
      });
      links.push({
        source: topic,
        target: item.tag,
        value: item.count,
      });
      tagSet.add(item.tag);
    }

    for (let i = 0; i < relatedTags.length; i++) {
      for (let j = i + 1; j < relatedTags.length; j++) {
        const t1 = relatedTags[i].tag;
        const t2 = relatedTags[j].tag;
        const key = t1 < t2 ? `${t1}|${t2}` : `${t2}|${t1}`;
        const count = this.tagCoOccurrence.get(key) || 0;
        if (count > 0) {
          links.push({
            source: t1,
            target: t2,
            value: count,
          });
        }
      }
    }

    return {
      topic,
      size,
      data: { nodes, links },
    };
  }

  getRecentPosts(limit = 20) {
    return this.recentPosts.slice(-limit).reverse();
  }

  getTotalCount() {
    return this.totalCount;
  }

  getCurrentHourCount() {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return this.hourlyBuckets.get(now.toISOString()) || 0;
  }

  getLastHourCount() {
    const lastHour = new Date();
    lastHour.setHours(lastHour.getHours() - 1);
    lastHour.setMinutes(0, 0, 0);
    return this.hourlyBuckets.get(lastHour.toISOString()) || 0;
  }

  getStats() {
    return {
      totalPosts: this.totalCount,
      uniqueKeywords: this.keywordCounts.size,
      uniqueTags: this.tagCounts.size,
      recentPosts: this.recentPosts.length,
      hourlyBuckets: this.hourlyBuckets.size,
    };
  }
}

module.exports = SlidingWindowAggregator;
