//! UTILITY for ERROR HANDLING

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class BadRequestError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class InactiveUserError extends Error {
  readonly statusCode = 301;
  readonly publicMessage = "User account is not active";

  constructor(
    message: string, 
    public readonly details?: { email?: string }
  ) {
    super(message);
    this.name = "InactiveUserError";
    
    // Necessario se il target del compilatore è ES5 o precedente
    Object.setPrototypeOf(this, InactiveUserError.prototype);
  }
}

export function findOrThrowNotFound<T>(
  elements: T[],
  predicate: (element: T) => boolean,
  errorMessage: string
): T {
  const found = elements.find(predicate);
  if (!found) {
    throw new NotFoundError(errorMessage);
  }
  return found;
}

export function throwConflictIfFound<T>(
  elements: T[],
  predicate: (element: T) => boolean,
  errorMessage: string
): void {
  const found = elements.find(predicate);
  if (found) {
    throw new ConflictError(errorMessage);
  }
}


