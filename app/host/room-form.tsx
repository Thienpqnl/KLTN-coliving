'use client'

import { useState, useEffect } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { uploadImage } from "@/lib/upload";
interface Room {
  id: string
  title: string
  description: string
  price: number
  area: string
  address: string
  image?: string | string[]
  images?: { url: string }[]
  status: 'AVAILABLE' | 'OCCUPIED'
  amenityIds?: string[]
  amenities?: { amenity?: { id: string; name: string } }[]
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
    image: '',
    status: 'AVAILABLE' as 'AVAILABLE' | 'OCCUPIED',
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
          const amenityIds = res.amenityIds || res.amenities?.map((item) => item.amenity?.id).filter((id): id is string => Boolean(id)) || []

          setFormData({
            title: res.title,
            description: res.description,
            price: res.price.toString(),
            area: res.area,
            address: res.address,
            image: roomImages[0] || '',
            status: res.status,
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
        image: imageUrls,
        amenityIds: selectedAmenities,
      }

      if (editMode && roomId) {
        await apiClient.put(`/rooms/${roomId}`, payload)
      } else {
        await apiClient.post('/rooms-upload/create', payload)
      }

      router.push('/room-management')
    } catch (error) {
      console.error('Không thể lưu phòng:', error)
      alert('Không thể lưu phòng. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm uppercase tracking-wide text-primary font-semibold mb-2">
            {editMode ? 'Cập nhật phòng' : 'Tạo phòng mới'}
          </p>
          <h1 className="text-4xl font-serif text-foreground mb-4">
            {editMode ? 'Chỉnh sửa không gian của bạn.' : 'Tạo không gian lưu trú của bạn.'}
          </h1>
          <p className="text-foreground max-w-2xl leading-relaxed">
            Mỗi phòng là một phần quan trọng trong trải nghiệm lưu trú. Hãy cập nhật thông tin, giá, tiện ích và hình ảnh để khách dễ dàng lựa chọn.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
          {/* Form Section - Left */}
          <div className="lg:col-span-2 space-y-8">
            {/* Room Details */}
            <div className="space-y-4">
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
                  placeholder="Nhập địa chỉ phòng"
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  TRẠNG THÁI
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="AVAILABLE">Còn trống</option>
                  <option value="OCCUPIED">Đã thuê</option>
                </select>
              </div>
            </div>

            {/* Amenities */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">TIỆN ÍCH</h2>
              <div className="grid grid-cols-2 gap-3">
                {amenities.map(amenity => (
                  <button
                    key={amenity.id}
                    type="button"
                    onClick={() => toggleAmenity(amenity.id)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all text-sm flex items-center gap-2 ${
                      selectedAmenities.includes(amenity.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-200 text-gray-600'
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
            <div className="flex gap-3">
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editMode ? 'Đang cập nhật...' : 'Đang tạo...'}
                  </>
                ) : (
                  editMode ? 'CẬP NHẬT PHÒNG' : 'TẠO PHÒNG'
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
            <div className="bg-blue-50 rounded-xl p-6 border-2 border-dashed border-blue-200">
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
                  className="w-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg text-center cursor-pointer hover:bg-blue-100 transition-colors"
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
          </div>
        </form>
      </div>
    </div>
  )
}
