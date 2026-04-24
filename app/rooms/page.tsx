'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

// Room card component with heart/favorite
function RoomCard({ room, isFavorite, onToggleFavorite }: { room: any; isFavorite: boolean; onToggleFavorite: () => void }) {
  return (
    <div className="group cursor-pointer h-full flex flex-col">
      <div className="relative overflow-hidden rounded-xl mb-4 aspect-[4/5] bg-gray-200">
        <img 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          src={room.image} 
          alt={room.title}
        />
        {room.badge && (
          <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider backdrop-blur-md ${room.badgeClass}`}>
            {room.badge}
          </div>
        )}
        
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
            📍 {room.location}
          </p>
        </div>

        <div className="pt-3 border-t border-gray-200 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-2xl font-black text-orange-600">${room.price.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase">/ tháng</p>
            </div>
            <div className="text-right text-xs text-gray-600">
              <div>📐 {room.area}m²</div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${room.avatarClass}`}>
              {room.ownerInitial}
            </div>
            <span className="text-xs text-gray-600">{room.owner}</span>
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
              ${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}
            </span>
          </div>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="5000"
              step="100"
              value={priceRange[0]}
              onChange={(e) => onPriceChange([parseInt(e.target.value), priceRange[1]])}
              className="w-full accent-orange-600"
            />
            <input
              type="range"
              min="0"
              max="5000"
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
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');

  const allRooms = [
    {
      id: 1,
      title: 'The Nordic Loft',
      location: 'Williamsburg, Brooklyn',
      price: 1850,
      area: 23,
      owner: 'Erik L.',
      ownerInitial: 'EL',
      type: 'Phòng riêng',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBhfd3vY2F4d3mZpS6-vamH-U7pEz4wLjKoemerALTYWz25cYCrAERSf1p02GdWa7MazFVmqGpjBxzpJNaisu2ngBYrFGT-rnCUQmpBNiEqBMn-OQc-wFFCzNPDXWTy9z7XhgSx51Ngp16vEXxSGnU8h0v-ElYNL4QWNBxm9K4O5J5OgH1dTUCd39HvSAwgiNJm40pbB56No41OWNCA4EwWxF00QKoQl4_MEjew7MExHjsks0W2AxSkCd30HbK6LWPZW2eFkSX-xYqT',
      badge: 'CÒN 1 PHÒNG TRỐNG',
      badgeClass: 'bg-white/90 text-orange-600',
      avatarClass: 'bg-orange-200 text-orange-700',
      amenities: ['Wi-Fi', 'Máy lạnh', 'Ban công']
    },
    {
      id: 2,
      title: 'Artisan Quarter',
      location: 'Greenpoint, Brooklyn',
      price: 1400,
      area: 18,
      owner: 'Sarah M.',
      ownerInitial: 'SM',
      type: 'Phòng chia sẻ',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB71MMEUgF6zeIiLtJQxArFyQ6tGoymXRzsWHGP5mXq9m4N-tyjg6nX7rpAkTfBDdAh0medgT1PiGrmxjItlnENGQ68xEB2BRVC9z6iP3JLEDVwz5TWx3y2aPFgL4RelZyW1ZwfRwJNcrjq2alTWHZG0KOJ7-Rcd3J4uyE4OUn1uaqNyrLMjKYdF9MUbv0dzd-FpAkjFstQ_StwL3xa4HQjmVDPEmrZyuy4ySmGL17iVyBJuHwDzhGmg60ANIXQ68xit-EMH79IiNLx',
      badge: 'YÊU THÍCH',
      badgeClass: 'bg-red-500/90 text-white',
      avatarClass: 'bg-blue-200 text-blue-700',
      amenities: ['Wi-Fi', 'Giặt ủi', 'Bếp']
    },
    {
      id: 3,
      title: 'The Heritage Suite',
      location: 'Brooklyn Heights',
      price: 2200,
      area: 29,
      owner: 'Julian H.',
      ownerInitial: 'JH',
      type: 'Phòng riêng',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9FVGTKrhN4htwxZ_JiD7yzGSegZlEtJGYfBpzgpNOjDOy9I2j4aTHfwTyB1mVPLNNcw99w0VNR5wC0Pbswb53gtP4-hkXQvCmfXMHTEFXTGcBp0WrggVDt5RWgBRG7Io858RNHXqn-scPwBZq1f4DuAMHHbgt03Pn8agvQtoeyLhEeGh39AKOslOhqtbgvhMOwEH49c5u1DiHl7beeR9AVWQQyvJaPOYtOdhjlgppr64gVXgIOkq-cqJ9vHqZoZ2Bnyvf_4i5sgjg',
      badge: 'MỚI CẬP NHẬT',
      badgeClass: 'bg-orange-600 text-white',
      avatarClass: 'bg-green-200 text-green-700',
      amenities: ['Máy lạnh', 'Phòng gym', 'Ban công']
    },
    {
      id: 4,
      title: 'The Digital Den',
      location: 'Dumbo, Brooklyn',
      price: 1650,
      area: 20,
      owner: 'Marcus C.',
      ownerInitial: 'MC',
      type: 'Studio',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuChLlW9lWqYj38YPPeBAsA99-GyA-w7-lcMW8nrKyDNoh2r02n7oljjGq90D426SzpG0ASN48m1CtJVOm-DNhVEOWf4Qk8IFNPYphtjZ_hiSpbeRstupWfI7ZLz_8scjbgHriHy-A7whCKCmUxCEKvpQ-5xDuvrY7MqBqFU5kLdtbY-6QMTWDHECS2exmWMUmuFOu2t3QuSs3NYmxiKsvb-AO4APkFzB1Qouu0Jxshw3eZcmVqfXBXe3MWS9Fps8nL8r0oKd2cFOq3l',
      badge: '',
      badgeClass: '',
      avatarClass: 'bg-purple-200 text-purple-700',
      amenities: ['Wi-Fi', 'Máy lạnh', 'Giặt ủi']
    }
  ];

  // Filter and sort logic
  const filteredRooms = useMemo(() => {
    let result = allRooms;

    // Search filter
    if (searchTerm) {
      result = result.filter(room =>
        room.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Price filter
    result = result.filter(room => room.price >= priceRange[0] && room.price <= priceRange[1]);

    // Room type filter
    if (selectedRoomTypes.length > 0) {
      result = result.filter(room => selectedRoomTypes.includes(room.type));
    }

    // Sort
    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'area-large') {
      result.sort((a, b) => b.area - a.area);
    }

    return result;
  }, [searchTerm, priceRange, selectedRoomTypes, sortBy]);

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
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {filteredRooms.length} phòng tìm thấy
              </h2>
            </div>

            {filteredRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    isFavorite={favorites.includes(room.id.toString())}
                    onToggleFavorite={() => handleToggleFavorite(room.id.toString())}
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
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}