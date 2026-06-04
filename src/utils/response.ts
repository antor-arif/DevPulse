import { Response } from 'express';

export const sendSuccess = (
  res: Response,
  statusCode: number,
  message: string,
  data?: unknown
): void => {
  const body: { success: boolean; message: string; data?: unknown } = {
    success: true,
    message,
  };
  if (data !== undefined) {
    body.data = data;
  }
  res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  errors?: unknown
): void => {
  const body: { success: boolean; message: string; errors?: unknown } = {
    success: false,
    message,
  };
  if (errors !== undefined) {
    body.errors = errors;
  }
  res.status(statusCode).json(body);
};
