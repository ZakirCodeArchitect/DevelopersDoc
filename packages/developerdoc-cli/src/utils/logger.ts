type LogLevel = "info" | "success" | "warn" | "error";

const ICONS: Record<LogLevel, string> = {
  info: "[info]",
  success: "[ok]",
  warn: "[warn]",
  error: "[error]",
};

export const logger = {
  info(message: string): void {
    console.log(`${ICONS.info} ${message}`);
  },
  success(message: string): void {
    console.log(`${ICONS.success} ${message}`);
  },
  warn(message: string): void {
    console.warn(`${ICONS.warn} ${message}`);
  },
  error(message: string): void {
    console.error(`${ICONS.error} ${message}`);
  },
};
