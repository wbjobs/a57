const crypto = require('crypto');
const config = require('./config');

const authors = [
  '科技达人小王', 'AI探索者', '数据科学家老李', '产品经理小美',
  '程序员小张', '创业者阿杰', '投资人老王', '技术博主小林',
  'TechGuru', 'AI_enthusiast', 'DataGeek', 'ProductMaster',
  'CodeNinja', 'StartupFounder', 'VentureCapital', 'TechReviewer',
  '机器学习爱好者', '深度学习实践者', 'NLP研究员', '计算机视觉专家',
  '机器人工程师', '自动驾驶爱好者', '量化分析师', '云计算专家',
];

const topicConfigs = {
  '#AI技术': {
    templates: [
      '今天尝试了一下{topic}，真的太神奇了！{tag}',
      '{topic}正在改变我们的生活方式，未来已来！{tag}',
      '关于{topic}的几点思考，欢迎大家讨论 {tag}',
      '刚刚发布了关于{topic}的最新研究成果 {tag}',
      '{topic}行业周报：本周大事记 {tag}',
      '入门{topic}看这篇就够了 {tag}',
      '深度解析：{topic}的核心技术原理 {tag}',
      '用{topic}做了一个小项目，效果出乎意料 {tag}',
      '{topic}面试常考题汇总，收藏备用 {tag}',
      '我为什么看好{topic}的发展前景 {tag}',
      'Just discovered {topic} and it\'s amazing! {tag}',
      '{topic} is revolutionizing the industry {tag}',
    ],
    tags: [
      '#人工智能', '#机器学习', '#深度学习', '#自然语言处理', '#计算机视觉',
      '#大语言模型', '#GPT', '#ChatGPT', '#AIGC', '#文生图',
      '#Python', '#技术分享', '#科技前沿', '#创新',
      '#MachineLearning', '#DeepLearning', '#NLP', '#ComputerVision',
      '#LLM', '#GenerativeAI', '#DataScience',
    ],
  },
  '#新能源汽车': {
    templates: [
      '{topic}又出新款了，颜值太高了吧 {tag}',
      '今天试驾了{topic}，加速真的爽 {tag}',
      '{topic}续航实测分享，结果出乎意料 {tag}',
      '为什么越来越多人选择{topic}？ {tag}',
      '{topic}充电体验大比拼 {tag}',
      '深度分析：{topic}到底值不值得买 {tag}',
      '{topic}技术突破，续航突破1000公里 {tag}',
      '分享我的{topic}用车体验 {tag}',
      '{topic}市场格局生变，谁能笑到最后 {tag}',
      '入手{topic}一个月，谈谈真实感受 {tag}',
      'EVs are the future and {topic} is leading {tag}',
      'Test drove {topic} today, it was incredible {tag}',
    ],
    tags: [
      '#电动车', '#特斯拉', '#比亚迪', '#蔚来', '#小鹏',
      '#理想汽车', '#自动驾驶', '#智能汽车', '#充电网', '#续航焦虑',
      '#新能源', '#碳中和', '#出行方式', '#科技改变生活',
      '#Tesla', '#BYD', '#NIO', '#XPeng',
      '#ElectricVehicle', '#EV', '#SustainableTransport',
    ],
  },
  '#元宇宙': {
    templates: [
      '{topic}概念又火了，这次是真风口吗 {tag}',
      '第一次体验{topic}，感觉打开了新世界 {tag}',
      '{topic}到底是什么？一文讲清楚 {tag}',
      '普通人怎么抓住{topic}的机会 {tag}',
      '{topic}游戏真的太沉浸了 {tag}',
      '深度解析{topic}的底层技术 {tag}',
      '{topic}+教育，未来的学习方式 {tag}',
      '我在{topic}里开了个店，结果... {tag}',
      '{topic}是未来还是泡沫？聊聊我的看法 {tag}',
      '盘点{topic}的几大应用场景 {tag}',
      'The metaverse is coming and {topic} is at the forefront {tag}',
      'Exploring {topic} and its possibilities {tag}',
    ],
    tags: [
      '#VR', '#AR', '#虚拟现实', '#增强现实', '#数字孪生',
      '#虚拟世界', '#区块链', '#NFT', '#Web3', '#去中心化',
      '#游戏', '#社交', '#数字资产', '#未来科技',
      '#VirtualReality', '#AugmentedReality', '#Web3', '#Metaverse',
      '#NFTs', '#Blockchain', '#DigitalTwins',
    ],
  },
};

const platforms = ['weibo', 'twitter', 'zhihu', 'linkedin'];

let postIdCounter = 0;

function generatePost(topic) {
  postIdCounter++;
  const topicConfig = topicConfigs[topic] || topicConfigs[Object.keys(topicConfigs)[0]];
  const author = authors[Math.floor(Math.random() * authors.length)];
  const template = topicConfig.templates[Math.floor(Math.random() * topicConfig.templates.length)];
  const platform = platforms[Math.floor(Math.random() * platforms.length)];

  const numTags = Math.floor(Math.random() * 3) + 1;
  const shuffledTags = [...topicConfig.tags].sort(() => 0.5 - Math.random());
  const selectedTags = shuffledTags.slice(0, numTags);
  const allTags = [topic, ...selectedTags];

  const tagStr = selectedTags.join(' ');
  let content = template.replace(/{topic}/g, topic).replace('{tag}', tagStr);

  if (Math.random() > 0.5) {
    const extraTexts = [
      ' #热门话题',
      ' #今日分享',
      ' #涨知识',
      ' #干货分享',
      ' #技术控',
    ];
    content += extraTexts[Math.floor(Math.random() * extraTexts.length)];
  }

  const postId = crypto.randomUUID();

  return {
    postId,
    timestamp: new Date().toISOString(),
    author,
    content,
    tags: allTags,
    platform,
    topic,
  };
}

class MockDataStream {
  constructor() {
    this.listeners = [];
    this.isRunning = false;
    this.intervalId = null;
    this.postsPerSecond = config.simulation.postsPerSecond;
    this.activeTopics = [config.topic];
    this.topicWeights = {};
    this.topicWeights[config.topic] = 1.0;
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[MockDataStream] 数据流已启动，每秒生成', this.postsPerSecond, '条帖子');
    console.log('[MockDataStream] 活跃话题:', this.activeTopics.join(', '));
    this._tick();
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    console.log('[MockDataStream] 数据流已停止');
  }

  _tick() {
    if (!this.isRunning) return;

    const burst = config.simulation.enableRandomBurst && Math.random() > 0.9;
    const count = burst ? Math.round(this.postsPerSecond * 3) : this.postsPerSecond;

    const posts = [];
    const topics = this._getWeightedTopics();
    for (let i = 0; i < count; i++) {
      const topic = topics[i % topics.length];
      posts.push(generatePost(topic));
    }

    this.listeners.forEach(listener => {
      try {
        if (typeof listener === 'function') {
          posts.forEach(post => listener(post));
        } else if (listener.onPostsBatch) {
          listener.onPostsBatch(posts);
        } else if (listener.onPost) {
          posts.forEach(post => listener.onPost(post));
        }
      } catch (error) {
        console.error('[MockDataStream] 监听器处理失败:', error.message);
      }
    });

    const delay = 1000;
    this.intervalId = setTimeout(() => this._tick(), delay);
  }

  _getWeightedTopics() {
    const topics = [];
    for (const topic of this.activeTopics) {
      const weight = this.topicWeights[topic] || 1.0;
      const count = Math.max(1, Math.round(weight * 10));
      for (let i = 0; i < count; i++) {
        topics.push(topic);
      }
    }
    return topics;
  }

  setPostsPerSecond(rate) {
    this.postsPerSecond = rate;
    console.log('[MockDataStream] 发帖速率已调整为:', rate, '帖/秒');
  }

  setActiveTopics(topics) {
    this.activeTopics = topics;
    topics.forEach(t => {
      if (!(t in this.topicWeights)) {
        this.topicWeights[t] = 1.0;
      }
    });
    console.log('[MockDataStream] 活跃话题已更新:', topics.join(', '));
  }

  setTopicWeight(topic, weight) {
    this.topicWeights[topic] = weight;
    console.log('[MockDataStream] 话题权重已更新:', topic, '=>', weight);
  }

  generateBurst(count = 50, topic = null) {
    const targetTopic = topic || config.topic;
    console.log('[MockDataStream] 生成突发流量:', count, '条，话题:', targetTopic);
    const posts = [];
    for (let i = 0; i < count; i++) {
      posts.push(generatePost(targetTopic));
    }
    this.listeners.forEach(listener => {
      try {
        if (typeof listener === 'function') {
          posts.forEach(post => listener(post));
        } else if (listener.onPostsBatch) {
          listener.onPostsBatch(posts);
        } else if (listener.onPost) {
          posts.forEach(post => listener.onPost(post));
        }
      } catch (error) {
        console.error('[MockDataStream] 监听器处理失败:', error.message);
      }
    });
    return posts.length;
  }

  getAvailableTopics() {
    return Object.keys(topicConfigs);
  }
}

const mockDataStream = new MockDataStream();

module.exports = {
  mockDataStream,
  generatePost,
  getAvailableTopics: () => Object.keys(topicConfigs),
};
