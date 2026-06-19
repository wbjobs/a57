# 社交媒体话题追踪看板

实时追踪话题在社交媒体（微博、Twitter等）上的演变过程。包含趋势折线图、高频词词云、关联标签网络图等可视化组件。

## 功能特性

- 📈 **实时趋势图** - 按小时统计发帖量，ECharts 折线图展示24小时趋势
- ☁️ **高频词云** - 自动提取帖子中的高频关键词，词云可视化展示
- 🕸️ **关联标签网络** - D3.js 力导向图展示话题标签之间的关联关系
- 🏷️ **热门标签排行** - 与目标话题共同出现的热门标签排行榜
- 📝 **实时帖子流** - WebSocket 实时推送最新帖子数据
- 📊 **数据统计卡片** - 总帖数、小时发帖量、增长率等核心指标

## 技术架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  模拟API数据源   │────▶│  实时聚合引擎    │────▶│  Elasticsearch  │
│  (mockData)     │     │ (aggregation)   │     │   / 内存存储     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  前端 React     │◀────│  WebSocket /    │◀────│  REST API 服务   │
│  + ECharts      │     │  Socket.IO      │     │   (Express)     │
│  + D3.js        │     └─────────────────┘     └─────────────────┘
└─────────────────┘
```

### 后端技术栈
- Node.js + Express
- Socket.IO (WebSocket实时通信)
- Elasticsearch (可选，用于持久化存储和高级查询)
- 内存存储 (默认，无需额外依赖)

### 前端技术栈
- React 18 + Vite
- ECharts 5 (趋势图、词云)
- D3.js 7 (关联标签网络图)
- Socket.IO Client

## 快速开始

### 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装所有子项目依赖
npm run install:all
```

或者分别安装：

```bash
# 后端
cd backend && npm install

# 前端
cd frontend && npm install
```

### 启动项目

#### 方式一：同时启动前后端

```bash
npm run dev
```

#### 方式二：分别启动

```bash
# 启动后端 (端口 3001)
npm run dev:backend

# 启动前端 (端口 5173)
npm run dev:frontend
```

### 访问应用

打开浏览器访问: http://localhost:5173

## 项目结构

```
.
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── index.js         # 服务入口
│   │   ├── config.js        # 配置文件
│   │   ├── mockData.js      # 模拟数据源
│   │   ├── aggregationEngine.js  # 实时聚合引擎
│   │   ├── elasticsearch.js # ES 存储模块
│   │   └── memoryStore.js   # 内存存储模块
│   └── package.json
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── App.jsx          # 主应用组件
│   │   ├── main.jsx         # 入口文件
│   │   ├── index.css        # 全局样式
│   │   └── components/
│   │       ├── StatCard.jsx       # 统计卡片
│   │       ├── TrendChart.jsx     # 趋势折线图
│   │       ├── WordCloudChart.jsx # 词云图
│   │       └── TagNetworkChart.jsx # 标签网络图
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── package.json             # 根目录配置
```

## API 接口

### 健康检查
```
GET /api/health
```

### 实时统计数据
```
GET /api/stats/realtime
```

### 历史统计数据
```
GET /api/stats/historical?startTime=xxx&endTime=xxx
```

### 最近帖子
```
GET /api/posts/recent?limit=20
```

### 模拟控制
```
POST /api/simulation/start    # 启动模拟
POST /api/simulation/stop     # 停止模拟
POST /api/simulation/rate     # 设置速率 { rate: 10 }
POST /api/simulation/burst    # 生成突发流量 { count: 50 }
```

## 配置说明

可以通过环境变量配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 3001 | 后端服务端口 |
| TRACK_TOPIC | #AI技术 | 追踪的话题标签 |
| ES_NODE | http://localhost:9200 | Elasticsearch 地址 |
| ES_USERNAME | elastic | ES 用户名 |
| ES_PASSWORD | changeme | ES 密码 |

## Elasticsearch (可选)

默认使用内存存储，无需安装 Elasticsearch 即可运行。

如需启用 Elasticsearch 进行持久化存储和更强大的查询功能：

1. 安装并启动 Elasticsearch 8.x
2. 配置环境变量 `ES_NODE`, `ES_USERNAME`, `ES_PASSWORD`
3. 重启后端服务

系统会自动检测 ES 是否可用，不可用时自动降级到内存存储。

## 数据延迟

- 模拟数据生成: 毫秒级
- 数据聚合处理: < 100ms
- WebSocket 推送: < 500ms
- 前端刷新: 每 2 秒更新统计数据，新帖子实时推送

## 自定义配置

修改 `backend/src/config.js` 调整：

- `postsPerSecond`: 每秒生成帖子数
- `enableRandomBurst`: 是否启用随机突发流量
- `hourlyBuckets`: 小时统计桶数
- `topKeywords`: 高频词数量
- `topRelatedTags`: 关联标签数量

## License

MIT
