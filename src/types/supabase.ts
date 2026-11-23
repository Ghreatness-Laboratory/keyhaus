import type {
  FloodingRating,
  Listing,
  ListingEnvironment,
  ListingStatus,
  PowerGridRating,
  Profile,
  PropertyType,
  PublicProfile,
  QualityRating,
  RentPeriod,
  Report,
  RoadConditionRating,
  RoadSurfaceType,
  Room,
  RoomKind,
  RoomLink,
  SavedListing,
  UserRole,
  ViewingRequest,
  ViewingStatus,
  WasteRating,
  WaterSourceType,
} from "./database";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole | null;
          avatar_url?: string | null;
        };
      };
      listings: {
        Row: Listing;
        Insert: {
          id?: string;
          landlord_id: string;
          title: string;
          description?: string;
          property_type: PropertyType;
          rent_amount: number;
          rent_period?: RentPeriod;
          agency_fee?: number | null;
          legal_fee?: number | null;
          caution_fee?: number | null;
          bedrooms?: number;
          bathrooms?: number;
          furnished?: boolean;
          amenities?: string[];
          state: string;
          lga: string;
          area: string;
          address_line?: string;
          cover_path?: string | null;
          cover_thumb_path?: string | null;
          status?: ListingStatus;
          created_at?: string;
          published_at?: string | null;
        };
        Update: Partial<Omit<Listing, "id" | "landlord_id" | "created_at">>;
      };
      listing_environment: {
        Row: ListingEnvironment;
        Insert: {
          listing_id: string;
          power_grid: PowerGridRating;
          grid_hours_per_day?: number | null;
          power_backup?: string[];
          road_surface: RoadSurfaceType;
          road_condition: RoadConditionRating;
          flooding: FloodingRating;
          waste: WasteRating;
          water: WaterSourceType;
          security: QualityRating;
          network: QualityRating;
          note?: string | null;
        };
        Update: Partial<Omit<ListingEnvironment, "listing_id">>;
      };
      rooms: {
        Row: Room;
        Insert: {
          id?: string;
          listing_id: string;
          name: string;
          kind?: RoomKind;
          photo_path: string;
          width: number;
          height: number;
          sort_order?: number;
        };
        Update: Partial<Omit<Room, "id" | "listing_id">>;
      };
      room_links: {
        Row: RoomLink;
        Insert: {
          id?: string;
          from_room_id: string;
          to_room_id: string;
          yaw?: number | null;
          pitch?: number | null;
          x_pct?: number | null;
          y_pct?: number | null;
          label: string;
        };
        Update: Partial<Omit<RoomLink, "id">>;
      };
      saved_listings: {
        Row: SavedListing;
        Insert: {
          user_id: string;
          listing_id: string;
          created_at?: string;
        };
        Update: never;
      };
      viewing_requests: {
        Row: ViewingRequest;
        Insert: {
          id?: string;
          listing_id: string;
          renter_id: string;
          preferred_date: string;
          time_window: string;
          note?: string | null;
          status?: ViewingStatus;
          created_at?: string;
        };
        Update: {
          status?: ViewingStatus;
        };
      };
      reports: {
        Row: Report;
        Insert: {
          id?: string;
          listing_id: string;
          reporter_id: string;
          reason: string;
          created_at?: string;
        };
        Update: never;
      };
    };
    Views: {
      public_profiles: {
        Row: PublicProfile;
      };
    };
    Functions: {
      get_landlord_contact: {
        Args: { p_listing_id: string };
        Returns: { full_name: string | null; phone: string | null }[];
      };
      get_listing_address: {
        Args: { p_listing_id: string };
        Returns: string | null;
      };
    };
  };
}
