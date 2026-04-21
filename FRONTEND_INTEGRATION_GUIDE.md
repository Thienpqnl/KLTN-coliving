# Frontend Integration Guide - KLTN Coliving API

Hướng dẫn chi tiết từng bước để liên kết các API endpoints vào frontend components.

## 📋 Mục Lục

1. [Chuẩn Bị Ban Đầu](#chuẩn-bị-ban-đầu)
2. [Setup Cơ Bản](#setup-cơ-bản)
3. [Authentication Integration](#authentication-integration)
4. [Room Management Integration](#room-management-integration)
5. [Booking Integration](#booking-integration)
6. [Reviews Integration](#reviews-integration)
7. [User Profile Integration](#user-profile-integration)
8. [Host Dashboard Integration](#host-dashboard-integration)
9. [Error Handling](#error-handling)
10. [Testing & Deployment](#testing--deployment)

---

## Chuẩn Bị Ban Đầu

### Kiểm tra Backend Status
```bash
# Chạy development server
npm run dev

# Trong terminal khác, test endpoint
curl http://localhost:3000/api/test-db
```

**Điều kiện tiên quyết:**
- ✅ Backend API chạy trên `http://localhost:3000`
- ✅ Database kết nối thành công
- ✅ Environment variables (.env) đã cấu hình
- ✅ Prisma migrations đã applied

---

## Setup Cơ Bản

### Bước 1: Tạo API Client Utility

**File:** `lib/api/client.ts`

**Công việc cần làm:**
1. Tạo class `ApiClient` để handle tất cả HTTP requests
2. Implement các method: `get()`, `post()`, `put()`, `delete()`
3. Tự động attach JWT token vào Authorization header
4. Handle response errors và return status code

**Pseudo code:**
```
Class ApiClient:
  - Constructor với baseUrl = '/api'
  - setToken(token): lưu token để dùng cho requests sau
  
  - private request<T>(endpoint, options):
      1. Chuẩn bị headers với Content-Type
      2. Nếu có token, thêm Authorization header
      3. Fetch tới endpoint
      4. Nếu error, throw ApiError object
      5. Return response.json()
  
  - get<T>(endpoint): gọi request với method GET
  - post<T>(endpoint, body): gọi request với method POST, stringify body
  - put<T>(endpoint, body): gọi request với method PUT, stringify body
  - delete<T>(endpoint): gọi request với method DELETE

Export: const apiClient = new ApiClient()
```

### Bước 2: Tạo Authentication Context

**File:** `lib/context/AuthContext.tsx`

**Công việc cần làm:**
1. Tạo React Context để quản lý authentication state
2. Implement `login()` function gọi POST `/api/auth/login`
3. Implement `register()` function gọi POST `/api/auth/register`
4. Implement `logout()` function xóa token và redirect
5. Lưu token + user info vào localStorage
6. Khôi phục session khi app load lại

**Pseudo code:**
```
Create AuthContext with properties:
  - user: User object (userId, email, role)
  - token: JWT token string
  - loading: boolean
  - login(email, password): Promise<void>
  - register(email, password, fullName): Promise<void>
  - logout(): void

AuthProvider component:
  1. Initialize state: user, token, loading
  2. useEffect (mount):
     - Lấy authToken từ localStorage
     - Lấy user từ localStorage
     - Set state nếu có

  3. login function:
     - POST /api/auth/login { email, password }
     - Nhận token + user từ response
     - Lưu localStorage
     - Set state
     - Redirect to /home

  4. register function:
     - POST /api/auth/register { email, password, fullName }
     - Nhận token + user từ response
     - Lưu localStorage
     - Set state
     - Redirect to /home

  5. logout function:
     - Xóa localStorage
     - Clear state
     - Redirect to /login

Create useAuth hook:
  - Return context value
  - Throw error nếu không trong AuthProvider
```

### Bước 3: Wrap App với AuthProvider

**File:** `app/layout.tsx`

**Công việc cần làm:**
1. Import AuthProvider từ context
2. Wrap children với `<AuthProvider>`
3. Có thể wrap ErrorBoundary cũng ở đây

**Pseudo code:**
```
app/layout.tsx:
  1. Import AuthProvider
  2. Import ErrorBoundary
  3. Wrap layout children:
     <ErrorBoundary>
       <AuthProvider>
         {children}
       </AuthProvider>
     </ErrorBoundary>
```

---

## Authentication Integration

### Bước 4: Update Login Page

**File:** `app/login/page.tsx`

**Công việc cần làm:**
1. Thêm useState cho email, password, error, isLoading
2. Gọi `useAuth()` hook
3. Implement handleLogin function
4. Form submit gọi login() từ context
5. Hiển thị error message nếu có
6. Disable button khi loading

**Pseudo code:**
```
LoginPage component:
  1. State:
     - email (string)
     - password (string)
     - error (string)
     - isLoading (boolean)

  2. Hooks:
     - const { login } = useAuth()

  3. handleLogin(e: FormEvent):
     a. e.preventDefault()
     b. setError('')
     c. setIsLoading(true)
     d. Try:
        - await login(email, password)
        - useAuth hook sẽ handle redirect
     e. Catch:
        - setError(error.message)
     f. Finally:
        - setIsLoading(false)

  4. Render:
     - Email input: bind to email state, onChange
     - Password input: bind to password state, onChange
     - Submit button: disabled={isLoading}
     - Error message div: conditionally show
```

### Bước 5: Update Register Page

**File:** `app/register/page.tsx`

**Công việc cần làm:**
1. Tương tự Login page
2. Thêm fullName field
3. Gọi `register()` thay vì `login()`

**Pseudo code:**
```
RegisterPage component:
  1. State:
     - fullName (string)
     - email (string)
     - password (string)
     - error (string)
     - isLoading (boolean)

  2. Hooks:
     - const { register } = useAuth()

  3. handleRegister(e: FormEvent):
     a. e.preventDefault()
     b. setError('')
     c. setIsLoading(true)
     d. Try:
        - await register(email, password, fullName)
     e. Catch:
        - setError(error.message)
     f. Finally:
        - setIsLoading(false)

  4. Render:
     - FullName input (new)
     - Email input
     - Password input
     - Submit button
     - Error message
```

---

## Room Management Integration

### Bước 6: Fetch & Display Rooms List

**File:** `app/home/page.tsx` (hoặc component mới)

**Công việc cần làm:**
1. Tạo interface Room với id, name, price, description, amenities
2. useState cho rooms array và loading
3. useEffect gọi API GET /api/rooms khi mount
4. Map rooms array để render grid

**Pseudo code:**
```
RoomsList component:
  1. Interfaces:
     - Room: { id, name, description, price, location, image, amenities }

  2. State:
     - rooms: Room[] = []
     - loading: boolean = true
     - error: string = null

  3. useEffect (mount):
     a. setLoading(true)
     b. Try:
        - apiClient.get('/rooms')
        - setRooms(response.data)
     c. Catch:
        - setError(error.message)
     d. Finally:
        - setLoading(false)

  4. Render:
     - Nếu loading: hiển thị loading spinner
     - Nếu error: hiển thị error message
     - Nếu có rooms: map và render room cards
     - Mỗi card hiển thị: image, name, description, price, amenities
```

### Bước 7: Implement Search/Filter

**File:** `app/home/page.tsx` (thêm vào RoomsList)

**Công việc cần làm:**
1. Thêm state cho search params: location, minPrice, maxPrice
2. Thêm search input fields
3. Implement debounced search function
4. Gọi API GET /api/rooms?location=...&minPrice=...

**Pseudo code:**
```
SearchRooms component (thêm vào RoomsList):
  1. State:
     - location: string = ''
     - minPrice: number = null
     - maxPrice: number = null

  2. useCallback (debounced):
     - Create debounced function (300ms delay)
     - Call apiClient.get('/rooms?location=...&minPrice=...&maxPrice=...')
     - setRooms(response.data)

  3. Render:
     - Input field cho location
     - Input field cho minPrice
     - Input field cho maxPrice
     - onChange event call debouncedSearch

  4. Tip:
     - Dùng URLSearchParams để build query string
     - Chỉ thêm param nếu có value
```

### Bước 8: Check Room Availability

**File:** `components/RoomCard.tsx` (hoặc detail page)

**Công việc cần làm:**
1. Thêm "Check Availability" button ở room card
2. Implement checkAvailability function
3. POST /api/rooms/available { roomId, checkInDate, checkOutDate }
4. Hiển thị availability status

**Pseudo code:**
```
CheckAvailabilityButton component:
  1. State:
     - checkInDate: string = ''
     - checkOutDate: string = ''
     - isAvailable: boolean = null
     - isLoading: boolean = false

  2. handleCheck():
     a. Validate dates (checkOut > checkIn)
     b. setIsLoading(true)
     c. Try:
        - apiClient.post('/rooms/available', {
            roomId, checkInDate, checkOutDate
          })
        - setIsAvailable(response.available)
     d. Catch:
        - Show error message
     e. Finally:
        - setIsLoading(false)

  3. Render:
     - Date input cho checkInDate
     - Date input cho checkOutDate
     - Button "Check Availability"
     - Status message: "Available" / "Not Available"
```

### Bước 9: Create New Room (For Host)

**File:** `app/room-management/add-room/page.tsx`

**Công việc cần làm:**
1. Tạo form với fields: name, description, price, location, image, amenities
2. Implement form submission
3. POST /api/rooms/create với form data
4. Redirect to /room-management khi success

**Pseudo code:**
```
CreateRoomForm component:
  1. State:
     - name: string = ''
     - description: string = ''
     - price: number = null
     - location: string = ''
     - image: string = ''
     - amenities: string[] = []
     - isLoading: boolean = false
     - error: string = null

  2. handleAddAmenity(amenity: string):
     - setAmenities([...amenities, amenity])

  3. handleRemoveAmenity(index: number):
     - setAmenities(amenities.filter((_, i) => i !== index))

  4. handleSubmit(e: FormEvent):
     a. e.preventDefault()
     b. setIsLoading(true)
     c. Validate all fields
     d. Try:
        - apiClient.post('/rooms/create', {
            name, description, price, location, image, amenities
          })
        - router.push('/room-management')
     e. Catch:
        - setError(error.message)
     f. Finally:
        - setIsLoading(false)

  4. Render:
     - Text input: name
     - Textarea: description
     - Number input: price
     - Text input: location
     - File/URL input: image
     - Amenities selection/input
     - Submit button
```

---

## Booking Integration

### Bước 10: Create Booking

**File:** `components/BookingForm.tsx` hoặc room detail page

**Công việc cần làm:**
1. Form với fields: roomId, checkInDate, checkOutDate, guests
2. Tính totalPrice dựa vào price và số ngày
3. POST /api/bookings
4. Show success message và redirect

**Pseudo code:**
```
BookingForm component:
  1. Props:
     - roomId: string
     - roomPrice: number
     - roomName: string

  2. State:
     - checkInDate: string = ''
     - checkOutDate: string = ''
     - guests: number = 1
     - totalPrice: number = 0
     - isLoading: boolean = false

  3. calculatePrice():
     a. Parse dates
     b. Calculate days = (checkOut - checkIn) / (1000 * 60 * 60 * 24)
     c. totalPrice = roomPrice * days
     d. Return totalPrice

  4. useEffect (when dates change):
     - Call calculatePrice()
     - setTotalPrice()

  5. handleSubmit():
     a. Validate dates
     b. setIsLoading(true)
     c. Try:
        - apiClient.post('/bookings', {
            roomId, checkInDate, checkOutDate, guests
          })
        - Show success toast
        - Redirect to /bookings
     d. Catch:
        - Show error message
     e. Finally:
        - setIsLoading(false)

  6. Render:
     - Date input: checkInDate
     - Date input: checkOutDate
     - Number input: guests
     - Display: totalPrice
     - Submit button
```

### Bước 11: Display User's Bookings

**File:** `app/bookings/page.tsx`

**Công việc cần làm:**
1. Fetch user's bookings sử dụng useAuth hook
2. Chỉ fetch nếu user authenticated
3. GET /api/bookings (auth required)
4. Display booking list

**Pseudo code:**
```
BookingsList component:
  1. Interfaces:
     - Booking: { id, roomId, roomName, checkInDate, checkOutDate, status, totalPrice }

  2. State:
     - bookings: Booking[] = []
     - loading: boolean = true

  3. Hooks:
     - const { token } = useAuth()

  4. useEffect (dependency: [token]):
     a. Nếu !token, return
     b. setLoading(true)
     c. Try:
        - apiClient.get('/bookings')
        - setBookings(response.data)
     d. Catch:
        - Handle error
     e. Finally:
        - setLoading(false)

  5. Render:
     - Filter bookings by status (Pending, Confirmed, Cancelled)
     - Display each booking card:
       * Room name
       * Check-in / Check-out dates
       * Total price
       * Status badge with color
       * Action buttons (View, Cancel)
```

### Bước 12: Update Booking Status

**File:** `components/BookingCard.tsx`

**Công việc cần làm:**
1. Host có thể confirm/reject pending bookings
2. Implement status dropdown hoặc buttons
3. PUT /api/bookings/{id} { status }
4. Refetch bookings list

**Pseudo code:**
```
BookingStatusUpdate component:
  1. Props:
     - booking: Booking
     - onStatusChanged: callback

  2. State:
     - newStatus: string = booking.status
     - isLoading: boolean = false

  3. handleStatusChange(newStatus: string):
     a. setIsLoading(true)
     b. Try:
        - apiClient.put(`/bookings/${booking.id}`, {
            status: newStatus
          })
        - Show success message
        - onStatusChanged() callback to refetch
     c. Catch:
        - Show error
     d. Finally:
        - setIsLoading(false)

  4. Render:
     - Dropdown select: status options (pending, confirmed, cancelled)
     - Update button
     - Loading indicator
```

### Bước 13: Cancel Booking

**File:** `components/BookingCard.tsx` (thêm vào)

**Công việc cần làm:**
1. Implement cancel button cho bookings
2. DELETE /api/bookings/{id}
3. Refetch bookings list

**Pseudo code:**
```
CancelBookingButton component:
  1. Props:
     - bookingId: string
     - onCancelled: callback

  2. State:
     - isLoading: boolean = false
     - showConfirm: boolean = false

  3. handleCancel():
     a. Hiển thị confirmation modal
     b. Nếu confirm:
        - setIsLoading(true)
        - Try:
          * apiClient.delete(`/bookings/${bookingId}`)
          * Show success message
          * onCancelled() callback
        - Catch: show error
        - Finally: setIsLoading(false)

  4. Render:
     - Cancel button (red color)
     - Confirmation modal: "Are you sure?"
     - Cancel / Confirm buttons
```

---

## Reviews Integration

### Bước 14: Fetch & Display Reviews

**File:** `components/RoomReviews.tsx`

**Công việc cần làm:**
1. Fetch reviews cho room
2. GET /api/rooms/{roomId}/reviews
3. Display average rating
4. List individual reviews

**Pseudo code:**
```
RoomReviews component:
  1. Props:
     - roomId: string

  2. Interfaces:
     - Review: { id, userId, userName, rating, comment, createdAt }
     - RatingInfo: { reviews, averageRating }

  3. State:
     - reviews: Review[] = []
     - averageRating: number = 0
     - loading: boolean = true

  4. useEffect (dependency: [roomId]):
     a. setLoading(true)
     b. Try:
        - apiClient.get(`/rooms/${roomId}/reviews`)
        - setReviews(response.reviews)
        - setAverageRating(response.averageRating)
     c. Catch:
        - Handle error
     d. Finally:
        - setLoading(false)

  5. Render:
     - Average rating display:
       * Large number (e.g., 4.5)
       * Star rating visualization
       * Total reviews count
     - Reviews list:
       * User name
       * Star rating (1-5 stars)
       * Comment text
       * Created date
```

### Bước 15: Create Review

**File:** `components/CreateReviewForm.tsx`

**Công việc cần làm:**
1. Form để submit review
2. Chỉ show nếu user đã book room đó
3. POST /api/reviews { roomId, rating, comment }
4. Refetch reviews list

**Pseudo code:**
```
CreateReviewForm component:
  1. Props:
     - roomId: string
     - onReviewCreated: callback

  2. State:
     - rating: number = 5
     - comment: string = ''
     - isLoading: boolean = false

  3. Hooks:
     - const { token } = useAuth()

  4. handleSubmit():
     a. Validate: comment not empty, rating 1-5
     b. setIsLoading(true)
     c. Try:
        - apiClient.post('/reviews', {
            roomId, rating, comment
          })
        - Clear form
        - Show success message
        - onReviewCreated() callback to refetch
     d. Catch:
        - Show error
     e. Finally:
        - setIsLoading(false)

  5. Render:
     - Star rating selector (1-5 stars, clickable)
     - Textarea: comment
     - Submit button
     - Character count indicator
```

---

## User Profile Integration

### Bước 16: Display User Profile

**File:** `app/user/profile/page.tsx` hoặc account settings

**Công việc cần làm:**
1. Fetch user profile
2. GET /api/users/profile (auth required)
3. Display profile info

**Pseudo code:**
```
UserProfile component:
  1. Interfaces:
     - UserProfile: { id, email, name, phone, avatar }

  2. State:
     - profile: UserProfile = null
     - loading: boolean = true

  3. Hooks:
     - const { token } = useAuth()

  4. useEffect (dependency: [token]):
     a. Nếu !token, return
     b. setLoading(true)
     c. Try:
        - apiClient.get('/users/profile')
        - setProfile(response.data)
     d. Catch:
        - Handle error
     e. Finally:
        - setLoading(false)

  5. Render:
     - Avatar image
     - Name display
     - Email display
     - Phone display
     - Edit button (navigate to edit page)
```

### Bước 17: Update User Profile

**File:** `app/user/profile/edit/page.tsx`

**Công việc cần làm:**
1. Form để edit user info
2. PUT /api/users/update { name, phone, avatar }
3. Refetch profile

**Pseudo code:**
```
EditProfileForm component:
  1. State:
     - name: string = ''
     - phone: string = ''
     - avatar: string = ''
     - isLoading: boolean = false

  2. useEffect (mount):
     a. Fetch current profile
     b. Set initial values

  3. handleSubmit():
     a. Validate fields
     b. setIsLoading(true)
     c. Try:
        - apiClient.put('/users/update', {
            name, phone, avatar
          })
        - Show success message
        - Redirect to profile page
     d. Catch:
        - Show error
     e. Finally:
        - setIsLoading(false)

  4. Render:
     - Text input: name
     - Text input: phone
     - File upload: avatar
     - Save button
     - Cancel button
```

---

## Host Dashboard Integration

### Bước 18: Display Host Stats

**File:** `app/host/page.tsx`

**Công việc cần làm:**
1. Chỉ show cho users với role = 'HOST'
2. Fetch stats: totalRooms, totalBookings, totalRevenue, averageRating
3. GET /api/bookings/stats (auth required)
4. Display stats cards

**Pseudo code:**
```
HostDashboard component:
  1. Interfaces:
     - HostStats: { totalRooms, totalBookings, totalRevenue, averageRating }

  2. State:
     - stats: HostStats = null
     - loading: boolean = true

  3. Hooks:
     - const { user, token } = useAuth()

  4. useEffect (dependency: [token, user]):
     a. Nếu !token hoặc user.role !== 'HOST', return
     b. setLoading(true)
     c. Try:
        - apiClient.get('/bookings/stats')
        - setStats(response.data)
     d. Catch:
        - Handle error
     e. Finally:
        - setLoading(false)

  5. Render:
     - Grid layout: 4 stat cards
       * Total Rooms: {stats.totalRooms}
       * Total Bookings: {stats.totalBookings}
       * Total Revenue: ${stats.totalRevenue}
       * Average Rating: {stats.averageRating}/5
     - Each card có icon và color khác nhau
```

### Bước 19: Host's Room Management

**File:** `app/room-management/page.tsx`

**Công việc cần làm:**
1. Display list of host's rooms
2. GET /api/rooms (hoặc endpoint riêng)
3. Edit, Delete buttons cho mỗi room

**Pseudo code:**
```
HostRoomsList component:
  1. State:
     - rooms: Room[] = []
     - loading: boolean = true

  2. useEffect (mount):
     a. setLoading(true)
     b. Try:
        - apiClient.get('/rooms')
        - Filter: rooms where host = current user
        - setRooms(filteredRooms)
     c. Catch:
        - Handle error
     d. Finally:
        - setLoading(false)

  3. handleDelete(roomId):
     a. Show confirmation
     b. If confirmed:
        - apiClient.delete(`/rooms/${roomId}`)
        - Refetch rooms list

  4. handleEdit(roomId):
     a. Redirect to `/room-management/edit-room/${roomId}`

  5. Render:
     - Button: "Add New Room" -> /room-management/add-room
     - Table hoặc grid của rooms:
       * Room name
       * Price
       * Status
       * Edit button
       * Delete button
```

### Bước 20: Host's Bookings Management

**File:** `app/host/bookings-table.tsx`

**Công việc cần làm:**
1. Display all bookings của host's rooms
2. GET /api/bookings (hoặc endpoint riêng)
3. Filter by room owner
4. Update status (confirm, reject)

**Pseudo code:**
```
HostBookingsList component:
  1. State:
     - bookings: Booking[] = []
     - loading: boolean = true
     - filter: string = 'all' (all, pending, confirmed, cancelled)

  2. useEffect (dependency: [filter]):
     a. setLoading(true)
     b. Try:
        - apiClient.get('/bookings')
        - Filter based on:
          * User role = 'HOST'
          * Status = filter (if not 'all')
        - setBookings(filteredBookings)
     c. Catch:
        - Handle error
     d. Finally:
        - setLoading(false)

  3. handleConfirm(bookingId):
     a. apiClient.put(`/bookings/${bookingId}`, { status: 'confirmed' })
     b. Refetch

  4. handleReject(bookingId):
     a. apiClient.put(`/bookings/${bookingId}`, { status: 'cancelled' })
     b. Refetch

  5. Render:
     - Filter tabs: All, Pending, Confirmed, Cancelled
     - Table:
       * Guest name
       * Room name
       * Check-in / Check-out
       * Status
       * Actions (Confirm, Reject buttons)
```

---

## Error Handling

### Bước 21: Create Error Boundary

**File:** `components/ErrorBoundary.tsx`

**Công việc cần làm:**
1. Class component catch errors
2. Display error UI
3. Provide retry button

**Pseudo code:**
```
ErrorBoundary class component:
  1. State:
     - hasError: boolean = false
     - error: Error = null

  2. getDerivedStateFromError(error):
     - Return { hasError: true, error }

  3. componentDidCatch(error, errorInfo):
     - console.error(error, errorInfo)
     - Có thể send to error tracking service

  4. Render:
     - Nếu hasError:
       * Error UI: red background, error message, retry button
       * onClick retry: setState({ hasError: false })
     - Else:
       * Render children bình thường
```

### Bước 22: Global Error Handler

**File:** `lib/utils/errorHandler.ts`

**Công việc cần làm:**
1. Utility function để format error messages
2. Handle different error types

**Pseudo code:**
```
errorHandler.ts:
  1. handleApiError(error):
     - If error.status === 401: redirect to /login
     - If error.status === 403: show "Permission denied"
     - If error.status === 404: show "Not found"
     - If error.status === 500: show "Server error"
     - Else: show error.message

  2. isValidationError(error):
     - Check if error có property 'errors'
     - Return boolean

  3. getErrorMessage(error):
     - If string: return as is
     - If object: return error.message
     - Else: return "Unknown error"
```

---

## Testing & Deployment

### Bước 23: Test Tất Cả Endpoints

**Sử dụng Postman hoặc Thunder Client:**

**Checklist test:**
```
Authentication:
  [ ] POST /api/auth/login
      Input: { email, password }
      Expected: { token, user }
  
  [ ] POST /api/auth/register
      Input: { email, password, fullName }
      Expected: { token, user }

Rooms:
  [ ] GET /api/rooms
      Expected: list of rooms
  
  [ ] GET /api/rooms/{id}
      Expected: room detail
  
  [ ] POST /api/rooms/create (Auth required)
      Input: { name, description, price, location, image, amenities }
      Expected: created room
  
  [ ] POST /api/rooms/available
      Input: { roomId, checkInDate, checkOutDate }
      Expected: { available: boolean }

Bookings:
  [ ] GET /api/bookings (Auth required)
      Expected: user's bookings list
  
  [ ] POST /api/bookings (Auth required)
      Input: { roomId, checkInDate, checkOutDate, guests }
      Expected: created booking
  
  [ ] PUT /api/bookings/{id} (Auth required)
      Input: { status }
      Expected: updated booking
  
  [ ] DELETE /api/bookings/{id} (Auth required)
      Expected: success message

Reviews:
  [ ] GET /api/rooms/{roomId}/reviews
      Expected: reviews + avgRating
  
  [ ] POST /api/reviews (Auth required)
      Input: { roomId, rating, comment }
      Expected: created review

Profile:
  [ ] GET /api/users/profile (Auth required)
      Expected: user profile
  
  [ ] PUT /api/users/update (Auth required)
      Input: { name, phone, avatar }
      Expected: updated profile

Stats:
  [ ] GET /api/bookings/stats (Auth required, HOST only)
      Expected: { totalRooms, totalBookings, totalRevenue, averageRating }
```

### Bước 24: Performance Optimization

**Công việc cần làm:**
1. Implement API response caching (dùng SWR hoặc React Query)
2. Add loading skeletons thay vì blank state
3. Implement pagination cho listings
4. Debounce search inputs
5. Lazy load images

**Pseudo code (example):**
```
// Caching with SWR
import useSWR from 'swr'

useRooms hook:
  - const { data, error, isLoading } = useSWR(
      '/api/rooms',
      url => apiClient.get(url),
      { revalidateOnFocus: false, revalidateOnReconnect: false }
    )
  - Return { rooms: data, error, isLoading }

// Debounced search
import { useCallback, useState } from 'react'
import { debounce } from 'lodash'

useSearchRooms hook:
  - Create debounced function (300ms delay)
  - Call apiClient.get with search params
  - Return results

// Pagination
GetRooms hook (with params):
  - Accept: page: number = 1, limit: number = 10
  - GET /api/rooms?page={page}&limit={limit}
  - Return: { rooms, total, hasMore }
```

### Bước 25: Deployment Preparation

**Công việc cần làm:**
1. Update environment variables cho production
2. Build project: `npm run build`
3. Test production build locally
4. Set up CORS nếu cần
5. Configure API endpoint cho production

**Checklist:**
```
[ ] Environment variables:
    - Update API_URL để pointing tới production backend
    - Secure sensitive data

[ ] Build:
    - npm run build
    - npm run lint
    - Check build output

[ ] Testing:
    - Test tất cả features
    - Test responsive design
    - Test error cases

[ ] Optimization:
    - Enable gzip compression
    - Minify CSS/JS
    - Cache static assets
    - Optimize images

[ ] Security:
    - Set secure HTTP headers
    - Enable HTTPS
    - Implement rate limiting
    - Sanitize inputs

[ ] Monitoring:
    - Setup error tracking (Sentry)
    - Setup analytics
    - Monitor performance
```

---

## Integration Workflow

### Recommended Order of Implementation:

1. **Week 1:**
   - [ ] Bước 1-3: API Client + Auth Context + Layout wrapper
   - [ ] Bước 4-5: Login/Register pages
   - [ ] Test authentication flow

2. **Week 2:**
   - [ ] Bước 6-8: Room listing + search
   - [ ] Bước 9: Create room (Host feature)
   - [ ] Test room features

3. **Week 3:**
   - [ ] Bước 10-13: Booking creation + management
   - [ ] Bước 14-15: Reviews
   - [ ] Test booking + reviews

4. **Week 4:**
   - [ ] Bước 16-17: User profile
   - [ ] Bước 18-20: Host dashboard
   - [ ] Test all host features

5. **Week 5:**
   - [ ] Bước 21-22: Error handling
   - [ ] Bước 23: Test all endpoints
   - [ ] Bug fixes + optimization

6. **Week 6:**
   - [ ] Bước 24: Performance optimization
   - [ ] Bước 25: Deployment
   - [ ] Go live!

---

## Common Issues & Solutions

### Issue 1: Token Expired
```
Symptom: API returns 401 Unauthorized
Solution:
  1. Check localStorage.getItem('authToken')
  2. Nếu expired: redirect to /login
  3. Implement token refresh mechanism
  4. Auto refresh token trước khi expire
```

### Issue 2: CORS Errors
```
Symptom: 'No Access-Control-Allow-Origin header'
Solution:
  1. Kiểm tra next.config.ts CORS settings
  2. Nếu local: backend cần allow localhost:3000
  3. Ensure credentials: 'include' nếu cần cookies
```

### Issue 3: API 404 Errors
```
Symptom: Cannot GET /api/endpoint
Solution:
  1. Kiểm tra endpoint path: /api/rooms vs /api/rooms/
  2. Verify route exists trong app/api/
  3. Check method: GET vs POST vs PUT
  4. Verify authentication nếu required
```

### Issue 4: Image Not Loading
```
Symptom: 404 hoặc CORS error cho images
Solution:
  1. Check next.config.ts remotePatterns
  2. Add image domain nếu external source
  3. Implement Image component từ next/image
```

---

## File Structure After Integration

```
app/
├── api/                    [Backend routes]
├── layout.tsx              [Root layout với AuthProvider]
├── login/page.tsx          [Login page]
├── register/page.tsx       [Register page]
├── home/page.tsx           [Homepage - rooms listing]
├── bookings/page.tsx       [User bookings]
├── user/
│   ├── profile/page.tsx    [View profile]
│   └── profile/edit/page.tsx [Edit profile]
├── host/
│   ├── page.tsx            [Host dashboard]
│   ├── bookings-table.tsx  [Host's bookings]
│   └── ...                 [Other host components]
└── room-management/
    ├── page.tsx            [List rooms]
    ├── add-room/page.tsx   [Create room]
    └── edit-room/page.tsx  [Edit room]

lib/
├── api/
│   └── client.ts           [API Client utility]
├── context/
│   └── AuthContext.tsx     [Auth Context & Provider]
├── hooks/
│   └── useApi.ts           [API hook]
├── utils/
│   └── errorHandler.ts     [Error handling utilities]
├── services/               [Service layer - optional]
├── validation.ts           [Zod schemas]
└── prisma.ts               [Prisma client]

components/
├── ui/                     [UI components]
├── RoomCard.tsx            [Room card component]
├── BookingForm.tsx         [Booking form]
├── ReviewForm.tsx          [Review form]
├── ErrorBoundary.tsx       [Error boundary]
└── ...                     [Other components]
```

---

## Useful Libraries to Install

```bash
# For API calls & caching
npm install swr
# or
npm install @tanstack/react-query

# For date handling
npm install date-fns

# For form validation
npm install zod

# For debouncing
npm install lodash debounce
npm install -D @types/lodash-es

# For toast notifications
npm install sonner
# or
npm install react-hot-toast

# For loading skeletons
npm install react-loading-skeleton

# For image optimization
npm install next-image-export-optimizer
```

---

## Next Steps After Integration

1. **User Testing:** Beta test with actual users
2. **Feedback:** Collect and implement feedback
3. **Mobile Optimization:** Test on mobile devices
4. **SEO:** Optimize for search engines
5. **Analytics:** Track user behavior
6. **Performance Monitoring:** Monitor real user metrics
7. **Regular Updates:** Maintain and update features

---

**Version**: 2.0.0 (Detailed Roadmap)  
**Last Updated**: April 20, 2026  
**Status**: Ready for Step-by-Step Implementation
