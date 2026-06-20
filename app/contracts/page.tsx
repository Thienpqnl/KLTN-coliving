'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { contractClient, ContractData } from '@/lib/services/contract-client.service';
import { ContractDetail } from '@/app/host/contracts/contract-detail';
import { Loader2 } from 'lucide-react';
import { ContractStatus } from '@prisma/client';

const statusLabels: Record<ContractStatus, string> = {
  DRAFT: 'Bản nháp',
  PENDING_HOST_SIGNATURE: 'Chờ chủ nhà ký',
  PENDING_RENTER_SIGNATURE: 'Chờ bạn ký',
  PENDING_DEPOSIT: 'Chờ xác nhận cọc',
  PENDING_HANDOVER: 'Chờ bàn giao',
  ACTIVE: 'Đang hiệu lực',
  EXPIRED: 'Đã hết hạn',
  TERMINATED: 'Đã chấm dứt',
  CANCELLED: 'Đã hủy',
  DISPUTED: 'Đang tranh chấp',
};

function statusClass(status: ContractStatus) {
  if (status === 'ACTIVE') return 'bg-green-100 text-green-800';
  if (status === 'PENDING_HANDOVER') return 'bg-sky-100 text-sky-800';
  if (status === 'PENDING_DEPOSIT') return 'bg-amber-100 text-amber-800';
  if (status === 'PENDING_RENTER_SIGNATURE') return 'bg-violet-100 text-violet-800';
  if (status === 'DRAFT' || status === 'PENDING_HOST_SIGNATURE') return 'bg-slate-100 text-slate-700';
  return 'bg-red-100 text-red-800';
}

export default function CustomerContractsPage() {
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [selectedContract, setSelectedContract] = useState<ContractData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadContracts = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await contractClient.getAll({ limit: 100 });
        setContracts(response.contracts || []);
        if (response.contracts?.length > 0) {
          const firstContract = await contractClient.getById(response.contracts[0].id);
          setSelectedContract(firstContract);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách hợp đồng');
      } finally {
        setIsLoading(false);
      }
    };

    loadContracts();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const selectContract = async (contract: ContractData) => {
    try {
      setSelectedContract(await contractClient.getById(contract.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải hợp đồng');
    }
  };

  const handleChanged = (updated: ContractData) => {
    setSelectedContract(updated);
    setContracts((items) => items.map((item) => item.id === updated.id ? updated : item));
    selectContract(updated);
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-slate-50 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Hợp Đồng Của Bạn</h1>
            <p className="text-muted-foreground">
              Xem và quản lý các hợp đồng thuê phòng của bạn
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 mb-6">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="rounded-lg bg-white border border-slate-200 p-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="rounded-lg bg-white border border-slate-200 p-12 text-center">
              <p className="text-slate-600">Bạn chưa có hợp đồng nào</p>
              <p className="text-sm text-muted-foreground mt-2">
                Hợp đồng sẽ xuất hiện ở đây khi chủ phòng tạo cho bạn
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Contract List */}
              <div className="lg:col-span-1">
                <div className="rounded-lg bg-white border border-slate-200 p-4 shadow-sm">
                  <h2 className="font-semibold text-foreground mb-4">Danh Sách Hợp Đồng</h2>
                  <div className="space-y-2">
                    {contracts.map((contract) => (
                      <button
                        key={contract.id}
                        onClick={() => selectContract(contract)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          selectedContract?.id === contract.id
                            ? 'bg-orange-100 border border-orange-300'
                            : 'bg-slate-50 border border-slate-200 hover:border-orange-300'
                        }`}
                      >
                        <div className="font-medium text-sm text-foreground truncate">
                          {contract.room.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                        </div>
                        <div className="text-xs mt-1">
                          <span
                            className={`px-2 py-0.5 rounded-full ${statusClass(contract.status)}`}
                          >
                            {statusLabels[contract.status]}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contract Detail */}
              <div className="lg:col-span-2">
                {selectedContract && (
                  <ContractDetail contract={selectedContract} isHost={false} onChanged={handleChanged} />
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
