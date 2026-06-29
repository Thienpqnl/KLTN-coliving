"use client";

import React, { useState, useEffect, use } from 'react';
import { sharedSpaceClientService, SharedResource, SharedActivity } from '@/lib/services/shared-space-client.service';
import { useAuth } from '@/lib/hooks/useAuth';
import BookingModal from '../../components/BookingModal';
import { Zap, Droplets, Calculator, Image as ImageIcon, Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { uploadImage } from '@/lib/upload';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SharedSpacePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  const { user } = useAuth();
  
  const [resources, setResources] = useState<SharedResource[]>([]);
  const [activities, setActivities] = useState<SharedActivity[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'booking'>('all');
  const [weekDays, setWeekDays] = useState<{ dayName: string; dayNum: number; dateStr: string }[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  // Utility bill state
  const [contract, setContract] = useState<any>(null);
  const [showUtilityCalculator, setShowUtilityCalculator] = useState(false);
  const [electricityUsage, setElectricityUsage] = useState('');
  const [waterUsage, setWaterUsage] = useState('');
  const [utilityBills, setUtilityBills] = useState<any[]>([]);
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<any>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const hoursGrid = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
  useEffect(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + distanceToMonday);

    const days = [];
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(startOfWeek);
      nextDay.setDate(startOfWeek.getDate() + i);
      days.push({
        dayName: dayNames[i],
        dayNum: nextDay.getDate(),
        dateStr: nextDay.toLocaleDateString('sv-SE') 
      });
    }
    setWeekDays(days);
  }, []);

  const fetchSharedSpaceData = async () => {
    try {
      setLoading(true);
      const [resData, actData] = await Promise.all([
        sharedSpaceClientService.getCalendar(roomId),
        sharedSpaceClientService.getActivities(roomId)
      ]);
      setResources(resData);
      setActivities(actData);
      if (resData.length > 0 && !selectedResourceId) {
        setSelectedResourceId(resData[0].id);
      }
    } catch (err) {
      console.error("Lỗi đồng bộ dữ liệu không gian chung:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedSpaceData();
    fetchContractData();
  }, [roomId]);

  const fetchContractData = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/contract`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setContract(data.data);
          // Fetch utility bills for this contract
          const billsResponse = await fetch(`/api/contracts/${data.data.id}/utility-bills`);
          if (billsResponse.ok) {
            const billsData = await billsResponse.json();
            if (billsData.success) {
              setUtilityBills(billsData.data);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching contract:", error);
    }
  };

  const handleBookingSuccess = () => {
    fetchSharedSpaceData();
    setShowBookingModal(false);
  };

  const calculateUtilityCost = () => {
    if (!contract) return { electricity: 0, water: 0, total: 0 };
    
    const elecUsage = parseFloat(electricityUsage) || 0;
    const waterUsageVal = parseFloat(waterUsage) || 0;
    
    const electricityCost = elecUsage * (contract.electricityRate || 0);
    const waterCost = waterUsageVal * (contract.waterRate || 0);
    
    return {
      electricity: electricityCost,
      water: waterCost,
      total: electricityCost + waterCost
    };
  };

  const handleSubmitPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPayment || !paymentProofFile) return alert("Vui lòng chọn ảnh minh chứng");
    
    try {
      setIsUploading(true);
      // Upload image to Cloudinary
      const imageUrl = await uploadImage(paymentProofFile);
      
      const response = await fetch(`/api/utility-bills/${selectedBillForPayment.id}/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentProofUrl: imageUrl })
      });
      
      if (response.ok) {
        alert("Đã gửi minh chứng thanh toán thành công!");
        setShowPaymentProofModal(false);
        setPaymentProofFile(null);
        setSelectedBillForPayment(null);
        fetchContractData(); // Refresh bills
      } else {
        alert("Lỗi khi gửi minh chứng thanh toán");
      }
    } catch (error) {
      alert("Lỗi khi upload ảnh hoặc gửi minh chứng thanh toán");
    } finally {
      setIsUploading(false);
    }
  };
  const selectedResource = resources.find(r => r.id === selectedResourceId);
  const visibleBookings = selectedResource?.resourceBookings.filter(b => {
    return b.status !== 'CANCELLED';
  }) || [];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 flex font-sans antialiased selection:bg-amber-200">
      
      {/* SIDEBAR TRÁI */}
      <aside className="w-64 bg-white border-r border-slate-100 p-6 flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="space-y-7">
          <div>
            <h2 className="text-xl font-black tracking-tight text-[#783E1A]">The Curated Hearth</h2>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">Editorial Living</p>
          </div>
          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition rounded-xl">
              OVERVIEW
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold bg-[#844216] text-white transition rounded-xl shadow-sm shadow-amber-900/20">
               CALENDAR
            </button>
          </nav>

          {/* Utility Bill Calculator Section */}
          {contract && (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-800">Tiền điện nước</h3>
                <button
                  onClick={() => setShowUtilityCalculator(!showUtilityCalculator)}
                  className="text-slate-500 hover:text-slate-700 transition"
                >
                  <Calculator className="w-4 h-4" />
                </button>
              </div>

              {/* Display Rates */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-slate-600">Điện:</span>
                  <span className="font-semibold text-slate-800">
                    {contract.electricityRate ? `${contract.electricityRate.toLocaleString('vi-VN')} đ/kWh` : 'Chưa thiết lập'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Droplets className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-slate-600">Nước:</span>
                  <span className="font-semibold text-slate-800">
                    {contract.waterRate ? `${contract.waterRate.toLocaleString('vi-VN')} đ/m³` : 'Chưa thiết lập'}
                  </span>
                </div>
              </div>

              {/* Calculator Form */}
              {showUtilityCalculator && (
                <div className="space-y-2 pt-3 border-t border-slate-200">
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Sử dụng điện (kWh)</label>
                    <input
                      type="number"
                      value={electricityUsage}
                      onChange={(e) => setElectricityUsage(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Sử dụng nước (m³)</label>
                    <input
                      type="number"
                      value={waterUsage}
                      onChange={(e) => setWaterUsage(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-slate-200">
                    <div className="text-[10px] text-slate-500 mb-1">Tổng tiền:</div>
                    <div className="text-sm font-bold text-slate-800">
                      {calculateUtilityCost().total.toLocaleString('vi-VN')} đ
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      Điện: {calculateUtilityCost().electricity.toLocaleString('vi-VN')} đ + 
                      Nước: {calculateUtilityCost().water.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                </div>
              )}

              {/* Utility Bills List */}
              {utilityBills.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="text-[10px] text-slate-500 mb-2">Hóa đơn gần đây</div>
                  <div className="space-y-2">
                    {utilityBills.slice(0, 3).map((bill) => (
                      <div key={bill.id} className="bg-white rounded-lg p-2 border border-slate-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-slate-700">
                            Tháng {bill.month}/{bill.year}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                            bill.status === 'PAID' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : bill.paymentProofUrl 
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {bill.status === 'PAID' ? 'Đã thanh toán' : bill.paymentProofUrl ? 'Chờ xác nhận' : 'Chưa thanh toán'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-600 font-semibold">
                          {bill.totalCost?.toLocaleString('vi-VN')} đ
                        </div>
                        {bill.status !== 'PAID' && !bill.paymentProofUrl && (
                          <button
                            onClick={() => {
                              setSelectedBillForPayment(bill)
                              setShowPaymentProofModal(true)
                            }}
                            className="mt-1 w-full text-[9px] bg-blue-50 text-blue-600 py-1 rounded hover:bg-blue-100 transition"
                          >
                            Gửi minh chứng
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <button 
          onClick={() => setShowBookingModal(true)}
          className="w-full bg-[#844216] hover:bg-[#6b3511] text-white text-xs font-bold py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2"
        >
          <span>+</span> Đặt tài nguyên
        </button>
      </aside>

      {/* KHU VỰC CHÍNH */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* CỘT LỊCH TRÌNH */}
        <main className="flex-1 p-8 overflow-y-auto border-r border-slate-100">
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Lịch Tài Nguyên Chung</h1>
              <p className="text-xs text-slate-400 mt-0.5">Quản lý và điều phối không gian sống của bạn.</p>
            </div>
            <div className="relative">
              <input type="text" placeholder="Tìm kiếm sự kiện..." className="bg-white border border-slate-200 rounded-full pl-4 pr-10 py-1.5 text-xs w-60 focus:outline-none focus:ring-1 focus:ring-amber-600"/>
              <span className="absolute right-3 top-2 text-slate-400 text-xs">🔍</span>
            </div>
          </div>

          {/* THANH BỘ LỌC & CHỌN RESOURCE */}
          <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              {(['all', 'booking'] as const).map((f) => (
                <button 
                  key={f}
                  onClick={() => setCalendarFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${calendarFilter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                >
                  {f === 'all' ? 'Tất cả' : 'Đặt lịch phòng'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <select 
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
                className="bg-slate-50 border border-slate-200/80 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none max-w-[200px]"
              >
                {resources.map(res => (
                  <option key={res.id} value={res.id}>{res.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* BẢNG LƯỚI LỊCH */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative">
            
            {/* Header Ngày */}
            <div className="grid grid-cols-8 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-20">
              <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center">Giờ</div>
              {weekDays.map((day) => (
                <div key={`header-${day.dateStr}`} className="p-3 text-center border-l border-slate-100/70">
                  <p className="text-[11px] font-bold text-slate-400">{day.dayName}</p>
                  <p className="text-base font-black text-slate-800 mt-0.5">{day.dayNum}</p>
                </div>
              ))}
            </div>

           {/* Thân lịch */}
<div className="divide-y divide-slate-100 relative">
  
  {/* 1. LỚI NỀN (Chỉ làm nhiệm vụ vẽ các ô dòng kẻ đứt để nhìn, không chứa dữ liệu booking bên trong nữa) */}
  {hoursGrid.map((hour) => (
    <div key={`row-${hour}`} className="grid grid-cols-8 h-24 group relative">
      <div className="text-[11px] font-bold text-slate-400 p-2 text-center bg-slate-50/20 flex items-start justify-center pt-2 sticky left-0 z-10">
        {hour}
      </div>
      {weekDays.map((day, dIdx) => (
        <div 
          key={`bg-cell-${day.dateStr}-${dIdx}`} 
          className="border-l border-slate-100 bg-white group-hover:bg-slate-50/10 transition-colors min-h-[96px]"
        />
      ))}
    </div>
  ))}

  {/* 2. LỚP PHỦ TUYỆT ĐỐI (Chỉ vẽ ĐÚNG 1 LẦN duy nhất cho mỗi booking theo đúng cột ngày của nó) */}
  <div className="absolute inset-0 pointer-events-none grid grid-cols-8 pl-[45px]"> 
    {/* Cột 1 trống để nhường chỗ cho cột hiển thị Giờ bên trái (pl-[45px] điều chỉnh theo độ rộng cột Giờ của bạn) */}
    <div className="pointer-events-none" /> 
    
    {/* Duyệt qua 7 ngày để đặt các booking vào đúng cột dọc */}
    {weekDays.map((day) => {
      const dayBookings = visibleBookings.filter(b => {
        const bDate = new Date(b.startTime).toLocaleDateString('sv-SE');
        return bDate === day.dateStr;
      });

      return (
        <div key={`overlay-col-${day.dateStr}`} className="relative h-full pointer-events-auto">
          {dayBookings.map((booking) => {
            const isMyBooking = booking.userId === user?.id;
            
            const start = new Date(booking.startTime);
            const end = new Date(booking.endTime);
            
            const startHour = start.getHours();
            const startMin = start.getMinutes();
            
            const minutesFromBase = ((startHour - 8) * 60) + startMin;
            
            const durationMs = end.getTime() - start.getTime();
            const durationMinutes = durationMs / (1000 * 60);
            
            const pixelsPerMinute = 0.8; 
            
            const topPos = Math.max(0, minutesFromBase * pixelsPerMinute);
            const heightPos = Math.max(24, durationMinutes * pixelsPerMinute); 

            const bgColor = isMyBooking ? 'bg-[#FFF4ED] border-[#F97316]' : 'bg-[#E8F1FF] border-[#3B82F6]';
            const textColor = isMyBooking ? 'text-[#7C2D12]' : 'text-[#1E3A8A]';
            const badgeColor = isMyBooking ? 'text-orange-600 bg-white/80 border-orange-100' : 'text-blue-600 bg-white/80 border-blue-100';

           return (
  <div 
    key={booking.id} 
    className={`absolute left-0.5 right-0.5 ${bgColor} border-l-4 rounded-xl p-2 text-[10px] flex flex-col justify-between shadow-sm z-10 cursor-pointer hover:brightness-95 transition-all`}
    style={{ 
      top: `${topPos}px`, 

      height: 'auto',
      minHeight: `${Math.max(75, heightPos)}px` 
    }}
    title={`${booking.title} (${start.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} - ${end.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})})`}
  >    <div className="space-y-0.5 w-full word-break break-words">
      <p className={`font-extrabold uppercase tracking-wide text-[9px] ${textColor}`}>
        {selectedResource?.name}
      </p>
      
      <p className="text-[9px] font-medium text-slate-500">
        {isMyBooking ? "Bạn" : (booking.user?.fullName || booking.user?.name || "Thành viên")}
      </p>

      <p className="font-bold text-slate-800 text-[10px] leading-tight mt-1">
        {booking.title}
      </p>
    </div>
    
    <div className="mt-2 pt-1 border-t border-slate-100/50 flex items-center justify-between gap-1">
      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border whitespace-nowrap ${badgeColor}`}>
        {booking.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'}
      </span>
      
      <span className="text-[8px] font-medium text-slate-400">
        {start.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
      </span>
    </div>
  </div>
);
          })}
        </div>
      );
    })}
  </div>

</div>
          </div>
        </main>

        {/* PANEL TIỆN ÍCH PHẢI */}
        <aside className="w-80 bg-white p-6 overflow-y-auto shrink-0 space-y-6 hidden lg:block">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Lịch hôm nay</h3>
              <span className="bg-rose-100 text-rose-700 font-bold text-[10px] px-2 py-0.5 rounded-full">
                {new Date().toLocaleDateString('vi-VN')}
              </span>
            </div>

            <div className="space-y-2">
              {visibleBookings.filter(b => {
                 const bDate = new Date(b.startTime).toLocaleDateString('sv-SE');
                 const todayStr = new Date().toLocaleDateString('sv-SE');
                 return bDate === todayStr;
              }).length > 0 ? (
                visibleBookings.filter(b => {
                   const bDate = new Date(b.startTime).toLocaleDateString('sv-SE');
                   const todayStr = new Date().toLocaleDateString('sv-SE');
                   return bDate === todayStr;
                }).map(b => (
                  <div key={b.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl text-xs"></div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-slate-800">{b.title}</h4>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {new Date(b.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} - 
                        {new Date(b.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">Không có lịch nào hôm nay</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
             <h3 className="text-sm font-black text-slate-900 tracking-tight">Thông báo gần đây</h3>
             {activities.slice(0, 3).map(act => (
               <div key={act.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="flex items-center gap-2 mb-1">
                   <span className="text-xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                     {act.type === 'ANNOUNCEMENT' ? 'THÔNG BÁO' : 'SỰ CỐ'}
                   </span>
                   <span className="text-[10px] text-slate-400">{act.eventDate ? new Date(act.eventDate).toLocaleDateString('vi-VN') : ''}</span>
                 </div>
                 <h4 className="text-xs font-bold text-slate-800 mb-1">{act.title}</h4>
                 <p className="text-[10px] text-slate-500 line-clamp-2">{act.content}</p>
               </div>
             ))}
             {activities.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Chưa có thông báo mới</p>}
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-700">Chú thích màu sắc</h4>
            <ul className="space-y-2 text-[11px] font-semibold text-slate-500">
              <li className="flex items-center gap-2.5"><span className="w-3 h-3 rounded-full bg-[#F97316] shrink-0"></span> Lịch của tôi</li>
              <li className="flex items-center gap-2.5"><span className="w-3 h-3 rounded-full bg-[#3B82F6] shrink-0"></span> Booking đã duyệt</li>
              <li className="flex items-center gap-2.5"><span className="w-3 h-3 rounded-full bg-[#9CA3AF] shrink-0"></span> Nhiệm vụ chung</li>
            </ul>
          </div>
        </aside>

      </div>

      <BookingModal 
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        resources={resources}
        roomId={roomId}
        onSuccess={handleBookingSuccess}
      />
              {showPaymentProofModal && selectedBillForPayment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4">
              
              {/* Header */}
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Gửi minh chứng thanh toán
                  </h3>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowPaymentProofModal(false);
                      setPaymentProofFile(null);
                      setPreviewUrl(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 transition text-lg"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Hóa đơn: Tháng {selectedBillForPayment.month}/{selectedBillForPayment.year} — Số tiền: <span className="font-bold text-slate-700">{selectedBillForPayment.totalCost?.toLocaleString('vi-VN')} đ</span>
                </p>
              </div>

              {/* Form Upload */}
              <form onSubmit={handleSubmitPaymentProof} className="space-y-4">
                
                {/* Vùng chọn file / Kéo thả file */}
                <div className="flex flex-col items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100/70 transition-colors p-4 relative overflow-hidden">
                    
                    {previewUrl ? (
                      // Nếu đã có ảnh chọn, hiển thị ảnh xem trước (Preview)
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/5">
                        <img 
                          src={previewUrl} 
                          alt="Payment Proof Preview" 
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute bottom-2 right-2 bg-slate-900/70 text-white text-[9px] font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                          Thay đổi ảnh
                        </div>
                      </div>
                    ) : (
                      // Chưa chọn ảnh, hiển thị placeholder mời gọi upload
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        <span className="text-2xl mb-2 text-slate-400">📸</span>
                        <p className="text-xs font-bold text-slate-700">Tải ảnh hóa đơn / Giao dịch</p>
                        <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ PNG, JPG, JPEG</p>
                      </div>
                    )}

                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPaymentProofFile(file);
                          setPreviewUrl(URL.createObjectURL(file)); // Tạo url ảo để hiển thị preview ngay lập tức
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => {
                      setShowPaymentProofModal(false);
                      setPaymentProofFile(null);
                      setPreviewUrl(null);
                    }}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs py-3 rounded-xl transition"
                  >
                    Hủy bỏ
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isUploading || !paymentProofFile}
                    className={`flex-1 font-bold text-xs py-3 rounded-xl transition text-white shadow-sm flex items-center justify-center gap-2 ${
                      isUploading || !paymentProofFile 
                        ? 'bg-slate-300 cursor-not-allowed' 
                        : 'bg-[#844216] hover:bg-[#6b3511]'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <span className="animate-spin text-xs">⏳</span> Đang xử lý...
                      </>
                    ) : 'Xác nhận gửi'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}
      {/* Payment Proof Modal */}
      {showPaymentProofModal && selectedBillForPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                Gửi minh chứng thanh toán
              </h2>
              <button onClick={() => setShowPaymentProofModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitPaymentProof} className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Tháng {selectedBillForPayment.month}/{selectedBillForPayment.year}
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {selectedBillForPayment.totalCost?.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Điện: {selectedBillForPayment.electricityUsage?.toLocaleString('vi-VN')} kWh | 
                  Nước: {selectedBillForPayment.waterUsage?.toLocaleString('vi-VN')} m³
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Ảnh minh chứng thanh toán
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPaymentProofFile(file);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:text-xs file:font-semibold"
                    required
                  />
                </div>
                {paymentProofFile && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                    <ImageIcon className="h-4 w-4" />
                    <span className="truncate">{paymentProofFile.name}</span>
                    <span className="text-slate-400">({(paymentProofFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Chọn ảnh từ máy tính của bạn (jpg, png, webp)
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400"
                >
                  {isUploading ? (
                    <span className="flex items-center gap-2">
                      <Upload className="h-4 w-4 animate-spin" />
                      Đang upload...
                    </span>
                  ) : (
                    "Gửi minh chứng"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPaymentProofModal(false);
                    setPaymentProofFile(null);
                  }}
                  className="flex-1"
                >
                  Hủy
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}