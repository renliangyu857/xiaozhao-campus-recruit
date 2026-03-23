import { NextRequest, NextResponse } from 'next/server';

/**
 * Sentry 告警转发到飞书接口
 * 用于接收 Sentry Webhook 事件并转发到飞书群机器人
 */

// TypeScript 类型定义
interface SentryUser {
  id?: string;
  email?: string;
  username?: string;
  ip_address?: string;
}

interface SentryProject {
  name: string;
}

interface SentryEvent {
  event_id?: string;
  level: string;
  title: string;
  project: SentryProject;
  tags?: Record<string, string>;
  culprit?: string;
  user?: SentryUser;
  timestamp: number;
  url?: string;
  event_type?: string;
}

interface FeishuCard {
  config: {
    wide_screen_mode: boolean;
  };
  elements: Record<string, unknown>[];
  header: {
    title: {
      tag: string;
      content: string;
    };
    template: string;
  };
}

// 飞书 Webhook URL（需要在 .env 中配置）
const FEISHU_WEBHOOK_URL = process.env.FEISHU_WEBHOOK_URL;

// 支持的 Sentry 事件类型
const SUPPORTED_EVENT_TYPES = ['error', 'event.alert'];

// 飞书卡片颜色配置（根据 Sentry 级别）
const LEVEL_COLORS: Record<string, string> = {
  fatal: 'red',
  error: 'red',
  warning: 'orange',
  info: 'blue',
  debug: 'gray',
};

// 将 Sentry 事件转换为飞书卡片
function convertToFeishuCard(event: SentryEvent): FeishuCard {
  const { level, title, project, tags, culprit, user, timestamp } = event;

  // 基本信息
  const levelColor = LEVEL_COLORS[level] || 'blue';
  const timeStr = new Date(timestamp * 1000).toLocaleString('zh-CN');

  // 标题卡片
  const header = {
    title: {
      tag: 'plain_text',
      content: `🚨 Sentry 告警 - ${level.toUpperCase()}`,
    },
    template: levelColor,
  };

  // 项目信息
  const projectSection = {
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `**项目**: ${project.name}`,
    },
  };

  // 事件标题
  const titleSection = {
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `**错误**: ${title}`,
    },
  };

  // 错误详情
  const detailsSection = {
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: culprit ? `**位置**: ${culprit}` : '',
    },
  };

  // 用户信息（如果有）
  let userSection;
  if (user) {
    const userInfo = [];
    if (user.id) userInfo.push(`ID: ${user.id}`);
    if (user.email) userInfo.push(`邮箱: ${user.email}`);
    if (user.ip_address) userInfo.push(`IP: ${user.ip_address}`);

    userSection = {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**用户**: ${userInfo.join(' | ')}`,
      },
    };
  }

  // 标签信息（如果有）
  let tagsSection;
  if (tags && Object.keys(tags).length > 0) {
    const tagContent = Object.entries(tags)
      .map(([key, value]) => `• **${key}**: ${value}`)
      .join('\n');

    tagsSection = {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**标签**:\n${tagContent}`,
      },
    };
  }

  // 时间信息
  const timeSection = {
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `**发生时间**: ${timeStr}`,
    },
  };

  // 操作按钮
  const actions = [
    {
      tag: 'button',
      text: {
        tag: 'plain_text',
        content: '🔍 查看详情',
      },
      url: event.url,
      type: 'primary',
    },
  ];

  // 卡片内容
  const card = {
    config: {
      wide_screen_mode: true,
    },
    elements: [
      projectSection,
      { tag: 'hr' },
      titleSection,
      { tag: 'hr' },
      detailsSection,
      ...(userSection ? [userSection] : []),
      { tag: 'hr' },
      timeSection,
      ...(tagsSection ? [tagsSection] : []),
      { tag: 'hr' },
      {
        tag: 'action',
        actions,
      },
    ],
    header,
  };

  return card;
}

// 发送到飞书
async function sendToFeishu(card: FeishuCard) {
  if (!FEISHU_WEBHOOK_URL) {
    console.warn('未配置飞书 Webhook URL');
    return false;
  }

  try {
    const response = await fetch(FEISHU_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msg_type: 'interactive',
        card,
      }),
    });

    if (!response.ok) {
      console.error('发送到飞书失败:', response.status, await response.text());
      return false;
    }

    console.log('Sentry 告警已成功发送到飞书');
    return true;
  } catch (error) {
    console.error('发送到飞书时发生错误:', error);
    return false;
  }
}

// 处理 Sentry Webhook 请求
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // 验证是有效的 Sentry 事件
    if (!payload.event_id) {
      console.warn('无效的 Sentry 事件');
      return NextResponse.json(
        { error: '无效的 Sentry 事件' },
        { status: 400 }
      );
    }

    // 检查是否是支持的事件类型
    const eventType = payload.event_type || 'error';
    if (!SUPPORTED_EVENT_TYPES.includes(eventType)) {
      console.warn(`不支持的事件类型: ${eventType}`);
      return NextResponse.json(
        { error: '不支持的事件类型' },
        { status: 400 }
      );
    }

    console.log('收到 Sentry 事件:', eventType, payload.title);

    // 转换为飞书卡片
    const card = convertToFeishuCard(payload);

    // 发送到飞书
    const success = await sendToFeishu(card);

    if (success) {
      return NextResponse.json({ success: true, message: '告警已转发到飞书' });
    } else {
      return NextResponse.json(
        { error: '转发到飞书失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('处理 Sentry Webhook 失败:', error);
    return NextResponse.json(
      { error: '处理请求失败' },
      { status: 500 }
    );
  }
}

// 测试接口（GET 请求）
export async function GET(request: NextRequest) {
  // 获取参数
  const searchParams = request.nextUrl.searchParams;
  const test = searchParams.get('test');
  const level = searchParams.get('level') || 'error';

  if (!test) {
    return NextResponse.json({
      message: 'Sentry 到飞书告警转发接口',
      documentation: '请配置 FEISHU_WEBHOOK_URL 并在 Sentry 中设置 Webhook',
    });
  }

  // 测试卡片
  const testCard = {
    config: {
      wide_screen_mode: true,
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: '**测试告警**',
        },
      },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: '这是一个 Sentry 到飞书的测试告警',
        },
      },
      { tag: 'hr' },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**级别**: ${level}`,
        },
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: {
              tag: 'plain_text',
              content: '访问 Sentry',
            },
            url: 'https://sentry.io',
            type: 'primary',
          },
        ],
      },
    ],
    header: {
      title: {
        tag: 'plain_text',
        content: '🚨 Sentry 测试告警',
      },
      template: LEVEL_COLORS[level] || 'blue',
    },
  };

  const success = await sendToFeishu(testCard as FeishuCard);

  if (success) {
    return NextResponse.json({
      success: true,
      message: `测试告警已发送到飞书（级别: ${level}）`,
    });
  } else {
    return NextResponse.json({
      error: '发送测试告警失败，请检查配置',
    });
  }
}
