// lib/api/client.ts

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

class ApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor() {
    this.baseUrl = '/api';
    this.token = null;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers(options.headers);

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const storedToken =
      typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const token = this.token || storedToken;

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text();
    let data: Record<string, unknown> | null = null;

    if (responseText && contentType.includes('application/json')) {
      try {
        data = JSON.parse(responseText) as Record<string, unknown>;
      } catch {
        throw new ApiError(
          `Máy chủ trả về JSON không hợp lệ (${response.status})`,
          response.status
        );
      }
    }

    if (responseText && !contentType.includes('application/json')) {
      const message =
        response.status === 404
          ? `Không tìm thấy API ${endpoint}`
          : response.status === 413
            ? 'Tài liệu vượt quá dung lượng máy chủ cho phép'
            : response.status === 401 || response.status === 403
              ? 'Phiên đăng nhập không hợp lệ hoặc bạn không có quyền thực hiện'
              : `Máy chủ trả về nội dung không hợp lệ (${response.status} ${response.statusText})`;

      if (response.status >= 500) {
        console.error('Non-JSON API response:', {
          endpoint,
          status: response.status,
          contentType,
          preview: responseText.slice(0, 160),
        });
      }

      throw new ApiError(message, response.status);
    }

    if (!response.ok) {
      if (response.status >= 500) {
        console.error('API Error Response:', { status: response.status, data });
      }

      throw new ApiError(
        String(data?.error || data?.message || 'API Error'),
        response.status,
        data?.errors as Record<string, string[]> | undefined
      );
    }

    if (data && 'data' in data && 'success' in data) {
      return data.data as T;
    }

    return data as T;
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
