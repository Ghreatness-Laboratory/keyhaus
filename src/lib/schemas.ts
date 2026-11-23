import { z } from "zod";
import {
  DESCRIPTION_MAX_CHARS,
  ENVIRONMENT_NOTE_MAX_CHARS,
  REPORT_MAX_CHARS,
} from "./constants";
import { normalizeNigerianPhone } from "./nigeria";

export const userRoleSchema = z.enum(["renter", "landlord"]);

export const propertyTypeSchema = z.enum([
  "self_contained",
  "room",
  "flat",
  "bungalow",
  "duplex",
  "boys_quarters",
]);

export const rentPeriodSchema = z.enum(["year", "month"]);

export const nigerianPhoneSchema = z
  .string()
  .trim()
  .min(1, "Enter your Nigerian mobile number")
  .transform((val, ctx) => {
    const normalized = normalizeNigerianPhone(val);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid Nigerian mobile number (e.g. 0803 123 4567)",
      });
      return z.NEVER;
    }
    return normalized;
  });

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email address"),
  phone: nigerianPhoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  acceptedLegal: z.literal(true, {
    errorMap: () => ({
      message: "You must accept the Terms of Use and Privacy Policy",
    }),
  }),
});

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: nigerianPhoneSchema,
  role: userRoleSchema,
});

export const listingDetailsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(120, "Keep title under 120 characters"),
  description: z
    .string()
    .trim()
    .min(20, "Describe the home in at least 20 characters")
    .max(DESCRIPTION_MAX_CHARS, `Maximum ${DESCRIPTION_MAX_CHARS} characters`),
  property_type: propertyTypeSchema,
  rent_amount: z.coerce
    .number()
    .int("Enter whole naira without kobo")
    .min(10000, "Rent must be at least ₦10,000")
    .max(500000000, "Rent amount looks too high"),
  rent_period: rentPeriodSchema,
  agency_fee: z.coerce
    .number()
    .int()
    .min(0)
    .max(500000000)
    .nullable()
    .optional(),
  legal_fee: z.coerce
    .number()
    .int()
    .min(0)
    .max(500000000)
    .nullable()
    .optional(),
  caution_fee: z.coerce
    .number()
    .int()
    .min(0)
    .max(500000000)
    .nullable()
    .optional(),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().int().min(0).max(20),
  furnished: z.boolean(),
  amenities: z.array(z.string()),
  state: z.string().trim().min(2, "Select a state"),
  lga: z.string().trim().min(2, "Select an LGA"),
  area: z.string().trim().min(2, "Enter the area or neighbourhood").max(80),
  address_line: z
    .string()
    .trim()
    .min(5, "Enter the street address (kept private until viewing accepted)")
    .max(200),
});

export const listingEnvironmentSchema = z.object({
  power_grid: z.enum(["steady", "fair", "poor", "none"]),
  grid_hours_per_day: z.coerce
    .number()
    .int()
    .min(0, "Between 0 and 24 hours")
    .max(24, "Between 0 and 24 hours")
    .nullable()
    .optional(),
  power_backup: z.array(z.enum(["generator", "solar", "inverter", "none"])).default([]),
  road_surface: z.enum(["tarred", "partly_tarred", "untarred"]),
  road_condition: z.enum(["good", "fair", "bad"]),
  flooding: z.enum(["none", "sometimes", "often"]),
  waste: z.enum(["regular", "irregular", "none"]),
  water: z.enum(["running_water", "borehole", "vendor_well", "none"]),
  security: z.enum(["good", "fair", "poor"]),
  network: z.enum(["good", "fair", "poor"]),
  note: z
    .string()
    .trim()
    .max(ENVIRONMENT_NOTE_MAX_CHARS, `Maximum ${ENVIRONMENT_NOTE_MAX_CHARS} characters`)
    .nullable()
    .optional(),
});

export const roomSchema = z.object({
  name: z.string().trim().min(2, "Enter a room name").max(60),
  kind: z.enum(["flat", "panorama"]),
  photo_path: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sort_order: z.number().int().min(0),
});

export const roomLinkSchema = z.object({
  from_room_id: z.string().min(1),
  to_room_id: z.string().min(1),
  yaw: z.number().nullable().optional(),
  pitch: z.number().nullable().optional(),
  x_pct: z.number().min(0).max(100).nullable().optional(),
  y_pct: z.number().min(0).max(100).nullable().optional(),
  label: z.string().trim().min(1, "Enter a label").max(40),
});

export const viewingRequestSchema = z.object({
  listing_id: z.string().min(1),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a preferred date"),
  time_window: z.string().min(2, "Select a time window"),
  note: z.string().trim().max(300, "Maximum 300 characters").optional(),
});

export const reportListingSchema = z.object({
  listing_id: z.string().min(1),
  reason: z
    .string()
    .trim()
    .min(10, "Please explain what is inaccurate (at least 10 characters)")
    .max(REPORT_MAX_CHARS, `Maximum ${REPORT_MAX_CHARS} characters`),
});
