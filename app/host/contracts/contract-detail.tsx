'use client';

import { ContractData } from '@/lib/services/contract-client.service';
import { ContractStatus } from '@prisma/client';
import {
  Calendar,
  DollarSign,
  FileText,
  MapPin,
  Phone,
  User,
  AlertCircle,
  RefreshCw,
  Trash2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContractDetailProps {
  contract: ContractData;
  onRenew?: () => void;
  onTerminate?: () => void;
  onDelete?: () => void;
  isHost?: boolean;
}

export function ContractDetail({
  contract,
  onRenew,
  onTerminate,
  onDelete,
  isHost = false,
}: ContractDetailProps) {

  const formatDate = (date: string | null) => {
    if (!date) return 'Chưa cập nhật';
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getStatusBadgeColor = (status: ContractStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'EXPIRED':
        return 'bg-yellow-100 text-yellow-800';
      case 'TERMINATED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: ContractStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'Đang hiệu lực';
      case 'EXPIRED':
        return 'Đã hết hạn';
      case 'TERMINATED':
        return 'Đã chấm dứt';
      default:
        return status;
    }
  };

  const daysUntilExpiry = () => {
    const now = new Date();
    const endDate = new Date(contract.endDate);
    const diff = endDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Hợp đồng #{contract.id.slice(0, 8).toUpperCase()}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Tạo lúc: {formatDate(contract.createdAt)}
            </p>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadgeColor(
              contract.status
            )}`}
          >
            {getStatusLabel(contract.status)}
          </span>
        </div>

        {contract.status === 'ACTIVE' && daysUntilExpiry() <= 30 && daysUntilExpiry() > 0 && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">Sắp hết hạn</p>
              <p className="text-sm text-yellow-800">
                Hợp đồng này sẽ hết hạn trong {daysUntilExpiry()} ngày
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Renter Information */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Thông Tin Người Thuê</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex gap-4">
            {contract.renter.avatarUrl && (
              <img
                src={contract.renter.avatarUrl}
                alt={contract.renter.fullName}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Họ và tên</p>
              <p className="font-semibold text-foreground">{contract.renter.fullName}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium text-foreground">{contract.renter.email}</p>
          </div>
          {contract.renter.phone && (
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Số điện thoại
              </p>
              <p className="font-medium text-foreground">{contract.renter.phone}</p>
            </div>
          )}
          {contract.renter.gender && (
            <div>
              <p className="text-sm text-muted-foreground">Giới tính</p>
              <p className="font-medium text-foreground">
                {contract.renter.gender === 'male'
                  ? 'Nam'
                  : contract.renter.gender === 'female'
                    ? 'Nữ'
                    : 'Khác'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Room Information */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Thông Tin Phòng</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Tên phòng</p>
            <p className="font-semibold text-foreground">{contract.room.title}</p>
          </div>
          <div className="flex gap-2">
            <MapPin className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Địa chỉ</p>
              <p className="font-medium text-foreground">{contract.room.address}</p>
            </div>
          </div>
          {contract.room.city && (
            <div>
              <p className="text-sm text-muted-foreground">Tỉnh/Thành phố</p>
              <p className="font-medium text-foreground">{contract.room.city}</p>
            </div>
          )}
          {contract.room.district && (
            <div>
              <p className="text-sm text-muted-foreground">Quận/Huyện</p>
              <p className="font-medium text-foreground">{contract.room.district}</p>
            </div>
          )}
        </div>
      </div>

      {/* Contract Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dates */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            Thời Hạn
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Ngày bắt đầu</p>
              <p className="font-semibold text-foreground">{formatDate(contract.startDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ngày kết thúc</p>
              <p className="font-semibold text-foreground">{formatDate(contract.endDate)}</p>
            </div>
          </div>
        </div>

        {/* Financial Terms */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-600" />
            Điều Khoản Tài Chính
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Tiền thuê/tháng</p>
              <p className="font-semibold text-foreground">{formatCurrency(contract.monthlyRent)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tiền đặt cọc</p>
              <p className="font-semibold text-foreground">{formatCurrency(contract.depositAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Renewal Information */}
      {contract.renewalCount > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">Lịch Sử Gia Hạn</h3>
          </div>
          <p className="text-blue-800">
            Hợp đồng đã được gia hạn <strong>{contract.renewalCount}</strong> lần
          </p>
        </div>
      )}

      {/* Termination Information */}
      {contract.status === 'TERMINATED' && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-4">Thông Tin Chấm Dứt</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-red-700">Ngày chấm dứt</p>
              <p className="font-medium text-red-900">{formatDate(contract.terminatedAt)}</p>
            </div>
            <div>
              <p className="text-sm text-red-700">Lý do chấm dứt</p>
              <p className="font-medium text-red-900">{contract.terminationReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {contract.notes && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-600" />
            Ghi Chú
          </h3>
          <p className="text-foreground whitespace-pre-wrap">{contract.notes}</p>
        </div>
      )}

      {/* Actions */}
      {isHost && contract.status === 'ACTIVE' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 flex gap-3">
          {onRenew && (
            <Button
              onClick={onRenew}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Gia Hạn Hợp Đồng
            </Button>
          )}
          {onTerminate && (
            <Button
              onClick={onTerminate}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              Chấm Dứt Hợp Đồng
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
