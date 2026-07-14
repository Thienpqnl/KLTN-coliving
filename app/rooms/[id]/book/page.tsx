import { notFound } from 'next/navigation';
import { Footer } from '@/components/Footer';
import { Navigation } from '@/components/Navigation';
import {
  getPublicRoomById,
  type PublicRoomDetail,
} from '@/lib/services/property-gateway.server';
import { BookingRequestForm } from './BookingRequestForm';

type RoomDetail = PublicRoomDetail;
type RoomAmenityItem = {
  amenity?: {
    name?: string | null;
  } | null;
};

const fallbackImage = 'https://via.placeholder.com/900x600?text=Room';

function getImageUrls(room: RoomDetail) {
  const fromImages = room.images?.map((image: { url: string }) => image.url) || [];
  const fromAlias = Array.isArray(room.image) ? room.image : room.image ? [room.image] : [];
  return Array.from(new Set([...fromImages, ...fromAlias])).filter(Boolean);
}

function formatCurrency(value?: number | null) {
  if (!value) return 'Liên hệ';
  return `${value.toLocaleString('vi-VN')} đ`;
}

function formatMonthlyPrice(room: RoomDetail) {
  if (room.price) return formatCurrency(room.price);
  if (room.priceValue) return formatCurrency(Number(room.priceValue));
  return room.priceText?.replace(/\/\s*tháng/gi, '').replace(/\s*đ\s*tháng/gi, 'đ').trim() || 'Liên hệ';
}

function RoomSummary({ room }: { room: RoomDetail }) {
  const images = getImageUrls(room);
  const image = images[0] || fallbackImage;
  const price = formatMonthlyPrice(room);
  const location = [room.district, room.city].filter(Boolean).join(', ') || room.address;
  const amenities = ((room.amenities ?? []) as RoomAmenityItem[])
    .map((item) => item.amenity?.name)
    .filter((name): name is string => Boolean(name))
    .slice(0, 3);
  const deposit = room.price || room.priceValue || 0;

  return (
    <aside className="lg:col-span-5">
      <div className="sticky top-32 space-y-8">
        <div className="space-y-6 rounded-[1.75rem] bg-white p-6 shadow-sm sm:p-8">
          <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-slate-200">
            <img className="h-full w-full object-cover" src={image} alt={room.title} />
            <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold tracking-tight text-[#944a00] backdrop-blur">
              PHÒNG ĐÃ CHỌN
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-2xl font-bold text-[#1a1c1f]">{room.title}</h3>
                <p className="mt-1 flex items-center gap-1 text-[#554337]">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  {location}
                </p>
              </div>
              <div className="min-w-fit sm:text-right">
                <span className="whitespace-nowrap text-2xl font-extrabold text-[#944a00] sm:text-3xl">{price}</span>
                <span className="block text-[0.65rem] font-bold uppercase text-[#887365]">Mỗi Tháng</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {(amenities.length > 0 ? amenities : ['Phòng riêng', 'Không gian làm việc', 'Wifi']).map((amenity) => (
                <span
                  className="rounded-md bg-[#e7e1dd] px-3 py-1 text-[0.7rem] font-bold uppercase text-[#1d1b19]"
                  key={amenity}
                >
                  {amenity}
                </span>
              ))}
            </div>

            <div className="space-y-3 border-t border-[#dbc2b2]/40 pt-6">
              <div className="flex justify-between text-sm">
                <span className="text-[#554337]">Phí Thành Viên</span>
                <span className="font-semibold">0 đ</span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[#554337]">Tiền Đặt Cọc (Hoàn lại được)</span>
                <span className="font-semibold">{formatCurrency(deposit)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-[#dbc2b2]/40 pt-2 text-lg font-bold">
                <span>Thanh Toán Ban Đầu</span>
                <span className="text-[#944a00]">{formatCurrency(deposit)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 rounded-[1.75rem] bg-[#d3e3ff] p-6">
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <span className="material-symbols-outlined text-3xl text-[#426087]">verified_user</span>
          </div>
          <div>
            <p className="font-bold leading-tight text-[#001c39]">Đảm Bảo An Tâm</p>
            <p className="mt-1 text-sm text-[#2a486e]">Hủy miễn phí trong vòng 48 giờ kể từ khi xác nhận đặt phòng.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

const faqs = [
  {
    icon: 'contact_support',
    title: 'Quy trình xét duyệt diễn ra như thế nào?',
    content:
      'Sau khi nhận yêu cầu, đội ngũ quản trị sẽ kiểm tra lịch phòng và liên hệ để xác nhận nhu cầu, thời gian chuyển đến và các điều kiện lưu trú phù hợp.',
  },
  {
    icon: 'cleaning_services',
    title: 'Dịch vụ dọn dẹp có bao gồm trong tiền thuê không?',
    content:
      'Các tiện ích đi kèm phụ thuộc vào từng phòng. Quản trị viên sẽ xác nhận rõ các khoản đã bao gồm trước khi bạn hoàn tất đặt cọc.',
  },
  {
    icon: 'event_available',
    title: 'Thời gian lưu trú tối thiểu là bao lâu?',
    content:
      'Hệ thống đang áp dụng thời gian lưu trú tối thiểu 3 tháng cho yêu cầu đặt phòng mới để hạn chế xung đột lịch thuê.',
  },
  {
    icon: 'wifi',
    title: 'Tiền điện nước và internet có được bao gồm không?',
    content:
      'Mỗi căn có chính sách riêng về điện, nước, internet và phí dịch vụ. Bạn sẽ nhận được bảng chi phí chi tiết trong bước xác nhận.',
  },
];

export default async function RoomBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let room: RoomDetail;

  try {
    const { id } = await params;
    room = await getPublicRoomById(id);
  } catch {
    notFound();
  }

  const maxOccupants = Math.max(1, Number(room.maxOccupants ?? 1));
  const currentOccupants = Math.max(0, Number(room.currentOccupants ?? 0));
  const confirmedReservations = Math.max(0, Number(room.confirmedReservations ?? 0));
  const isRoomFull = room.status === 'OCCUPIED' ||
    currentOccupants + confirmedReservations >= maxOccupants;

  return (
    <>
      <Navigation />
      <main className="bg-[#f9f9fe] px-4 pb-24 pt-32 text-[#1a1c1f] sm:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 lg:grid-cols-12">
          <div className="space-y-12 lg:col-span-7">
            <header className="space-y-4">
              <span className="inline-block rounded-md bg-[#e7e1dd] px-3 py-1 text-[0.75rem] font-semibold uppercase tracking-wider text-[#1d1b19]">
                Bước 1: Thông Tin Của Bạn
              </span>
              <h1 className="max-w-3xl font-[var(--font-manrope)] text-4xl font-extrabold leading-[1.1] tracking-tight text-[#1a1c1f] sm:text-5xl">
                Yêu Cầu Tham Quan Hoặc Bắt Đầu Hành Trình Của Bạn.
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-[#554337]">
                Điền vào biểu mẫu bên dưới và quản trị viên cộng đồng của chúng tôi sẽ liên hệ trong vòng 24 giờ để hoàn tất chi tiết chuyến thăm hoặc đặt phòng của bạn.
              </p>
            </header>

            {isRoomFull && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">
                Phòng này đã đủ số người tối đa. Hệ thống tạm ngừng nhận yêu cầu đặt phòng mới.
              </div>
            )}
            <BookingRequestForm roomId={room.id} isRoomFull={isRoomFull} />
          </div>

          <RoomSummary room={room} />
        </div>

        <section className="mx-auto mt-32 max-w-7xl space-y-12">
          <div className="space-y-4 text-center">
            <h2 className="font-[var(--font-manrope)] text-4xl font-extrabold text-[#1a1c1f]">Các Câu Hỏi Thường Gặp</h2>
            <p className="text-[#554337]">Mọi điều bạn cần biết trước khi gia nhập cộng đồng của chúng tôi.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <div className="rounded-[1.75rem] bg-[#f3f3f8] p-8 transition-all hover:bg-[#ededf3]" key={faq.title}>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-[#1a1c1f]">
                  <span className="material-symbols-outlined text-[#944a00]">{faq.icon}</span>
                  {faq.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#554337]">{faq.content}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
