import { getApiBaseUrl } from './config';
import { ApiError, isAbortError } from './error';

export type HttpMethod = 'GET' | 'POST' | 'PUT';

export type RequestSpec = {
  path: string;
  method: HttpMethod;
  body?: unknown;
  idempotencyKey?: string;
  ifMatch?: string;
  ifNoneMatch?: string;
  signal?: AbortSignal;
};

export type TransportResult<T> = {
  data: T;
  status: number;
  requestId: string | null;
  location: string | null;
  retryAfterMs: number | null;
  etag: string | null;
};

type ErrorBody = {
  error: {
    code?: string;
    message?: string;
  };
};

export async function request<T>(spec: RequestSpec): Promise<TransportResult<T>> {
  const headers = new Headers();
  if (spec.idempotencyKey) {
    headers.set('Idempotency-Key', spec.idempotencyKey);
  }
  if (spec.ifMatch) {
    headers.set('If-Match', spec.ifMatch);
  }
  if (spec.ifNoneMatch) {
    headers.set('If-None-Match', spec.ifNoneMatch);
  }

  const init: RequestInit = {
    method: spec.method,
    headers,
    signal: spec.signal,
    cache: 'no-store',
  };

  if (spec.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(spec.body);
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${spec.path}`, init);
  } catch (cause) {
    if (isAbortError(cause)) {
      throw cause;
    }
    throw new ApiError({
      kind: 'network',
      message: 'Не удалось связаться с сервером. Проверьте соединение и повторите.',
    });
  }

  const requestId = response.headers.get('x-request-id');
  const location = response.headers.get('location');
  const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
  const etag = response.headers.get('etag');

  if (response.status === 204 || response.status === 304) {
    if (!response.ok && response.status !== 304) {
      throw new ApiError({
        kind: 'http',
        status: response.status,
        message: 'Сервер вернул пустой ответ с ошибкой.',
        requestId,
      });
    }
    return {
      data: undefined as T,
      status: response.status,
      requestId,
      location,
      retryAfterMs,
      etag,
    };
  }

  const parsed = await readJson(response, requestId);

  if (!response.ok) {
    throw toHttpError(parsed, response.status, requestId);
  }

  return {
    data: parsed as T,
    status: response.status,
    requestId,
    location,
    retryAfterMs,
    etag,
  };
}

async function readJson(response: Response, requestId: string | null): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    throw new ApiError({
      kind: 'parse',
      status: response.status,
      message: 'Сервер вернул пустое тело ответа.',
      requestId,
    });
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError({
      kind: 'parse',
      status: response.status,
      message: 'Не удалось разобрать ответ сервера.',
      requestId,
    });
  }
}

function isErrorBody(value: unknown): value is ErrorBody {
  return typeof value === 'object' && value !== null && 'error' in value;
}

function toHttpError(parsed: unknown, status: number, requestId: string | null): ApiError {
  if (isErrorBody(parsed) && parsed.error && typeof parsed.error === 'object') {
    return new ApiError({
      kind: 'http',
      status,
      code: typeof parsed.error.code === 'string' ? parsed.error.code : null,
      message:
        typeof parsed.error.message === 'string'
          ? parsed.error.message
          : 'Запрос завершился ошибкой.',
      requestId,
    });
  }
  return new ApiError({
    kind: 'http',
    status,
    message: 'Запрос завершился ошибкой.',
    requestId,
  });
}

function parseRetryAfterMs(header: string | null): number | null {
  if (!header) {
    return null;
  }
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }
  return Math.round(seconds * 1000);
}
