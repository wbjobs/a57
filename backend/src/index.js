const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const config = require('./config');
const es = require('./elasticsearch');
const { mockDataStream } = require('./mockData');
const aggregationEngine = require('./aggregationEngine');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  const stats = aggregationEngine.getRealtimeStats();
  res.json({
    status: 'ok',
    topic: config.topic,
    topics: aggregationEngine.getAvailableTopics(),
    elasticsearchConnected: es.isReady(),
    totalPosts: stats.totalCount,
    simulation: {
      running: mockDataStream.isRunning,
      postsPerSecond: mockDataStream.postsPerSecond,
      activeTopics: mockDataStream.activeTopics,
    },
  });
});

app.get('/api/topics', (req, res) => {
  res.json({
    available: mockDataStream.getAvailableTopics(),
    active: aggregationEngine.getAvailableTopics(),
  });
});

app.get('/api/stats/realtime', (req, res) => {
  const { topic } = req.query;
  const stats = aggregationEngine.getRealtimeStats(topic);
  res.json(stats);
});

app.get('/api/stats/all', (req, res) => {
  const allStats = aggregationEngine.getAllStats();
  res.json(allStats);
});

app.get('/api/prediction', (req, res) => {
  const { topic } = req.query;
  const prediction = aggregationEngine.getPrediction(topic);
  res.json(prediction || {});
});

app.get('/api/compare', (req, res) => {
  const { topic1, topic2 } = req.query;
  if (!topic1 || !topic2) {
    return res.status(400).json({ error: 'topic1 and topic2 are required' });
  }
  const result = aggregationEngine.compareTopics(topic1, topic2);
  res.json(result);
});

app.post('/api/simulation/topics', (req, res) => {
  const { topics } = req.body;
  if (topics && Array.isArray(topics) && topics.length > 0) {
    mockDataStream.setActiveTopics(topics);
    res.json({ status: 'updated', topics });
  } else {
    res.status(400).json({ error: 'Invalid topics array' });
  }
});

app.post('/api/simulation/topic-weight', (req, res) => {
  const { topic, weight } = req.body;
  if (topic && weight !== undefined && weight > 0) {
    mockDataStream.setTopicWeight(topic, weight);
    res.json({ status: 'updated', topic, weight });
  } else {
    res.status(400).json({ error: 'Invalid topic or weight' });
  }
});

app.get('/api/stats/historical', async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    const start = startTime ? new Date(startTime) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endTime ? new Date(endTime) : new Date();

    const stats = await aggregationEngine.getHistoricalStats(start, end);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/posts/recent', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const stats = aggregationEngine.getRealtimeStats();
  res.json({ posts: stats.recentPosts || [] });
});

app.get('/api/performance', (req, res) => {
  const stats = aggregationEngine.getRealtimeStats();
  res.json({
    performance: stats.performance || {},
  });
});

app.post('/api/simulation/start', (req, res) => {
  mockDataStream.start();
  res.json({ status: 'started' });
});

app.post('/api/simulation/stop', (req, res) => {
  mockDataStream.stop();
  res.json({ status: 'stopped' });
});

app.post('/api/simulation/rate', (req, res) => {
  const { rate } = req.body;
  if (rate && rate > 0) {
    mockDataStream.setPostsPerSecond(rate);
    res.json({ status: 'updated', rate });
  } else {
    res.status(400).json({ error: 'Invalid rate' });
  }
});

app.post('/api/simulation/burst', (req, res) => {
  const { count, topic } = req.body;
  const burstCount = count || 50;
  mockDataStream.generateBurst(burstCount, topic);
  res.json({ status: 'burst generated', count: burstCount, topic: topic || config.topic });
});

io.on('connection', (socket) => {
  console.log('[WebSocket] 客户端连接:', socket.id);

  socket.emit('stats', aggregationEngine.getRealtimeStats());

  socket.on('disconnect', () => {
    console.log('[WebSocket] 客户端断开:', socket.id);
  });

  socket.on('getStats', () => {
    socket.emit('stats', aggregationEngine.getRealtimeStats());
  });
});

const wsListener = {
  onPost: (post) => {
    io.emit('newPost', post);
  },
  onStats: (stats) => {
    io.emit('stats', stats);
  },
};

async function start() {
  console.log('='.repeat(50));
  console.log('社交媒体话题追踪看板 - 后端服务');
  console.log('='.repeat(50));

  await es.connect();

  aggregationEngine.addListener(wsListener);
  aggregationEngine.start();

  const mockListener = {
    onPostsBatch: (posts) => {
      aggregationEngine.ingestPosts(posts);
    },
  };
  mockDataStream.addListener(mockListener);

  mockDataStream.start();

  server.listen(config.port, () => {
    console.log(`\n[HTTP] 服务器运行在 http://localhost:${config.port}`);
    console.log(`[WebSocket] Socket.IO 运行在 ws://localhost:${config.port}`);
    console.log(`[追踪话题] ${config.topic}`);
    console.log(`\nAPI 端点:`);
    console.log(`  GET  /api/health           - 健康检查`);
    console.log(`  GET  /api/topics           - 话题列表`);
    console.log(`  GET  /api/stats/realtime   - 实时统计数据`);
    console.log(`  GET  /api/stats/all        - 所有话题统计`);
    console.log(`  GET  /api/stats/historical - 历史统计数据`);
    console.log(`  GET  /api/posts/recent     - 最近帖子`);
    console.log(`  GET  /api/prediction       - 热度预测`);
    console.log(`  GET  /api/compare          - 话题对比`);
    console.log(`  GET  /api/performance      - 性能指标`);
    console.log(`  POST /api/simulation/start - 启动模拟`);
    console.log(`  POST /api/simulation/stop  - 停止模拟`);
    console.log(`  POST /api/simulation/burst - 生成突发流量`);
    console.log(`  POST /api/simulation/topics - 设置追踪话题`);
  });
}

start().catch(error => {
  console.error('启动失败:', error);
  process.exit(1);
});
