'use client';

import { ContractData } from '@/lib/services/contract-client.service';
import { ContractStatus } from '@prisma/client';
import { Calendar, DollarSign, MapPin, User } from 'lucide-react';

interface ContractListProps {
  contracts: ContractData[];
  onSelectContract: (contract: ContractData) => void;
  filters?: {
    status?: ContractStatus;
    page?: number;
    limit?: number;
  };
}

export function ContractList({ contracts, onSelectContract }: ContractListProps) {
  const getStatusBadgeColor = (status: ContractStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
      case 'PENDING_HOST_SIGNATURE':
        return 'bg-slate-100 text-slate-700';
      case 'PENDING_RENTER_SIGNATURE':
        return 'bg-violet-100 text-violet-800';
      case 'PENDING_DEPOSIT':
        return 'bg-amber-100 text-amber-800';
      case 'PENDING_HANDOVER':
        return 'bg-sky-100 text-sky-800';
      case 'EXPIRED':
        return 'bg-yellow-100 text-yellow-800';
      case 'TERMINATED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
      case 'DISPUTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: ContractStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'Đang hiệu lực';
      case 'DRAFT':
        return 'Bản nháp';
      case 'PENDING_HOST_SIGNATURE':
        return 'Chờ chủ nhà ký';
      case 'PENDING_RENTER_SIGNATURE':
        return 'Chờ người thuê ký';
      case 'PENDING_DEPOSIT':
        return 'Chờ tiền cọc';
      case 'PENDING_HANDOVER':
        return 'Chờ bàn giao';
      case 'EXPIRED':
        return 'Đã hết hạn';
      case 'TERMINATED':
        return 'Đã chấm dứt';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'DISPUTED':
        return 'Đang tranh chấp';
      default:
        return status;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  if (contracts.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-600">Không có hợp đồng nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contracts.map((contract) => (
        <div
          key={contract.id}
          onClick={() => onSelectContract(contract)}
          className="cursor-pointer rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-orange-300 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {contract.contractNumber}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {contract.room.title}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(
                contract.status
              )}`}
            >
              {getStatusLabel(contract.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Renter Info */}
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Người thuê</p>
                <p className="font-medium text-foreground truncate">
                  {contract.renter.fullName}
                </p>
              </div>
            </div>

            {/* Room Info */}
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Địa chỉ</p>
                <p className="font-medium text-foreground truncate">
                  {contract.room.address}
                </p>
              </div>
            </div>

            {/* Date Info */}
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Thời hạn</p>
                <p className="font-medium text-foreground">
                  {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                </p>
              </div>
            </div>

            {/* Rent Info */}
            <div className="flex items-start gap-3">
              <DollarSign className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Tiền thuê/tháng</p>
                <p className="font-medium text-foreground">
                  {formatCurrency(contract.monthlyRent)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="text-sm text-muted-foreground">
              Gia hạn {contract.renewalCount} lần
            </div>
            <button className="text-sm font-medium text-orange-600 hover:text-orange-700">
              Chi tiết →
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
