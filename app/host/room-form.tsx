'use client'

import { useState, useEffect } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { uploadImage } from "@/lib/upload"
import { MapPicker } from '@/app/components/MapPicker'
import { RoomVerificationPanel } from '@/app/host/room-verification-panel'
interface Room {
  id: string
  title: string
  description: string
  price: number
  area: string
  address: string
  image?: string | string[]
  images?: { url: string }[]
  status: 'DRAFT' | 'PENDING' | 'NEEDS_REVISION' | 'AVAILABLE' | 'REJECTED' | 'HIDDEN' | 'OCCUPIED'
  amenityIds: string[]
  amenities?: Array<{ amenity?: { id: string; name: string } | null }>
  latitude?: number
  longitude?: number
  cleanlinessRequired?: 'low' | 'medium' | 'high'
  noiseTolerance?: 'quiet' | 'moderate' | 'active'
  guestPolicy?: 'no_guests' | 'occasionally' | 'frequently'
  preferredSleepHabit?: 'early' | 'normal' | 'late'
  preferredOccupation?: string
  curfewPolicy?: string
  maxOccupants?: number
  preferredGender?: string
  allowSmoking?: boolean
  allowPets?: boolean
}

interface Amenity {
  id: string
  name: string
}

export function RoomForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get('id')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '1.00',
    area: '',
    address: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    image: '',
    status: 'DRAFT' as Room['status'],
    cleanlinessRequired: 'medium' as 'low' | 'medium' | 'high',
    noiseTolerance: 'moderate' as 'quiet' | 'moderate' | 'active',
    guestPolicy: 'occasionally' as 'no_guests' | 'occasionally' | 'frequently',
    preferredSleepHabit: 'normal' as 'early' | 'normal' | 'late',
    preferredOccupation: '' as string,
    curfewPolicy: '' as string,
    maxOccupants: '2',
    preferredGender: '' as string,
    allowSmoking: false,
    allowPets: false,
  })

  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [images, setImages] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([])
const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  // Load amenities
  useEffect(() => {
    const fetchAmenities = async () => {
      try {
        const res = await apiClient.get<Amenity[]>('/amenities')
        setAmenities(res)
      } catch (error) {
        console.error('Không thể tải tiện ích:', error)
      }
    }
    fetchAmenities()
  }, [])
useEffect(() => {
  const token = localStorage.getItem("token");
  if (token) {
    apiClient.setToken(token);
  }
}, []);
useEffect(() => {
  return () => {
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
  };
}, [imagePreviews]);
  // Load room data if editing
  useEffect(() => {
    if (roomId) {
      const fetchRoom = async () => {
        try {
          const res = await apiClient.get<Room>(`/rooms/${roomId}`)
          const roomImages = [
            ...(res.images?.map((image) => image.url) || []),
            ...(Array.isArray(res.image) ? res.image : res.image ? [res.image] : []),
          ].filter(Boolean)
          const amenityIds = res.amenityIds || (res.amenities?.map((item) => item.amenity?.id).filter((id): id is string => Boolean(id)) ?? [])

          setFormData({
            title: res.title,
            description: res.description,
            price: res.price.toString(),
            area: res.area,
            address: res.address,
            image: roomImages[0] || '',
            status: res.status,
            latitude: res.latitude,
            longitude: res.longitude,
            cleanlinessRequired: (res.cleanlinessRequired as 'low' | 'medium' | 'high') || 'medium',
            noiseTolerance: (res.noiseTolerance as 'quiet' | 'moderate' | 'active') || 'moderate',
            guestPolicy: (res.guestPolicy as 'no_guests' | 'occasionally' | 'frequently') || 'occasionally',
            preferredSleepHabit: (res.preferredSleepHabit as 'early' | 'normal' | 'late') || 'normal',
            preferredOccupation: res.preferredOccupation || '',
            curfewPolicy: res.curfewPolicy || '',
            maxOccupants: res.maxOccupants?.toString() || '2',
            preferredGender: res.preferredGender || '',
            allowSmoking: res.allowSmoking || false,
            allowPets: res.allowPets || false,
          })
          setExistingImageUrls(Array.from(new Set(roomImages)))
          setSelectedAmenities(amenityIds)
          setEditMode(true)
        } catch (error) {
          console.error('Không thể tải thông tin phòng:', error)
        }
      }
      fetchRoom()
    }
  }, [roomId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.currentTarget.files;
  if (files) {
    const fileArray = Array.from(files);

    setImages(prev => [...prev, ...fileArray]);

    // 🔥 tạo preview URL
    const previewUrls = fileArray.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previewUrls]);
    if (images.length + fileArray.length > 5) {
  alert("Tối đa 5 ảnh");
  return;
}
  }
  
};

 const removeImage = (index: number) => {
  // 🔥 revoke đúng URL
  URL.revokeObjectURL(imagePreviews[index]);

  setImages(prev => prev.filter((_, i) => i !== index));
  setImagePreviews(prev => prev.filter((_, i) => i !== index));
};
  const removeExistingImage = (index: number) => {
    setExistingImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenityId)
        ? prev.filter(id => id !== amenityId)
        : [...prev, amenityId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {

        let imageUrls: string[] = [...existingImageUrls];

// upload tất cả ảnh
if (images.length > 0) {
  const uploadedUrls = await Promise.all(
    images.map((img) => uploadImage(img))
  );
  imageUrls = [...imageUrls, ...uploadedUrls];
}

      const payload = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        area: formData.area,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        image: imageUrls,
        amenityIds: selectedAmenities,
        cleanlinessRequired: formData.cleanlinessRequired,
        noiseTolerance: formData.noiseTolerance,
        guestPolicy: formData.guestPolicy,
        preferredSleepHabit: formData.preferredSleepHabit,
        preferredOccupation: formData.preferredOccupation,
        curfewPolicy: formData.curfewPolicy,
        maxOccupants: parseInt(formData.maxOccupants),
        preferredGender: formData.preferredGender,
        allowSmoking: formData.allowSmoking,
        allowPets: formData.allowPets,
      }

      if (editMode && roomId) {
        await apiClient.put(`/rooms/${roomId}`, payload)
        router.push('/room-management')
      } else {
        const createdRoom = await apiClient.post<Room>('/rooms-upload/create', payload)
        router.push(`/room-management/edit-room?id=${createdRoom.id}`)
      }
    } catch (error) {
      console.error('Không thể lưu phòng:', error)
      alert('Không thể lưu phòng. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <p className="text-sm uppercase tracking-wide text-primary font-semibold mb-2">
            {editMode ? 'Cập nhật phòng' : 'Tạo phòng mới'}
          </p>
          <h1 className="mb-4 bg-gradient-to-r from-slate-950 via-orange-800 to-sky-800 bg-clip-text text-4xl font-black tracking-tight text-transparent">
            {editMode ? 'Chỉnh sửa không gian của bạn.' : 'Tạo không gian lưu trú của bạn.'}
          </h1>
          <p className="max-w-2xl leading-relaxed text-slate-600">
            Mỗi phòng là một phần quan trọng trong trải nghiệm lưu trú. Hãy cập nhật thông tin, giá, tiện ích và hình ảnh để khách dễ dàng lựa chọn.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
          {/* Form Section - Left */}
          <div className="lg:col-span-2 space-y-8">
            {/* Room Details */}
            <div className="space-y-4 rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
              {/* Room Title */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  TÊN PHÒNG *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Studio nhiều ánh sáng"
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  MÔ TẢ *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Mô tả phòng, không gian và các điểm nổi bật"
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  GIÁ THUÊ HÀNG THÁNG *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-foreground">đ</span>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    className="flex-1 px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Ước tính 12 tháng: {(parseFloat(formData.price) * 12).toLocaleString('vi-VN')} đ
                </p>
              </div>

              {/* Area */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  DIỆN TÍCH (m²) *
                </label>
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleInputChange}
                  placeholder="Nhập diện tích phòng"
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  ĐỊA CHỈ *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Nhập hoặc chọn địa chỉ từ bản đồ"
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <MapPicker
                  onLocationSelect={(lat, lng, address) => {
                    setFormData(prev => ({
                      ...prev,
                      latitude: lat,
                      longitude: lng,
                      address: address
                    }))
                  }}
                  initialLat={formData.latitude}
                  initialLng={formData.longitude}
                />
              </div>

            </div>

            {/* Room Requirements */}
            <div className="space-y-6 rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
              <div>
                <h2 className="text-lg font-black text-slate-950 mb-1">SỞ THÍCH & CHÍNH SÁCH PHÒNG</h2>
                <p className="text-sm text-muted-foreground mb-4">Giúp hệ thống hiểu kiểu người thuê phù hợp với không gian của bạn</p>
              </div>
              
              {/* Cleanliness Required */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Môi trường sạch sẽ và ngăn nắp quan trọng như thế nào?
                </label>
                <p className="text-xs text-muted-foreground mb-3">Thông tin này giúp ghép phòng với người thuê có thói quen tương đồng</p>
                <select
                  name="cleanlinessRequired"
                  value={formData.cleanlinessRequired}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="low">Thoải mái - Linh hoạt về việc gọn gàng</option>
                  <option value="medium">Tiêu chuẩn - Ưu tiên không gian sạch sẽ vừa phải</option>
                  <option value="high">Rất quan trọng - Muốn duy trì môi trường thật sạch</option>
                </select>
              </div>

              {/* Noise Tolerance */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Mức độ tiếng ồn có thể chấp nhận là gì?
                </label>
                <p className="text-xs text-muted-foreground mb-3">Bao gồm âm nhạc, trò chuyện và các sinh hoạt hằng ngày</p>
                <select
                  name="noiseTolerance"
                  value={formData.noiseTolerance}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="quiet">Yên tĩnh - Cần không gian yên bình, ít tiếng ồn</option>
                  <option value="moderate">Vừa phải - Chấp nhận tiếng ồn sinh hoạt bình thường</option>
                  <option value="active">Sôi động - Phù hợp với không khí náo nhiệt</option>
                </select>
              </div>

              {/* Guest Policy */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Bạn muốn người thuê dẫn khách đến thường xuyên như thế nào?
                </label>
                <p className="text-xs text-muted-foreground mb-3">Giúp thiết lập kỳ vọng rõ ràng cho không gian chung</p>
                <select
                  name="guestPolicy"
                  value={formData.guestPolicy}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="no_guests">Không tiếp khách - Ưu tiên không gian riêng tư</option>
                  <option value="occasionally">Thỉnh thoảng - Bạn bè/gia đình có thể ghé thăm</option>
                  <option value="frequently">Thường xuyên - Chấp nhận khách ghé thăm đều đặn</option>
                </select>
              </div>

              {/* Preferred Sleep Habit */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Lịch sinh hoạt/ngủ nghỉ thường phù hợp với kiểu nào?
                </label>
                <p className="text-xs text-muted-foreground mb-3">Giúp ghép với người thuê có nhịp sinh hoạt tương thích</p>
                <select
                  name="preferredSleepHabit"
                  value={formData.preferredSleepHabit}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="early">Dậy sớm (6-8 giờ sáng)</option>
                  <option value="normal">Lịch sinh hoạt tiêu chuẩn (8-10 giờ sáng)</option>
                  <option value="late">Thức khuya (dậy sau 10 giờ sáng)</option>
                </select>
              </div>

              {/* Preferred Occupations */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Bạn ưu tiên kiểu người thuê nào?
                </label>
                <p className="text-xs text-muted-foreground mb-3">Ví dụ: sinh viên, nhân viên văn phòng, người làm việc từ xa...</p>
                <input
                  type="text"
                  name="preferredOccupation"
                  value={formData.preferredOccupation}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: sinh viên đại học, nhân viên công nghệ, người làm sáng tạo"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Curfew Policy */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Có quy định giờ yên tĩnh hoặc hạn chế ra vào không?
                </label>
                <p className="text-xs text-muted-foreground mb-3">Không bắt buộc - ví dụ: giờ yên tĩnh 22h-8h, không tiếp khách khuya</p>
                <textarea
                  name="curfewPolicy"
                  value={formData.curfewPolicy}
                  onChange={handleInputChange}
                  placeholder="Mô tả nội quy hoặc giới hạn của phòng/nhà (không bắt buộc)"
                  rows={3}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Max Occupants */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Số người tối đa trong mỗi phòng
                </label>
                <p className="text-xs text-muted-foreground mb-3">Phòng này phù hợp cho tối đa bao nhiêu người?</p>
                <select
                  name="maxOccupants"
                  value={formData.maxOccupants}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="1">1 người (ở đơn)</option>
                  <option value="2">2 người (ở đôi)</option>
                  <option value="3">3 người (ở ba)</option>
                  <option value="4">4+ người (phòng chia sẻ)</option>
                </select>
              </div>

              {/* Preferred Gender */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Bạn có ưu tiên giới tính người thuê không?
                </label>
                <p className="text-xs text-muted-foreground mb-3">Không bắt buộc - thông tin này giúp người thuê cảm thấy thoải mái hơn</p>
                <select
                  name="preferredGender"
                  value={formData.preferredGender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Không ưu tiên</option>
                  <option value="any">Bất kỳ giới tính nào</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="female_only">Chỉ nữ</option>
                  <option value="male_only">Chỉ nam</option>
                </select>
              </div>

              {/* Lifestyle Preferences */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-4">Mức độ tương thích lối sống</p>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/40 p-3 transition hover:bg-orange-50">
                    <input
                      type="checkbox"
                      name="allowSmoking"
                      checked={formData.allowSmoking}
                      onChange={(e) => setFormData({ ...formData, allowSmoking: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-primary"
                    />
                    <div>
                      <span className="font-medium text-foreground">Cho phép hút thuốc</span>
                      <p className="text-xs text-muted-foreground">Người thuê có thể hút thuốc ở khu vực được cho phép hoặc trong phòng</p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/50 p-3 transition hover:bg-sky-50">
                    <input
                      type="checkbox"
                      name="allowPets"
                      checked={formData.allowPets}
                      onChange={(e) => setFormData({ ...formData, allowPets: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-primary"
                    />
                    <div>
                      <span className="font-medium text-foreground">Cho phép nuôi thú cưng</span>
                      <p className="text-xs text-muted-foreground">Người thuê có thể mang thú cưng vào phòng</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="space-y-4 rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
              <h2 className="text-lg font-black text-slate-950">TIỆN ÍCH</h2>
              <div className="grid grid-cols-2 gap-3">
                {amenities.map(amenity => (
                  <button
                    key={amenity.id}
                    type="button"
                    onClick={() => toggleAmenity(amenity.id)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all text-sm flex items-center gap-2 ${
                      selectedAmenities.includes(amenity.id)
                        ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md shadow-orange-100'
                        : 'bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(amenity.id)}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                    {amenity.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 rounded-[2rem] border border-white/80 bg-white/85 p-4 shadow-xl shadow-slate-200/60 backdrop-blur">
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-gradient-to-r from-orange-600 to-amber-500 text-white hover:from-orange-500 hover:to-amber-400"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editMode ? 'Đang cập nhật...' : 'Đang tạo...'}
                  </>
                ) : (
                  editMode ? 'LƯU THAY ĐỔI' : 'LƯU BẢN NHÁP'
                )}
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={() => router.push('/room-management')}
              >
                HỦY
              </Button>
            </div>
          </div>

          {/* Thanh bên phải - tải ảnh */}
          <div className="space-y-6">
            {/* Khu vực tải ảnh */}
            <div className="rounded-[2rem] border-2 border-dashed border-sky-200 bg-sky-50/80 p-6 shadow-lg shadow-sky-100/60">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500 text-white mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Tải ảnh phòng</h3>
                <p className="text-xs text-muted-foreground">
                  Giúp khách hình dung phòng rõ hơn bằng những ảnh đẹp
                </p>
              </div>

              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="block">
                <button
                  type="button"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-sky-300 bg-white/70 px-4 py-3 text-center transition-colors hover:bg-sky-100"
                >
                  <span className="text-sm font-medium text-foreground">Bấm để chọn ảnh</span>
                </button>
              </label>
            </div>

            {/* Xem trước ảnh */}
          {(existingImageUrls.length > 0 || images.length > 0) && (
  <div>
    <h3 className="font-semibold text-foreground mb-3">
      ẢNH ĐÃ CHỌN ({existingImageUrls.length + images.length})
    </h3>

    <div className="grid grid-cols-2 gap-3">
      {existingImageUrls.map((imageUrl, index) => (
        <div key={imageUrl} className="relative group">
          <img
            src={imageUrl}
            alt="Ảnh phòng hiện tại"
            className="w-full h-32 object-cover rounded-lg border"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
            <button
              type="button"
              onClick={() => removeExistingImage(index)}
              className="bg-white p-2 rounded-full text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs mt-1 truncate">Ảnh hiện tại</p>
        </div>
      ))}
      {images.map((image, index) => (
        <div key={index} className="relative group">
        <img
  src={imagePreviews[index]}
  alt="Xem trước ảnh"
  className="w-full h-32 object-cover rounded-lg border"
/>
          {/* 🔥 Overlay khi hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="bg-white p-2 rounded-full text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 🔥 Tên file */}
          <p className="text-xs mt-1 truncate">{image.name}</p>
        </div>
      ))}
    </div>
  </div>
)}

            {/* Status Badge */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-medium text-amber-900">
                {editMode ? 'Đang chỉnh sửa phòng' : 'Đang tạo phòng mới'}
              </p>
            </div>
            {roomId && <RoomVerificationPanel roomId={roomId} />}
          </div>
        </form>
      </div>
    </div>
  )
}
