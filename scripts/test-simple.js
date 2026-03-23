
/**
 * 简单测试脚本 - 验证图片生成功能
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const PROJECT_DIR = path.join(__dirname, '..');
const BAOYU_SKILLS_DIR = path.join(PROJECT_DIR, 'baoyu-skills');
const TEST_DIR = path.join(PROJECT_DIR, 'daily_output', 'xhs-images', 'test-simple');
const DASHSCOPE_API_KEY = 'sk-d4f06f46bf244ac182676103948d5a2a';

// 确保目录存在
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'prompts'), { recursive: true });
}

console.log('==========================================================');
console.log('          小红书图片生成简单测试');
console.log('==========================================================');
console.log('测试目录:', TEST_DIR);
console.log('');

// 创建一个简单的提示文件
const testPrompt = `Create a simple Notion style cover for Xiaohongshu.

Theme: "今日新增互联网校招职位"
Style: Notion style - minimal white background, simple lines, clean design
Elements:
- Main title: "今日新增互联网校招职位"
- Subtitle: "10家互联网公司"
- Layout: Centered, sparse design

This should be a 1:1 square image (1536x1536), 2K quality.
`;

const promptFile = path.join(TEST_DIR, 'prompts', 'test-cover.md');
const outputFile = path.join(TEST_DIR, 'test-cover.png');

fs.writeFileSync(promptFile, testPrompt, 'utf8');
console.log('✅ 创建提示文件:', path.basename(promptFile));

console.log('');
console.log('🎨 开始生成图片...');
console.log('   这可能需要1-2分钟，请耐心等待...');
console.log('');

try {
  const command = `cd "${BAOYU_SKILLS_DIR}" && node --import tsx skills/baoyu-image-gen/scripts/main.ts --promptfiles "${promptFile}" --image "${outputFile}" --provider dashscope --model qwen-image-2.0-pro --size 1536x1536 --quality 2k`;

  const result = execSync(command, {
    encoding: 'utf8',
    env: { ...process.env, DASHSCOPE_API_KEY }
  });

  console.log(result);
  console.log('');
  console.log('==========================================================');
  console.log('          ✅ 测试成功！');
  console.log('==========================================================');
  console.log('图片已保存到:', outputFile);
  console.log('');
  console.log('现在你可以运行完整脚本了：');
  console.log('  npm run xhs:generate');
  console.log('  或');
  console.log('  npm run xhs:schedule');
  console.log('==========================================================');

} catch (error) {
  console.error('❌ 测试失败:', error.message);
  console.error('');
  console.error('错误详情:', error.stdout || error.stderr);
}

