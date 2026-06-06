'use client';

import { useState } from 'react';
import { TenantsList } from './tenants-list';
import { TenantDetailsModal } from './tenant-details-modal';
import { TerminateTenantModal } from './terminate-tenant-modal';
import { AddTenantModal } from './add-tenant-modal';
import { TenantHistory } from './tenant-history';
import { Users, Plus, History } from 'lucide-react';
import type { Occupant } from '@/lib/services/occupancy-client.service';

interface TenantsManagementProps {
  roomId: string;
  roomTitle?: string;
}

export function TenantsManagement({ roomId, roomTitle = 'Phòng' }: TenantsManagementProps) {
  const [view, setView] = useState<'list' | 'history'>('list');
  const [selectedOccupancyId, setSelectedOccupancyId] = useState<string | null>(null);
  const [terminateOccupancyId, setTerminateOccupancyId] = useState<string | null>(null);
  const [terminateTenantName, setTerminateTenantName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelectTenant = (tenant: Occupant) => {
    setSelectedOccupancyId(tenant.id);
  };

  const handleTerminateTenant = (occupancyId: string, tenantName: string) => {
    setTerminateOccupancyId(occupancyId);
    setTerminateTenantName(tenantName);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-orange-600" />
            Quản lý người thuê
          </h2>
          <p className="text-sm text-slate-600 mt-1">{roomTitle}</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors w-full sm:w-auto justify-center"
        >
          <Plus className="h-4 w-4" />
          Thêm người thuê
        </button>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setView('list')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
            view === 'list'
              ? 'text-orange-600 border-orange-600'
              : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
        >
          Danh sách hiện tại
        </button>
        <button
          onClick={() => setView('history')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
            view === 'history'
              ? 'text-orange-600 border-orange-600'
              : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
        >
          <History className="h-4 w-4" />
          Lịch sử
        </button>
      </div>

      {/* Content */}
      <div key={refreshKey}>
        {view === 'list' ? (
          <TenantsList
            roomId={roomId}
            onSelectTenant={handleSelectTenant}
            onTerminate={handleTerminateTenant}
          />
        ) : (
          <TenantHistory roomId={roomId} />
        )}
      </div>

      {/* Modals */}
      {selectedOccupancyId && (
        <TenantDetailsModal
          occupancyId={selectedOccupancyId}
          onClose={() => setSelectedOccupancyId(null)}
        />
      )}

      {terminateOccupancyId && (
        <TerminateTenantModal
          occupancyId={terminateOccupancyId}
          tenantName={terminateTenantName}
          onClose={() => setTerminateOccupancyId(null)}
          onSuccess={handleRefresh}
        />
      )}

      {showAddModal && (
        <AddTenantModal
          roomId={roomId}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
