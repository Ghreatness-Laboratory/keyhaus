export type UserRole = "renter" | "landlord";
export type PropertyType =
  | "self_contained"
  | "room"
  | "flat"
  | "bungalow"
  | "duplex"
  | "boys_quarters";
export type RentPeriod = "year" | "month";
export type ListingStatus = "draft" | "published" | "rented" | "archived";
export type PowerGridRating = "steady" | "fair" | "poor" | "none";
export type RoadSurfaceType = "tarred" | "partly_tarred" | "untarred";
export type RoadConditionRating = "good" | "fair" | "bad";
export type FloodingRating = "none" | "sometimes" | "often";
export type WasteRating = "regular" | "irregular" | "none";
export type WaterSourceType = "running_water" | "borehole" | "vendor_well" | "none";
export type QualityRating = "good" | "fair" | "poor";
export type RoomKind = "flat" | "panorama";
export type ViewingStatus = "pending" | "accepted" | "declined";
export type DepthMapStatus = "pending" | "done" | "failed";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole | null;
  avatar_url: string | null;
  is_admin?: boolean;
  created_at: string;
}

export interface PublicProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole | null;
  created_at: string;
}

export interface Listing {
  id: string;
  landlord_id: string;
  title: string;
  description: string;
  property_type: PropertyType;
  rent_amount: number;
  rent_period: RentPeriod;
  agency_fee: number | null;
  legal_fee: number | null;
  caution_fee: number | null;
  bedrooms: number;
  bathrooms: number;
  size_sqm?: number | null;
  furnished: boolean;
  amenities: string[];
  state: string;
  lga: string;
  area: string;
  address_line?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  approx_latitude?: number | null;
  approx_longitude?: number | null;
  matterport_url?: string | null;
  cover_path: string | null;
  cover_thumb_path: string | null;
  status: ListingStatus;
  created_at: string;
  published_at: string | null;
}

export interface ListingEnvironment {
  listing_id: string;
  power_grid: PowerGridRating;
  grid_hours_per_day: number | null;
  power_backup: string[];
  road_surface: RoadSurfaceType;
  road_condition: RoadConditionRating;
  flooding: FloodingRating;
  waste: WasteRating;
  water: WaterSourceType;
  security: QualityRating;
  network: QualityRating;
  note: string | null;
  has_tarred_road?: boolean;
  has_steady_electricity?: boolean;
  has_regular_waste?: boolean;
  has_water_available?: boolean;
  has_low_flood_risk?: boolean;
}

export interface Room {
  id: string;
  listing_id: string;
  name: string;
  kind: RoomKind;
  photo_path: string;
  width: number;
  height: number;
  sort_order: number;
}

export interface RoomLink {
  id: string;
  from_room_id: string;
  to_room_id: string;
  yaw: number | null;
  pitch: number | null;
  x_pct: number | null;
  y_pct: number | null;
  label: string;
}

export type FloorPlanRoomType =
  | "living"
  | "bedroom"
  | "kitchen"
  | "bathroom"
  | "hallway"
  | "balcony"
  | "compound"
  | "other";

export interface FloorPlanRoom {
  id: string;
  name: string;
  type: FloorPlanRoomType;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export type FloorPlanWallSide = "top" | "right" | "bottom" | "left";

export interface FloorPlanOpening {
  kind: "door" | "window";
  roomId: string;
  wall: FloorPlanWallSide;
  offsetPct: number;
  widthPct: number;
}

export interface FloorPlan {
  rooms: FloorPlanRoom[];
  openings: FloorPlanOpening[];
  summary: string;
  isIllustrative: true;
}

export interface ListingFloorPlan {
  id: string;
  listing_id: string;
  plan: FloorPlan;
  model: string | null;
  generated_at: string;
  is_illustrative: boolean;
}

export interface DepthMap {
  id: string;
  listing_id: string;
  photo_path: string;
  depth_path: string;
  status: DepthMapStatus;
  created_at: string;
}

export interface ListingCoordinates {
  latitude: number;
  longitude: number;
}

export interface ViewingModeFlags {
  areaView: boolean;
  streetView: boolean;
  floorPlan2d: boolean;
  view3d: boolean;
}

export interface SavedListing {
  user_id: string;
  listing_id: string;
  created_at: string;
}

export interface ViewingRequest {
  id: string;
  listing_id: string;
  renter_id: string;
  preferred_date: string;
  time_window: string;
  note: string | null;
  status: ViewingStatus;
  created_at: string;
}

export interface Report {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
}

export interface ListingCardData {
  id: string;
  title: string;
  property_type: PropertyType;
  rent_amount: number;
  rent_period: RentPeriod;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  state: string;
  lga: string;
  area: string;
  cover_thumb_path: string | null;
  cover_path: string | null;
  status: ListingStatus;
  published_at: string | null;
  environment: ListingEnvironment | null;
  room_count: number;
  has_panorama: boolean;
  is_saved?: boolean;
}

export interface ListingDetailData {
  listing: Omit<Listing, "address_line" | "latitude" | "longitude">;
  environment: ListingEnvironment | null;
  rooms: Room[];
  roomLinks: RoomLink[];
  landlord: PublicProfile | null;
  isSaved: boolean;
  myViewingRequest: ViewingRequest | null;
  revealedAddress: string | null;
  exactLocation: ListingCoordinates | null;
  canViewExactLocation: boolean;
  floorPlan: ListingFloorPlan | null;
  depthMaps: DepthMap[];
  landlordPhone: string | null;
}

export interface BrowseFilters {
  q?: string;
  state?: string;
  lga?: string;
  chip?: "all" | "flat" | "house" | "room";
  propertyType?: PropertyType | "";
  maxRent?: number;
  minBedrooms?: number;
  furnishedOnly?: boolean;
  tarredRoad?: boolean;
  steadyElectricity?: boolean;
  regularWaste?: boolean;
  waterAvailable?: boolean;
  lowFloodRisk?: boolean;
  offset?: number;
  limit?: number;
}
