const { Client } = require('@elastic/elasticsearch');
const config = require('./config');

let client = null;
let isConnected = false;

async function connect() {
  try {
    client = new Client({
      node: config.elasticsearch.node,
      auth: {
        username: config.elasticsearch.username,
        password: config.elasticsearch.password,
      },
    });
    await client.ping();
    isConnected = true;
    console.log('[Elasticsearch] 连接成功');
    await ensureIndex();
    return true;
  } catch (error) {
    console.warn('[Elasticsearch] 连接失败，将使用内存存储:', error.message);
    isConnected = false;
    return false;
  }
}

async function ensureIndex() {
  const indexName = 'social_posts';
  try {
    const exists = await client.indices.exists({ index: indexName });
    if (!exists) {
      await client.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              postId: { type: 'keyword' },
              timestamp: { type: 'date' },
              author: { type: 'keyword' },
              content: { type: 'text' },
              tags: { type: 'keyword' },
              platform: { type: 'keyword' },
              topic: { type: 'keyword' },
            },
          },
        },
      });
      console.log('[Elasticsearch] 索引创建成功:', indexName);
    }
  } catch (error) {
    console.error('[Elasticsearch] 索引创建失败:', error.message);
  }
}

async function indexPost(post) {
  if (!isConnected) return false;
  try {
    await client.index({
      index: 'social_posts',
      id: post.postId,
      body: {
        ...post,
        timestamp: new Date(post.timestamp),
      },
    });
    return true;
  } catch (error) {
    console.error('[Elasticsearch] 索引文档失败:', error.message);
    return false;
  }
}

async function getHourlyStats(startTime, endTime, topic) {
  if (!isConnected) return null;
  try {
    const result = await client.search({
      index: 'social_posts',
      size: 0,
      body: {
        query: {
          bool: {
            must: [
              { term: { topic } },
              {
                range: {
                  timestamp: {
                    gte: startTime.toISOString(),
                    lte: endTime.toISOString(),
                  },
                },
              },
            ],
          },
        },
        aggs: {
          hourly: {
            date_histogram: {
              field: 'timestamp',
              calendar_interval: 'hour',
              min_doc_count: 0,
              extended_bounds: {
                min: startTime.toISOString(),
                max: endTime.toISOString(),
              },
            },
          },
        },
      },
    });
    return result.aggregations.hourly.buckets.map(bucket => ({
      time: bucket.key_as_string,
      count: bucket.doc_count,
    }));
  } catch (error) {
    console.error('[Elasticsearch] 查询小时统计失败:', error.message);
    return null;
  }
}

async function getTopKeywords(startTime, endTime, topic, size = 50) {
  if (!isConnected) return null;
  try {
    const result = await client.search({
      index: 'social_posts',
      size: 0,
      body: {
        query: {
          bool: {
            must: [
              { term: { topic } },
              {
                range: {
                  timestamp: {
                    gte: startTime.toISOString(),
                    lte: endTime.toISOString(),
                  },
                },
              },
            ],
          },
        },
        aggs: {
          keywords: {
            significant_text: {
              field: 'content',
              size,
            },
          },
        },
      },
    });
    return result.aggregations.keywords.buckets.map(bucket => ({
      word: bucket.key,
      count: bucket.doc_count,
      score: bucket.score,
    }));
  } catch (error) {
    console.error('[Elasticsearch] 查询高频词失败:', error.message);
    return null;
  }
}

async function getRelatedTags(startTime, endTime, topic, size = 30) {
  if (!isConnected) return null;
  try {
    const result = await client.search({
      index: 'social_posts',
      size: 0,
      body: {
        query: {
          bool: {
            must: [
              { term: { topic } },
              {
                range: {
                  timestamp: {
                    gte: startTime.toISOString(),
                    lte: endTime.toISOString(),
                  },
                },
              },
            ],
          },
        },
        aggs: {
          tags: {
            terms: {
              field: 'tags',
              size: size + 1,
            },
          },
        },
      },
    });
    return result.aggregations.tags.buckets
      .filter(bucket => bucket.key !== topic)
      .slice(0, size)
      .map(bucket => ({
        tag: bucket.key,
        count: bucket.doc_count,
      }));
  } catch (error) {
    console.error('[Elasticsearch] 查询关联标签失败:', error.message);
    return null;
  }
}

function isReady() {
  return isConnected;
}

module.exports = {
  connect,
  indexPost,
  getHourlyStats,
  getTopKeywords,
  getRelatedTags,
  isReady,
};
