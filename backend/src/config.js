module.exports = {
  port: process.env.PORT || 3001,
  elasticsearch: {
    node: process.env.ES_NODE || 'http://localhost:9200',
    username: process.env.ES_USERNAME || 'elastic',
    password: process.env.ES_PASSWORD || 'changeme',
  },
  topic: process.env.TRACK_TOPIC || '#AI技术',
  simulation: {
    postsPerSecond: 5,
    enableRandomBurst: true,
  },
  aggregation: {
    hourlyBuckets: 24,
    topKeywords: 50,
    topRelatedTags: 30,
    windowSize: 1000,
  },
};
