'use client'

import { useState } from 'react'
import { Plus, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AmenityItem {
  id: string
  label: string
  selected: boolean
  color?: string
}

const amenities: AmenityItem[] = [
  { id: 'fire', label: 'Bright Fire', selected: true, color: 'bg-primary' },
  { id: 'bedroom', label: 'Soft Bedroom', selected: false, color: 'bg-gray-200' },
  { id: 'solace', label: 'Ample Solace', selected: true, color: 'bg-blue-500' },
  { id: 'kitchen', label: 'AMD Kitchen', selected: false, color: 'bg-gray-200' },
]

export function RoomForm() {
  const [formData, setFormData] = useState({
    roomName: '',
    roomType: 'E.g., The Sun-Circled Nook',
    monthlyRent: '1.00',
    targetOccupancy: '',
    images: [] as string[],
  })

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['fire', 'solace'])
  const [draftStatus, setDraftStatus] = useState('Drafting in Progress')

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenityId)
        ? prev.filter(id => id !== amenityId)
        : [...prev, amenityId]
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm uppercase tracking-wide text-primary font-semibold mb-2">
            Create or Update
          </p>
          <h1 className="text-4xl font-serif text-foreground mb-4">Curate Your Space.</h1>
          <p className="text-foreground max-w-2xl leading-relaxed">
            Every room in the hearth is a chapter. Define the narrative of your space through our thoughtful interior aesthetic and architectural elements.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Section - Left */}
          <div className="lg:col-span-2 space-y-8">
            {/* Room Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  ROOM NAME
                </label>
                <input
                  type="text"
                  name="roomName"
                  value={formData.roomName}
                  onChange={handleInputChange}
                  placeholder="Enter room name"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Monthly Rent */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  MONTHLY RENT
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-foreground">$</span>
                  <input
                    type="number"
                    name="monthlyRent"
                    value={formData.monthlyRent}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Suggested annual {(parseFloat(formData.monthlyRent) * 12).toFixed(2)} - 20% discount yearly
                </p>
              </div>

              {/* Room Type */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  ROOM TYPE
                </label>
                <input
                  type="text"
                  name="roomType"
                  value={formData.roomType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Target Occupancy */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  TARGETED OCCUPANCY
                </label>
                <textarea
                  name="targetOccupancy"
                  value={formData.targetOccupancy}
                  onChange={handleInputChange}
                  placeholder="Describe the atmosphere, the meeting style, and the feeling of the space"
                  rows={3}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>

            {/* Curated Amenities */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">CURATED AMENITIES</h2>
              <div className="grid grid-cols-2 gap-3">
                {amenities.map(amenity => (
                  <button
                    key={amenity.id}
                    onClick={() => toggleAmenity(amenity.id)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all text-sm flex items-center gap-2 ${
                      selectedAmenities.includes(amenity.id)
                        ? amenity.id === 'solace'
                          ? 'bg-blue-500 text-white'
                          : 'bg-primary text-primary-foreground'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(amenity.id)}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                    {amenity.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                RESERVE NOW
              </Button>
              <Button variant="outline">SAVE AS DRAFT</Button>
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
                <h3 className="font-semibold text-foreground mb-1">Upload Image Gallery</h3>
                <p className="text-xs text-muted-foreground">
                  Showcase your room with beautiful photos. Drag & drop or click to upload
                </p>
              </div>

              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload">
                <button className="w-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg text-center cursor-pointer hover:bg-blue-100 transition-colors">
                  <span className="text-sm font-medium text-foreground">Drag images here or click to select</span>
                </button>
              </label>
            </div>

            {/* Open Spaces */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">OPEN SPACES</h3>
              <p className="text-xs text-muted-foreground">
                Drafting in Progress
              </p>
            </div>

            {/* Status Badge */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-medium text-amber-900">
                {draftStatus}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}