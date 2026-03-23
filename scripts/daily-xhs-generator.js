/**
 * 每日定时任务：自动生成并发布小红书笔记
 * 时间：每天早上10点
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 配置参数
const PROJECT_DIR = __dirname;
const BAOYU_SKILLS_DIR = path.join(__dirname, '..', 'baoyu-skills');
const OUTPUT_BASE_DIR = path.join(__dirname, '..', 'daily_output', 'xhs-images');
const DASHSCOPE_API_KEY = 'sk-d4f06f46bf244ac182676103948d5a2a';
const IMAGE_SIZE = '1536x1536';
const IMAGE_QUALITY = '2k';

// 职位类型配置
const CATEGORIES = [
  { key: 'soe', name: '国央企', title: '今日新增国央企校招职位' },
  { key: 'internet', name: '互联网', title: '今日新增互联网校招职位' },
  { key: 'foreign', name: '外企', title: '今日新增外企校招职位' }
];

/**
 * 检查并创建目录
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * 生成当天的日期字符串
 */
function getDateStr() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * 从数据库获取职位数据
 */
async function fetchJobData(category, limit = 10) {
  console.log(`🔍 查询${category}职位...`);

  const jobs = await prisma.job.findMany({
    where: {
      category: category,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      company: true,
      position: true,
      recruit_type: true
    }
  });

  console.log(`✅ 找到 ${jobs.length} 条${category}职位`);
  return jobs;
}

/**
 * 生成职位信息的 Markdown 文件
 */
function generateJobMarkdown(jobs, categoryInfo, outputDir) {
  let content = `# ${categoryInfo.title}\n\n`;

  jobs.forEach((job, index) => {
    content += `## ${job.company}\n\n`;
    content += `- **职位**: ${job.position}\n`;
    content += `- **类型**: ${job.recruit_type || '校招'}\n\n`;
  });

  const markdownPath = path.join(outputDir, 'source.md');
  fs.writeFileSync(markdownPath, content, 'utf8');

  return content;
}

/**
 * 生成分析文件
 */
function generateAnalysisFile(jobs, categoryInfo, outputDir) {
  const content = `# 内容分析

## 主题
${categoryInfo.title}

## 内容类型
干货 · 求职资讯

## 内容要点
- ${jobs.length}家${categoryInfo.name}校招职位
- 职位类型多样
- 全部为校招岗位

## 目标受众
- 应届毕业生
- 正在找工作的求职者
- 关注校招信息的学生

## 推荐方案
- 策略：B（信息密集型）
- 风格：notion（极简线条设计）
- 布局：list（列表形式）
- 图片：4张（封面 + 2张内容 + 结尾）
`;

  fs.writeFileSync(path.join(outputDir, 'analysis.md'), content, 'utf8');
}

/**
 * 生成大纲文件
 */
function generateOutlineFile(jobs, categoryInfo, outputDir) {
  const content = `---
strategy: b
name: Information-Dense
style: notion
style_reason: "Notion style with minimalist design is perfect for professional job information"
elements:
  background: solid-white
  decorations: [lines, subtle-shadows]
  emphasis: bold
  typography: simple
layout: list
image_count: 4
---

## P1 Cover
**Type**: cover
**Hook**: "${categoryInfo.title}"
**Visual**: Notion style minimalist cover with company logos
**Layout**: sparse

## P2 Content
**Type**: content
**Message**: "前5个职位"
**Visual**: Clean list format
**Layout**: list

## P3 Content
**Type**: content
**Message**: "后5个职位"
**Visual**: Clean list format
**Layout**: list

## P4 Ending
**Type**: call-to-action
**Message**: "抓紧校招机会！"
**Visual**: Simple CTA with Notion style
**Layout**: sparse
`;

  fs.writeFileSync(path.join(outputDir, 'outline.md'), content, 'utf8');
}

/**
 * 生成单张图片的提示文件
 */
function generatePromptFile(type, jobs, categoryInfo, outputDir, imageNum) {
  let prompt = '';

  if (type === 'cover') {
    prompt = `Create a Notion style minimalist cover for Xiaohongshu.

Theme: "${categoryInfo.title}"
Style: Notion style - minimal white background, simple lines, clean design
Colors: Light colors, soft gray accents
Elements:
- Main title: "${categoryInfo.title}" in clean, modern font
- Subtitle: "${jobs.length}家${categoryInfo.name}校招职位" in smaller font
- Layout: Centered, sparse design
- Mood: Professional, clean, inviting

This should be a 1:1 square image (1536x1536), 2K quality.
`;
  } else if (type === 'content') {
    const startIndex = imageNum === 2 ? 0 : 5;
    const endIndex = imageNum === 2 ? Math.min(5, jobs.length) : Math.min(10, jobs.length);
    const jobsSubset = jobs.slice(startIndex, endIndex);

    let jobList = '';
    jobsSubset.forEach((job, idx) => {
      const num = startIndex + idx + 1;
      jobList += `  ${num}. ${job.company} - ${job.position}\n`;
    });

    prompt = `Create a Notion style list page for Xiaohongshu showing ${categoryInfo.name} company jobs.

Theme: ${categoryInfo.name} Positions (Part ${imageNum - 1})
Style: Notion style - clean white background, simple lines, minimalist
Colors: Light colors, soft accents
Elements:
- Header: "${categoryInfo.name}校招职位"
- Numbered list format:
${jobList}
- Layout: Vertical list, clean spacing
- Typography: Simple, readable font

This should be a 1:1 square image (1536x1536), 2K quality.
`;
  } else if (type === 'ending') {
    prompt = `Create a Notion style ending page for Xiaohongshu job information.

Theme: Call to Action
Style: Notion style - clean white background, simple lines, minimalist
Colors: Light colors, with a touch of blue for emphasis
Elements:
- Main message: "抓住${categoryInfo.name}校招机会！"
- Subtext: "${jobs.length}家${categoryInfo.name}公司等你来"
- Layout: Centered, sparse design
- Mood: Encouraging, professional

This should be a 1:1 square image (1536x1536), 2K quality.
`;
  }

  const promptPath = path.join(outputDir, 'prompts', `${String(imageNum).padStart(2, '0')}-${type}.md`);
  fs.writeFileSync(promptPath, prompt, 'utf8');

  return promptPath;
}

/**
 * 调用 baoyu-image-gen 生成单张图片
 */
async function generateSingleImage(promptFile, outputFile, refFile = null) {
  return new Promise((resolve, reject) => {
    console.log(`🎨 生成图片: ${path.basename(outputFile)}`);

    let command = `cd "${BAOYU_SKILLS_DIR}" && node --import tsx skills/baoyu-image-gen/scripts/main.ts`;
    command += ` --promptfiles "${promptFile}"`;
    command += ` --image "${outputFile}"`;
    command += ` --provider dashscope`;
    command += ` --model qwen-image-2.0-pro`;
    command += ` --size ${IMAGE_SIZE}`;
    command += ` --quality ${IMAGE_QUALITY}`;

    if (refFile) {
      command += ` --ref "${refFile}"`;
    }

    try {
      const result = execSync(command, {
        encoding: 'utf8',
        env: { ...process.env, DASHSCOPE_API_KEY }
      });

      console.log(`✅ ${path.basename(outputFile)} 生成成功`);
      resolve(outputFile);
    } catch (error) {
      console.error(`❌ ${path.basename(outputFile)} 生成失败:`, error.message);
      reject(error);
    }
  });
}

/**
 * 为单个职位类别生成完整的图片集
 */
async function generateImageSet(categoryInfo, jobs) {
  const slug = `${categoryInfo.key}-${getDateStr()}`;
  const outputDir = ensureDir(path.join(OUTPUT_BASE_DIR, slug));
  const promptsDir = ensureDir(path.join(outputDir, 'prompts'));

  console.log(`\n📦 开始处理: ${categoryInfo.name}职位`);
  console.log(`   输出目录: ${outputDir}`);

  // 生成源文件和分析文件
  const markdownContent = generateJobMarkdown(jobs, categoryInfo, outputDir);
  generateAnalysisFile(jobs, categoryInfo, outputDir);
  generateOutlineFile(jobs, categoryInfo, outputDir);

  // 生成提示文件
  const coverPrompt = generatePromptFile('cover', jobs, categoryInfo, outputDir, 1);
  const content1Prompt = generatePromptFile('content', jobs, categoryInfo, outputDir, 2);
  const content2Prompt = generatePromptFile('content', jobs, categoryInfo, outputDir, 3);
  const endingPrompt = generatePromptFile('ending', jobs, categoryInfo, outputDir, 4);

  // 生成图片（封面不使用ref，其他使用封面作为ref保持一致）
  const coverPath = path.join(outputDir, '01-cover.png');
  const content1Path = path.join(outputDir, '02-content.png');
  const content2Path = path.join(outputDir, '03-content.png');
  const endingPath = path.join(outputDir, '04-ending.png');

  try {
    // 顺序生成图片，避免API速率限制
    await generateSingleImage(coverPrompt, coverPath);

    // 等待一段时间避免API限制
    await new Promise(resolve => setTimeout(resolve, 60000));

    await generateSingleImage(content1Prompt, content1Path, coverPath);

    await new Promise(resolve => setTimeout(resolve, 60000));

    await generateSingleImage(content2Prompt, content2Path, coverPath);

    await new Promise(resolve => setTimeout(resolve, 60000));

    await generateSingleImage(endingPrompt, endingPath, coverPath);

    console.log(`✅ ${categoryInfo.name}图片集生成完成！`);

    return {
      category: categoryInfo,
      dir: outputDir,
      images: [coverPath, content1Path, content2Path, endingPath],
      markdown: markdownContent
    };
  } catch (error) {
    console.error(`❌ ${categoryInfo.name}图片集生成失败:`, error);
    throw error;
  }
}

/**
 * 生成小红书笔记文字内容
 */
function generateNoteText(categoryInfo, jobs) {
  let text = `${categoryInfo.title}\n\n`;
  text += `整理了${jobs.length}家${categoryInfo.name}校招职位，快来看有没有适合你的！\n\n`;

  jobs.forEach((job, index) => {
    text += `${index + 1}. ${job.company}\n`;
    text += `   职位：${job.position}\n`;
    text += `   类型：${job.recruit_type || '校招'}\n\n`;
  });

  text += `抓紧时间投递，春招不等人！\n`;
  text += `#校招 #求职 #${categoryInfo.name} #春招`;

  return text;
}

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(70));
  console.log('        🚀 每日小红书笔记生成任务开始');
  console.log('='.repeat(70));
  console.log(`📅 运行时间: ${new Date().toLocaleString('zh-CN')}`);

  const results = [];

  try {
    for (const categoryInfo of CATEGORIES) {
      try {
        const jobs = await fetchJobData(categoryInfo.key, 10);

        if (jobs.length > 0) {
          const result = await generateImageSet(categoryInfo, jobs);
          result.noteText = generateNoteText(categoryInfo, jobs);
          results.push(result);

          // 保存笔记文字
          fs.writeFileSync(
            path.join(result.dir, 'note-text.txt'),
            result.noteText,
            'utf8'
          );
        } else {
          console.log(`⚠️ ${categoryInfo.name}没有找到新职位，跳过`);
        }
      } catch (error) {
        console.error(`❌ 处理${categoryInfo.name}失败:`, error);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('        📊 任务完成总结');
    console.log('='.repeat(70));
    console.log(`成功生成 ${results.length} 个职位类别的内容`);

    results.forEach(result => {
      console.log(`- ${result.category.name}: ${result.images.length}张图片`);
      console.log(`  目录: ${result.dir}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('        ⚠️  关于发布到小红书');
    console.log('='.repeat(70));
    console.log('1. 生成的内容已保存在上述目录中');
    console.log('2. 文字内容保存在 note-text.txt');
    console.log('3. 图片已准备好，可手动上传到小红书');
    console.log('4. 如需自动发布，需要配置小红书API或使用浏览器自动化');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('任务运行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 导出供其他模块使用
module.exports = { main, generateImageSet, generateNoteText };

// 如果直接运行此文件
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 任务失败:', error);
    process.exit(1);
  });
}

