'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

// Room card component
function RoomCard({ room }: { room: any }) {
  return (
    <div className="group cursor-pointer">
      <div className="relative overflow-hidden rounded-2xl mb-6 aspect-[4/5]" style={{ boxShadow: '0 20px 40px -10px rgba(26, 28, 31, 0.04)' }}>
        <img 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          src={room.image} 
          alt={room.title}
        />
        {room.badge && (
          <div className={`absolute top-6 left-6 px-4 py-1.5 rounded-full shadow-sm backdrop-blur-md ${room.badgeClass}`}>
            <span className="font-label text-[10px] font-black uppercase tracking-widest">{room.badge}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      <div className="px-2">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface group-hover:text-primary transition-colors">{room.title}</h3>
            <p className="text-on-surface-variant font-medium text-sm flex items-center gap-1.5">
              📍 {room.location}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-primary tracking-tighter">${room.price}</p>
            <p className="font-label text-[10px] font-bold text-outline-variant uppercase tracking-widest">/ THÁNG</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${room.avatarClass}`}>
              {room.ownerInitial}
            </div>
            <span className="text-xs font-semibold text-on-surface-variant">Chủ nhà: {room.owner}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-outline">
            📐 {room.area}m²
          </div>
        </div>
      </div>
    </div>
  );
}

// Filter sidebar component
function FilterSidebar() {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('Williamsburg');

  return (
    <aside className="w-full lg:w-72 flex-shrink-0">
      <div className="sticky top-32 space-y-10">
        {/* Neighborhoods */}
        <section>
          <h3 className="font-label text-xs font-bold uppercase tracking-widest text-outline mb-6">KHU VỰC</h3>
          <div className="space-y-3">
            {['Brooklyn Heights', 'Williamsburg', 'Greenpoint'].map((neighborhood) => (
              <label key={neighborhood} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  selectedNeighborhood === neighborhood 
                    ? 'border-primary bg-primary' 
                    : 'border-outline-variant group-hover:border-primary'
                }`}>
                  {selectedNeighborhood === neighborhood && (
                    <span className="text-white text-[16px]">✓</span>
                  )}
                </div>
                <span className={`text-sm ${selectedNeighborhood === neighborhood ? 'font-semibold' : 'font-medium'}`}>
                  {neighborhood}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Price Range */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <h3 className="font-label text-xs font-bold uppercase tracking-widest text-outline">THUÊ HÀNG THÁNG</h3>
            <span className="text-sm font-bold text-primary">$1,200 - $3,500</span>
          </div>
          <div className="relative h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div className="absolute left-1/4 right-1/4 h-full bg-primary-container"></div>
          </div>
        </section>

        {/* Amenities */}
        <section>
          <h3 className="font-label text-xs font-bold uppercase tracking-widest text-outline mb-6">TIỆN NGHI THIẾT YẾU</h3>
          <div className="flex flex-wrap gap-2">
            {['Wi-Fi tốc độ cao', 'Bếp chung', 'Vườn thượng uyển', 'Giặt ủi', 'Phòng gym'].map((amenity, index) => (
              <span 
                key={amenity}
                className={`px-4 py-2 rounded-md text-xs font-bold tracking-tight cursor-pointer transition-colors ${
                  index % 2 === 0 
                    ? 'bg-tertiary-fixed text-on-tertiary-container hover:bg-tertiary-container' 
                    : 'bg-surface-container-highest text-on-surface-variant hover:bg-tertiary-fixed'
                }`}
              >
                {amenity}
              </span>
            ))}
          </div>
        </section>

        {/* Room Type */}
        <section>
          <h3 className="font-label text-xs font-bold uppercase tracking-widest text-outline mb-6">LOẠI PHÒNG</h3>
          <div className="grid grid-cols-2 gap-2">
            <button className="px-4 py-3 bg-white text-xs font-bold border-2 border-primary text-primary rounded-xl">Phòng riêng</button>
            <button className="px-4 py-3 bg-surface-container-low text-xs font-bold text-on-surface-variant rounded-xl hover:bg-surface-container-high">Phòng chung</button>
          </div>
        </section>
      </div>
    </aside>
  );
}

// Main page component
export default function RoomsPage() {
  const rooms = [
    {
      id: 1,
      title: 'The Nordic Loft',
      location: 'Williamsburg, Brooklyn',
      price: 1850,
      area: 23,
      owner: 'Erik L.',
      ownerInitial: 'EL',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBhfd3vY2F4d3mZpS6-vamH-U7pEz4wLjKoemerALTYWz25cYCrAERSf1p02GdWa7MazFVmqGpjBxzpJNaisu2ngBYrFGT-rnCUQmpBNiEqBMn-OQc-wFFCzNPDXWTy9z7XhgSx51Ngp16vEXxSGnU8h0v-ElYNL4QWNBxm9K4O5J5OgH1dTUCd39HvSAwgiNJm40pbB56No41OWNCA4EwWxF00QKoQl4_MEjew7MExHjsks0W2AxSkCd30HbK6LWPZW2eFkSX-xYqT',
      badge: 'CÒN 1 PHÒNG TRỐNG',
      badgeClass: 'bg-white/90 text-primary',
      avatarClass: 'bg-primary-fixed-dim text-on-primary-fixed-variant'
    },
    {
      id: 2,
      title: 'Artisan Quarter',
      location: 'Greenpoint, Brooklyn',
      price: 1400,
      area: 18,
      owner: 'Sarah M.',
      ownerInitial: 'SM',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB71MMEUgF6zeIiLtJQxArFyQ6tGoymXRzsWHGP5mXq9m4N-tyjg6nX7rpAkTfBDdAh0medgT1PiGrmxjItlnENGQ68xEB2BRVC9z6iP3JLEDVwz5TWx3y2aPFgL4RelZyW1ZwfRwJNcrjq2alTWHZG0KOJ7-Rcd3J4uyE4OUn1uaqNyrLMjKYdF9MUbv0dzd-FpAkjFstQ_StwL3xa4HQjmVDPEmrZyuy4ySmGL17iVyBJuHwDzhGmg60ANIXQ68xit-EMH79IiNLx',
      badge: 'YÊU THÍCH',
      badgeClass: 'bg-secondary/90 text-white',
      avatarClass: 'bg-secondary-fixed-dim text-on-secondary-fixed-variant'
    },
    {
      id: 3,
      title: 'The Heritage Suite',
      location: 'Brooklyn Heights',
      price: 2200,
      area: 29,
      owner: 'Julian H.',
      ownerInitial: 'JH',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9FVGTKrhN4htwxZ_JiD7yzGSegZlEtJGYfBpzgpNOjDOy9I2j4aTHfwTyB1mVPLNNcw99w0VNR5wC0Pbswb53gtP4-hkXQvCmfXMHTEFXTGcBp0WrggVDt5RWgBRG7Io858RNHXqn-scPwBZq1f4DuAMHHbgt03Pn8agvQtoeyLhEeGh39AKOslOhqtbgvhMOwEH49c5u1DiHl7beeR9AVWQQyvJaPOYtOdhjlgppr64gVXgIOkq-cqJ9vHqZoZ2Bnyvf_4i5sgjg',
      badge: 'MỚI CẬP NHẬT',
      badgeClass: 'bg-primary text-white',
      avatarClass: 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant'
    },
    {
      id: 4,
      title: 'The Digital Den',
      location: 'Dumbo, Brooklyn',
      price: 1650,
      area: 20,
      owner: 'Marcus C.',
      ownerInitial: 'MC',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuChLlW9lWqYj38YPPeBAsA99-GyA-w7-lcMW8nrKyDNoh2r02n7oljjGq90D426SzpG0ASN48m1CtJVOm-DNhVEOWf4Qk8IFNPYphtjZ_hiSpbeRstupWfI7ZLz_8scjbgHriHy-A7whCKCmUxCEKvpQ-5xDuvrY7MqBqFU5kLdtbY-6QMTWDHECS2exmWMUmuFOu2t3QuSs3NYmxiKsvb-AO4APkFzB1Qouu0Jxshw3eZcmVqfXBXe3MWS9Fps8nL8r0oKd2cFOq3l',
      badge: '',
      badgeClass: '',
      avatarClass: 'bg-primary-fixed-dim text-on-primary-fixed-variant'
    }
  ];

  return (
    <>
      <Navigation />
      <main className="pt-32 pb-20 px-8 max-w-screen-2xl mx-auto">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-headline font-extrabold tracking-tight mb-4 leading-tight">
              Khám Phá Không Gian{' '}
              <span style={{ background: 'linear-gradient(135deg, #944a00 0%, #f28c38 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Sống Lý Tưởng
              </span>
              {' '}Của Bạn
            </h1>
            <p className="text-on-surface-variant text-lg max-w-lg leading-relaxed">Tuyển chọn những không gian sống chung tinh tế dành cho nhịp sống hiện đại.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-6 py-3 bg-surface-container-high rounded-full font-label font-bold text-xs uppercase tracking-widest hover:bg-surface-container-highest transition-all">
              🗺️ XEM BẢN ĐỒ
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-full font-label font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all">
              ⚙️ LỌC
            </button>
          </div>
        </header>
        <div className="flex flex-col lg:flex-row gap-12">
          <FilterSidebar />
          {/* Main Listing Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-16">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}