'use client';

import { useCallback, useEffect, useState } from 'react';
import { contractClient, ContractData } from '@/lib/services/contract-client.service';
import { ContractList } from './contract-list';
import { ContractDetail } from './contract-detail';
import { ContractForm } from './contract-form';
import { RenewContractModal } from './renew-contract-modal';
import { TerminateContractModal } from './terminate-contract-modal';
import { ContractStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, X } from 'lucide-react';

const filterLabels: Record<string, string> = {
  ALL: 'Tất cả',
  DRAFT: 'Bản nháp',
  PENDING_RENTER_SIGNATURE: 'Chờ người thuê ký',
  PENDING_DEPOSIT: 'Chờ tiền cọc',
  PENDING_HANDOVER: 'Chờ bàn giao',
  ACTIVE: 'Đang hiệu lực',
  EXPIRED: 'Đã hết hạn',
  TERMINATED: 'Đã chấm dứt',
};

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

  const loadContracts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const filters: {
        page: number;
        limit: number;
        status?: ContractStatus;
      } = {
        page: currentPage,
        limit: 10,
      };

      if (statusFilter !== 'ALL') {
        filters.status = statusFilter;
      }

      const response = await contractClient.getAll(filters);
      setContracts(response.contracts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách hợp đồng');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const handleSelectContract = async (contract: ContractData) => {
    try {
      const fullContract = await contractClient.getById(contract.id);
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

  const handleWorkflowChanged = (updated: ContractData) => {
    setSelectedContract(updated);
    loadContracts();
    handleSelectContract(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <h1 className="bg-gradient-to-r from-slate-950 via-orange-800 to-sky-800 bg-clip-text text-3xl font-black tracking-tight text-transparent">
          Quản Lý Hợp Đồng
        </h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-500 text-white hover:from-orange-500 hover:to-amber-400"
        >
          <Plus className="h-4 w-4" />
          Tạo Hợp Đồng Mới
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-[2rem] border border-orange-200 bg-orange-50/90 p-6 shadow-xl shadow-orange-100/60">
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
        {['ALL', 'DRAFT', 'PENDING_RENTER_SIGNATURE', 'PENDING_DEPOSIT', 'PENDING_HANDOVER', 'ACTIVE', 'EXPIRED', 'TERMINATED'].map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status as ContractStatus | 'ALL');
              setCurrentPage(1);
            }}
            className={`rounded-full px-4 py-2 font-semibold transition-colors ${
              statusFilter === status
                ? 'bg-slate-950 text-white shadow-sm'
                : 'bg-white/80 border border-orange-100 text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700'
            }`}
          >
            {filterLabels[status] || status}
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
          <div className="rounded-[2rem] border border-white/80 bg-white/85 p-4 shadow-xl shadow-slate-200/60 backdrop-blur">
            <h2 className="font-black text-slate-950 mb-4">Danh Sách Hợp Đồng</h2>
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
                onChanged={handleWorkflowChanged}
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
            <div className="rounded-[2rem] border border-dashed border-orange-200 bg-white/80 p-12 text-center shadow-xl shadow-slate-200/60">
              <p className="text-slate-600 mb-4">Chọn một hợp đồng để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
