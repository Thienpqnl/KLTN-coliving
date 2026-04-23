# 🚀 Quick Start Guide - KLTN Coliving Backend

## 1️⃣ Setup Environment Variables

Create `.env` file in project root:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/kltn_coliving"
JWT_SECRET="your-super-secret-jwt-key-change-me-in-production"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

## 2️⃣ Run Database Migrations

```bash
npx prisma migrate dev
```

This will:
- Apply all pending migrations
- Generate Prisma client

## 3️⃣ (Optional) Seed Sample Data

Create `prisma/seed.ts`:
```typescript
import { prisma } from "@/lib/prisma";

async function main() {
  // Create amenities
  const wifi = await prisma.amenity.create({ data: { name: "WiFi" } });
  const kitchen = await prisma.amenity.create({ data: { name: "Kitchen" } });
  const parking = await prisma.amenity.create({ data: { name: "Parking" } });

  // Create sample room
  const room = await prisma.room.create({
    data: {
      title: "Cozy Downtown Apartment",
      description: "Beautiful furnished apartment in the heart of the city",
      price: 500,
      address: "123 Main St, City, Country",
      image: "https://example.com/room.jpg",
      status: "AVAILABLE",
    },
  });

  // Link amenities to room
  await prisma.roomAmenity.create({
    data: { roomId: room.id, amenityId: wifi.id },
  });
}

main().catch(console.error);
```

Then run:
```bash
npx prisma db seed
```

## 4️⃣ Start Development Server

```bash
npm run dev
```

Server runs at: http://localhost:3000

## 5️⃣ Test API Endpoints

### Option A: Using cURL
```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Get all rooms
curl http://localhost:3000/api/rooms

# Create room (requires auth)
curl -X POST http://localhost:3000/api/rooms/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Beautiful Room",
    "description": "A nice room with city view",
    "price": 450,
    "address": "456 Oak Ave, City",
    "image": "https://example.com/img.jpg"
  }'
```

### Option B: Using Postman
1. Open Postman
2. Create new Collection: "KLTN Coliving API"
3. Add requests with endpoints from [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
4. For auth requests, set `Authorization` header as "Bearer TOKEN"

### Option C: Using JavaScript
```javascript
import {
  registerUser,
  login,
  getRooms,
  createBooking,
  createReview,
  getUserProfile,
} from "@/lib/api-client";

// Register
await registerUser();

// Get all rooms
const rooms = await getRooms();

// Get available rooms
const available = await getAvailableRooms("2024-01-01T00:00:00Z", "2024-01-15T00:00:00Z");
```

## 📚 Key Files

| File | Purpose |
|------|---------|
| `lib/validation.ts` | Zod schemas for all entities |
| `lib/api-error.ts` | Error handling utilities |
| `lib/jwt.ts` | JWT token management |
| `lib/auth.ts` | Auth middleware |
| `lib/services/*.ts` | Business logic |
| `app/api/` | API routes |
| `lib/api-client.ts` | Frontend API client |

## 🔐 Authentication Flow

1. **Register/Login** → Get JWT token
2. **Store token** in localStorage: `localStorage.setItem("token", data.token)`
3. **Send with requests** in Authorization header: `Authorization: Bearer {token}`
4. **Access protected** endpoints (all /api endpoints requiring auth)

## ✅ Implemented Features

- ✅ User Authentication (Register, Login)
- ✅ Room Management (CRUD, Filter, Availability)
- ✅ Booking System (Create, Cancel, Status)
- ✅ Review System (Create, Update, Delete)
- ✅ Amenity Management
- ✅ User Profiles
- ✅ Statistics & Analytics
- ✅ Input Validation (Zod)
- ✅ Error Handling
- ✅ JWT Authentication
- ✅ Type-safe TypeScript

## 🚨 Common Issues

### Issue: "JWT_SECRET is missing"
**Solution:** Add `JWT_SECRET` to `.env` file

### Issue: "Database connection error"
**Solution:** Check `DATABASE_URL` in `.env` and ensure database is running

### Issue: "Validation failed" error
**Solution:** Check error details in response.errors - fix the field values

### Issue: "Unauthorized" on protected endpoint
**Solution:** Make sure you're sending valid JWT token in Authorization header

## 📖 API Documentation

Full API documentation: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

Backend setup details: [BACKEND_SETUP.md](BACKEND_SETUP.md)

## 🎯 Next Steps

1. ✅ **Backend** - Implemented
2. **Frontend Integration** - Connect UI to API
3. **Admin Dashboard** - Create admin panel
4. **Payment Integration** - Implement Momo/VNPay
5. **Notifications** - Email/Push notifications
6. **Testing** - Unit and integration tests
7. **Deployment** - Deploy to production

---

**Ready to go!** 🎉 Your backend is fully set up and ready for development.
