const http = require('http');

function apiRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runBenchmark() {
  console.log('=== 性能压测开始 ===\n');

  const burstCount = 10000;
  console.log('1. 生成 ' + burstCount + ' 条突发帖子...');

  await apiRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/simulation/burst',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { count: burstCount });

  console.log('   突发流量已生成\n');
  console.log('2. 监控处理进度:');

  const results = [];
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const perf = await apiRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/performance',
      method: 'GET'
    });
    const p = perf.performance;
    results.push({
      time: (i + 1) * 0.5 + 's',
      queueSize: p.queueSize,
      processed: p.processed,
      total: p.aggregatorStats.totalPosts,
      dropped: p.queueDropped,
      peak: p.queuePeak
    });
    console.log(
      '   [' + ((i + 1) * 0.5).toFixed(1) + 's] ' +
      '队列: ' + String(p.queueSize).padStart(6) + ' | ' +
      '已处理: ' + String(p.processed).padStart(7) + ' | ' +
      '总帖: ' + String(p.aggregatorStats.totalPosts).padStart(7) + ' | ' +
      '丢弃: ' + p.queueDropped
    );
  }

  await new Promise(resolve => setTimeout(resolve, 2000));
  const finalPerf = await apiRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/performance',
    method: 'GET'
  });
  const p = finalPerf.performance;

  console.log('\n=== 压测结果 ===');
  console.log('输入帖子数: ' + burstCount.toLocaleString());
  console.log('成功处理: ' + p.processed.toLocaleString());
  console.log('丢弃数量: ' + p.queueDropped.toLocaleString());
  console.log('峰值队列大小: ' + p.queuePeak.toLocaleString());
  console.log('最终队列大小: ' + p.queueSize);
  console.log('处理状态: ' + (p.queueSize === 0 && p.queueDropped === 0 ? '✓ 全部处理完成，无积压无丢失' : '✗ 有积压或丢失'));
  console.log('\n聚合统计:');
  console.log('  总帖子数: ' + p.aggregatorStats.totalPosts.toLocaleString());
  console.log('  唯一关键词: ' + p.aggregatorStats.uniqueKeywords);
  console.log('  唯一标签: ' + p.aggregatorStats.uniqueTags);
  console.log('  小时桶数: ' + p.aggregatorStats.hourlyBuckets);
}

runBenchmark().catch(console.error);
