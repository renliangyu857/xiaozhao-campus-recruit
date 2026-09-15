import assert from "node:assert/strict";
import test from "node:test";

const ezfpModulePath = "./ezfp.ts";
const {
  buildEzfpCreatePayload,
  getAppBaseUrl,
  getEzfpConfig,
  getEzfpNotifyConfig,
  normalizeEzfpCreateResult,
} = await import(ezfpModulePath);

test("生产环境未配置应用地址时仍使用正式域名", () => {
  const previous = process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;

  try {
    assert.equal(getAppBaseUrl(), "https://www.xiaozhaomiao.cn");
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previous;
  }
});

test("创建订单签名参数包含用户 IP", () => {
  const payload = buildEzfpCreatePayload(
    {
      outTradeNo: "ORDER_123",
      name: "VIP会员",
      moneyYuan: "19.90",
      notifyUrl: "https://www.xiaozhaomiao.cn/api/payment/notify",
      clientIp: "203.0.113.10",
    },
    { pid: "1001", timestamp: "1721206072" }
  );

  assert.equal(payload.clientip, "203.0.113.10");
  assert.equal(payload.money, "19.90");
  assert.equal(payload.timestamp, "1721206072");
});

test("创建订单配置不应要求回调公钥", () => {
  const previous = {
    pid: process.env.EZFP_PID,
    privateKey: process.env.EZFP_PRIVATE_KEY,
    publicKey: process.env.EZFP_PUBLIC_KEY,
  };
  process.env.EZFP_PID = "1001";
  process.env.EZFP_PRIVATE_KEY = "private-key-placeholder";
  delete process.env.EZFP_PUBLIC_KEY;

  try {
    const config = getEzfpConfig();
    assert.equal(config.pid, "1001");
    assert.equal(config.publicKey, "");
    assert.throws(() => getEzfpNotifyConfig(), /EZFP_PUBLIC_KEY/);
  } finally {
    if (previous.pid === undefined) delete process.env.EZFP_PID;
    else process.env.EZFP_PID = previous.pid;
    if (previous.privateKey === undefined) delete process.env.EZFP_PRIVATE_KEY;
    else process.env.EZFP_PRIVATE_KEY = previous.privateKey;
    if (previous.publicKey === undefined) delete process.env.EZFP_PUBLIC_KEY;
    else process.env.EZFP_PUBLIC_KEY = previous.publicKey;
  }
});

test("创建订单返回缺少二维码时应明确失败", () => {
  assert.throws(
    () => normalizeEzfpCreateResult({ code: 0, trade_no: "TRADE_123", pay_type: "qrcode" }),
    /pay_info/
  );
});

test("回调验签配置不应依赖商户私钥", () => {
  const previous = {
    pid: process.env.EZFP_PID,
    privateKey: process.env.EZFP_PRIVATE_KEY,
    publicKey: process.env.EZFP_PUBLIC_KEY,
  };
  delete process.env.EZFP_PID;
  delete process.env.EZFP_PRIVATE_KEY;
  process.env.EZFP_PUBLIC_KEY = "public-key-placeholder";

  try {
    const config = getEzfpNotifyConfig();
    assert.equal(config.publicKey.includes("public-key-placeholder"), true);
  } finally {
    if (previous.pid === undefined) delete process.env.EZFP_PID;
    else process.env.EZFP_PID = previous.pid;
    if (previous.privateKey === undefined) delete process.env.EZFP_PRIVATE_KEY;
    else process.env.EZFP_PRIVATE_KEY = previous.privateKey;
    if (previous.publicKey === undefined) delete process.env.EZFP_PUBLIC_KEY;
    else process.env.EZFP_PUBLIC_KEY = previous.publicKey;
  }
});
