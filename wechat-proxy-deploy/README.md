# WeChat Proxy 部署指南

## 文件说明

- `wechat-proxy.js` - 代理服务主程序
- `package.json` - Node.js 依赖配置
- `install.sh` - 自动部署脚本
- `README.md` - 本文件

## 快速部署步骤

### 1. 上传文件到服务器

在本地终端执行：

```bash
# 创建目录
ssh root@36.151.146.109 "mkdir -p /root/wechat-proxy"

# 上传文件（在 wechat-proxy-deploy 目录中执行）
scp wechat-proxy.js package.json install.sh root@36.151.146.109:/root/wechat-proxy/
```

### 2. 配置环境变量

编辑服务器上的环境变量：

```bash
ssh root@36.151.146.109

# 编辑环境变量
export WECHAT_APP_ID="wx你的appid"
export WECHAT_APP_SECRET="你的appsecret"
export PROXY_TOKEN="自定义随机字符串（可选，脚本会自动生成）"
export PORT="3001"
```

### 3. 运行部署脚本

```bash
ssh root@36.151.146.109 "cd /root/wechat-proxy && bash install.sh"
```

### 4. 检查部署状态

```bash
# 查看服务状态
ssh root@36.151.146.109 "systemctl status wechat-proxy"

# 查看日志
ssh root@36.151.146.109 "journalctl -u wechat-proxy -f"

# 测试接口
curl http://36.151.146.109:3001/health
```

## 手动部署（如果脚本失败）

```bash
# 1. SSH 到服务器
ssh root@36.151.146.109

# 2. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. 进入目录
cd /opt/wechat-proxy

# 4. 安装依赖
npm install

# 5. 设置环境变量并启动
export PORT=3001
export PROXY_TOKEN="your-random-token"
export WECHAT_APP_ID="wx..."
export WECHAT_APP_SECRET="..."
node wechat-proxy.js
```

## 配置说明

### 微信公众号后台配置

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 开发 → 基本配置 → IP 白名单
3. 添加服务器 IP: `36.151.146.109`

### Vercel 环境变量配置

在 Vercel Dashboard → Settings → Environment Variables 中添加：

| 变量名 | 值 |
|--------|-----|
| `WECHAT_PROXY_URL` | `http://36.151.146.109:3001` |
| `WECHAT_PROXY_TOKEN` | 部署脚本生成的 Token |

## 故障排查

### 服务无法启动

```bash
# 查看详细日志
journalctl -u wechat-proxy -n 100

# 检查端口占用
netstat -tlnp | grep 3001

# 手动测试
 cd /opt/wechat-proxy
 node wechat-proxy.js
```

### 微信接口返回错误

1. 检查 IP 白名单是否已添加
2. 检查 APP_ID 和 APP_SECRET 是否正确
3. 查看代理服务日志确认请求是否到达

### 防火墙问题

```bash
# 开放端口
ufw allow 3001/tcp

# 或 iptables
iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
```

## 安全建议

1. **修改默认端口**: 将 `3001` 改为其他不常用端口
2. **使用 HTTPS**: 配置 Nginx 反向代理并启用 SSL
3. **限制访问 IP**: 配置防火墙只允许 Vercel 服务器访问

## 升级维护

```bash
# 重启服务
systemctl restart wechat-proxy

# 更新代码后重新部署
cd /opt/wechat-proxy
git pull  # 如果使用 git
npm install
systemctl restart wechat-proxy
```
