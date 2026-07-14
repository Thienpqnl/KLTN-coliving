import { z } from "zod";

// Room Schemas
export const roomCreateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().positive("Price must be positive"),
  area: z.string().min(1, "Area must be provided"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .nullable()
    .optional(),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .nullable()
    .optional(),
  image: z.array(z.string().url()).optional(),
  amenityIds: z.array(z.string()).optional(),
  // Room Requirements & Policies
  cleanlinessRequired: z.enum(["low", "medium", "high"]).optional(),
  noiseTolerance: z.enum(["quiet", "moderate", "active"]).optional(),
  guestPolicy: z.enum(["no_guests", "occasionally", "frequently"]).optional(),
  preferredSleepHabit: z.enum(["early", "normal", "late"]).optional(),
  preferredOccupation: z.string().optional(),
  curfewPolicy: z.string().optional(),
  maxOccupants: z.number().int().min(1).optional(),
  preferredGender: z.string().optional(),
  allowSmoking: z.boolean().optional(),
  allowPets: z.boolean().optional(),
});

export const roomUpdateSchema = roomCreateSchema.partial();

export const roomFilterSchema = z.object({
  status: z.enum(["AVAILABLE", "OCCUPIED"]).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  search: z.string().optional(),
  ownerId: z.string().optional(),
  location: z.string().optional(),
  originLat: z.number().min(-90).max(90).optional(),
  originLng: z.number().min(-180).max(180).optional(),
  maxDistanceKm: z.number().positive().max(100).optional(),
  minAvailableSlots: z.number().int().min(1).max(10).optional(),
  allowPets: z.boolean().optional(),
  allowSmoking: z.boolean().optional(),
  cleanlinessRequired: z.enum(["low", "medium", "high"]).optional(),
  noiseTolerance: z.enum(["quiet", "moderate", "active"]).optional(),
  guestPolicy: z.enum(["no_guests", "occasionally", "frequently"]).optional(),
  preferredSleepHabit: z.enum(["early", "normal", "late"]).optional(),
});

// Booking Schemas
export const bookingCreateSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const bookingUpdateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
});

export const bookingCancellationSchema = z.object({
  reason: z.string().trim().min(5, "Lý do hủy phải có ít nhất 5 ký tự").max(500, "Lý do hủy không được vượt quá 500 ký tự"),
});

// Amenity Schemas
export const amenityCreateSchema = z.object({
  name: z.string().min(2, "Amenity name must be at least 2 characters"),
});

export const amenityUpdateSchema = amenityCreateSchema.partial();

// Review Schemas
export const reviewCreateSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().max(500, "Comment must be less than 500 characters").optional(),
});

// User Schemas
export const userProfileUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
});

export const userCreateSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  role: z.enum(["CUSTOMER", "SERVER", "DELIVER", "ADMIN"]).default("CUSTOMER"),
});

// Contract Schemas
export const contractCreateSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
  renterId: z.string().min(1, "Renter ID is required"),
  startDate: z.coerce.date("Invalid start date"),
  endDate: z.coerce.date("Invalid end date"),
  monthlyRent: z.number().min(0, "Monthly rent must be non-negative"),
  depositAmount: z.number().min(0, "Deposit amount must be non-negative"),
  notes: z.string().optional(),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const contractUpdateSchema = z.object({
  endDate: z.coerce.date().optional(),
  monthlyRent: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const contractRenewSchema = z.object({
  newEndDate: z.coerce.date("Invalid end date"),
  newMonthlyRent: z.number().min(0).optional(),
});

export const contractTerminateSchema = z.object({
  terminationReason: z.string().min(5, "Termination reason must be at least 5 characters"),
});

// Type exports
export type RoomCreate = z.infer<typeof roomCreateSchema>;
export type RoomUpdate = z.infer<typeof roomUpdateSchema>;
export type RoomFilter = z.infer<typeof roomFilterSchema>;
export type BookingCreate = z.infer<typeof bookingCreateSchema>;
export type BookingUpdate = z.infer<typeof bookingUpdateSchema>;
export type BookingCancellation = z.infer<typeof bookingCancellationSchema>;
export type AmenityCreate = z.infer<typeof amenityCreateSchema>;
export type AmenityUpdate = z.infer<typeof amenityUpdateSchema>;
export type ReviewCreate = z.infer<typeof reviewCreateSchema>;
export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
export type ContractCreate = z.infer<typeof contractCreateSchema>;
export type ContractUpdate = z.infer<typeof contractUpdateSchema>;
export type ContractRenew = z.infer<typeof contractRenewSchema>;
export type ContractTerminate = z.infer<typeof contractTerminateSchema>;
