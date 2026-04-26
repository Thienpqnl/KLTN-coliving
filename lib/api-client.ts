// Example API usage with fetch

// Example 1: Register User
const registerUser = async () => {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // 🔥 QUAN TRỌNG
    body: JSON.stringify({
      email: "user@example.com",
      password: "password123",
      name: "John Doe",
      phone: "0123456789"
    })
  });

  const data = await response.json();

  // ❌ KHÔNG lưu token nữa
  // cookie đã được server set
};

// Example 2: Login
const login = async () => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // 🔥 bắt buộc
    body: JSON.stringify({
      email: "user@example.com",
      password: "password123"
    })
  });

  const data = await response.json();

  // ❌ bỏ localStorage
};

// Helper function for authenticated requests
const authFetch = (url: string, options: RequestInit = {}) => {
  return fetch(url, {
    ...options,
    credentials: "include", // 🔥 tự gửi cookie
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
    }
  });
};
// Example 3: Get all rooms
const getRooms = async (filters?: { status?: string; minPrice?: number; maxPrice?: number }) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.minPrice) params.append("minPrice", String(filters.minPrice));
  if (filters?.maxPrice) params.append("maxPrice", String(filters.maxPrice));

  const response = await fetch(`/api/rooms?${params.toString()}`);
  return response.json();
};

// Example 4: Get available rooms
const getAvailableRooms = async (startDate: string, endDate: string) => {
  const response = await fetch(
    `/api/rooms/available?startDate=${startDate}&endDate=${endDate}`
  );
  return response.json();
};

// Example 5: Create a room
const createRoom = async (roomData: {
  title: string;
  description: string;
  price: number;
  address: string;
  image?: string;
  amenityIds?: string[];
}) => {
  const response = await authFetch("/api/rooms-upload/create", {
    method: "POST",
    
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(roomData)
  });
  console.log('Create Room Response:', response);
  return response.json();
};

// Example 6: Create a booking
const createBooking = async (roomId: string, startDate: string, endDate: string) => {
  const response = await authFetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomId,
      startDate,
      endDate
    })
  });
  return response.json();
};

// Example 7: Get user's bookings
const getUserBookings = async () => {
  const response = await authFetch("/api/bookings");
  return response.json();
};

// Example 8: Cancel a booking
const cancelBooking = async (bookingId: string) => {
  const response = await authFetch(`/api/bookings/${bookingId}`, {
    method: "DELETE"
  });
  return response.json();
};

// Example 9: Create a review
const createReview = async (roomId: string, rating: number, comment?: string) => {
  const response = await authFetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomId,
      rating,
      comment
    })
  });
  return response.json();
};

// Example 10: Get room reviews
const getRoomReviews = async (roomId: string) => {
  const response = await fetch(`/api/rooms/${roomId}/reviews`);
  return response.json();
};

// Example 11: Get user profile
const getUserProfile = async () => {
  const response = await authFetch("/api/users/profile");
  return response.json();
};

// Example 12: Update user profile
const updateUserProfile = async (name?: string, phone?: string) => {
  const response = await authFetch("/api/users/update", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone })
  });
  return response.json();
};

// Example 13: Get room statistics
const getRoomStats = async (roomId: string) => {
  const response = await authFetch(`/api/rooms/${roomId}/stats`);
  return response.json();
};

// Example 14: Get booking statistics
const getBookingStats = async (roomId?: string) => {
  const url = roomId 
    ? `/api/bookings/stats?roomId=${roomId}`
    : `/api/bookings/stats`;
  const response = await authFetch(url);
  return response.json();
};

// Example 15: Get all amenities
const getAmenities = async () => {
  const response = await fetch("/api/amenities");
  return response.json();
};

// Example 16: Create amenity
const createAmenity = async (name: string) => {
  const response = await authFetch("/api/amenities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  return response.json();
};

export {
  registerUser,
  login,
  authFetch,
  getRooms,
  getAvailableRooms,
  createRoom,
  createBooking,
  getUserBookings,
  cancelBooking,
  createReview,
  getRoomReviews,
  getUserProfile,
  updateUserProfile,
  getRoomStats,
  getBookingStats,
  getAmenities,
  createAmenity
};
