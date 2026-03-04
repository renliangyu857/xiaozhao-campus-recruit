const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const PROXY_TOKEN = process.env.PROXY_TOKEN || '';
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || '';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || '';

// Token 验证中间件
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${PROXY_TOKEN}`) {
    return res.status(403).json({ error: 'Invalid token' });
  }
  next();
}

// 生成带参数二维码
app.post('/wechat/qrcode', verifyToken, async (req, res) => {
  try {
    const { scene_str, expire_seconds = 600 } = req.body;

    // 获取 access_token
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.errcode) {
      return res.status(500).json({ error: tokenData.errmsg });
    }

    // 生成二维码
    const qrUrl = `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${tokenData.access_token}`;
    const qrRes = await fetch(qrUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expire_seconds,
        action_name: 'QR_STR_SCENE',
        action_info: { scene: { scene_str } }
      })
    });

    const qrData = await qrRes.json();

    if (qrData.errcode) {
      return res.status(500).json({ error: qrData.errmsg });
    }

    res.json({
      ticket: qrData.ticket,
      expire_seconds: qrData.expire_seconds,
      url: qrData.url
    });
  } catch (error) {
    console.error('[Proxy] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取 access_token
app.get('/wechat/token', verifyToken, async (req, res) => {
  try {
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.errcode) {
      return res.status(500).json({ error: tokenData.errmsg });
    }

    res.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in
    });
  } catch (error) {
    console.error('[Proxy] Error getting token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取用户信息
app.get('/wechat/userinfo', verifyToken, async (req, res) => {
  try {
    const { openid, access_token } = req.query;

    if (!openid) {
      return res.status(400).json({ error: 'Missing openid parameter' });
    }

    let token = access_token;

    // 如果没有提供 access_token，先获取一个
    if (!token) {
      const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (tokenData.errcode) {
        return res.status(500).json({ error: tokenData.errmsg });
      }
      token = tokenData.access_token;
    }

    // 获取用户信息
    const userUrl = `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${token}&openid=${openid}&lang=zh_CN`;
    const userRes = await fetch(userUrl);
    const userData = await userRes.json();

    if (userData.errcode) {
      return res.status(500).json({ error: userData.errmsg, errcode: userData.errcode });
    }

    res.json({
      openid: userData.openid,
      nickname: userData.nickname,
      sex: userData.sex,
      province: userData.province,
      city: userData.city,
      country: userData.country,
      headimgurl: userData.headimgurl,
      subscribe: userData.subscribe,
      subscribe_time: userData.subscribe_time
    });
  } catch (error) {
    console.error('[Proxy] Error getting user info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[WeChat Proxy] Server running on port ${PORT}`);
  console.log(`[WeChat Proxy] APP_ID: ${WECHAT_APP_ID ? 'Configured' : 'Not configured'}`);
});
