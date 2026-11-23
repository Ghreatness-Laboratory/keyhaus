export const APP_NAME = "Keyhaus";

export const MAX_ROOMS_PER_LISTING = 12;
export const MAX_PUBLISHED_LISTINGS_PER_LANDLORD = 10;
export const MAX_IMAGE_BYTES = 1024 * 1024; // 1 MB bucket limit
export const BROWSE_PAGE_SIZE = 12;

export const FLAT_IMAGE_MAX_WIDTH = 1600;
export const FLAT_IMAGE_TARGET_MB = 0.25;

export const PANORAMA_IMAGE_MAX_WIDTH = 4096;
export const PANORAMA_IMAGE_TARGET_MB = 0.7;

export const THUMB_IMAGE_MAX_WIDTH = 480;
export const THUMB_IMAGE_TARGET_MB = 0.08;

export const DESCRIPTION_MAX_CHARS = 1000;
export const ENVIRONMENT_NOTE_MAX_CHARS = 300;
export const REPORT_MAX_CHARS = 500;

export const PROPERTY_TYPES = [
  { value: "self_contained", label: "Self-contained", group: "room" },
  { value: "room", label: "Single room", group: "room" },
  { value: "flat", label: "Flat / Apartment", group: "flat" },
  { value: "bungalow", label: "Bungalow", group: "house" },
  { value: "duplex", label: "Duplex", group: "house" },
  { value: "boys_quarters", label: "Boys quarters (BQ)", group: "room" },
] as const;

export const BROWSE_CHIP_GROUPS = [
  { value: "all", label: "All" },
  { value: "flat", label: "Flat" },
  { value: "house", label: "House" },
  { value: "room", label: "Room" },
] as const;

export const AMENITIES = [
  { value: "prepaid_meter", label: "Prepaid meter" },
  { value: "borehole", label: "Borehole" },
  { value: "fenced_gated", label: "Fenced and gated" },
  { value: "parking", label: "Parking space" },
  { value: "pop_ceiling", label: "POP ceiling" },
  { value: "tiled_floor", label: "Tiled floor" },
  { value: "security_post", label: "Security post" },
] as const;

export const ROOM_NAME_PRESETS = [
  "Living room",
  "Kitchen",
  "Bedroom 1",
  "Bedroom 2",
  "Bathroom",
  "Toilet",
  "Compound",
  "Balcony",
] as const;

export const TIME_WINDOWS = [
  "Morning (9:00 AM - 12:00 PM)",
  "Afternoon (12:00 PM - 3:00 PM)",
  "Late afternoon (3:00 PM - 5:30 PM)",
] as const;

export const BACKUP_POWER_OPTIONS = [
  { value: "generator", label: "Generator" },
  { value: "solar", label: "Solar" },
  { value: "inverter", label: "Inverter" },
  { value: "none", label: "None" },
] as const;
