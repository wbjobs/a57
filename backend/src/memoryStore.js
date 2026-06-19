const config = require('./config');

class MemoryStore {
  constructor() {
    this.posts = [];
    this.maxPosts = 50000;
    this.hourlyStats = new Map();
    this.keywordCounts = new Map();
    this.tagCounts = new Map();
    this.tagCoOccurrence = new Map();
  }

  addPost(post) {
    this.posts.push(post);
    if (this.posts.length > this.maxPosts) {
      this.posts.shift();
    }
    this._updateAggregates(post);
  }

  _updateAggregates(post) {
    const hourKey = new Date(post.timestamp);
    hourKey.setMinutes(0, 0, 0);
    const hourStr = hourKey.toISOString();
    this.hourlyStats.set(hourStr, (this.hourlyStats.get(hourStr) || 0) + 1);

    const words = this._extractWords(post.content);
    words.forEach(word => {
      this.keywordCounts.set(word, (this.keywordCounts.get(word) || 0) + 1);
    });

    post.tags.forEach(tag => {
      this.tagCounts.set(tag, (this.tagCounts.get(tag) || 0) + 1);
    });

    const topicTag = post.topic;
    post.tags
      .filter(tag => tag !== topicTag)
      .forEach(tag => {
        const key = `${topicTag}|${tag}`;
        this.tagCoOccurrence.set(key, (this.tagCoOccurrence.get(key) || 0) + 1);
      });
  }

  _extractWords(content) {
    const cleaned = content.replace(/#\w+/g, '').replace(/[^\w\u4e00-\u9fa5\s]/g, '');
    const words = cleaned
      .split(/\s+/)
      .filter(w => w.length >= 2 && !this._isStopWord(w))
      .map(w => w.toLowerCase());

    const chineseChars = content.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    return [...words, ...chineseChars];
  }

  _isStopWord(word) {
    const stopWords = new Set([
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
      'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
      'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都',
      '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你',
      '会', '着', '没有', '看', '好', '自己', '这', '那', '他', '她',
      '它', '们', '而', '与', '或', '等', '及', '以', '但', '还',
      '又', '再', '被', '把', '让', '给', '从', '向', '对', '比',
    ]);
    return stopWords.has(word.toLowerCase());
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
        count: this.hourlyStats.get(hourStr) || 0,
      });
      current.setHours(current.getHours() + 1);
    }
    return result;
  }

  getTopKeywords(size = 50) {
    const sorted = [...this.keywordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, size);
    return sorted.map(([word, count]) => ({
      word,
      count,
      score: count,
    }));
  }

  getRelatedTags(topic, size = 30) {
    const coOccurrences = [];
    for (const [key, count] of this.tagCoOccurrence.entries()) {
      const [t1, t2] = key.split('|');
      if (t1 === topic || t2 === topic) {
        const tag = t1 === topic ? t2 : t1;
        coOccurrences.push({ tag, count });
      }
    }
    return coOccurrences
      .sort((a, b) => b.count - a.count)
      .slice(0, size);
  }

  getTagNetwork(topic, size = 30) {
    const relatedTags = this.getRelatedTags(topic, size);
    const nodes = [
      { id: topic, name: topic, value: this.tagCounts.get(topic) || 0, category: 0 },
    ];
    const links = [];

    relatedTags.forEach((item, index) => {
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
    });

    for (let i = 0; i < relatedTags.length; i++) {
      for (let j = i + 1; j < relatedTags.length; j++) {
        const key1 = `${relatedTags[i].tag}|${relatedTags[j].tag}`;
        const key2 = `${relatedTags[j].tag}|${relatedTags[i].tag}`;
        const count = this.tagCoOccurrence.get(key1) || this.tagCoOccurrence.get(key2) || 0;
        if (count > 0) {
          links.push({
            source: relatedTags[i].tag,
            target: relatedTags[j].tag,
            value: count,
          });
        }
      }
    }

    return { nodes, links };
  }

  getRecentPosts(limit = 10) {
    return this.posts.slice(-limit).reverse();
  }

  getTotalCount() {
    return this.posts.length;
  }
}

const memoryStore = new MemoryStore();

module.exports = memoryStore;
