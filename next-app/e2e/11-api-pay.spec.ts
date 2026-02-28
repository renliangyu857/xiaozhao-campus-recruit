import { test, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE || "http://localhost:3000/api";

test.describe("API - 微信支付回调", () => {
  test("POST /pay/wechat/notify 接收支付通知", async ({ request }) => {
    const xmlBody = `<xml>
      <appid><![CDATA[wx123456789]]></appid>
      <mch_id><![CDATA[1234567890]]></mch_id>
      <nonce_str><![CDATA[test_nonce]]></nonce_str>
      <sign><![CDATA[TEST_SIGN]]></sign>
      <result_code><![CDATA[SUCCESS]]></result_code>
      <openid><![CDATA[test_openid]]></openid>
      <trade_type><![CDATA[JSAPI]]></trade_type>
      <bank_type><![CDATA[CMB_CREDIT]]></bank_type>
      <total_fee>1</total_fee>
      <cash_fee>1</cash_fee>
      <transaction_id><![CDATA[test_transaction_id_123]]></transaction_id>
      <out_trade_no><![CDATA[TEST_ORDER_123]]></out_trade_no>
      <time_end><![CDATA[20240101120000]]></time_end>
    </xml>`;

    const response = await request.post(`${API_BASE}/pay/wechat/notify`, {
      headers: { "Content-Type": "application/xml" },
      data: xmlBody,
    });

    expect(response.status()).toBe(200);
    const responseText = await response.text();
    expect(responseText).toContain("<return_code><![CDATA[SUCCESS]]></return_code>");
  });

  test("POST /pay/wechat/notify 支付失败返回 SUCCESS（微信要求）", async ({ request }) => {
    const xmlBody = `<xml>
      <appid><![CDATA[wx123456789]]></appid>
      <mch_id><![CDATA[1234567890]]></mch_id>
      <nonce_str><![CDATA[test_nonce]]></nonce_str>
      <sign><![CDATA[TEST_SIGN]]></sign>
      <result_code><![CDATA[FAIL]]></result_code>
      <err_code><![CDATA[SYSTEMERROR]]></err_code>
      <err_code_des><![CDATA[系统错误]]></err_code_des>
    </xml>`;

    const response = await request.post(`${API_BASE}/pay/wechat/notify`, {
      headers: { "Content-Type": "application/xml" },
      data: xmlBody,
    });

    expect(response.status()).toBe(200);
    const responseText = await response.text();
    expect(responseText).toContain("<return_code><![CDATA[SUCCESS]]></return_code>");
  });

  test("POST /pay/wechat/notify 无效 XML 也能处理", async ({ request }) => {
    const response = await request.post(`${API_BASE}/pay/wechat/notify`, {
      headers: { "Content-Type": "application/xml" },
      data: "<xml><invalid></invalid></xml>",
    });

    expect(response.status()).toBe(200);
  });
});
