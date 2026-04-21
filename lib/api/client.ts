// lib/api/client.ts

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
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
  if (this.token) {
    headers.set("Authorization", `Bearer ${this.token}`);
  }

  const response = await fetch(`${this.baseUrl}${endpoint}`, {
    ...options,
    headers, // Fetch API chấp nhận đối tượng Headers này
  });

  // Xử lý response như cũ...
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(data.message || "API Error", response.status);
  }
  return data;
}

  // 3. Methods
  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "GET" });
  }

  post<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body: any) {
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