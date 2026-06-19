import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import StatCard from './components/StatCard.jsx';
import TrendChart from './components/TrendChart.jsx';
import WordCloudChart from './components/WordCloudChart.jsx';
import TagNetworkChart from './components/TagNetworkChart.jsx';
import PredictionCard from './components/PredictionCard.jsx';

function App() {
  const [stats, setStats] = useState(null);
  const [compareStats, setCompareStats] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('#AI技术');
  const [compareTopic, setCompareTopic] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [wordCloudTopN, setWordCloudTopN] = useState(50);
  const [wordCloudShape, setWordCloudShape] = useState('circle');
  const [tagNetworkTopN, setTagNetworkTopN] = useState(30);
  const [tagListTopN, setTagListTopN] = useState(15);

  useEffect(() => {
    fetch('/api/topics')
      .then(res => res.json())
      .then(data => {
        setAvailableTopics(data.available || []);
        if (data.available?.length > 0 && !selectedTopic) {
          setSelectedTopic(data.available[0]);
        }
      })
      .catch(err => console.error('获取话题列表失败:', err));
  }, []);

  useEffect(() => {
    if (!selectedTopic) return;

    fetch(`/api/stats/realtime?topic=${encodeURIComponent(selectedTopic)}`)
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
      if (data.topic === selectedTopic) {
        setStats(data);
      }
    });

    socket.on('newPost', (post) => {
      if (post.topic === selectedTopic) {
        setRecentPosts(prev => {
          const updated = [post, ...prev];
          return updated.slice(0, 20);
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedTopic]);

  useEffect(() => {
    if (!compareMode || !compareTopic) {
      setCompareStats(null);
      return;
    }

    fetch(`/api/stats/realtime?topic=${encodeURIComponent(compareTopic)}`)
      .then(res => res.json())
      .then(data => {
        setCompareStats(data);
      })
      .catch(err => console.error('获取对比数据失败:', err));

    const interval = setInterval(() => {
      fetch(`/api/stats/realtime?topic=${encodeURIComponent(compareTopic)}`)
        .then(res => res.json())
        .then(data => {
          setCompareStats(data);
        })
        .catch(err => console.error('刷新对比数据失败:', err));
    }, 2000);

    return () => clearInterval(interval);
  }, [compareMode, compareTopic]);

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const maxTagCount = stats?.relatedTags?.[0]?.count || 1;
  const compareMaxTagCount = compareStats?.relatedTags?.[0]?.count || 1;

  const getTagNetworkData = (data, topN) => {
    if (!data?.tagNetwork) return null;
    return {
      nodes: data.tagNetwork.nodes.slice(0, topN + 1),
      links: data.tagNetwork.links.filter(
        link => link.source === data.topic ||
          (data.tagNetwork.nodes.findIndex(n => n.id === link.source) < topN + 1 &&
           data.tagNetwork.nodes.findIndex(n => n.id === link.target) < topN + 1)
      ),
    };
  };

  const tagNetworkData = getTagNetworkData(stats, tagNetworkTopN);
  const compareTagNetworkData = getTagNetworkData(compareStats, tagNetworkTopN);

  const handleTopicChange = (e) => {
    const topic = e.target.value;
    setSelectedTopic(topic);
    if (topic === compareTopic) {
      setCompareTopic('');
    }
  };

  const handleCompareTopicChange = (e) => {
    const topic = e.target.value;
    if (topic === selectedTopic) {
      alert('对比话题不能与当前话题相同');
      return;
    }
    setCompareTopic(topic);
  };

  const toggleCompareMode = () => {
    if (!compareMode) {
      const secondTopic = availableTopics.find(t => t !== selectedTopic);
      if (secondTopic) {
        setCompareTopic(secondTopic);
      }
      setCompareMode(true);
    } else {
      setCompareMode(false);
      setCompareTopic('');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>社交媒体话题追踪看板</h1>
        <p className="subtitle">实时追踪话题在社交媒体上的演变过程</p>

        <div className="header-controls">
          <div className="topic-selector">
            <label className="control-label">
              追踪话题:
              <select
                value={selectedTopic}
                onChange={handleTopicChange}
                className="control-select"
              >
                {availableTopics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </label>
          </div>

          <button className="compare-toggle" onClick={toggleCompareMode}>
            {compareMode ? '关闭对比' : '开启对比'}
          </button>

          {compareMode && (
            <div className="topic-selector">
              <label className="control-label">
                对比话题:
                <select
                  value={compareTopic}
                  onChange={handleCompareTopicChange}
                  className="control-select"
                >
                  <option value="">请选择</option>
                  {availableTopics.filter(t => t !== selectedTopic).map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="topic-tag">
          <span className="live-indicator">
            <span className="live-dot"></span>
            {isConnected ? '实时更新中' : '连接中...'}
          </span>
          {'  '}
          {stats?.topic || selectedTopic}
        </div>

        {stats?.performance && (
          <div className="perf-info">
            <span className="perf-item">队列: {stats.performance.queueSize}</span>
            <span className="perf-item">已处理: {stats.performance.processed?.toLocaleString()}</span>
          </div>
        )}
      </header>

      {compareMode ? (
        <div className="compare-layout">
          <div className="compare-column">
            <div className="stats-grid single-column">
              <StatCard
                label="总帖子数"
                value={stats?.totalCount || 0}
              />
              <StatCard
                label="本小时发帖"
                value={stats?.currentHourCount || 0}
                change={stats?.growthRate ? parseFloat(stats.growthRate) : 0}
              />
            </div>
          </div>
          <div className="compare-column">
            <div className="stats-grid single-column">
              <StatCard
                label="总帖子数"
                value={compareStats?.totalCount || 0}
                color="secondary"
              />
              <StatCard
                label="本小时发帖"
                value={compareStats?.currentHourCount || 0}
                change={compareStats?.growthRate ? parseFloat(compareStats.growthRate) : 0}
                color="secondary"
              />
            </div>
          </div>
        </div>
      ) : (
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
      )}

      <div className="chart-card">
        <div className="chart-header">
          <h3>📈 {compareMode ? '话题趋势对比' : '24小时发帖趋势'}</h3>
        </div>
        <TrendChart
          data={stats?.hourlyStats}
          predictedData={stats?.prediction?.predicted}
          compareData={compareMode ? compareStats?.hourlyStats : null}
          comparePredicted={compareMode ? compareStats?.prediction?.predicted : null}
          topicNames={[selectedTopic, compareTopic]}
        />
      </div>

      {!compareMode && stats?.prediction && (
        <div className="prediction-section">
          <PredictionCard prediction={stats.prediction} />
        </div>
      )}

      {compareMode && (
        <div className="compare-predictions">
          <div className="compare-column">
            {stats?.prediction && <PredictionCard prediction={stats.prediction} />}
          </div>
          <div className="compare-column">
            {compareStats?.prediction && <PredictionCard prediction={compareStats.prediction} />}
          </div>
        </div>
      )}

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3>☁️ {compareMode ? '词云对比' : '高频词云'}</h3>
            <div className="chart-controls">
              <label className="control-label">
                Top N:
                <select
                  value={wordCloudTopN}
                  onChange={e => setWordCloudTopN(Number(e.target.value))}
                  className="control-select"
                >
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={80}>80</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <label className="control-label">
                形状:
                <select
                  value={wordCloudShape}
                  onChange={e => setWordCloudShape(e.target.value)}
                  className="control-select"
                >
                  <option value="circle">圆形</option>
                  <option value="cardioid">心形</option>
                  <option value="diamond">菱形</option>
                  <option value="triangle">三角形</option>
                  <option value="pentagon">五边形</option>
                  <option value="star">星形</option>
                </select>
              </label>
            </div>
          </div>
          {compareMode ? (
            <div className="compare-wordclouds">
              <div className="compare-wordcloud">
                <div className="wordcloud-topic-label topic-1">{selectedTopic}</div>
                <WordCloudChart
                  data={stats?.topKeywords}
                  topN={wordCloudTopN}
                  shape={wordCloudShape}
                  colorScheme={0}
                />
              </div>
              <div className="compare-wordcloud">
                <div className="wordcloud-topic-label topic-2">{compareTopic}</div>
                <WordCloudChart
                  data={compareStats?.topKeywords}
                  topN={wordCloudTopN}
                  shape={wordCloudShape}
                  colorScheme={1}
                />
              </div>
            </div>
          ) : (
            <WordCloudChart
              data={stats?.topKeywords}
              topN={wordCloudTopN}
              shape={wordCloudShape}
            />
          )}
        </div>
      </div>

      <div className="bottom-section">
        {compareMode ? (
          <>
            <div className="chart-card">
              <div className="chart-header">
                <h3>🕸️ {selectedTopic} 标签网络</h3>
              </div>
              <TagNetworkChart data={tagNetworkData} colorScheme={0} />
            </div>
            <div className="chart-card">
              <div className="chart-header">
                <h3>🕸️ {compareTopic} 标签网络</h3>
              </div>
              <TagNetworkChart data={compareTagNetworkData} colorScheme={1} />
            </div>
          </>
        ) : (
          <>
            <div className="chart-card">
              <div className="chart-header">
                <h3>🕸️ 关联标签网络图</h3>
                <div className="chart-controls">
                  <label className="control-label">
                    显示数量:
                    <select
                      value={tagNetworkTopN}
                      onChange={e => setTagNetworkTopN(Number(e.target.value))}
                      className="control-select"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                </div>
              </div>
              <TagNetworkChart data={tagNetworkData} />
            </div>
            <div className="chart-card">
              <div className="chart-header">
                <h3>🏷️ 热门关联标签</h3>
                <div className="chart-controls">
                  <label className="control-label">
                    Top N:
                    <select
                      value={tagListTopN}
                      onChange={e => setTagListTopN(Number(e.target.value))}
                      className="control-select"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="related-tags-list" style={{ maxHeight: 350, overflowY: 'auto' }}>
                {stats?.relatedTags?.slice(0, tagListTopN).map((item, index) => (
                  <div key={item.tag} className="related-tag-item">
                    <span className="tag-rank">{index + 1}</span>
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
          </>
        )}
      </div>

      {!compareMode && (
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
      )}
    </div>
  );
}

export default App;
