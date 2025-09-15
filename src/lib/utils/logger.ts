import { NextRequest } from 'next/server';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const formattedMessage = this.formatMessage(level, message, context);

    if (error) {
      const errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
      console.error(formattedMessage, errorDetails);
    } else {
      console[level === LogLevel.ERROR ? 'error' : level === LogLevel.WARN ? 'warn' : 'log'](
        formattedMessage
      );
    }

    // In production, you might want to send logs to external services
    if (this.isProduction) {
      this.sendToExternalService(level, message, context, error);
    }
  }

  private sendToExternalService(
    _level: LogLevel,
    _message: string,
    _context?: LogContext,
    _error?: Error
  ): void {
    // TODO: Implement external logging service (e.g., Sentry, LogRocket, etc.)
    // This is a placeholder for production logging
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  // Helper method to extract context from NextRequest
  extractRequestContext(request: NextRequest, userId?: string): LogContext {
    const url = new URL(request.url);
    return {
      userId,
      requestId: request.headers.get('x-request-id') || undefined,
      endpoint: url.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    };
  }
}

export const logger = new Logger();
