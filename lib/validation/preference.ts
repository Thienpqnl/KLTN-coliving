import { z } from "zod";

export const userPreferenceSchema = z.object({
  budgetMinVnd: z.union([
    z.coerce.number().int().positive("Ngân sách tối thiểu phải lớn hơn 0"),
    z.literal(""),
    z.null(),
  ]).optional(),
  budgetMaxVnd: z.union([
    z.coerce.number().int().positive("Ngân sách tối đa phải lớn hơn 0"),
    z.literal(""),
    z.null(),
  ]).optional(),
  preferredDistrict: z.string().nullable().optional(),
  lifestyleArchetype: z.enum([
    "Privacy Seeker",
    "Remote Worker",
    "Social Butterfly",
    "Student",
    "Young Professional",
  ]).nullable().optional(),
  priorityCleanliness: z.number().int().min(1).max(5).optional().default(3),
  prioritySocialEnvironment: z.number().int().min(1).max(5).optional().default(3),
  acceptSmokingRoommates: z.boolean().optional().default(false),
  acceptPets: z.boolean().optional().default(false),
}).superRefine((data, context) => {
  if (
    typeof data.budgetMinVnd === "number" &&
    typeof data.budgetMaxVnd === "number" &&
    data.budgetMinVnd > data.budgetMaxVnd
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["budgetMaxVnd"],
      message: "Ngân sách tối đa phải lớn hơn hoặc bằng ngân sách tối thiểu",
    });
  }
});

export type UserPreferenceInput = z.infer<typeof userPreferenceSchema>;
