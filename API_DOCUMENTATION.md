# API Documentation

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Auth Endpoints

### POST /api/auth/login
Login user
- **Body**: `{ email: string, password: string }`
- **Response**: `{ user: { id, email, name }, token: string }`

### POST /api/auth/register
Register new user
- **Body**: `{ email: string, password: string, name: string, phone?: string }`
- **Response**: `{ user: { id, email, name }, token: string }`

---

## Room Endpoints

### GET /api/rooms
List all rooms with optional filters
- **Query Params**: 
  - `status`: AVAILABLE | OCCUPIED | MAINTENANCE
  - `minPrice`: number
  - `maxPrice`: number
  - `search`: string
- **Response**: `{ success: true, data: Room[] }`

### GET /api/rooms/:id
Get room details
- **Response**: `{ success: true, data: Room }`

### POST /api/rooms/create
Create new room (requires auth)
- **Body**: 
  ```json
  {
    "title": "string",
    "description": "string",
    "price": number,
    "address": "string",
    "image": "string (URL)",
    "amenityIds": ["uuid"]
  }
  ```
- **Response**: `{ success: true, data: Room }`

### PUT /api/rooms/:id
Update room (requires auth)
- **Body**: Same as create (all fields optional)
- **Response**: `{ success: true, data: Room }`

### DELETE /api/rooms/:id
Delete room (requires auth)
- **Response**: `{ success: true, data: { message: string } }`

### GET /api/rooms/available?startDate=ISO&endDate=ISO
Get available rooms for date range
- **Response**: `{ success: true, data: Room[] }`

### GET /api/rooms/:id/stats
Get room statistics
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "roomId": "string",
      "title": "string",
      "totalBookings": number,
      "confirmedBookings": number,
      "pendingBookings": number,
      "totalReviews": number,
      "averageRating": number,
      "totalRevenue": number,
      "status": "AVAILABLE | OCCUPIED | MAINTENANCE"
    }
  }
  ```

### GET /api/rooms/:id/reviews
Get room reviews with rating
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "reviews": Review[],
      "averageRating": number,
      "totalReviews": number
    }
  }
  ```

### GET /api/rooms/:id/bookings
Get bookings for a room
- **Response**: `{ success: true, data: Booking[] }`

---

## Booking Endpoints

### GET /api/bookings
Get user's bookings (requires auth)
- **Response**: `{ success: true, data: Booking[] }`

### POST /api/bookings
Create booking (requires auth)
- **Body**: 
  ```json
  {
    "roomId": "uuid",
    "startDate": "ISO date",
    "endDate": "ISO date"
  }
  ```
- **Response**: `{ success: true, data: Booking }`

### GET /api/bookings/:id
Get booking details (requires auth)
- **Response**: `{ success: true, data: Booking }`

### PUT /api/bookings/:id
Update booking status (requires auth)
- **Body**: `{ status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" }`
- **Response**: `{ success: true, data: Booking }`

### DELETE /api/bookings/:id
Cancel booking (requires auth)
- **Response**: `{ success: true, data: { message: string } }`

### GET /api/bookings/stats?roomId=uuid (optional)
Get booking statistics
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "total": number,
      "pending": number,
      "confirmed": number,
      "cancelled": number,
      "completed": number
    }
  }
  ```

---

## Review Endpoints

### GET /api/reviews
Get user's reviews (requires auth)
- **Response**: `{ success: true, data: Review[] }`

### POST /api/reviews
Create review (requires auth)
- **Body**: 
  ```json
  {
    "roomId": "uuid",
    "rating": 1-5,
    "comment": "string (optional)"
  }
  ```
- **Response**: `{ success: true, data: Review }`

### GET /api/reviews/:id
Get review details
- **Response**: `{ success: true, data: Review }`

### PUT /api/reviews/:id
Update review (requires auth)
- **Body**: `{ rating?: number, comment?: string }`
- **Response**: `{ success: true, data: Review }`

### DELETE /api/reviews/:id
Delete review (requires auth)
- **Response**: `{ success: true, data: { message: string } }`

---

## Amenity Endpoints

### GET /api/amenities
List all amenities
- **Response**: `{ success: true, data: Amenity[] }`

### POST /api/amenities
Create amenity (requires auth)
- **Body**: `{ name: string }`
- **Response**: `{ success: true, data: Amenity }`

### GET /api/amenities/:id
Get amenity details
- **Response**: `{ success: true, data: Amenity }`

### PUT /api/amenities/:id
Update amenity (requires auth)
- **Body**: `{ name?: string }`
- **Response**: `{ success: true, data: Amenity }`

### DELETE /api/amenities/:id
Delete amenity (requires auth)
- **Response**: `{ success: true, data: { message: string } }`

---

## User Endpoints

### GET /api/users/profile
Get user profile with bookings and reviews (requires auth)
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "name": "string",
      "email": "string",
      "phone": "string",
      "role": "CUSTOMER | SERVER | DELIVER | ADMIN",
      "bookings": Booking[],
      "reviews": Review[]
    }
  }
  ```

### PUT /api/users/update
Update user profile (requires auth)
- **Body**: `{ name?: string, phone?: string }`
- **Response**: `{ success: true, data: User }`

### DELETE /api/users/update
Delete user account (requires auth)
- **Response**: `{ success: true, data: { message: string } }`

---

## Error Response Format

All error responses follow this format:
```json
{
  "success": false,
  "error": "Error message",
  "errors": {
    "fieldName": ["Error 1", "Error 2"]
  }
}
```

**Common Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request / Validation Error
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error
