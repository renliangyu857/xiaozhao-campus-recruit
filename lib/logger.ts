/**
 * 结构化日志：关键操作记录，不包含密码、token 等敏感信息。
 * 生产环境可对接 ELK / 云日志，此处仅 stdout。
 */

type LogLevel = "info" | "warn" | "error";

function formatPayload(level: LogLevel, event: string, data?: Record<string, unknown>): string {
  const payload = {
    time: new Date().toISOString(),
    level,
    event,
    ...(data && Object.keys(data).length > 0 ? data : {}),
  };
  return JSON.stringify(payload);
}

export const logger = {
  info(event: string, data?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.log(formatPayload("info", event, data));
  },
  warn(event: string, data?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.warn(formatPayload("warn", event, data));
  },
  error(event: string, data?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.error(formatPayload("error", event, data));
  },
};
