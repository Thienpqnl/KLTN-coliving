'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { amenityClientService, Amenity } from '@/lib/services/amenity-client.service'

export default function AmenitiesPage() {
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [loading, setLoading] = useState(true)
  const [newAmenityName, setNewAmenityName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    fetchAmenities()
  }, [])

  const fetchAmenities = async () => {
    try {
      setLoading(true)
      const res = await amenityClientService.getAll()
      setAmenities(res)
    } catch (error) {
      console.error('Failed to fetch amenities:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAmenityName.trim()) return

    try {
      setIsAdding(true)
      const newAmenity = await amenityClientService.create(newAmenityName)
      setAmenities([...amenities, newAmenity])
      setNewAmenityName('')
    } catch (error) {
      console.error('Failed to add amenity:', error)
      alert('Failed to add amenity')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this amenity?')) return

    try {
      await amenityClientService.delete(id)
      setAmenities(amenities.filter(a => a.id !== id))
    } catch (error) {
      console.error('Failed to delete amenity:', error)
      alert('Failed to delete amenity')
    }
  }

  const handleEdit = async (id: string) => {
    if (!editingName.trim()) return

    try {
      const updated = await amenityClientService.update(id, editingName)
      setAmenities(amenities.map(a => a.id === id ? updated : a))
      setEditingId(null)
      setEditingName('')
    } catch (error) {
      console.error('Failed to update amenity:', error)
      alert('Failed to update amenity')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Manage Amenities</h1>
          <p className="text-muted-foreground">Add and manage amenities for your rooms</p>
        </div>

        {/* Add New Amenity Form */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Add New Amenity</h2>
          <form onSubmit={handleAdd} className="flex gap-3">
            <Input
              type="text"
              placeholder="Enter amenity name (e.g., WiFi, Kitchen, etc.)"
              value={newAmenityName}
              onChange={(e) => setNewAmenityName(e.target.value)}
              disabled={isAdding}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isAdding || !newAmenityName.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {isAdding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Amenity
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Amenities List */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground">Amenities ({amenities.length})</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : amenities.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-muted-foreground">No amenities yet. Create one above!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {amenities.map((amenity) => (
                <div key={amenity.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition">
                  {editingId === amenity.id ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleEdit(amenity.id)}
                        className="bg-primary hover:bg-primary/90"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null)
                          setEditingName('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-medium text-foreground">{amenity.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(amenity.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(amenity.id)
                            setEditingName(amenity.name)
                          }}
                          className="p-1.5 hover:bg-secondary rounded transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDelete(amenity.id)}
                          className="p-1.5 hover:bg-red-50 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
