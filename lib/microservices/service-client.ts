export class ServiceUnavailableError extends Error {
  constructor(
    public readonly serviceName: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}

export class ServiceHttpError extends Error {
  constructor(
    public readonly serviceName: string,
    public readonly status: number,
    public readonly payload: unknown,
  ) {
    super(`${serviceName} returned HTTP ${status}`);
    this.name = "ServiceHttpError";
  }
}

type ServiceRequestOptions = RequestInit & {
  timeoutMs?: number;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function serviceTarget(serviceName: string, baseUrl: string, path: string) {
  const gatewayUrl = process.env.API_GATEWAY_URL?.trim();
  if (!gatewayUrl) return `${trimTrailingSlash(baseUrl)}${path}`;
  return `${trimTrailingSlash(gatewayUrl)}/v1/services/${encodeURIComponent(serviceName)}${path}`;
}

export function gatewayServiceBase(serviceName: string, directBaseUrl: string) {
  const gatewayUrl = process.env.API_GATEWAY_URL?.trim();
  return gatewayUrl
    ? `${trimTrailingSlash(gatewayUrl)}/v1/services/${encodeURIComponent(serviceName)}`
    : trimTrailingSlash(directBaseUrl);
}

export function internalServiceHeaders(headers: HeadersInit = {}) {
  const result = new Headers(headers);
  const internalToken = process.env.INTERNAL_SERVICE_TOKEN?.trim();
  if (internalToken) result.set("x-internal-service-token", internalToken);
  return result;
}

export async function requestServiceJson<T>(
  serviceName: string,
  baseUrl: string,
  path: string,
  options: ServiceRequestOptions = {},
): Promise<T> {
  const { timeoutMs = 3_000, headers, ...requestOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const requestHeaders = new Headers(headers);
  requestHeaders.set("accept", "application/json");

  const internalToken = process.env.INTERNAL_SERVICE_TOKEN?.trim();
  if (internalToken) {
    requestHeaders.set("x-internal-service-token", internalToken);
  }

  try {
    const response = await fetch(serviceTarget(serviceName, baseUrl, path), {
      ...requestOptions,
      headers: requestHeaders,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new ServiceHttpError(
        serviceName,
        response.status,
        payload,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (
      error instanceof ServiceUnavailableError ||
      error instanceof ServiceHttpError
    ) {
      throw error;
    }

    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new ServiceUnavailableError(
      serviceName,
      `Cannot reach ${serviceName}: ${reason}`,
      error,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function getServiceUrl(name: "PROPERTY" | "IDENTITY" | "RENTAL" | "COMMUNITY" | "PREFERENCE") {
  const value = process.env[`${name}_SERVICE_URL`]?.trim();
  return value || null;
}
