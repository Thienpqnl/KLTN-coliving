'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  AlertCircle,
  ArrowRight,
  BedDouble,
  Clock3,
  DoorOpen,
  Loader2,
  Search,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';
import {
  occupancyClient,
  type HostOccupancyOverview,
  type HostOccupancyRoom,
} from '@/lib/services/occupancy-client.service';

type RoomFilter = 'ALL' | 'HAS_MEMBERS' | 'AVAILABLE' | 'FULL';

const emptyOverview: HostOccupancyOverview = {
  summary: { totalRooms: 0, activeMembers: 0, formerMembers: 0, availableSlots: 0 },
  rooms: [],
};

function roomImage(room: HostOccupancyRoom) {
  if (room.imageUrl) return room.imageUrl;
  const first = room.images?.[0];
  return typeof first === 'string' ? first : first?.url;
}

function memberName(room: HostOccupancyRoom) {
  return room.members
    .filter((member) => member.status === 'ACTIVE')
    .map((member) => member.user?.fullName || member.user?.name || member.user?.email || 'Thành viên');
}

export function MembersOverview() {
  const [data, setData] = useState<HostOccupancyOverview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RoomFilter>('ALL');

  const loadOverview = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await occupancyClient.getHostOverview());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const rooms = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return data.rooms.filter((room) => {
      const matchesSearch = !keyword || [room.title, room.address, ...memberName(room)]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('vi').includes(keyword));
      const matchesFilter = filter === 'ALL'
        || (filter === 'HAS_MEMBERS' && room.currentOccupants > 0)
        || (filter === 'AVAILABLE' && room.availableSlots > 0)
        || (filter === 'FULL' && room.availableSlots === 0);
      return matchesSearch && matchesFilter;
    });
  }, [data.rooms, filter, search]);

  const stats = [
    { label: 'Phòng đang quản lý', value: data.summary.totalRooms, icon: BedDouble, tone: 'bg-sky-100 text-sky-700', accent: 'from-sky-500 to-cyan-400' },
    { label: 'Thành viên đang ở', value: data.summary.activeMembers, icon: UserRoundCheck, tone: 'bg-emerald-100 text-emerald-700', accent: 'from-emerald-500 to-teal-400' },
    { label: 'Chỗ còn trống', value: data.summary.availableSlots, icon: DoorOpen, tone: 'bg-orange-100 text-orange-700', accent: 'from-orange-500 to-amber-400' },
    { label: 'Thành viên trước đây', value: data.summary.formerMembers, icon: Clock3, tone: 'bg-violet-100 text-violet-700', accent: 'from-violet-500 to-fuchsia-400' },
  ];

  return (
    <div className="space-y-7">
      <header className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <p className="mb-2 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-700">
          Vận hành cư trú
        </p>
        <h1 className="bg-gradient-to-r from-slate-950 via-orange-800 to-sky-800 bg-clip-text text-4xl font-black tracking-tight text-transparent">
          Quản lý thành viên
        </h1>
      </header>

      <section className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, tone, accent }) => (
          <div key={label} className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-slate-200/55 backdrop-blur">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-600">{label}</p>
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></span>
            </div>
            <p className="mt-5 text-3xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="flex items-center gap-3 border-b border-orange-100/70 bg-gradient-to-r from-orange-50 via-white to-sky-50 p-5">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo phòng, địa chỉ hoặc tên thành viên"
              className="h-11 w-full rounded-xl border border-white bg-white/90 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as RoomFilter)}
            className="h-11 w-52 rounded-xl border border-white bg-white/90 px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-orange-300"
          >
            <option value="ALL">Tất cả phòng</option>
            <option value="HAS_MEMBERS">Đang có thành viên</option>
            <option value="AVAILABLE">Còn chỗ</option>
            <option value="FULL">Đã đủ người</option>
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-orange-600" /> Đang tải dữ liệu cư trú...
          </div>
        ) : error ? (
          <div className="m-5 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex gap-3"><AlertCircle className="mt-0.5 h-5 w-5 text-red-600" /><div><p className="font-bold text-red-900">Không thể tải dữ liệu</p><p className="text-sm text-red-700">{error}</p></div></div>
            <button onClick={() => void loadOverview()} className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100">Thử lại</button>
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <UsersRound className="h-10 w-10 text-slate-300" />
            <p className="mt-3 font-bold text-slate-800">Không có phòng phù hợp</p>
            <p className="mt-1 text-sm text-slate-500">Hãy thay đổi từ khóa hoặc bộ lọc đang chọn.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {rooms.map((room) => {
              const names = memberName(room);
              const image = roomImage(room);
              const percentage = Math.min(100, Math.round((room.currentOccupants / Math.max(1, room.maxOccupants)) * 100));
              return (
                <div key={room.id} className="grid grid-cols-[minmax(320px,1.4fr)_220px_minmax(260px,1fr)_150px] items-center gap-6 px-5 py-4 transition-colors hover:bg-orange-50/45">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {image ? <Image src={image} alt={room.title || 'Phòng'} width={96} height={64} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><BedDouble className="h-6 w-6 text-slate-300" /></div>}
                    </div>
                    <div className="min-w-0"><p className="truncate font-bold text-slate-950">{room.title || 'Phòng chưa đặt tên'}</p><p className="mt-1 truncate text-sm text-slate-500">{room.address || 'Chưa có địa chỉ'}</p></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm"><span className="font-bold text-slate-900">{room.currentOccupants}/{room.maxOccupants} người</span><span className={room.availableSlots ? 'text-emerald-700' : 'text-red-600'}>{room.availableSlots ? `Còn ${room.availableSlots} chỗ` : 'Đã đủ'}</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${room.availableSlots ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }} /></div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Thành viên hiện tại</p>
                    <p className="mt-1 truncate text-sm text-slate-700">{names.length ? names.join(', ') : 'Chưa có thành viên'}</p>
                    {room.formerCount > 0 && <p className="mt-1 text-xs text-violet-700">{room.formerCount} thành viên trong lịch sử</p>}
                  </div>
                  <Link href={`/room-management/tenants/${room.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-4 text-sm font-bold text-white shadow-md shadow-orange-100 transition hover:from-orange-500 hover:to-amber-400">Quản lý <ArrowRight className="h-4 w-4" /></Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
