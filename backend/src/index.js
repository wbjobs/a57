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
  res.json({
    status: 'ok',
    topic: config.topic,
    elasticsearchConnected: es.isReady(),
    totalPosts: aggregationEngine.getRealtimeStats().totalCount,
    simulation: {
      running: mockDataStream.isRunning,
      postsPerSecond: mockDataStream.postsPerSecond,
    },
  });
});

app.get('/api/stats/realtime', (req, res) => {
  const stats = aggregationEngine.getRealtimeStats();
  res.json(stats);
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
  const memoryStore = require('./memoryStore');
  const posts = memoryStore.getRecentPosts(limit);
  res.json({ posts });
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
  const { count } = req.body;
  mockDataStream.generateBurst(count || 50);
  res.json({ status: 'burst generated', count: count || 50 });
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

  mockDataStream.addListener((post) => {
    aggregationEngine.processPost(post);
  });

  mockDataStream.start();

  server.listen(config.port, () => {
    console.log(`\n[HTTP] 服务器运行在 http://localhost:${config.port}`);
    console.log(`[WebSocket] Socket.IO 运行在 ws://localhost:${config.port}`);
    console.log(`[追踪话题] ${config.topic}`);
    console.log(`\nAPI 端点:`);
    console.log(`  GET  /api/health          - 健康检查`);
    console.log(`  GET  /api/stats/realtime  - 实时统计数据`);
    console.log(`  GET  /api/stats/historical - 历史统计数据`);
    console.log(`  GET  /api/posts/recent    - 最近帖子`);
    console.log(`  POST /api/simulation/start - 启动模拟`);
    console.log(`  POST /api/simulation/stop  - 停止模拟`);
    console.log(`  POST /api/simulation/burst - 生成突发流量`);
  });
}

start().catch(error => {
  console.error('启动失败:', error);
  process.exit(1);
});
