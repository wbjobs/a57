import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import StatCard from './components/StatCard.jsx';
import TrendChart from './components/TrendChart.jsx';
import WordCloudChart from './components/WordCloudChart.jsx';
import TagNetworkChart from './components/TagNetworkChart.jsx';

function App() {
  const [stats, setStats] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    fetch('/api/stats/realtime')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setRecentPosts(data.recentPosts || []);
      })
      .catch(err => console.error('获取初始数据失败:', err));

    const socket = io('/', {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('WebSocket 已连接');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket 已断开');
      setIsConnected(false);
    });

    socket.on('stats', (data) => {
      setStats(data);
    });

    socket.on('newPost', (post) => {
      setRecentPosts(prev => {
        const updated = [post, ...prev];
        return updated.slice(0, 20);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const maxTagCount = stats?.relatedTags?.[0]?.count || 1;

  return (
    <div className="app">
      <header className="header">
        <h1>社交媒体话题追踪看板</h1>
        <p className="subtitle">实时追踪话题在社交媒体上的演变过程</p>
        <div className="topic-tag">
          <span className="live-indicator">
            <span className="live-dot"></span>
            {isConnected ? '实时更新中' : '连接中...'}
          </span>
          {'  '}
          {stats?.topic || '#AI技术'}
        </div>
      </header>

      <div className="stats-grid">
        <StatCard
          label="总帖子数"
          value={stats?.totalCount || 0}
        />
        <StatCard
          label="本小时发帖"
          value={stats?.currentHourCount || 0}
          change={stats?.growthRate ? parseFloat(stats.growthRate) : 0}
        />
        <StatCard
          label="每分钟发帖"
          value={stats?.postsPerMinute || 0}
        />
        <StatCard
          label="关联话题数"
          value={stats?.relatedTags?.length || 0}
        />
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>📈 24小时发帖趋势</h3>
          <TrendChart data={stats?.hourlyStats} />
        </div>
        <div className="chart-card">
          <h3>☁️ 高频词云</h3>
          <WordCloudChart data={stats?.topKeywords} />
        </div>
      </div>

      <div className="bottom-section">
        <div className="chart-card">
          <h3>🕸️ 关联标签网络图</h3>
          <TagNetworkChart data={stats?.tagNetwork} />
        </div>
        <div className="chart-card">
          <h3>🏷️ 热门关联标签</h3>
          <div className="related-tags-list" style={{ maxHeight: 350, overflowY: 'auto' }}>
            {stats?.relatedTags?.slice(0, 15).map((item, index) => (
              <div key={item.tag} className="related-tag-item">
                <span className="tag-name">{item.tag}</span>
                <div className="bar-container">
                  <div
                    className="bar"
                    style={{ width: `${(item.count / maxTagCount) * 100}%` }}
                  />
                </div>
                <span className="count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="chart-card" style={{ marginTop: 16 }}>
        <h3>📝 实时帖子流</h3>
        <div className="recent-posts">
          {recentPosts.map((post) => (
            <div key={post.postId} className="post-item">
              <div className="post-header">
                <span className="author">{post.author}</span>
                <span className="platform">{post.platform}</span>
                <span className="time">{formatTime(post.timestamp)}</span>
              </div>
              <div className="content">{post.content}</div>
              <div className="tags">
                {post.tags?.map((tag, i) => (
                  <span key={i} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
