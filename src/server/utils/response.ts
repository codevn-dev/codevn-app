export interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export function ok<T = any>(data: T): StandardResponse<T> {
  return { success: true, data };
}

export function fail(message: string): StandardResponse<never> {
  return { success: false, error: message };
}
