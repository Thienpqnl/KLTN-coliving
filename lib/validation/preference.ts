import { z } from "zod";

export const userPreferenceSchema = z.object({
  budgetMinVnd: z.coerce.number().int().positive().optional().or(z.literal("")),
  budgetMaxVnd: z.coerce.number().int().positive().optional().or(z.literal("")),
  preferredDistrict: z.string().optional(),
  lifestyleArchetype: z.enum([
    "Privacy Seeker",
    "Remote Worker",
    "Social Butterfly",
    "Student",
    "Young Professional",
  ]).optional(),
  priorityCleanliness: z.number().int().min(1).max(5).optional().default(3),
  prioritySocialEnvironment: z.number().int().min(1).max(5).optional().default(3),
  acceptSmokingRoommates: z.boolean().optional().default(false),
  acceptPets: z.boolean().optional().default(false),
});

export type UserPreferenceInput = z.infer<typeof userPreferenceSchema>;
