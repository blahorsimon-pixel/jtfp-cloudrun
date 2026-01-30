import { ZodError } from 'zod';

export class AppError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const errorMiddleware = (err: any, _req: any, res: any, _next: any) => {
  if (err instanceof ZodError) {
    const issue = err.issues?.[0];
    const path = issue?.path?.length ? issue.path.join('.') : '';
    const msg = issue?.message ? `${path ? `${path}: ` : ''}${issue.message}` : '参数错误';
    return res.status(400).json({ code: 'BAD_REQUEST', message: msg, requestId: res.locals.requestId || '' });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ code: err.code, message: err.message, requestId: res.locals.requestId || '' });
  }
  console.error(err);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: res.locals.requestId || '' });
};

