import { ContractDepositStatus, ContractStatus } from "@prisma/client";

export interface ContractEventData {
  id: string;
  type: string;
  fromStatus: ContractStatus | null;
  toStatus: ContractStatus | null;
  note: string | null;
  createdAt: string;
  actor?: { id: string; fullName: string; role: string } | null;
}

export interface ContractData {
  id: string;
  contractNumber: string;
  roomId: string;
  renterId: string;
  hostId: string;
  bookingId: string | null;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  depositStatus: ContractDepositStatus;
  depositPaidAt: string | null;
  depositReference: string | null;
  paymentDueDay: number;
  paymentMethod: string | null;
  electricityRate: number | null;
  waterRate: number | null;
  utilitiesNotes: string | null;
  noticeDays: number;
  depositReturnDays: number;
  houseRules: string | null;
  inventory: Array<{ name: string; quantity: number; condition?: string }> | null;
  contentSnapshot: Record<string, unknown>;
  contentHash: string;
  termsVersion: string;
  status: ContractStatus;
  hostSignedAt: string | null;
  hostSignatureName: string | null;
  renterSignedAt: string | null;
  renterSignatureName: string | null;
  hostHandoverConfirmedAt: string | null;
  renterHandoverConfirmedAt: string | null;
  handoverNotes: string | null;
  activatedAt: string | null;
  renewalCount: number;
  terminatedAt: string | null;
  terminationReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  events?: ContractEventData[];
  room: {
    id: string;
    title: string;
    address: string;
    priceValue: number | string | null;
    areaValue?: number | string | null;
    city?: string | null;
    district?: string | null;
    currentOccupants?: number | null;
    maxOccupants?: number | null;
  };
  renter: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
    gender?: string | null;
    birthDate?: string | null;
    address?: string | null;
  };
  host: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    address?: string | null;
  };
}

export interface CreateContractPayload {
  bookingId: string;
  endDate?: string;
  monthlyRent?: number;
  depositAmount: number;
  paymentDueDay: number;
  paymentMethod?: string;
  electricityRate?: number;
  waterRate?: number;
  utilitiesNotes?: string;
  noticeDays: number;
  depositReturnDays: number;
  houseRules?: string;
  inventory?: Array<{ name: string; quantity: number; condition?: string }>;
  notes?: string;
}

export interface UpdateContractPayload extends Partial<Omit<CreateContractPayload, "bookingId">> {
  endDate?: string;
}

export interface RenewContractPayload { newEndDate: string; newMonthlyRent?: number }
export interface TerminateContractPayload { terminationReason: string }
export interface SignContractPayload { signatureName: string; acceptedTerms: true; informationConfirmed: true }
export interface ConfirmDepositPayload { received: true; reference?: string; note?: string }
export interface ConfirmHandoverPayload { confirmed: true; note?: string }

async function authFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    const detail = payload?.errors ? Object.values(payload.errors).flat().join(". ") : null;
    throw new Error(detail || payload?.error || "Không thể xử lý yêu cầu hợp đồng");
  }
  return payload.data as T;
}

export const contractClient = {
  getAll(filters?: { status?: ContractStatus; roomId?: string; renterId?: string; page?: number; limit?: number }) {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.roomId) params.set("roomId", filters.roomId);
    if (filters?.renterId) params.set("renterId", filters.renterId);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));
    return authFetch<{ contracts: ContractData[]; total: number; page: number; limit: number; pages: number }>(`/api/contracts?${params}`);
  },
  getById(contractId: string) {
    return authFetch<ContractData>(`/api/contracts/${contractId}`);
  },
  create(payload: CreateContractPayload) {
    return authFetch<ContractData>("/api/contracts", { method: "POST", body: JSON.stringify(payload) });
  },
  update(contractId: string, payload: UpdateContractPayload) {
    return authFetch<ContractData>(`/api/contracts/${contractId}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  delete(contractId: string) {
    return authFetch<{ message: string }>(`/api/contracts/${contractId}`, { method: "DELETE" });
  },
  sign(contractId: string, payload: SignContractPayload) {
    return authFetch<ContractData>(`/api/contracts/${contractId}/sign`, { method: "POST", body: JSON.stringify(payload) });
  },
  confirmDeposit(contractId: string, payload: ConfirmDepositPayload) {
    return authFetch<ContractData>(`/api/contracts/${contractId}/deposit`, { method: "POST", body: JSON.stringify(payload) });
  },
  confirmHandover(contractId: string, payload: ConfirmHandoverPayload) {
    return authFetch<ContractData>(`/api/contracts/${contractId}/handover`, { method: "POST", body: JSON.stringify(payload) });
  },
  renew(contractId: string, payload: RenewContractPayload) {
    return authFetch<ContractData>(`/api/contracts/${contractId}/renew`, { method: "POST", body: JSON.stringify(payload) });
  },
  terminate(contractId: string, payload: TerminateContractPayload) {
    return authFetch<ContractData>(`/api/contracts/${contractId}/terminate`, { method: "POST", body: JSON.stringify(payload) });
  },
};
