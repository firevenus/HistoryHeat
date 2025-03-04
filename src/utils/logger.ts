// 日志级别定义
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

// 日志工具类
class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  public debug(message: string): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage(LogLevel.DEBUG, message));
    }
  }

  public info(message: string): void {
    console.info(this.formatMessage(LogLevel.INFO, message));
  }

  public warn(message: string): void {
    console.warn(this.formatMessage(LogLevel.WARN, message));
  }

  public error(message: string): void {
    console.error(this.formatMessage(LogLevel.ERROR, message));
  }
}

// 导出单例实例
export const logger = Logger.getInstance();