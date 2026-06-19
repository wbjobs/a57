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

const contentTemplates = [
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
  '手把手教你用{topic}实现XXX功能 {tag}',
  '{topic}实战经验分享，避坑指南 {tag}',
  '2024年{topic}发展趋势预测 {tag}',
  '{topic}工具推荐，提升效率必备 {tag}',
  '从0到1学习{topic}，我的学习路线图 {tag}',
  'Just discovered {topic} and it\'s amazing! {tag}',
  '{topic} is revolutionizing the industry {tag}',
  'Sharing my thoughts on {topic} {tag}',
  'New breakthrough in {topic} research {tag}',
  '{topic} weekly roundup {tag}',
];

const relatedTagsPool = [
  '#人工智能', '#机器学习', '#深度学习', '#自然语言处理', '#计算机视觉',
  '#大语言模型', '#GPT', '#ChatGPT', '#AIGC', '#文生图',
  '#数据分析', '#大数据', '#云计算', '#物联网', '#区块链',
  '#元宇宙', '#VR', '#AR', '#机器人', '#自动驾驶',
  '#Python', '#编程', '#技术分享', '#科技前沿', '#创新',
  '#创业', '#投资', '#数字化转型', '#智能推荐', '#知识图谱',
  '#MachineLearning', '#DeepLearning', '#NLP', '#ComputerVision',
  '#LLM', '#GenerativeAI', '#DataScience', '#BigData',
  '#CloudComputing', '#IoT', '#Robotics', '#SelfDriving',
];

const platforms = ['weibo', 'twitter', 'zhihu', 'linkedin'];

let postIdCounter = 0;

function generatePost(topic) {
  postIdCounter++;
  const author = authors[Math.floor(Math.random() * authors.length)];
  const template = contentTemplates[Math.floor(Math.random() * contentTemplates.length)];
  const platform = platforms[Math.floor(Math.random() * platforms.length)];

  const numTags = Math.floor(Math.random() * 3) + 1;
  const shuffledTags = [...relatedTagsPool].sort(() => 0.5 - Math.random());
  const selectedTags = shuffledTags.slice(0, numTags);
  const allTags = [topic, ...selectedTags];

  const tagStr = selectedTags.join(' ');
  let content = template.replace('{topic}', topic).replace('{tag}', tagStr);

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
    for (let i = 0; i < count; i++) {
      posts.push(generatePost(config.topic));
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

  setPostsPerSecond(rate) {
    this.postsPerSecond = rate;
    console.log('[MockDataStream] 发帖速率已调整为:', rate, '帖/秒');
  }

  generateBurst(count = 50) {
    console.log('[MockDataStream] 生成突发流量:', count, '条');
    const posts = [];
    for (let i = 0; i < count; i++) {
      posts.push(generatePost(config.topic));
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
}

const mockDataStream = new MockDataStream();

module.exports = {
  mockDataStream,
  generatePost,
};
