'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

interface Room {
  id: string;
  title: string;
  description: string;
  address: string;
  price: number;
  area: string;
  image: string | string[];
  status: string;
  ownerId: string;
  owner?: {
    name: string;
    fullName: string;
  };
  createdAt: string;
  amenities?: any[];
}

// Room card component with heart/favorite
function RoomCard({ room, isFavorite, onToggleFavorite }: { room: Room; isFavorite: boolean; onToggleFavorite: () => void }) {
  const imageUrl = Array.isArray(room.image) ? room.image[0] : room.image;
  const ownerInitial = room.owner?.name?.charAt(0).toUpperCase() || 'U';
  const ownerName = room.owner?.fullName || room.owner?.name || 'Owner';
  
  return (
    <div className="group cursor-pointer h-full flex flex-col">
      <div className="relative overflow-hidden rounded-xl mb-4 aspect-[4/5] bg-gray-200">
        <img 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          src={imageUrl || 'https://via.placeholder.com/400x500?text=Room'}
          alt={room.title}
        />
        <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider backdrop-blur-md ${
          room.status === 'AVAILABLE' 
            ? 'bg-white/90 text-orange-600' 
            : room.status === 'OCCUPIED'
            ? 'bg-red-500/90 text-white'
            : 'bg-yellow-500/90 text-white'
        }`}>
          {room.status === 'AVAILABLE' ? 'CÒN TRỐNG' : room.status === 'OCCUPIED' ? 'ĐÃ CHO THUÊ' : 'BẢO TRÌ'}
        </div>
        
        {/* Favorite Button */}
        <button
          onClick={onToggleFavorite}
          className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white transition-all shadow-md"
        >
          <span className={`text-xl transition-all ${isFavorite ? '❤️ scale-110' : '🤍'}`}>
            {isFavorite ? '❤️' : '🤍'}
          </span>
        </button>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="mb-3 flex-1">
          <h3 className="font-headline text-lg font-bold tracking-tight text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2">
            {room.title}
          </h3>
          <p className="text-gray-600 font-medium text-sm mt-1 flex items-center gap-1">
            📍 {room.address}
          </p>
        </div>

        <div className="pt-3 border-t border-gray-200 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-2xl font-black text-orange-600">₫ {room.price.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase">/ tháng</p>
            </div>
            <div className="text-right text-xs text-gray-600">
              <div>📐 {room.area}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-orange-500">
              {ownerInitial}
            </div>
            <span className="text-xs text-gray-600">{ownerName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Filter sidebar
function FilterSidebar({ 
  selectedNeighborhoods, 
  onNeighborhoodChange,
  priceRange,
  onPriceChange,
  selectedAmenities,
  onAmenityChange,
  selectedRoomTypes,
  onRoomTypeChange,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange
}: any) {
  const neighborhoods = ['Quận 1', 'Quận 3', 'Quận 5', 'Quận 7', 'Quận 10'];
  const amenities = ['Wi-Fi', 'Máy lạnh', 'Bếp', 'Phòng gym', 'Giặt ủi', 'Ban công'];
  const roomTypes = ['Phòng riêng', 'Phòng chia sẻ', 'Studio'];

  return (
    <aside className="w-full lg:w-80 flex-shrink-0">
      <div className="sticky top-32 space-y-6 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        
        {/* Search */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-700 mb-3">Tìm kiếm</label>
          <input
            type="text"
            placeholder="Tên phòng, địa điểm..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Neighborhoods */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-3">Khu vực</h3>
          <div className="space-y-2.5">
            {neighborhoods.map((neighborhood) => (
              <label key={neighborhood} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedNeighborhoods.includes(neighborhood)}
                  onChange={() => onNeighborhoodChange(neighborhood)}
                  className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                />
                <span className="text-sm text-gray-700 group-hover:text-orange-600 transition-colors">
                  {neighborhood}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700">Giá thuê</h3>
            <span className="text-sm font-bold text-orange-600">
              ₫ {priceRange[0].toLocaleString()} - ₫ {priceRange[1].toLocaleString()}
            </span>
          </div>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="10000000"
              step="100"
              value={priceRange[0]}
              onChange={(e) => onPriceChange([parseInt(e.target.value), priceRange[1]])}
              className="w-full accent-orange-600"
            />
            <input
              type="range"
              min="0"
              max="10000000"
              step="100"
              value={priceRange[1]}
              onChange={(e) => onPriceChange([priceRange[0], parseInt(e.target.value)])}
              className="w-full accent-orange-600"
            />
          </div>
        </div>

        {/* Room Type */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-3">Loại phòng</h3>
          <div className="space-y-2.5">
            {roomTypes.map((roomType) => (
              <label key={roomType} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedRoomTypes.includes(roomType)}
                  onChange={() => onRoomTypeChange(roomType)}
                  className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                />
                <span className="text-sm text-gray-700 group-hover:text-orange-600 transition-colors">
                  {roomType}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-3">Tiện nghi</h3>
          <div className="grid grid-cols-2 gap-2">
            {amenities.map((amenity) => (
              <button
                key={amenity}
                onClick={() => onAmenityChange(amenity)}
                className={`px-3 py-2.5 rounded-lg text-xs font-semibold transition-all border ${
                  selectedAmenities.includes(amenity)
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:border-orange-600 hover:bg-orange-50'
                }`}
              >
                {amenity}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-3">Sắp xếp</h3>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
          >
            <option value="newest">Mới nhất</option>
            <option value="price-low">Giá: Thấp đến cao</option>
            <option value="price-high">Giá: Cao đến thấp</option>
            <option value="area-large">Diện tích: Lớn nhất</option>
          </select>
        </div>
      </div>
    </aside>
  );
}

// Main page component
export default function RoomsPage() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 10000000]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1); // Reset to page 1 when filters change
  }, [searchTerm, priceRange, selectedNeighborhoods, selectedAmenities, selectedRoomTypes, sortBy]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        
        // Add search
        if (searchTerm) {
          params.append('search', searchTerm);
        }
        
        // Add price range
        if (priceRange[0] > 0) {
          params.append('minPrice', priceRange[0].toString());
        }
        if (priceRange[1] < 10000000) {
          params.append('maxPrice', priceRange[1].toString());
        }
        
        // Add neighborhoods
        selectedNeighborhoods.forEach(neighborhood => {
          params.append('neighborhoods', neighborhood);
        });
        
        // Add amenities
        selectedAmenities.forEach(amenity => {
          params.append('amenities', amenity);
        });
        
        // Add room types
        selectedRoomTypes.forEach(roomType => {
          params.append('roomTypes', roomType);
        });
        
        // Add sort
        if (sortBy) {
          params.append('sortBy', sortBy);
        }
        
        const response = await fetch(`/api/rooms?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch rooms');
        }
        const data = await response.json();
        setRooms(data.data.rooms || []);
        setTotal(data.data.total || 0);
      } catch (err) {
        console.error('Error fetching rooms:', err);
        setError('Không thể tải danh sách phòng');
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, [page, searchTerm, priceRange, selectedNeighborhoods, selectedAmenities, selectedRoomTypes, sortBy]);


  // Tổng số trang
  const totalPages = Math.ceil(total / limit);

  const handleToggleFavorite = (roomId: string) => {
    setFavorites(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  return (
    <>
      <Navigation />
      <main className="pt-20 pb-20 px-4 sm:px-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-gray-900">
            Khám Phá Không Gian{' '}
            <span className="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
              Sống Lý Tưởng
            </span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Tuyển chọn những không gian sống chung tinh tế dành cho nhịp sống hiện đại.
          </p>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters */}
          <FilterSidebar
            selectedNeighborhoods={selectedNeighborhoods}
            onNeighborhoodChange={(neighborhood: string) => {
              setSelectedNeighborhoods(prev =>
                prev.includes(neighborhood)
                  ? prev.filter(n => n !== neighborhood)
                  : [...prev, neighborhood]
              );
            }}
            priceRange={priceRange}
            onPriceChange={setPriceRange}
            selectedAmenities={selectedAmenities}
            onAmenityChange={(amenity: string) => {
              setSelectedAmenities(prev =>
                prev.includes(amenity)
                  ? prev.filter(a => a !== amenity)
                  : [...prev, amenity]
              );
            }}
            selectedRoomTypes={selectedRoomTypes}
            onRoomTypeChange={(roomType: string) => {
              setSelectedRoomTypes(prev =>
                prev.includes(roomType)
                  ? prev.filter(t => t !== roomType)
                  : [...prev, roomType]
              );
            }}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          {/* Rooms Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">⏳</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Đang tải danh sách phòng...</h3>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">❌</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{error}</h3>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {total} phòng tìm thấy
                  </h2>
                  {totalPages > 1 && (
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1 rounded border text-sm font-semibold disabled:opacity-50"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        Trang trước
                      </button>
                      <span className="px-2 py-1 text-sm">{page} / {totalPages}</span>
                      <button
                        className="px-3 py-1 rounded border text-sm font-semibold disabled:opacity-50"
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                      >
                        Trang sau
                      </button>
                    </div>
                  )}
                </div>

                {rooms.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rooms.map((room) => (
                      <RoomCard
                        key={room.id}
                        room={room}
                        isFavorite={favorites.includes(room.id)}
                        onToggleFavorite={() => handleToggleFavorite(room.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <div className="text-5xl mb-4">🔍</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Không tìm thấy phòng</h3>
                    <p className="text-gray-600">Thử điều chỉnh các bộ lọc của bạn để xem thêm kết quả.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}