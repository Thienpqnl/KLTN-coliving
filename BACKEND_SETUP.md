# Backend Setup Hoàn Chỉnh

## 📋 Tóm Tắt Những Gì Đã Được Tạo

### 1. **Validation Schemas** (`lib/validation.ts`)
- Room CRUD schemas với validation rules
- Booking schemas với date validation
- Amenity, Review, User schemas
- Type exports để dùng trong TypeScript

### 2. **Error Handling** (`lib/api-error.ts`)
- Custom `ApiError` class
- Zod validation error handling
- Standardized response format
- Helper functions: `successResponse()`, `errorResponse()`

### 3. **JWT & Authentication** 
- `lib/jwt.ts` - JWT token generation and verification
- `lib/auth.ts` - Auth middleware helpers (`getAuthUser`, `optionalAuthUser`)

### 4. **Service Layer** (`lib/services/`)
Mỗi service có full CRUD operations:
- **room.service.ts** - Room management (create, read, update, delete, filter, availability)
- **booking.service.ts** - Booking operations (create, cancel, get user bookings, stats)
- **amenity.service.ts** - Amenity management (CRUD, bulk operations)
- **review.service.ts** - Review operations (create, update, delete, get by room/user, rating)
- **user.service.ts** - User management (profile, update, delete, stats)

### 5. **API Routes** (`app/api/`)

#### Rooms
```
GET    /api/rooms                    - List all rooms (with filters)
GET    /api/rooms/:id               - Get room details
POST   /api/rooms/create            - Create room
PUT    /api/rooms/:id               - Update room
DELETE /api/rooms/:id               - Delete room
GET    /api/rooms/available         - Get available rooms by date
GET    /api/rooms/:id/stats         - Room statistics
GET    /api/rooms/:id/reviews       - Room reviews with rating
GET    /api/rooms/:id/bookings      - Bookings for a room
```

#### Bookings
```
GET    /api/bookings                - Get user's bookings
POST   /api/bookings                - Create booking
GET    /api/bookings/:id            - Get booking details
PUT    /api/bookings/:id            - Update booking status
DELETE /api/bookings/:id            - Cancel booking
GET    /api/bookings/stats          - Booking statistics
```

#### Reviews
```
GET    /api/reviews                 - Get user's reviews
POST   /api/reviews                 - Create review
GET    /api/reviews/:id             - Get review details
PUT    /api/reviews/:id             - Update review
DELETE /api/reviews/:id             - Delete review
```

#### Amenities
```
GET    /api/amenities               - List all amenities
POST   /api/amenities               - Create amenity
GET    /api/amenities/:id           - Get amenity details
PUT    /api/amenities/:id           - Update amenity
DELETE /api/amenities/:id           - Delete amenity
```

#### Users
```
GET    /api/users/profile           - Get user profile with data
PUT    /api/users/update            - Update user profile
DELETE /api/users/update            - Delete user account
```

---

## 🚀 Cách Sử Dụng

### 1. **Cấu hình Environment Variables**
Tạo file `.env` trong root project:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/kltn_coliving"
JWT_SECRET="your-super-secret-jwt-key-here-min-32-chars"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### 2. **Chạy Database Migrations**
```bash
npx prisma migrate dev
```

### 3. **Seed Data (Optional)**
Tạo file `prisma/seed.ts` để seed dữ liệu test.

### 4. **Chạy Dev Server**
```bash
npm run dev
```

---

## 📌 Feature Highlights

### ✅ Validation Tự Động
- Tất cả requests được validate với Zod
- Type-safe responses
- Chi tiết error messages

### ✅ Authentication
- JWT-based authentication
- Middleware cho protected routes
- Token verification

### ✅ Business Logic
- Check overlapping bookings
- Verify room availability
- Calculate revenue
- Rating calculations

### ✅ Error Handling
- Standardized error responses
- Proper HTTP status codes
- Validation error details

### ✅ Type Safety
- Full TypeScript support
- Exported types từ validation schemas
- Prisma types integration

---

## 🔄 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* ... */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "errors": {
    "fieldName": ["Error 1", "Error 2"]
  }
}
```

---

## 📚 Tiếp Theo

### Cần Làm:
1. ✅ Backend infrastructure (HOÀN THÀNH)
2. **Cập nhật register API** - sửa `fullName` → `name` trong auth routes
3. **Seed Data** - tạo amenities và sample rooms
4. **Frontend Integration** - kết nối UI components với APIs
5. **Admin Dashboard** - quản lý toàn bộ bookings/rooms
6. **Notifications** - thông báo khi có booking
7. **Payment Integration** - Momo, VNPay (Payment model sẵn)

### Testing:
- Unit tests cho services
- API integration tests
- E2E tests cho flows

---

## 🛠️ Troubleshooting

### JWT_SECRET missing
→ Thêm vào `.env`: `JWT_SECRET="your-secret-key"`

### Database connection error
→ Kiểm tra DATABASE_URL trong `.env`

### Validation errors
→ Xem error message chi tiết trong response

---

## 📞 Notes
- Tất cả dates sử dụng ISO format: `2024-01-01T00:00:00Z`
- Rating: 1-5 stars
- Prices: số thực (float)
- UUIDs: dùng cho IDs
