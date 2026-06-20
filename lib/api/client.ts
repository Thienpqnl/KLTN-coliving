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
    this.baseUrl = "/api";
    this.token = null;
  }

  // 1. Set token
  setToken(token: string | null) {
    this.token = token;
  }

  // 2. Core request
 private async request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // 1. Khởi tạo đối tượng Headers từ options.headers có sẵn
  const headers = new Headers(options.headers);

  // 2. Thêm các header mặc định nếu chưa có
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // 3. Đính kèm token
const token = this.token || localStorage.getItem("token");

if (token) {
  headers.set("Authorization", `Bearer ${token}`);
}
  const response = await fetch(`${this.baseUrl}${endpoint}`, {
    ...options,
    headers, 
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status >= 500) {
      console.error('API Error Response:', { status: response.status, data });
    }
    throw new ApiError(
      data.error || data.message || "API Error",
      response.status,
      data.errors,
    );
  }
  
  // Nếu response có cấu trúc ApiResponse, trả về data
  if (data && typeof data === 'object' && 'data' in data && 'success' in data) {
    return data.data;
  }
  
  return data;
}

  // 3. Methods
  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "GET" });
  }

  post<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
