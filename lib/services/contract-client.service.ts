import { ContractStatus } from "@prisma/client";

export interface ContractData {
  id: string;
  roomId: string;
  renterId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  renewalCount: number;
  status: ContractStatus;
  terminatedAt: string | null;
  terminationReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  room: {
    id: string;
    title: string;
    address: string;
    priceValue: number | null;
    city?: string;
    district?: string;
    currentOccupants?: number;
    maxOccupants?: number;
  };
  renter: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    gender?: string;
    birthDate?: string;
    address?: string;
  };
}

export interface CreateContractPayload {
  roomId: string;
  renterId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  notes?: string;
}

export interface UpdateContractPayload {
  endDate?: string;
  monthlyRent?: number;
  notes?: string;
}

export interface RenewContractPayload {
  newEndDate: string;
  newMonthlyRent?: number;
}

export interface TerminateContractPayload {
  terminationReason: string;
}

const authFetch = (url: string, options: RequestInit = {}) => {
  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
    },
  });
};

export const contractClient = {
  // Get all contracts
  async getAll(filters?: {
    status?: ContractStatus;
    roomId?: string;
    renterId?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.roomId) params.append("roomId", filters.roomId);
    if (filters?.renterId) params.append("renterId", filters.renterId);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));

    const response = await authFetch(`/api/contracts?${params.toString()}`);
      const json = await response.json();
  return json.data;
  },

  // Get contract by ID
 async getById(contractId: string) {
  const response = await authFetch(`/api/contracts/${contractId}`);
  const json = await response.json();

  return json.data;
},

  // Create contract
  async create(payload: CreateContractPayload) {
    const response = await authFetch("/api/contracts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  // Update contract
  async update(contractId: string, payload: UpdateContractPayload) {
    const response = await authFetch(`/api/contracts/${contractId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  // Delete contract
  async delete(contractId: string) {
    const response = await authFetch(`/api/contracts/${contractId}`, {
      method: "DELETE",
    });
    return response.json();
  },

  // Renew contract
  async renew(contractId: string, payload: RenewContractPayload) {
    const response = await authFetch(`/api/contracts/${contractId}/renew`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  // Terminate contract
  async terminate(contractId: string, payload: TerminateContractPayload) {
    const response = await authFetch(`/api/contracts/${contractId}/terminate`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.json();
  },
};
