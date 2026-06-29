'use client';

/* eslint-disable react/no-unescaped-entities */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import {
  roomClientService,
  Room,
} from '@/lib/services/room-client.service'
import RoomsMap from '../components/GoogleRoomMap';
import { useAuth } from '@/lib/hooks/useAuth';

interface UserOccupancy {
  occupancy: {
    id: string;
    status: string;
    room: {
      id: string;
      title: string;
      address: string;
    };
  } | null;
  ownedRooms: {
    id: string;
    title: string;
    address: string;
  }[];
}

export default function HomePage() {
  const { user } = useAuth();
  const [location, setLocation] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [roomType, setRoomType] = useState('Suite Riêng tư');
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] =
    useState<Room | null>(null)
  const [occupancy, setOccupancy] = useState<UserOccupancy | null>(null);
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search:', { location, moveInDate, roomType });
  };
    useEffect(() => {
      const loadRooms =
        async () => {

          try {
            const data =
              await roomClientService
                .getMapRooms()
            setRooms(data)
          } catch (error) {
            console.error(error)
          }
        }

      loadRooms()

    }, [])

    useEffect(() => {
      if (!user?.id) return;

      const loadOccupancy = async () => {
        try {
          const res = await fetch('/api/user/occupancy', {
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            setOccupancy(data);
          }
        } catch (error) {
          console.error('Error loading occupancy:', error);
        }
      };

      loadOccupancy();
    }, [user?.id]);
  const handleNewsletterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Newsletter signup');
  };

  return (
    <>
      <Navigation />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative h-[870px] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              alt="Không gian co-living sang trọng"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhcdk72WCvxNCwMJ1l2loPc7PYpkJv0DAkVeY_Trh_cRRFNf8VphDVngZkSIb0myzjILLuzF5BNy6PboGB1H-l4_dktfGlRcS4v--ItJQd8jUUs7RmLgboUnBKNK6SeYle3bnMW8rkrBG0JAxnRhZqRjp-XeDYBFdmWuaiRyG6pbSJyWrgASN6wInpvm5HCWFmDQ-Nv_6qrHTJUGls-vt8ZN8A8DxNEjiCBCqEgucXjbwzHtJfaE9Ukh_Zhpcg3slBg4yzG4-5Q3Ir"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/40 to-transparent"></div>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-8 w-full">
            <div className="max-w-2xl">
              <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-orange-100 text-orange-900 font-label text-[10px] font-bold tracking-[0.2em] uppercase">
                Tái định nghĩa Không gian sống chung
              </span>
              <h1 className="font-headline text-[3.5rem] leading-[1.1] font-extrabold tracking-tighter text-slate-900 mb-8">
                Nghệ thuật của <span className="text-orange-600 italic">sự gắn kết</span>, được tuyển chọn tinh tế.
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed mb-12 max-w-lg">
                Vượt xa những căn hộ thông thường. Trải nghiệm lối sống được định nghĩa bởi cộng đồng, sự sang trọng linh hoạt và những không gian khơi nguồn cảm hứng cho công việc và cuộc sống của bạn.
              </p>
            </div>

            {/* Search Bar Floating */}
            <div className="editorial-shadow bg-white rounded-full p-2 max-w-5xl flex items-center gap-2">
              <form onSubmit={handleSearch} className="w-full flex items-center gap-2">
                <div className="flex-1 px-6 py-3 flex items-center space-x-3">
                  <span className="material-symbols-outlined text-orange-600">location_on</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Địa điểm</span>
                    <input
                      className="bg-transparent border-none p-0 focus:ring-0 text-slate-900 placeholder:text-slate-400 font-medium outline-none"
                      placeholder="Bạn muốn đến đâu?"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>
                <div className="w-px h-10 bg-slate-300 hidden md:block"></div>
                <div className="flex-1 px-6 py-3 flex items-center space-x-3">
                  <span className="material-symbols-outlined text-orange-600">calendar_today</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ngày dọn vào</span>
                    <input
                      className="bg-transparent border-none p-0 focus:ring-0 text-slate-900 placeholder:text-slate-400 font-medium outline-none"
                      placeholder="Chọn ngày"
                      type="text"
                      value={moveInDate}
                      onChange={(e) => setMoveInDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="w-px h-10 bg-slate-300 hidden lg:block"></div>
                <div className="flex-1 px-6 py-3 flex items-center space-x-3 hidden lg:flex">
                  <span className="material-symbols-outlined text-orange-600">bed</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Loại phòng</span>
                    <select
                      className="bg-transparent border-none p-0 focus:ring-0 text-slate-900 font-medium appearance-none outline-none"
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value)}
                    >
                      <option>Suite Riêng tư</option>
                      <option>Studio Chung</option>
                      <option>Penthouse Loft</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="shrink-0 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white h-14 px-8 rounded-full flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/30 font-bold tracking-tight whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-lg">search</span>
                  <span>Tìm không gian</span>
                </button>
              </form>
            </div>

            {/* Smart Search Button */}
            <div className="mt-6 flex justify-center">
              <Link href="/preferences" className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all">
                <span className="material-symbols-outlined text-blue-600 group-hover:scale-110 transition-transform">auto_awesome</span>
                <span className="font-bold text-blue-900">Tìm phòng bằng AI thông minh</span>
                <span className="material-symbols-outlined text-blue-600 group-hover:translate-x-1 transition-transform">arrow_right_alt</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Access to Shared Space */}
        {occupancy && (occupancy.occupancy || occupancy.ownedRooms.length > 0) && (
          <section className="py-12 bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="max-w-7xl mx-auto px-8">
              <div className="text-center mb-8">
                <span className="inline-block px-4 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider mb-4">
                  Truy cập nhanh
                </span>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                  Không gian chung của bạn
                </h2>
                <p className="text-slate-600">
                  Quản lý tiện ích, lịch trực nhật và bảng tin phòng
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {occupancy.occupancy && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-orange-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                          Phòng đang ở
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                          {occupancy.occupancy.room.title}
                        </p>
                        <Link
                          href={`/rooms/${occupancy.occupancy.room.id}/shared-space`}
                          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">apartment</span>
                          Vào Sảnh Chung
                        </Link>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <span className="material-symbols-outlined text-2xl text-orange-600">home</span>
                      </div>
                    </div>
                  </div>
                )}

                {occupancy.ownedRooms.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                          Phòng bạn quản lý ({occupancy.ownedRooms.length})
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                          {occupancy.ownedRooms.map(room => room.title).join(', ')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {occupancy.ownedRooms.map(room => (
                            <Link
                              key={room.id}
                              href={`/rooms/${room.id}/shared-space`}
                              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">apartment</span>
                              {room.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <span className="material-symbols-outlined text-2xl text-blue-600">admin_panel_settings</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

{/* Map Section */}
<section className="py-20 bg-slate-50">
  <div className="max-w-7xl mx-auto px-8">

    <div className="text-center mb-12">
      <span
        className="
          inline-block
          px-4
          py-1
          rounded-full
          bg-orange-100
          text-orange-700
          text-xs
          font-bold
          tracking-wider
          uppercase
          mb-4
        "
      >
        Khám phá trên bản đồ
      </span>

      <h2
        className="
          text-4xl
          font-bold
          tracking-tight
          text-slate-900
          mb-3
        "
      >
        Tìm phòng theo vị trí
      </h2>

      <p
        className="
          text-slate-600
          max-w-2xl
          mx-auto
        "
      >
        Chọn một vị trí trên bản đồ để xem nhanh
        thông tin phòng phù hợp với nhu cầu của bạn.
      </p>
    </div>

    <div
      className="
        grid
        lg:grid-cols-12
        gap-6
      "
    >

      {/* MAP */}
      <div
        className="
          lg:col-span-8
          rounded-3xl
          overflow-hidden
          shadow-xl
          border
          bg-white
        "
      >

        <RoomsMap
          rooms={rooms}
          onSelectRoom={setSelectedRoom}
        />

      </div>

      {/* SIDEBAR */}
      <div
        className="
          lg:col-span-4
        "
      >

        {selectedRoom ? (

          <div
            className="
              sticky
              top-24
              rounded-3xl
              overflow-hidden
              bg-white
              border
              shadow-xl
            "
          >

            <img
              src={
                selectedRoom.image ||
                "/images/no-image.jpg"
              }
              alt={selectedRoom.title}
              className="
                h-64
                w-full
                object-cover
              "
            />

            <div className="p-6">

              <h3
                className="
                  text-2xl
                  font-bold
                  text-slate-900
                "
              >
                {selectedRoom.title}
              </h3>

              <p
                className="
                  mt-3
                  text-orange-600
                  text-xl
                  font-bold
                "
              >
                {Number(
                  selectedRoom.priceValue
                ).toLocaleString("vi-VN")}
                đ
              </p>

              <p
                className="
                  mt-4
                  text-slate-600
                  leading-relaxed
                "
              >
                {selectedRoom.address}
              </p>

              <Link
                href={`/rooms/${selectedRoom.id}`}
                className="
                  mt-6
                  flex
                  items-center
                  justify-center
                  rounded-xl
                  bg-orange-500
                  py-3
                  text-white
                  font-semibold
                  hover:bg-orange-600
                  transition-colors
                "
              >
                Xem chi tiết
              </Link>

            </div>

          </div>

        ) : (

          <div
            className="
              h-full
              min-h-[600px]
              rounded-3xl
              border
              bg-white
              shadow-xl
              flex
              flex-col
              items-center
              justify-center
              text-center
              p-8
            "
          >

            <div
              className="
                w-20
                h-20
                rounded-full
                bg-orange-100
                flex
                items-center
                justify-center
                mb-5
              "
            >
              <span className="material-symbols-outlined text-4xl text-orange-600">
                location_on
              </span>
            </div>

            <h3
              className="
                text-xl
                font-bold
                text-slate-900
                mb-2
              "
            >
              Chưa chọn phòng
            </h3>

            <p className="text-slate-500">
              Hãy nhấn vào một marker trên bản đồ để
              xem thông tin chi tiết.
            </p>

          </div>

        )}

      </div>

    </div>

  </div>
</section>
        {/* Featured Listings (Bento Grid Style) */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <h2 className="font-headline text-3xl font-bold tracking-tight text-slate-900 mb-2">Lựa chọn từ Biên tập viên</h2>
                <p className="text-slate-600 font-body">Những nơi cư trú được tuyển chọn kỹ lưỡng tại các khu vực sôi động nhất thế giới.</p>
              </div>
              <a className="group flex items-center space-x-2 text-orange-600 font-bold" href="#">
                <span>Xem tất cả điểm đến</span>
                <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_right_alt</span>
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Featured Large Card */}
              <div className="md:col-span-8 group relative overflow-hidden rounded-xl h-[500px]">
                <img
                  alt="Căn hộ cao cấp"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuChZ7JFQA_HT38YA1e3TQVA7d54wYO6eJaskyXrs41C25XAZfnGgDKjJMlL4p_w5HZCQdma5XGQ3CX3S__3bbjoPpUF3rvE7_L_wAmxNfLnE89xrwXFTUtnJOb5B0FAny4PxYGjdOXaBa0y0JWcbam8v6cOy-J1TyLcPmP5T-rWZ-ihBkhFZVwM2DFqlvY89dYcUCQQsWM41F0M0iQpkPY2s1xcpWel2JV6hSTBrHEEcLMfhg5mJvJ4eXfOir2XB3JgYVvBDBVrvMF-"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-10 text-white w-full flex justify-between items-end">
                  <div>
                    <div className="flex gap-2 mb-4">
                      <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase">London, Shoreditch</span>
                      <span className="bg-orange-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase">Phổ biến</span>
                    </div>
                    <h3 className="font-headline text-3xl font-bold mb-2">The Brickwork House</h3>
                    <p className="text-white/80 max-w-sm">Một kiến trúc cải tạo lịch sử với 12 suite riêng tư và vườn trên mái nhìn ra đường chân trời thành phố.</p>
                  </div>
                  <div className="bg-white text-slate-900 p-6 rounded-xl text-center editorial-shadow transform translate-y-4 group-hover:translate-y-0 transition-transform">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Bắt đầu từ</p>
                    <p className="text-2xl font-extrabold tracking-tight">
                      £1,850<span className="text-sm font-normal text-slate-500">/tháng</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Side Grid Column */}
              <div className="md:col-span-4 flex flex-col gap-8">
                <div className="flex-1 group relative overflow-hidden rounded-xl">
                  <img
                    alt="Phòng thoải mái"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXcTgabXuuOlorraJEHjz-xWYM8tiYciBFdLrAxCFykt4cMRfbThy5IdeKn-ps_2lnOag6rIkkv1OuA7z6a-pnvjRU-FqbDU4sbfHf4SBBD1MQFy2CoPypwVnU4EweOq6EHdWlsQfsvDo_g66EkZbScbrhxzkfSez2Hp1FVaqNQCqpnf-vRBm_VCQTokc688xMdgNwRsuAA-jSWjdL5O60b1XA8MXTXw8jrL91LKeI9WX2hOrWNrB3wv0GuhMujwZxf2FoabUYv6bJ"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-6 text-white">
                    <h4 className="font-headline text-xl font-bold">The Nomad Studio</h4>
                    <p className="text-sm text-white/80">Berlin • Mitte</p>
                  </div>
                </div>
                <div className="flex-1 group relative overflow-hidden rounded-xl">
                  <img
                    alt="Không gian sống hiện đại"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2a9Ff2340AYsnWScJEVZ9EngKLyTwaxVAyF7iQvz3D0fsAsOKvtdPhetYZKwjhnLynipy39davEG4liTE17mklDRohQY3n9PPndjCcV2Lg5PWcpdIgglKu4tW6n2-l7mjEPZjuluCavGJxXmXbaNR0nQlnOCF6mPDFTlcrzjymFvuUUeA13OdkALrtts3BZxmpIVzGhPmEzIUSgOe7ocVYR0uFDknZVP1lfKU7W20B23_P3Z4iX0TdttzKBlCpTj-V7KWNe4eVDJ0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-6 text-white">
                    <h4 className="font-headline text-xl font-bold">Arcade Lofts</h4>
                    <p className="text-sm text-white/80">Barcelona • Gràcia</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us (Asymmetric Layout) */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="relative">
                <div className="absolute -top-12 -left-12 w-48 h-48 bg-orange-200/20 rounded-full blur-3xl"></div>
                <img
                  alt="Cộng đồng tươi cười"
                  className="rounded-xl relative z-10 editorial-shadow grayscale hover:grayscale-0 transition-all duration-1000"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAsNZxSeG2RPJRNOzaQ9JUeDvv71zeoHMp0mayIkLFwG_rKBFjKorAjwEoZSKGR83-3JJY00-9-WUYkVHcKKVyXk_jMnlCb-HfepeWkxaRDv3_hjYcVjRGv9E1l6nEM8-z-kgT_PN9XBXx95LE98OO6GUx0k49cLLdMcWCVD63SF2-7leUmSvNlyeAqIqJet4PeNdREtGwJFlLEcG9Sxbfr6MlkH_wdBdSU8ywAGy6WP2TSBDQQ3HGhzg8EFDIbSQAgFzHrKebEHBDW"
                />
                <div className="absolute -bottom-10 -right-10 bg-white p-8 rounded-xl shadow-xl z-20 max-w-xs hidden md:block">
                  <span className="material-symbols-outlined text-orange-600 text-4xl mb-4">format_quote</span>
                  <p className="italic text-slate-600 mb-4">"Nó không chỉ là một phòng; đó là nơi tôi tìm thấy các đối tác kinh doanh và những người bạn tốt nhất."</p>
                  <p className="font-bold text-sm">— Elena M., Người sáng lập</p>
                </div>
              </div>
              <div className="space-y-12">
                <div className="text-left">
                  <h2 className="font-headline text-4xl font-extrabold tracking-tight mb-6">
                    Thiết kế cho <span className="text-orange-600 italic">tâm hồn hiện đại</span>.
                  </h2>
                  <p className="text-lg text-slate-600 leading-relaxed">Chúng tôi tin rằng nhà của bạn nên là sự mở rộng của những tham vọng của bạn. Mỗi không gian được thiết kế tỉ mỉ để cân bằng giữa quyền riêng tư và khả năng.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  <div>
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 editorial-shadow">
                      <span className="material-symbols-outlined text-orange-600">groups</span>
                    </div>
                    <h4 className="font-bold text-lg mb-2">Cộng đồng Triệt để</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">Các bữa tối của đầu bếp hàng tuần, loạt bài hội thảo và các phiên wellness theo tiêu chuẩn.</p>
                  </div>
                  <div>
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 editorial-shadow">
                      <span className="material-symbols-outlined text-orange-600">bolt</span>
                    </div>
                    <h4 className="font-bold text-lg mb-2">Tính linh hoạt Toàn bộ</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">Ở lại một tháng, hoặc một năm. Chuyển vào các thành phố khác với thông báo trước 30 ngày.</p>
                  </div>
                  <div>
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 editorial-shadow">
                      <span className="material-symbols-outlined text-orange-600">chair</span>
                    </div>
                    <h4 className="font-bold text-lg mb-2">Thiết kế Biên tập</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">Nội thất được thiết kế bởi các kiến trúc sư đoạt giải thưởng vì sự đẹp và chức năng.</p>
                  </div>
                  <div>
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 editorial-shadow">
                      <span className="material-symbols-outlined text-orange-600">wifi</span>
                    </div>
                    <h4 className="font-bold text-lg mb-2">Tiện ích Liền mạch</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">Một hóa đơn bao gồm tất cả các chi phí bao gồm WiFi cực nhanh, dọn dẹp và vật tư.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter / CTA */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-8">
            <div className="bg-slate-900 rounded-3xl p-12 md:p-20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-20">
                <img
                  alt="Không gian văn phòng"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZ_1hraTV-gfUANJwcY8U18fmYa2NF0w_tcav0GmAcpZz_DA8zjk_p7OWWgb7hZ-FvJi38yePEaGyWZS64rLIS-dySerMzMCFcE4xsWEL5KdSeV-k0v91eZdlyN0N77T0jI29YCOsT9ygi5z95MdsTr9L4Jk4ov5Zi4Nz1GOip1Yh95fh60cz6I0Ze4W2B_dAfR3F8BQH-kKTX0Q5_WyqP3zU1KPBWiQbILx58az47ZRbyS5hr_mvcVcN58xcqCFSngJW4PBksX6Le"
                />
              </div>
              <div className="relative z-10 max-w-xl">
                <h2 className="font-headline text-4xl font-bold text-white mb-6">Ở lại vì câu chuyện.</h2>
                <p className="text-white/70 text-lg mb-10">Nhận quyền truy cập sớm vào các vị trí mở mới của chúng tôi và các sự kiện cộng đồng độc quyền được gửi đến hộp thư của bạn.</p>
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4">
                  <input
                    className="flex-1 bg-white/10 border border-white/20 rounded-full px-6 py-4 text-white placeholder:text-white/40 focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Địa chỉ email của bạn"
                    type="email"
                  />
                  <button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-4 rounded-full transition-colors whitespace-nowrap"
                  >
                    Tham gia
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
