'use client';

import { useEffect, useState } from 'react';
import { contractClient, ContractData } from '@/lib/services/contract-client.service';
import { ContractList } from './contract-list';
import { ContractDetail } from './contract-detail';
import { ContractForm } from './contract-form';
import { RenewContractModal } from './renew-contract-modal';
import { TerminateContractModal } from './terminate-contract-modal';
import { ContractStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, X } from 'lucide-react';

export function ContractsManagement() {
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [selectedContract, setSelectedContract] = useState<ContractData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const loadContracts = async () => {
    setIsLoading(true);
    setError('');
    try {
      const filters: any = {
        page: currentPage,
        limit: 10,
      };

      if (statusFilter !== 'ALL') {
        filters.status = statusFilter;
      }

      const response = await contractClient.getAll(filters);

      if (response.error) {
        throw new Error(response.error);
      }

setContracts(response.contracts || []);    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách hợp đồng');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, [statusFilter, currentPage]);

  const handleSelectContract = async (contract: ContractData) => {
    try {
      const fullContract = await contractClient.getById(contract.id);

      if (fullContract.error) {
        throw new Error(fullContract.error);
      }
      setSelectedContract(fullContract);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải chi tiết hợp đồng');
    }
  };

  const handleContractCreated = () => {
    setShowForm(false);
    loadContracts();
  };

  const handleRenewSuccess = () => {
    loadContracts();
    if (selectedContract) {
      handleSelectContract(selectedContract);
    }
    setShowRenewModal(false);
  };

  const handleTerminateSuccess = () => {
    loadContracts();
    if (selectedContract) {
      handleSelectContract(selectedContract);
    }
    setShowTerminateModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Quản Lý Hợp Đồng</h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Tạo Hợp Đồng Mới
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Tạo Hợp Đồng Mới</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <ContractForm onSuccess={handleContractCreated} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'ACTIVE', 'EXPIRED', 'TERMINATED'].map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status as any);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === status
                ? 'bg-orange-600 text-white'
                : 'bg-white border border-slate-200 text-foreground hover:border-orange-300'
            }`}
          >
            {status === 'ALL'
              ? 'Tất Cả'
              : status === 'ACTIVE'
                ? 'Đang Hiệu Lực'
                : status === 'EXPIRED'
                  ? 'Đã Hết Hạn'
                  : 'Đã Chấm Dứt'}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Contract List */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-foreground mb-4">Danh Sách Hợp Đồng</h2>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
              </div>
            ) : (
              <ContractList
                contracts={contracts}
                onSelectContract={handleSelectContract}
              />
            )}
          </div>
        </div>

        {/* Right: Contract Detail */}
        <div className="lg:col-span-2">
          {selectedContract ? (
            <>
              <ContractDetail
                contract={selectedContract}
                isHost={true}
                onRenew={() => setShowRenewModal(true)}
                onTerminate={() => setShowTerminateModal(true)}
              />

              {/* Modals */}
              {showRenewModal && (
                <RenewContractModal
                  contractId={selectedContract.id}
                  currentEndDate={selectedContract.endDate}
                  currentMonthlyRent={selectedContract.monthlyRent}
                  onSuccess={handleRenewSuccess}
                  onClose={() => setShowRenewModal(false)}
                />
              )}

              {showTerminateModal && (
                <TerminateContractModal
                  contractId={selectedContract.id}
                  renterName={selectedContract.renter.fullName}
                  roomTitle={selectedContract.room.title}
                  onSuccess={handleTerminateSuccess}
                  onClose={() => setShowTerminateModal(false)}
                />
              )}
            </>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
              <p className="text-slate-600 mb-4">Chọn một hợp đồng để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
