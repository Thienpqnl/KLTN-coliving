"use client"
import { useState, useEffect } from "react"
import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"
import { Footer } from "@/app/host/footer"
import { HostProtectedRoute } from "@/components/HostProtectedRoute"
import { useAuth } from "@/lib/hooks/useAuth"
import { sharedSpaceClientService, SharedResource, ResourceBooking } from "@/lib/services/shared-space-client.service"
import { Button } from "@/components/ui/button"
import { Package2, Plus, Edit, Trash2, Search, Monitor, Home, Zap, Droplets, CheckCircle, Clock, Image as ImageIcon } from "lucide-react"
import ApprovalModal from "@/app/rooms/components/ApprovalModal"
import { getResourceRealTimeStatus } from '@/lib/utils/resource-status';
import { apiClient } from "@/lib/api/client"

interface Room {
  id: string;
  title: string;
}

interface UtilityBill {
  id: string;
  month: number;
  year: number;
  electricityUsage?: number;
  waterUsage?: number;
  totalCost?: number;
  notes?: string | null;
  status: string;
  paymentProofUrl?: string | null;
  approvedAt?: string | null;
}

function ResourceManagementContent() {
  const { user } = useAuth()
  const [resources, setResources] = useState<SharedResource[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoom, setSelectedRoom] = useState<string>("")
  const [approvalBooking, setApprovalBooking] = useState<ResourceBooking | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [pageFeedback, setPageFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  
  const [showUtilityBills, setShowUtilityBills] = useState(false)
  const [utilityBills, setUtilityBills] = useState<UtilityBill[]>([])
  const [showUtilityForm, setShowUtilityForm] = useState(false)
  const [utilityForm, setUtilityForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    electricityUsage: '',
    waterUsage: '',
    notes: ''
  })
  const [activeLightBoxImg, setActiveLightBoxImg] = useState<string | null>(null);
  // State mới cho danh sách phòng lấy từ API
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)

  // Form state ban đầu
  const initialFormState = {
    name: "",
    description: "",
    type: "EQUIPMENT" as "EQUIPMENT" | "SPACE",
    status: "ACTIVE" as "ACTIVE" | "MAINTENANCE",
    requiresApproval: false,
    maxDurationMinutes: 120,
    roomId: ""
  }
  const [formData, setFormData] = useState(initialFormState)
  const handleOpenApproval = (booking: ResourceBooking) => {
    setApprovalBooking(booking)
    setShowApprovalModal(true)
  }

  // Hàm reload sau khi xét duyệt xong
  const handleApprovalSuccess = () => {
    loadResources() // Reload lại danh sách tài nguyên và bookings
  }

  // Fetch utility bills for selected room
  const fetchUtilityBills = async () => {
    if (!selectedRoom) return
    try {
      const contract = await apiClient.get<{ id: string }>(`/rooms/${selectedRoom}/contract`)
      const contractId = contract?.id
      if (!contractId) {
        setUtilityBills([])
        return
      }

      const billsData = await apiClient.get<UtilityBill[]>(`/contracts/${contractId}/utility-bills`)
      setUtilityBills(Array.isArray(billsData) ? billsData : [])
    } catch (error) {
      console.error("Error fetching utility bills:", error)
    }
  }

  useEffect(() => {
    if (showUtilityBills && selectedRoom) {
      fetchUtilityBills()
    }
  }, [showUtilityBills, selectedRoom])

  // Create utility bill
  const handleCreateUtilityBill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoom) {
      setPageFeedback({ type: "error", message: "Vui lòng chọn phòng" })
      return
    }
    try {
      setPageFeedback(null)
      const contract = await apiClient.get<{ id: string }>(`/rooms/${selectedRoom}/contract`)
      const contractId = contract?.id
      if (!contractId) {
        alert("Không tìm thấy hợp đồng của phòng")
        return
      }

      await apiClient.post(`/contracts/${contractId}/utility-bills`, {
        ...utilityForm,
        electricityUsage: parseFloat(utilityForm.electricityUsage) || 0,
        waterUsage: parseFloat(utilityForm.waterUsage) || 0
      })

      setPageFeedback({ type: "success", message: "Đã tạo hóa đơn điện nước thành công!" })
      setShowUtilityForm(false)
      setUtilityForm({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        electricityUsage: '',
        waterUsage: '',
        notes: ''
      })
      fetchUtilityBills()
    } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
      setPageFeedback({ type: "error", message: error?.message || "Lỗi khi tạo hóa đơn" })
    }
  }

  // Approve payment proof
  const handleApproveProof = async (billId: string) => {
    try {
      setPageFeedback(null)
      await apiClient.put(`/utility-bills/${billId}/approve`, {})
      setPageFeedback({ type: "success", message: "Đã xác nhận thanh toán!" })
      fetchUtilityBills()
    } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
      setPageFeedback({ type: "error", message: error?.message || "Lỗi khi xác nhận thanh toán" })
    }
  }

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setRoomsLoading(true)
        const response = await apiClient.get<{ rooms: Room[] }>('/rooms-upload')
        const roomList = Array.isArray(response?.rooms) ? response.rooms : []
        if (!Array.isArray(response?.rooms)) {
          console.warn('Unexpected rooms response:', response)
        }
        setRooms(roomList)
      } catch (error) {
        console.error("Error fetching rooms:", error)
        setRooms([])
      } finally {
        setRoomsLoading(false)
      }
    }

    fetchRooms()
  }, [])

  // Đồng bộ roomId vào form khi thay đổi bộ lọc phòng bên ngoài để tăng trải nghiệm người dùng
  useEffect(() => {
    if (selectedRoom) {
      setFormData(prev => ({ ...prev, roomId: selectedRoom }))
    }
    loadResources()
  }, [selectedRoom])

  const loadResources = async () => {
    try {
      setLoading(true)
      if (selectedRoom) {
        const data = await sharedSpaceClientService.getCalendar(selectedRoom)
        setResources(data)
      } else {
        setResources([])
      }
    } catch (error) {
      console.error("Error loading resources:", error)
    } finally {
      setLoading(false)
    }
  }

  // Xử lý Thêm tài nguyên thực tế qua API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.roomId) {
      setPageFeedback({ type: "error", message: "Vui lòng lựa chọn phòng chỉ định!" })
      return
    }
    try {
      setSubmitting(true)
      setPageFeedback(null)
      await sharedSpaceClientService.createResource(formData)
      
      setPageFeedback({ type: "success", message: "Tạo tài nguyên dùng chung thành công!" })
      setShowForm(false)
      setFormData(initialFormState)
      
      // Chuyển bộ lọc sang phòng mới tạo và tải lại danh sách
      setSelectedRoom(formData.roomId)
      // Đợi một chút để state cập nhật rồi mới load resources
      setTimeout(() => {
        loadResources()
      }, 100)
    } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
      setPageFeedback({ type: "error", message: error.message || "Gặp lỗi trong quá trình tạo tài nguyên." })
    } finally {
      setSubmitting(false)
    }
  }

  // Xử lý Xóa tài nguyên thực tế qua API
  const handleDelete = async (resourceId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa tài nguyên này? Tất cả dữ liệu đặt lịch liên quan sẽ bị ảnh hưởng.")) {
      try {
        setPageFeedback(null)
        await sharedSpaceClientService.deleteResource(resourceId)
        setPageFeedback({ type: "success", message: "Đã xóa tài nguyên thành công." })
        // Cập nhật nhanh danh sách hiển thị cục bộ không cần reload trang
        setResources(prev => prev.filter(res => res.id !== resourceId))
      } catch (error: unknown) {
        if (!(error instanceof Error)) throw error;
        setPageFeedback({ type: "error", message: error.message || "Không thể xóa tài nguyên vào lúc này." })
      }
    }
  }

  const filteredResources = resources.filter(res =>
    res.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/45 to-sky-50/60">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-auto">
        <MobileHeader />
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-4 lg:p-8">
          {/* Header */}
          <header className="mb-8 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="mb-2 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-700">
                  Quản lý tài nguyên
                </p>
                <h1 className="bg-gradient-to-r from-slate-950 via-orange-800 to-sky-800 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-4xl">
                  Tài nguyên dùng chung
                </h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                  Quản lý thiết bị và không gian dùng chung cho các phòng co-living của bạn.
                </p>
              </div>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-orange-600 to-amber-500 text-white hover:from-orange-500 hover:to-amber-400 gap-2 shadow-lg shadow-orange-950/30"
              >
                <Plus className="h-4 w-4" />
                Thêm tài nguyên
              </Button>
            </div>
          </header>

          {pageFeedback && (
            <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm shadow-sm ${pageFeedback.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {pageFeedback.message}
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 rounded-2xl border border-white/70 bg-white/75 p-4 shadow-xl shadow-slate-200/60 backdrop-blur">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm tài nguyên..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>
              </div>
              <div className="w-full sm:w-64">
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                >
                  <option value="">Tất cả phòng</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>{room.title}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => setShowUtilityBills(!showUtilityBills)}
                variant={showUtilityBills ? "default" : "outline"}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                {showUtilityBills ? "Đóng" : "Tiền điện nước"}
              </Button>
            </div>
          </div>

          {/* Utility Bills Section */}
          {showUtilityBills && (
            <div className="mb-6 rounded-2xl border border-white/70 bg-white/75 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Quản lý tiền điện nước
                </h2>
                <Button
                  onClick={() => setShowUtilityForm(!showUtilityForm)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tạo hóa đơn mới
                </Button>
              </div>

              {/* Create Utility Bill Form */}
              {showUtilityForm && (
                <form onSubmit={handleCreateUtilityBill} className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Tháng</label>
                      <select
                        value={utilityForm.month}
                        onChange={(e) => setUtilityForm({...utilityForm, month: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                        required
                      >
                        {Array.from({length: 12}, (_, i) => (
                          <option key={i+1} value={i+1}>Tháng {i+1}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Năm</label>
                      <input
                        type="number"
                        value={utilityForm.year}
                        onChange={(e) => setUtilityForm({...utilityForm, year: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Sử dụng điện (kWh)
                      </label>
                      <input
                        type="number"
                        value={utilityForm.electricityUsage}
                        onChange={(e) => setUtilityForm({...utilityForm, electricityUsage: e.target.value})}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        Sử dụng nước (m³)
                      </label>
                      <input
                        type="number"
                        value={utilityForm.waterUsage}
                        onChange={(e) => setUtilityForm({...utilityForm, waterUsage: e.target.value})}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Ghi chú</label>
                    <textarea
                      value={utilityForm.notes}
                      onChange={(e) => setUtilityForm({...utilityForm, notes: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2 ">
                    <Button type="submit" className="flex-1 cursor-pointer">Tạo hóa đơn</Button>
                    <Button type="button" variant="outline" onClick={() => setShowUtilityForm(false)}>Hủy</Button>
                  </div>
                </form>
              )}
              {/* Utility Bills List */}
              <div className="space-y-3">
                {utilityBills.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Chưa có hóa đơn nào</p>
                ) : (
                  utilityBills.map((bill) => (
                    <div key={bill.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            Tháng {bill.month}/{bill.year}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Điện: {bill.electricityUsage?.toLocaleString('vi-VN')} kWh | 
                            Nước: {bill.waterUsage?.toLocaleString('vi-VN')} m³
                          </p>
                          {bill.notes && (
                            <p className="text-xs italic text-slate-400 mt-1">Ghi chú: {bill.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-slate-900">
                            {bill.totalCost?.toLocaleString('vi-VN')} đ
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            bill.status === 'PAID' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : bill.paymentProofUrl 
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {bill.status === 'PAID' ? 'Đã thanh toán' : bill.paymentProofUrl ? 'Chờ xác nhận' : 'Chưa thanh toán'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Trường hợp: Chờ xác nhận - Hiển thị ảnh kèm nút Duyệt */}
                      {bill.paymentProofUrl && bill.status !== 'PAID' && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <div className="flex items-end gap-4">
                            <div className="flex-1">
                              <p className="text-xs text-slate-600 mb-2 flex items-center gap-1 font-medium">
                                <ImageIcon className="h-3 w-3" />
                                Minh chứng thanh toán (Click để phóng to)
                              </p>
                              <div className="relative w-24 h-24 group overflow-hidden rounded-lg border border-slate-200 shadow-sm cursor-zoom-in">
                                <img 
                                  src={bill.paymentProofUrl} 
                                  alt="Payment proof" 
                                  className="w-full h-full object-cover transition duration-300 group-hover:scale-110 group-hover:brightness-90"
                                  onClick={() => setActiveLightBoxImg(bill.paymentProofUrl ?? null)}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none">
                                  <span className="text-white text-xs font-bold"> Xem</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleApproveProof(bill.id)}
                              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Xác nhận đã nhận tiền
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Trường hợp: Đã thanh toán - Vẫn giữ lại ảnh thu nhỏ để chủ nhà kiểm tra lịch sử nếu cần */}
                      {bill.status === 'PAID' && (
                        <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col gap-3">
                          <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                            <CheckCircle className="h-3 w-3" />
                            Đã xác nhận thanh toán vào {bill.approvedAt ? new Date(bill.approvedAt).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}
                          </p>
                          {bill.paymentProofUrl && (
                            <div>
                              <p className="text-[11px] text-slate-400 mb-1.5">Ảnh đối chiếu lịch sử:</p>
                              <img 
                                src={bill.paymentProofUrl} 
                                alt="Past Payment proof" 
                                className="w-14 h-14 object-cover rounded-md border border-slate-200 opacity-70 hover:opacity-100 transition cursor-zoom-in"
                                onClick={() => setActiveLightBoxImg(bill.paymentProofUrl ?? null)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Resource List */}
          {!selectedRoom ? (
            <div className="rounded-2xl border border-white/70 bg-white/75 p-12 shadow-xl shadow-slate-200/60 backdrop-blur text-center">
              <Package2 className="h-16 w-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Chọn phòng để xem tài nguyên</h3>
              <p className="text-sm text-slate-500">Vui lòng chọn một phòng từ bộ lọc ở trên để quản lý tài nguyên của phòng đó.</p>
            </div>
          ) : loading ? (
            <div className="rounded-2xl border border-white/70 bg-white/75 p-12 shadow-xl shadow-slate-200/60 backdrop-blur text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-sm text-slate-500 mt-4">Đang tải tài nguyên thời gian thực...</p>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="rounded-2xl border border-white/70 bg-white/75 p-12 shadow-xl shadow-slate-200/60 backdrop-blur text-center">
              <Package2 className="h-16 w-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Chưa có tài nguyên nào</h3>
              <p className="text-sm text-slate-500 mb-4">Phòng này chưa có tài nguyên dùng chung nào.</p>
              <Button
                onClick={() => setShowForm(true)}
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Thêm tài nguyên đầu tiên
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map((resource) => (
                <div
                  key={resource.id}
                  className="rounded-2xl border border-white/70 bg-white/75 p-6 shadow-xl shadow-slate-200/60 backdrop-blur hover:shadow-2xl transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${
                      resource.type === 'EQUIPMENT' 
                        ? 'bg-gradient-to-br from-blue-100 to-cyan-100' 
                        : 'bg-gradient-to-br from-purple-100 to-pink-100'
                    }`}>
                      
                      {resource.type === 'EQUIPMENT' ? (
                        <Monitor className="h-6 w-6 text-blue-600" />
                      ) : (
                        <Home className="h-6 w-6 text-purple-600" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(resource.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{resource.name}</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                    {resource.description || "Không có mô tả"}
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    {(() => {
                      const realTimeStatus = getResourceRealTimeStatus(resource);

                      return (
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                          realTimeStatus === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : realTimeStatus === 'BUSY'
                            ? 'bg-red-100 text-red-700 animate-pulse'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {realTimeStatus === 'ACTIVE' && '🟢 Sẵn sàng'}
                          {realTimeStatus === 'BUSY' && '🔴 Đang sử dụng'}
                          {realTimeStatus === 'MAINTENANCE' && '🟠 Bảo trì'}
                        </span>
                      );
                    })()}
                    <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-full">
                      {resource.type === 'EQUIPMENT' ? 'Thiết bị' : 'Không gian'}
                    </span>
                  </div> 
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-xs text-slate-400 font-medium">
                      {resource.resourceBookings?.length || 0} lượt đặt lịch sử dụng
                    </p>
                    
                    {/* Hiển thị danh sách booking chờ duyệt */}
                    {resource.resourceBookings?.filter(b => b.status === 'PENDING').map(booking => (
                      <div key={booking.id} className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-xs font-bold text-amber-800 truncate">{booking.title}</p>
                          <p className="text-[10px] text-amber-600 truncate">
                            Người đặt: {booking.user?.fullName || booking.user?.name || "Không rõ"}
                          </p>
                          <p className="text-[10px] text-amber-600">
                            {new Date(booking.startTime).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} - 
                            {new Date(booking.endTime).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenApproval(booking)}
                          className="h-7 px-2 text-[10px] font-bold border-amber-300 text-amber-700 hover:bg-amber-100 whitespace-nowrap shrink-0"
                        >
                          Xét duyệt
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                </div>
              ))}
            </div>
          )}
<ApprovalModal 
                    isOpen={showApprovalModal}
                    onClose={() => {
                      setShowApprovalModal(false)
                      setApprovalBooking(null)
                    }}
                    booking={approvalBooking}
                    resource={resources.find(r => r.id === approvalBooking?.resourceId)}
                    onSuccess={handleApprovalSuccess}
                  />
          {/* Add Resource Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-xl font-bold text-slate-900">Thêm tài nguyên mới</h2>
                  <p className="text-sm text-slate-500 mt-1">Tạo tài nguyên dùng chung cho phòng</p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Chọn phòng chỉ định</label>
                    <select
                      value={formData.roomId}
                      onChange={(e) => setFormData({...formData, roomId: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm font-medium text-slate-700"
                      required
                      disabled={roomsLoading}
                    >
                      <option value="">-- Chọn phòng kết nối --</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>{room.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Tên tài nguyên</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ví dụ: Máy giặt tủ sấy, Phòng sinh hoạt tầng 2..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Mô tả</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Mô tả chi tiết nội quy hoặc cách vận hành thiết bị..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Loại</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value as 'EQUIPMENT' | 'SPACE'})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      >
                        <option value="EQUIPMENT">Thiết bị vật chất</option>
                        <option value="SPACE">Không gian chung</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Trạng thái ban đầu</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value as 'ACTIVE' | 'MAINTENANCE'})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      >
                        <option value="ACTIVE">Sẵn sàng sử dụng</option>
                        <option value="MAINTENANCE">Đang bảo trì/Sửa chữa</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Thời gian sử dụng tối đa (phút/lượt)</label>
                    <input
                      type="number"
                      value={formData.maxDurationMinutes}
                      onChange={(e) => setFormData({...formData, maxDurationMinutes: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      min="15"
                      step="15"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2 py-2">
                    <input
                      type="checkbox"
                      id="requiresApproval"
                      checked={formData.requiresApproval}
                      onChange={(e) => setFormData({...formData, requiresApproval: e.target.checked})}
                      className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    <label htmlFor="requiresApproval" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
                      Yêu cầu phê duyệt từ chủ nhà (Host) trước khi dùng
                    </label>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-gradient-to-r from-orange-600 to-amber-500 text-white hover:from-orange-500 hover:to-amber-400"
                    >
                      {submitting ? "Đang xử lý..." : "Xác nhận thêm"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submitting}
                      onClick={() => {
                        setShowForm(false)
                        setFormData(initialFormState)
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
      </main>
        {activeLightBoxImg && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 transition-all duration-300 animate-fadeIn"
            onClick={() => setActiveLightBoxImg(null)} 
          >
            <div className="relative max-w-3xl max-h-[85vh] w-full flex flex-col items-center">
              <button 
                onClick={() => setActiveLightBoxImg(null)}
                className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full flex items-center justify-center transition border border-white/20 font-bold text-lg shadow-lg"
                title="Đóng"
              >
                ✕
              </button>

              {/* Thẻ hiển thị ảnh chính */}
              <img 
                src={activeLightBoxImg} 
                alt="Enlarged payment proof" 
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10 bg-slate-900"
                onClick={(e) => e.stopPropagation()} // Chặn sự kiện đóng khi click vào chính tấm ảnh
              />
              
              <p className="text-white/60 text-xs mt-3 text-center tracking-wide">
                Bấm bất kỳ đâu bên ngoài hoặc dấu ✕ để quay lại
              </p>
            </div>
          </div>
        )}
    </div>
  )
}

export default function ResourceManagementPage() {
  return (
    <HostProtectedRoute>
      <ResourceManagementContent />
    </HostProtectedRoute>
  )
}
