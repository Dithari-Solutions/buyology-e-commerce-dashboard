export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export class ApiRequestError extends Error {
  statusCode: number;
  serverError?: string;

  constructor(payload: ApiError) {
    super(payload.message);
    this.name = "ApiRequestError";
    this.statusCode = payload.statusCode;
    this.serverError = payload.error;
  }
}
