import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { roomService } from '@/lib/services/room.service';
import { RoommatesSection } from '../components/RoommatesSection';
import { RoomCompatibility } from './components/RoomCompatibility';
import { getAuthUser } from '@/lib/auth';
import { cookies } from 'next/headers';

type RoomDetail = Awaited<ReturnType<typeof roomService.getById>>;
type RoomAmenityItem = {
  amenity?: {
    id: string;
    name: string;
  } | null;
};

const fallbackImage = 'https://via.placeholder.com/900x600?text=Room';

function getImageUrls(room: RoomDetail) {
  const fromImages = room.images?.map((image: { url: string }) => image.url) || [];
  const fromAlias = Array.isArray(room.image) ? room.image : room.image ? [room.image] : [];
  return Array.from(new Set([...fromImages, ...fromAlias])).filter(Boolean);
}

function AmenityIcon({ name }: { name: string }) {
  const lowerName = name.toLowerCase();
  let icon = 'home';

  if (lowerName.includes('wifi')) icon = 'wifi';
  else if (lowerName.includes('máy lạnh')) icon = 'ac_unit';
  else if (lowerName.includes('máy giặt')) icon = 'local_laundry_service';
  else if (lowerName.includes('tủ lạnh')) icon = 'kitchen';
  else if (lowerName.includes('bếp')) icon = 'countertops';
  else if (lowerName.includes('xe')) icon = 'garage_home';
  else if (lowerName.includes('gác')) icon = 'stairs';
  else if (lowerName.includes('thang máy')) icon = 'elevator';
  else if (lowerName.includes('giờ')) icon = 'schedule';

  return <span className="material-symbols-outlined text-3xl text-orange-700">{icon}</span>;


}
function getRequirementIcon(key: string, value?: string | boolean): string {
  switch (key) {
    case 'cleanlinessRequired':
      return value === 'high' ? 'sparkles' : value === 'medium' ? 'cleaning_services' : 'cleaning_bucket';
    case 'noiseTolerance':
      return value === 'quiet' ? 'volume_down' : value === 'active' ? 'volume_up' : 'volume_mute';
    case 'guestPolicy':
      return value === 'no_guests' ? 'no_luggage' : value === 'frequently' ? 'party_mode' : 'home_repair_service';
    case 'preferredSleepHabit':
      return value === 'early' ? 'wb_sunny' : value === 'late' ? 'nightlight' : 'bedtime';
    case 'maxOccupants':
      return 'supervisor_account';
    case 'allowSmoking':
      return value ? 'smoking_rooms' : 'smoke_free';
    case 'allowPets':
      return value ? 'pets' : 'pets';
    default:
      return 'info';
  }
}
function Gallery({ images, title }: { images: string[]; title: string }) {
  const galleryImages = images.length > 0 ? images : [fallbackImage];
  const featuredImage = galleryImages[0];
  const sideImages = galleryImages.slice(1, 5);
  const displaySideImages = sideImages.length > 0 ? sideImages : [featuredImage, featuredImage, featuredImage, featuredImage];
  const thumbnailImages = galleryImages.slice(0, 12);

  return (
    <section className="mx-auto mb-12 max-w-7xl px-8">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
        <div className="group relative min-h-[360px] overflow-hidden rounded-[1.75rem] bg-slate-200 shadow-sm md:min-h-[560px]">
          <img
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            src={featuredImage}
            alt={title}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute bottom-5 left-5 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg backdrop-blur">
            Ảnh nổi bật
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-rows-2">
          {displaySideImages.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="group relative min-h-[150px] overflow-hidden rounded-2xl bg-slate-200 md:min-h-[220px] lg:min-h-0"
            >
              <img
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                src={image}
                alt={`${title} - ảnh ${index + 2}`}
              />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
              {index === 3 && galleryImages.length > 5 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 p-4">
                  <span className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg">
                    <span className="material-symbols-outlined text-base">photo_library</span>
                    +{galleryImages.length - 5} ảnh
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {thumbnailImages.map((image, index) => (
          <div
            key={`thumb-${image}-${index}`}
            className="relative h-20 w-28 flex-none overflow-hidden rounded-xl bg-slate-200 ring-1 ring-black/5 md:h-24 md:w-36"
          >
            <img
              className="h-full w-full object-cover"
              src={image}
              alt={`${title} - thumbnail ${index + 1}`}
            />
            {index === thumbnailImages.length - 1 && galleryImages.length > thumbnailImages.length && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="text-xs font-black text-white">+{galleryImages.length - thumbnailImages.length}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
function RoomRequirements({ room }: { room: RoomDetail }) {
  const requirements: Array<{ label: string; value?: string; iconKey: string }> = [];

  if (room.cleanlinessRequired) {
    const cleanlinessMap: Record<string, string> = {
      low: 'Không quá nghiêm ngặt',
      medium: 'Sạch sẽ thường xuyên',
      high: 'Rất sạch sẽ',
    };
    requirements.push({
      label: 'Yêu cầu sạch sẽ',
      value: cleanlinessMap[room.cleanlinessRequired],
      iconKey: getRequirementIcon('cleanlinessRequired', room.cleanlinessRequired),
    });
  }

  if (room.noiseTolerance) {
    const noiseMap: Record<string, string> = {
      low: 'Yêu cầu yên tĩnh',
      medium: 'Chấp nhận tiếng ồn bình thường',
      high: 'Cộng đồng sôi động',
    };
    requirements.push({
      label: 'Độ ồn',
      value: noiseMap[room.noiseTolerance],
      iconKey: getRequirementIcon('noiseTolerance', room.noiseTolerance),
    });
  }

  if (room.guestPolicy) {
    const guestMap: Record<string, string> = {
      rarely: 'Không cho khách qua đêm',
      occasionally: 'Cho khách thỉnh thoảng',
      frequently: 'Thường xuyên có khách',
    };
    requirements.push({
      label: 'Chính sách khách',
      value: guestMap[room.guestPolicy],
      iconKey: getRequirementIcon('guestPolicy', room.guestPolicy),
    });
  }

  if (room.preferredSleepHabit) {
    const sleepMap: Record<string, string> = {
      early: 'Thức sớm (6-8h)',
      normal: 'Giờ thường (8-10h)',
      late: 'Thức khuya (10h+)',
    };
    requirements.push({
      label: 'Thói quen ngủ',
      value: sleepMap[room.preferredSleepHabit],
      iconKey: getRequirementIcon('preferredSleepHabit', room.preferredSleepHabit),
    });
  }

  if (room.maxOccupants) {
    requirements.push({
      label: 'Số người tối đa',
      value: `${room.maxOccupants} người`,
      iconKey: getRequirementIcon('maxOccupants'),
    });
  }

  if (room.allowSmoking !== undefined) {
    requirements.push({
      label: 'Hút thuốc',
      value: room.allowSmoking ? 'Cho phép' : 'Không cho phép',
      iconKey: getRequirementIcon('allowSmoking', room.allowSmoking),
    });
  }

  if (room.allowPets !== undefined) {
    requirements.push({
      label: 'Thú cưng',
      value: room.allowPets ? 'Cho phép' : 'Không cho phép',
      iconKey: getRequirementIcon('allowPets', room.allowPets),
    });
  }

  if (requirements.length === 0) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold tracking-tight">🎯 Yêu cầu phòng & Chính sách</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {requirements.map((req, idx) => (
          <div 
            key={idx} 
            className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 border border-slate-200"
          >
            <div className="mb-2 flex items-center gap-2">
              {/* ✅ Render icon bằng Material Symbols giống AmenityIcon */}
              <span className="material-symbols-outlined text-2xl text-orange-700">
                {req.iconKey}
              </span>
              <p className="font-bold text-slate-700">{req.label}</p>
            </div>
            {req.value && <p className="text-sm text-slate-600">{req.value}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
  // ✅ Thêm component mới cho phần sidebar
function RoomSidebar({ room }: { room: RoomDetail }) {
  const price = room.priceText || (room.price ? `${room.price.toLocaleString('vi-VN')} đ/tháng` : 'Liên hệ');
  const area = room.areaText || room.area;

  return (
    <aside className="w-full lg:w-[400px]">
      <div className="sticky top-28 space-y-6">
        <div className="rounded-[2rem] border border-orange-100 bg-white p-8 shadow-xl shadow-slate-900/5">
          <div className="mb-8 flex justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-4xl font-extrabold tracking-tighter text-slate-950">{price}</span>
              <span className="font-medium text-slate-400">Giá thuê tham khảo</span>
            </div>
          </div>

          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Diện tích</span>
                <span className="font-bold">{area || 'Đang cập nhật'}</span>
              </div>
              <span className="material-symbols-outlined text-slate-300">square_foot</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Trạng thái</span>
                <span className="font-bold">{room.status === 'AVAILABLE' ? 'Còn trống' : 'Tạm ẩn'}</span>
              </div>
              <span className="material-symbols-outlined text-slate-300">verified</span>
            </div>
          </div>

          <Link
            href={`/rooms/${room.id}/book`}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-orange-900 to-orange-500 py-5 text-lg font-black tracking-wide text-white shadow-lg transition-transform hover:scale-[0.98]"
          >
            Đặt ngay
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>

          <p className="mt-6 text-center text-xs font-medium text-slate-400">
            Bạn sẽ không bị tính phí cho đến khi yêu cầu được xác nhận.
          </p>

          <hr className="my-8 border-slate-200" />

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
              <span className="material-symbols-outlined text-xl text-orange-700">verified_user</span>
              Thông tin phòng đã xác thực
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
              <span className="material-symbols-outlined text-xl text-orange-700">support_agent</span>
              Hỗ trợ thành viên 24/7
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-blue-100 bg-blue-50/60 p-8">
          <h4 className="mb-2 font-bold text-blue-950">Được quan tâm</h4>
          <p className="mb-4 text-sm leading-relaxed text-blue-950/80">
            Phòng này có dữ liệu nguồn từ Phongtro123. Hãy liên hệ sớm để xác nhận tình trạng mới nhất.
          </p>
          {room.sourceUrl && (
            <a
              href={room.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-blue-950 transition-all hover:gap-2"
            >
              Xem nguồn tin
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let room: RoomDetail;
  let isUserLoggedIn = false;

  try {
    const { id } = await params;
    room = await roomService.getById(id);
  } catch {
    notFound();
  }

  // Check if user is logged in
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    isUserLoggedIn = !!token?.value;
  } catch {
    isUserLoggedIn = false;
  }

  const images = getImageUrls(room);
  const amenities = ((room.amenities ?? []) as RoomAmenityItem[])
    .map((item) => item.amenity)
    .filter((amenity): amenity is { id: string; name: string } => Boolean(amenity));
  const location = [room.district, room.city].filter(Boolean).join(', ') || room.address;
  const roomId  = room.id;
console.log(" [Page] Room Object:", room);
console.log(" [Page] RoomID extracted:", roomId);
  return (
    <>
      <Navigation />
      <main className="bg-[#f9f9fe] pb-20 pt-24 text-slate-950">
        <header className="mx-auto mb-8 max-w-7xl px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-orange-800">
                <span className="material-symbols-outlined text-sm">location_on</span>
                {location}
              </div>
              <h1 className="text-4xl font-extrabold tracking-tighter text-slate-950 md:text-5xl">{room.title}</h1>
              <p className="max-w-2xl text-lg font-medium text-slate-500">{room.address}</p>
            </div>
            <div className="flex gap-3">
              <button className="rounded-full bg-white p-3 shadow-sm transition-colors hover:bg-orange-50" aria-label="Chia sẻ">
                <span className="material-symbols-outlined">share</span>
              </button>
              <FavoriteButton roomId={room.id} />
            </div>
          </div>
        </header>

        <Gallery images={images} title={room.title} />

        <section className="mx-auto max-w-7xl px-8">
          <div className="relative flex flex-col gap-16 lg:flex-row">
            <div className="flex-1 space-y-12">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold tracking-tight">Thông tin chi tiết</h2>
                <div className="whitespace-pre-line text-lg leading-relaxed text-slate-700">
                  {room.description}
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-2xl font-bold tracking-tight">Tiện ích</h3>
                {amenities.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {amenities.map((amenity: { id: string; name: string }) => (
                      <div
                        key={amenity.id}
                        className="flex items-start gap-4 rounded-2xl bg-white p-4 shadow-sm transition-colors hover:bg-orange-50"
                      >
                        <AmenityIcon name={amenity.name} />
                        <div>
                          <h4 className="font-bold text-slate-950">{amenity.name}</h4>
                          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">Có sẵn</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">Tiện ích đang được cập nhật.</p>
                )}
              </div>

              <RoomRequirements room={room} />

            
      {/* Truyền roomId đã sửa vào component */}
      {roomId ? (
        <section className="mx-auto max-w-7xl px-8 mt-12">
           <RoommatesSection roomId={roomId} />
        </section>
      ) : (
        <div className="text-center text-red-500">Lỗi: Không tìm thấy ID phòng!</div>
      )}

              <div className="space-y-6">
                <h3 className="text-2xl font-bold tracking-tight">Vị trí</h3>
                <div className="relative h-[400px] w-full overflow-hidden rounded-[2rem] bg-slate-200">
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:48px_48px] bg-[position:0_0,0_24px,24px_-24px,-24px_0] opacity-70" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-800 shadow-2xl">
                      <span className="material-symbols-outlined text-white">home</span>
                    </div>
                    <p className="max-w-xl text-lg font-bold text-slate-950">{room.address}</p>
                    <p className="mt-2 text-sm text-slate-500">{location}</p>
                  </div>
                </div>
              </div>

              {/* Hiển thị phần tương đồng sau vị trí */}
              {roomId && (
                <section className="space-y-6 mt-12">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    So sánh sở thích
                  </p>
                  <RoomCompatibility 
                    roomId={roomId} 
                    isUserLoggedIn={isUserLoggedIn}
                  />
                </section>
              )}
            </div>

         
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
