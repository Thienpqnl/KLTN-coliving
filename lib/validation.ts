import { z } from "zod";

// Room Schemas
export const roomCreateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().positive("Price must be positive"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  images: z.array(z.string().url()).optional(),
  amenityIds: z.array(z.string()).optional(),
});

export const roomUpdateSchema = roomCreateSchema.partial();

export const roomFilterSchema = z.object({
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  search: z.string().optional(),
  ownerId: z.string().optional(),
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
});

export const userCreateSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  role: z.enum(["CUSTOMER", "SERVER", "DELIVER", "ADMIN"]).default("CUSTOMER"),
});

// Type exports
export type RoomCreate = z.infer<typeof roomCreateSchema>;
export type RoomUpdate = z.infer<typeof roomUpdateSchema>;
export type RoomFilter = z.infer<typeof roomFilterSchema>;
export type BookingCreate = z.infer<typeof bookingCreateSchema>;
export type BookingUpdate = z.infer<typeof bookingUpdateSchema>;
export type AmenityCreate = z.infer<typeof amenityCreateSchema>;
export type AmenityUpdate = z.infer<typeof amenityUpdateSchema>;
export type ReviewCreate = z.infer<typeof reviewCreateSchema>;
export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
