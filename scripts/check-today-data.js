
/**
 * 检查今天是否有职位数据
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('检查数据库职位数据');
  console.log('========================================\n');

  // 检查今天的职位数据（2026-03-21）
  const today = new Date('2026-03-21');
  const tomorrow = new Date('2026-03-22');

  console.log('检查日期范围:', today.toISOString(), '到', tomorrow.toISOString());
  console.log('');

  const todayJobs = await prisma.job.findMany({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow
      }
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      company: true,
      roles: true,
      industry: true,
      recruitType: true,
      createdAt: true
    }
  });

  console.log(`今天（2026-03-21）共有 ${todayJobs.length} 条职位数据\n`);

  if (todayJobs.length > 0) {
    console.log('最新10条数据：');
    const recent = todayJobs.slice(0, 10);
    recent.forEach((job, index) => {
      console.log(`${index + 1}. [${job.industry}] ${job.company} - ${job.roles}`);
      console.log(`   类型: ${job.recruitType}`);
      console.log(`   时间: ${job.createdAt.toLocaleString()}`);
    });

    // 按行业统计
    const stats = {};
    todayJobs.forEach(job => {
      stats[job.industry] = (stats[job.industry] || 0) + 1;
    });

    console.log('\n按行业统计：');
    Object.entries(stats).sort((a, b) => b[1] - a[1]).forEach(([industry, count]) => {
      console.log(`- ${industry}: ${count}`);
    });
  } else {
    console.log('⚠️  今天没有新职位数据！');
  }

  console.log('\n========================================');
}

main().catch(error => {
  console.error('检查失败:', error);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});

