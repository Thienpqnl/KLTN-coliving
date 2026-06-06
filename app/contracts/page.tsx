'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { contractClient, ContractData } from '@/lib/services/contract-client.service';
import { ContractDetail } from '@/app/host/contracts/contract-detail';
import { Loader2 } from 'lucide-react';

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
            console.log("Contracts:", contracts);
console.log("Count:", contracts.length);
        if (response.error) {
          throw new Error(response.error);
        }

        setContracts(response.contracts || []);
        if (response.contracts?.length > 0) {
          setSelectedContract(response.contracts[0]);
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
                        onClick={() => setSelectedContract(contract)}
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
                            className={`px-2 py-0.5 rounded-full ${
                              contract.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : contract.status === 'EXPIRED'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {contract.status === 'ACTIVE'
                              ? 'Đang hiệu lực'
                              : contract.status === 'EXPIRED'
                                ? 'Đã hết hạn'
                                : 'Đã chấm dứt'}
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
                  <ContractDetail contract={selectedContract} isHost={false} />
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
