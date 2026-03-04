#!/bin/bash

# WeChat Proxy 部署脚本
# 服务器: 36.151.146.109

set -e

echo "========================================"
echo "  WeChat Proxy 部署脚本"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用 root 权限运行此脚本${NC}"
  echo "示例: sudo bash install.sh"
  exit 1
fi

# 配置变量（请修改这些值）
WECHAT_APP_ID="${WECHAT_APP_ID:-}"
WECHAT_APP_SECRET="${WECHAT_APP_SECRET:-}"
PROXY_TOKEN="${PROXY_TOKEN:-$(openssl rand -hex 16)}"
PORT="${PORT:-3001}"

echo -e "${YELLOW}步骤 1: 安装 Node.js...${NC}"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  echo -e "${GREEN}✓ Node.js 安装完成${NC}"
else
  echo -e "${GREEN}✓ Node.js 已安装: $(node --version)${NC}"
fi

echo ""
echo -e "${YELLOW}步骤 2: 创建应用目录...${NC}"
mkdir -p /opt/wechat-proxy
cd /opt/wechat-proxy
echo -e "${GREEN}✓ 目录创建完成: /opt/wechat-proxy${NC}"

echo ""
echo -e "${YELLOW}步骤 3: 复制文件...${NC}"
# 假设文件已通过 scp 上传到 /root/wechat-proxy/
if [ -f /root/wechat-proxy/wechat-proxy.js ]; then
  cp /root/wechat-proxy/* /opt/wechat-proxy/
  echo -e "${GREEN}✓ 文件复制完成${NC}"
else
  echo -e "${RED}✗ 未找到源文件，请确保已通过 scp 上传文件到 /root/wechat-proxy/${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}步骤 4: 安装依赖...${NC}"
npm install
echo -e "${GREEN}✓ 依赖安装完成${NC}"

echo ""
echo -e "${YELLOW}步骤 5: 创建环境变量文件...${NC}"
cat > /opt/wechat-proxy/.env << EOF
PORT=${PORT}
PROXY_TOKEN=${PROXY_TOKEN}
WECHAT_APP_ID=${WECHAT_APP_ID}
WECHAT_APP_SECRET=${WECHAT_APP_SECRET}
EOF
echo -e "${GREEN}✓ 环境变量文件创建完成${NC}"

echo ""
echo -e "${YELLOW}步骤 6: 创建 Systemd 服务...${NC}"
cat > /etc/systemd/system/wechat-proxy.service << EOF
[Unit]
Description=WeChat Proxy Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/wechat-proxy
EnvironmentFile=/opt/wechat-proxy/.env
ExecStart=/usr/bin/node /opt/wechat-proxy/wechat-proxy.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable wechat-proxy
echo -e "${GREEN}✓ Systemd 服务创建完成${NC}"

echo ""
echo -e "${YELLOW}步骤 7: 配置防火墙...${NC}"
if command -v ufw &> /dev/null; then
  ufw allow ${PORT}/tcp || true
  echo -e "${GREEN}✓ UFW 防火墙配置完成${NC}"
elif command -v firewall-cmd &> /dev/null; then
  firewall-cmd --permanent --add-port=${PORT}/tcp || true
  firewall-cmd --reload || true
  echo -e "${GREEN}✓ FirewallD 配置完成${NC}"
else
  echo -e "${YELLOW}! 未检测到防火墙，请手动开放端口 ${PORT}${NC}"
fi

echo ""
echo -e "${YELLOW}步骤 8: 启动服务...${NC}"
systemctl start wechat-proxy
sleep 2

# 检查服务状态
if systemctl is-active --quiet wechat-proxy; then
  echo -e "${GREEN}✓ 服务启动成功${NC}"
else
  echo -e "${RED}✗ 服务启动失败，请检查日志${NC}"
  echo "查看日志: journalctl -u wechat-proxy -n 50"
  exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}  部署完成！${NC}"
echo "========================================"
echo ""
echo "服务信息:"
echo "  - 服务地址: http://$(curl -s icanhazip.com):${PORT}"
echo "  - 健康检查: http://$(curl -s icanhazip.com):${PORT}/health"
echo "  - PROXY_TOKEN: ${PROXY_TOKEN}"
echo ""
echo "管理命令:"
echo "  查看状态: systemctl status wechat-proxy"
echo "  查看日志: journalctl -u wechat-proxy -f"
echo "  重启服务: systemctl restart wechat-proxy"
echo "  停止服务: systemctl stop wechat-proxy"
echo ""
echo -e "${YELLOW}重要提示:${NC}"
echo "1. 请将此服务器的 IP ($(curl -s icanhazip.com)) 添加到微信公众号后台的 IP 白名单"
echo "2. 请在 Vercel 环境变量中配置:"
echo "   WECHAT_PROXY_URL=http://$(curl -s icanhazip.com):${PORT}"
echo "   WECHAT_PROXY_TOKEN=${PROXY_TOKEN}"
echo ""
