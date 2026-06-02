'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  image: string
  status: 'AVAILABLE' | 'OCCUPIED'
  amenityIds: string[]
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
    image: '',
    status: 'AVAILABLE' as 'AVAILABLE' | 'OCCUPIED',
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
const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  // Load amenities
  useEffect(() => {
    const fetchAmenities = async () => {
      try {
        const res = await apiClient.get<Amenity[]>('/amenities')
        setAmenities(res)
      } catch (error) {
        console.error('Failed to fetch amenities:', error)
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
          setFormData({
            title: res.title,
            description: res.description,
            price: res.price.toString(),
            area: res.area,
            address: res.address,
            image: res.image,
            status: res.status,
          })
          setSelectedAmenities(res.amenityIds)
          setEditMode(true)
        } catch (error) {
          console.error('Failed to fetch room:', error)
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

        let imageUrls: string[] = [];

// upload tất cả ảnh
if (images.length > 0) {
  imageUrls = await Promise.all(
    images.map((img) => uploadImage(img))
  );
}

      const payload = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        area: formData.area,
        address: formData.address,
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
        await apiClient.put(`/rooms-upload/${roomId}`, payload)
      } else {
        await apiClient.post('/rooms-upload/create', payload)
      }

      router.push('/room-management')
    } catch (error) {
      console.error('Failed to save room:', error)
      alert('Failed to save room. Please try again.')
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
            {editMode ? 'Update Room' : 'Create or Update'}
          </p>
          <h1 className="text-4xl font-serif text-foreground mb-4">
            {editMode ? 'Edit Your Space.' : 'Curate Your Space.'}
          </h1>
          <p className="text-foreground max-w-2xl leading-relaxed">
            Every room in the hearth is a chapter. Define the narrative of your space through our thoughtful interior aesthetic and architectural elements.
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
                  ROOM TITLE *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., The Sun-Circled Nook"
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  DESCRIPTION *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the room, atmosphere, and features"
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  MONTHLY RENT *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-foreground">$</span>
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
                  Annual: ${(parseFloat(formData.price) * 12).toFixed(2)} 
                </p>
              </div>

              {/* Area */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  AREA (m²) *
                </label>
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleInputChange}
                  placeholder="Enter room area"
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  ADDRESS *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter room address"
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  STATUS
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="OCCUPIED">Occupied</option>
                </select>
              </div>
            </div>

            {/* Room Requirements */}
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">ROOM PREFERENCES & POLICIES</h2>
                <p className="text-sm text-muted-foreground mb-4">Help us understand what kind of roommates would thrive in your space</p>
              </div>
              
              {/* Cleanliness Required */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  How important is a clean and organized environment?
                </label>
                <p className="text-xs text-muted-foreground mb-3">This helps match with like-minded residents</p>
                <select
                  name="cleanlinessRequired"
                  value={formData.cleanlinessRequired}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="low">Relaxed - I'm flexible about tidiness</option>
                  <option value="medium">Standard - I appreciate a reasonably clean space</option>
                  <option value="high">Very Important - I maintain a very clean environment</option>
                </select>
              </div>

              {/* Noise Tolerance */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  What's your noise comfort level?
                </label>
                <p className="text-xs text-muted-foreground mb-3">Think about music, conversations, and daily activities</p>
                <select
                  name="noiseTolerance"
                  value={formData.noiseTolerance}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="quiet">Quiet - I need a peaceful, silent space</option>
                  <option value="moderate">Moderate - Normal household noise is fine</option>
                  <option value="active">Active - I enjoy a lively, vibrant atmosphere</option>
                </select>
              </div>

              {/* Guest Policy */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  How often do you expect roommates to have visitors?
                </label>
                <p className="text-xs text-muted-foreground mb-3">This sets expectations for shared spaces</p>
                <select
                  name="guestPolicy"
                  value={formData.guestPolicy}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="no_guests">No Guests - Private space preferred</option>
                  <option value="occasionally">Occasionally - Friends/family visit sometimes</option>
                  <option value="frequently">Frequently - Regular visitors are welcome</option>
                </select>
              </div>

              {/* Preferred Sleep Habit */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  What's your typical sleep schedule?
                </label>
                <p className="text-xs text-muted-foreground mb-3">Helps match with compatible residents</p>
                <select
                  name="preferredSleepHabit"
                  value={formData.preferredSleepHabit}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="early">Early Riser (Wake 6-8am)</option>
                  <option value="normal">Standard Schedule (Wake 8-10am)</option>
                  <option value="late">Night Owl (Wake 10am+)</option>
                </select>
              </div>

              {/* Preferred Occupations */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  What type of residents do you prefer?
                </label>
                <p className="text-xs text-muted-foreground mb-3">e.g., Students, Professionals, Remote workers, etc.</p>
                <input
                  type="text"
                  name="preferredOccupation"
                  value={formData.preferredOccupation}
                  onChange={handleInputChange}
                  placeholder="e.g., University students, Tech professionals, Creative professionals"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Curfew Policy */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Are there any quiet hours or access restrictions?
                </label>
                <p className="text-xs text-muted-foreground mb-3">Optional - e.g., "Quiet hours 10pm-8am", "No late night guests"</p>
                <textarea
                  name="curfewPolicy"
                  value={formData.curfewPolicy}
                  onChange={handleInputChange}
                  placeholder="Describe any house rules or restrictions (optional)"
                  rows={3}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Max Occupants */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Maximum number of occupants per room
                </label>
                <p className="text-xs text-muted-foreground mb-3">How many people should share this room?</p>
                <select
                  name="maxOccupants"
                  value={formData.maxOccupants}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="1">1 Person (Single occupancy)</option>
                  <option value="2">2 People (Double occupancy)</option>
                  <option value="3">3 People (Triple occupancy)</option>
                  <option value="4">4+ People (Shared dorm)</option>
                </select>
              </div>

              {/* Preferred Gender */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Do you have a gender preference for roommates?
                </label>
                <p className="text-xs text-muted-foreground mb-3">Optional - this helps some residents feel more comfortable</p>
                <select
                  name="preferredGender"
                  value={formData.preferredGender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No Preference</option>
                  <option value="any">Any Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="female_only">Female Only</option>
                  <option value="male_only">Male Only</option>
                </select>
              </div>

              {/* Lifestyle Preferences */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-4">Lifestyle Compatibility</p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-border rounded-lg hover:bg-muted transition">
                    <input
                      type="checkbox"
                      name="allowSmoking"
                      checked={formData.allowSmoking}
                      onChange={(e) => setFormData({ ...formData, allowSmoking: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-primary"
                    />
                    <div>
                      <span className="font-medium text-foreground">Allow Smoking</span>
                      <p className="text-xs text-muted-foreground">Roommates can smoke in common areas or their room</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-border rounded-lg hover:bg-muted transition">
                    <input
                      type="checkbox"
                      name="allowPets"
                      checked={formData.allowPets}
                      onChange={(e) => setFormData({ ...formData, allowPets: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-primary"
                    />
                    <div>
                      <span className="font-medium text-foreground">Allow Pets</span>
                      <p className="text-xs text-muted-foreground">Roommates can bring pets into the room</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">AMENITIES</h2>
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
                    {editMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editMode ? 'UPDATE ROOM' : 'CREATE ROOM'
                )}
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={() => router.push('/room-management')}
              >
                CANCEL
              </Button>
            </div>
          </div>

          {/* Right Sidebar - Image Upload */}
          <div className="space-y-6">
            {/* Upload Section */}
            <div className="bg-blue-50 rounded-xl p-6 border-2 border-dashed border-blue-200">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500 text-white mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Upload Images</h3>
                <p className="text-xs text-muted-foreground">
                  Showcase your room with beautiful photos
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
                  <span className="text-sm font-medium text-foreground">Click to select images</span>
                </button>
              </label>
            </div>

            {/* Image Preview */}
          {images.length > 0 && (
  <div>
    <h3 className="font-semibold text-foreground mb-3">
      SELECTED IMAGES ({images.length})
    </h3>

    <div className="grid grid-cols-2 gap-3">
      {images.map((image, index) => (
        <div key={index} className="relative group">
        <img
  src={imagePreviews[index]}
  alt="preview"
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
                {editMode ? 'Updating Room' : 'Creating New Room'}
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}