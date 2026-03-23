/**
 * 定时任务调度器
 * 每天早上10点自动运行小红书笔记生成任务
 */

const cron = require('node-cron');
const path = require('path');

console.log('='.repeat(70));
console.log('        ⏰ 小红书定时任务调度器已启动');
console.log('='.repeat(70));
console.log(`当前时间: ${new Date().toLocaleString('zh-CN')}`);
console.log('定时任务: 每天 10:00 运行');
console.log('='.repeat(70));

// 导入生成任务
const { main } = require('./daily-xhs-generator.js');

/**
 * 运行任务的包装函数
 */
async function runTask() {
  const runTime = new Date().toLocaleString('zh-CN');
  console.log(`\n🚀 [${runTime}] 定时任务触发，开始执行...`);

  try {
    await main();
    console.log(`✅ [${new Date().toLocaleString('zh-CN')}] 任务执行完成`);
  } catch (error) {
    console.error(`❌ [${new Date().toLocaleString('zh-CN')}] 任务执行失败:`, error);
  }
}

// 设置定时任务：每天早上10点 (秒 分 时 日 月 星期)
// 语法: second minute hour day month dayOfWeek
const cronExpression = '0 0 10 * * *';

console.log(`\n📅 Cron 表达式: ${cronExpression}`);
console.log('等待定时任务触发...\n');

// 启动定时任务
const task = cron.schedule(cronExpression, async () => {
  await runTask();
}, {
  timezone: 'Asia/Shanghai', // 设置时区为中国
  scheduled: true
});

// 启动时立即运行一次测试（可选）
console.log('💡 如需立即测试，按 Ctrl+C 停止后运行: node scripts/daily-xhs-generator.js');
console.log('💡 或取消下面的注释以立即运行一次测试\n');

// 取消下面这行的注释以在启动时立即运行一次测试
// setTimeout(() => runTask(), 3000);

// 处理优雅退出
process.on('SIGINT', () => {
  console.log('\n\n👋 收到停止信号，正在关闭...');
  task.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 收到终止信号，正在关闭...');
  task.stop();
  process.exit(0);
});

