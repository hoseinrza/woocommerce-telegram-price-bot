export class AppError extends Error {
  constructor(code, message, statusCode = 500, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(code, message, details) {
    super(code, message, 404, details);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends AppError {
  constructor(code, message, details) {
    super(code, message, 409, details);
    this.name = 'ConflictError';
  }
}

export class UpstreamError extends AppError {
  constructor(message, details) {
    super('UPSTREAM_UNAVAILABLE', message, 502, details);
    this.name = 'UpstreamError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}
