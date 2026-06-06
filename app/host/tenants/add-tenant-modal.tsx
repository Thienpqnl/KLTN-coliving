'use client';

import { useState } from 'react';
import { occupancyClient } from '@/lib/services/occupancy-client.service';
import { X, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { apiClient } from '@/lib/api/client'
interface AddTenantModalProps {
  roomId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

export function AddTenantModal({ roomId, onClose, onSuccess }: AddTenantModalProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSearchUsers = async (query: string) => {
    if (query.length < 2) {
      setUsers([]);
      return;
    }

    try {
      setSearchLoading(true);
      // Assuming there's a search users endpoint
      const results = await apiClient.get(`/api/users/search?q=${encodeURIComponent(query)}`);
      setUsers(results);
    } catch (err) {
      console.error('Failed to search users:', err);
      setUsers([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddTenant = async () => {
    if (!selectedUserId) {
      setError('Vui lòng chọn người dùng');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await occupancyClient.addOccupant(roomId, selectedUserId, notes || undefined);
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add occupant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold">Thêm người thuê mới</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <p className="text-sm text-slate-700">
                Đã thêm người thuê mới thành công!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* User Search */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Tìm kiếm người dùng <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      handleSearchUsers(e.target.value);
                    }}
                    placeholder="Nhập tên hoặc email người dùng..."
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={loading}
                  />
                </div>

                {/* User Results */}
                {users.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setUserSearch(user.fullName || user.name);
                          setUsers([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-100 border-b border-slate-100 last:border-b-0 text-sm"
                      >
                        <p className="font-medium">{user.fullName || user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </button>
                    ))}
                  </div>
                )}

                {searchLoading && (
                  <p className="text-xs text-slate-500 mt-2">Đang tìm kiếm...</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Ghi chú (tùy chọn)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ví dụ: Người thuê từ booking #123..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex gap-3 p-6 border-t border-slate-200">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleAddTenant}
              disabled={loading || !selectedUserId}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang thêm...' : 'Thêm người thuê'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
