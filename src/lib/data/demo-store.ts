import type {
  DepthMap,
  Listing,
  ListingEnvironment,
  ListingFloorPlan,
  Profile,
  Report,
  Room,
  RoomLink,
  ViewingRequest,
} from "@/types/database";

export interface DemoUserRecord {
  profile: Profile;
  email: string;
}

export interface DemoStoreState {
  users: Record<string, DemoUserRecord>;
  listings: Record<string, Listing>;
  environments: Record<string, ListingEnvironment>;
  rooms: Record<string, Room>;
  roomLinks: Record<string, RoomLink>;
  floorPlans: Record<string, ListingFloorPlan>;
  depthMaps: Record<string, DepthMap>;
  saved: Record<string, string[]>; // userId -> listingId[]
  viewings: Record<string, ViewingRequest>;
  reports: Report[];
}

function buildInitialDemoState(): DemoStoreState {
  const landlordLagosId = "11111111-1111-4111-8111-111111111101";
  const landlordAbujaId = "11111111-1111-4111-8111-111111111102";
  const demoRenterId = "11111111-1111-4111-8111-111111111103";

  const users: Record<string, DemoUserRecord> = {
    [landlordLagosId]: {
      email: "chinedu@demo.keyhaus.ng",
      profile: {
        id: landlordLagosId,
        full_name: "Chinedu Okafor",
        phone: "+2348030000001",
        role: "landlord",
        avatar_url: null,
        created_at: "2026-10-01T09:00:00.000Z",
      },
    },
    [landlordAbujaId]: {
      email: "amina@demo.keyhaus.ng",
      profile: {
        id: landlordAbujaId,
        full_name: "Amina Bello",
        phone: "+2348090000002",
        role: "landlord",
        avatar_url: null,
        created_at: "2026-10-02T09:00:00.000Z",
      },
    },
    [demoRenterId]: {
      email: "tunde@demo.keyhaus.ng",
      profile: {
        id: demoRenterId,
        full_name: "Tunde Adeyemi",
        phone: "+2348050000003",
        role: "renter",
        avatar_url: null,
        created_at: "2026-10-05T09:00:00.000Z",
      },
    },
  };

  const seedListings: Array<{
    listing: Listing;
    env: ListingEnvironment;
    rooms: Array<{
      id: string;
      name: string;
      kind: "flat" | "panorama";
      photo_path: string;
      width: number;
      height: number;
    }>;
  }> = [
    {
      listing: {
        id: "22222222-2222-4222-8222-222222222201",
        landlord_id: landlordLagosId,
        title: "Sunlit 2-Bedroom Flat in Ikeja GRA",
        description:
          "Clean 2-bedroom upstairs flat with POP ceiling, fitted kitchen cabinets, and reliable borehole water. Quiet residential close with neat interlocking compound.",
        property_type: "flat",
        rent_amount: 2800000,
        rent_period: "year",
        agency_fee: 280000,
        legal_fee: 140000,
        caution_fee: 200000,
        bedrooms: 2,
        bathrooms: 2,
        furnished: false,
        amenities: [
          "prepaid_meter",
          "borehole",
          "fenced_gated",
          "parking",
          "pop_ceiling",
          "tiled_floor",
        ],
        state: "Lagos",
        lga: "Ikeja",
        area: "Ikeja GRA",
        address_line: "Plot 01 Demo Lane, Sample Close (Demo Address)",
        cover_path: "/images/demo/living-lagos.webp",
        cover_thumb_path: "/images/demo/living-lagos-thumb.webp",
        status: "published",
        created_at: "2026-11-10T10:00:00.000Z",
        published_at: "2026-11-20T10:00:00.000Z",
      },
      env: {
        listing_id: "22222222-2222-4222-8222-222222222201",
        power_grid: "steady",
        grid_hours_per_day: 16,
        power_backup: ["inverter", "generator"],
        road_surface: "tarred",
        road_condition: "good",
        flooding: "none",
        waste: "regular",
        water: "borehole",
        security: "good",
        network: "good",
        note: "Band A feeder line; LAWMA picks up every Tuesday morning.",
      },
      rooms: [
        {
          id: "33333333-0001-4000-8000-000000000001",
          name: "Living room",
          kind: "panorama",
          photo_path: "/images/demo/panorama-living.webp",
          width: 2048,
          height: 1024,
        },
        {
          id: "33333333-0001-4000-8000-000000000002",
          name: "Kitchen",
          kind: "flat",
          photo_path: "/images/demo/kitchen-abuja.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0001-4000-8000-000000000003",
          name: "Bedroom 1",
          kind: "flat",
          photo_path: "/images/demo/bedroom-lekki.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0001-4000-8000-000000000004",
          name: "Compound",
          kind: "flat",
          photo_path: "/images/demo/duplex-wuse.webp",
          width: 1200,
          height: 900,
        },
      ],
    },
    {
      listing: {
        id: "22222222-2222-4222-8222-222222222202",
        landlord_id: landlordLagosId,
        title: "Serviced Self-Contained Studio in Yaba",
        description:
          "Compact self-contained studio close to UNILAG and Herbert Macaulay Way. Ideal for young professionals seeking quick mainland transit.",
        property_type: "self_contained",
        rent_amount: 950000,
        rent_period: "year",
        agency_fee: 95000,
        legal_fee: 50000,
        caution_fee: 100000,
        bedrooms: 1,
        bathrooms: 1,
        furnished: true,
        amenities: ["prepaid_meter", "borehole", "fenced_gated", "tiled_floor"],
        state: "Lagos",
        lga: "Lagos Mainland",
        area: "Yaba",
        address_line: "No. 02 Demo Street, Sample Quarters (Demo Address)",
        cover_path: "/images/demo/bedroom-lekki.webp",
        cover_thumb_path: "/images/demo/bedroom-lekki-thumb.webp",
        status: "published",
        created_at: "2026-11-11T10:00:00.000Z",
        published_at: "2026-11-19T10:00:00.000Z",
      },
      env: {
        listing_id: "22222222-2222-4222-8222-222222222202",
        power_grid: "fair",
        grid_hours_per_day: 10,
        power_backup: ["generator"],
        road_surface: "tarred",
        road_condition: "fair",
        flooding: "sometimes",
        waste: "regular",
        water: "borehole",
        security: "good",
        network: "good",
        note: "Slight puddle near junction after heavy storms, clears within 2 hours.",
      },
      rooms: [
        {
          id: "33333333-0002-4000-8000-000000000001",
          name: "Bedroom 1",
          kind: "flat",
          photo_path: "/images/demo/bedroom-lekki.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0002-4000-8000-000000000002",
          name: "Living room",
          kind: "flat",
          photo_path: "/images/demo/living-lagos.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0002-4000-8000-000000000003",
          name: "Kitchen",
          kind: "flat",
          photo_path: "/images/demo/kitchen-abuja.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0002-4000-8000-000000000004",
          name: "Compound",
          kind: "flat",
          photo_path: "/images/demo/duplex-wuse.webp",
          width: 1200,
          height: 900,
        },
      ],
    },
    {
      listing: {
        id: "22222222-2222-4222-8222-222222222203",
        landlord_id: landlordLagosId,
        title: "3-Bedroom Terrace Flat in Lekki Phase 1",
        description:
          "Spacious flat with cross-ventilation, balcony, and steady compound security. Transparent note: approach road floods during heavy rain.",
        property_type: "flat",
        rent_amount: 4500000,
        rent_period: "year",
        agency_fee: 450000,
        legal_fee: 225000,
        caution_fee: 300000,
        bedrooms: 3,
        bathrooms: 3,
        furnished: false,
        amenities: [
          "prepaid_meter",
          "borehole",
          "fenced_gated",
          "parking",
          "pop_ceiling",
          "tiled_floor",
          "security_post",
        ],
        state: "Lagos",
        lga: "Eti-Osa",
        area: "Lekki Phase 1",
        address_line: "Block 03 Sample Crescent (Demo Address)",
        cover_path: "/images/demo/panorama-living.webp",
        cover_thumb_path: "/images/demo/panorama-living-thumb.webp",
        status: "published",
        created_at: "2026-11-12T10:00:00.000Z",
        published_at: "2026-11-18T10:00:00.000Z",
      },
      env: {
        listing_id: "22222222-2222-4222-8222-222222222203",
        power_grid: "steady",
        grid_hours_per_day: 18,
        power_backup: ["solar", "inverter"],
        road_surface: "tarred",
        road_condition: "fair",
        flooding: "often",
        waste: "regular",
        water: "running_water",
        security: "good",
        network: "good",
        note: "Compound is raised, but approach road floods in July and September.",
      },
      rooms: [
        {
          id: "33333333-0003-4000-8000-000000000001",
          name: "Living room",
          kind: "panorama",
          photo_path: "/images/demo/panorama-living.webp",
          width: 2048,
          height: 1024,
        },
        {
          id: "33333333-0003-4000-8000-000000000002",
          name: "Kitchen",
          kind: "flat",
          photo_path: "/images/demo/kitchen-abuja.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0003-4000-8000-000000000003",
          name: "Bedroom 1",
          kind: "flat",
          photo_path: "/images/demo/bedroom-lekki.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0003-4000-8000-000000000004",
          name: "Compound",
          kind: "flat",
          photo_path: "/images/demo/duplex-wuse.webp",
          width: 1200,
          height: 900,
        },
      ],
    },
    {
      listing: {
        id: "22222222-2222-4222-8222-222222222204",
        landlord_id: landlordAbujaId,
        title: "4-Bedroom Semi-Detached Duplex in Wuse II",
        description:
          "Well-maintained family duplex with interlocking paved compound, dedicated prepaid meter, and shaded carport.",
        property_type: "duplex",
        rent_amount: 6500000,
        rent_period: "year",
        agency_fee: 650000,
        legal_fee: 325000,
        caution_fee: 500000,
        bedrooms: 4,
        bathrooms: 4,
        furnished: false,
        amenities: [
          "prepaid_meter",
          "borehole",
          "fenced_gated",
          "parking",
          "pop_ceiling",
          "tiled_floor",
          "security_post",
        ],
        state: "FCT",
        lga: "Abuja Municipal",
        area: "Wuse II",
        address_line: "House 04 Example Avenue (Demo Address)",
        cover_path: "/images/demo/duplex-wuse.webp",
        cover_thumb_path: "/images/demo/duplex-wuse-thumb.webp",
        status: "published",
        created_at: "2026-11-13T10:00:00.000Z",
        published_at: "2026-11-17T10:00:00.000Z",
      },
      env: {
        listing_id: "22222222-2222-4222-8222-222222222204",
        power_grid: "steady",
        grid_hours_per_day: 19,
        power_backup: ["solar", "generator"],
        road_surface: "tarred",
        road_condition: "good",
        flooding: "none",
        waste: "regular",
        water: "running_water",
        security: "good",
        network: "good",
        note: "Quiet cul-de-sac with uniformed estate guards 24/7.",
      },
      rooms: [
        {
          id: "33333333-0004-4000-8000-000000000001",
          name: "Compound",
          kind: "flat",
          photo_path: "/images/demo/duplex-wuse.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0004-4000-8000-000000000002",
          name: "Living room",
          kind: "panorama",
          photo_path: "/images/demo/panorama-living.webp",
          width: 2048,
          height: 1024,
        },
        {
          id: "33333333-0004-4000-8000-000000000003",
          name: "Kitchen",
          kind: "flat",
          photo_path: "/images/demo/kitchen-abuja.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0004-4000-8000-000000000004",
          name: "Bedroom 1",
          kind: "flat",
          photo_path: "/images/demo/bedroom-lekki.webp",
          width: 1200,
          height: 900,
        },
      ],
    },
    {
      listing: {
        id: "22222222-2222-4222-8222-222222222205",
        landlord_id: landlordAbujaId,
        title: "2-Bedroom Bungalow in Gwarinpa",
        description:
          "Quiet standalone bungalow in a gated estate with steady borehole water and strong 4G coverage.",
        property_type: "bungalow",
        rent_amount: 2400000,
        rent_period: "year",
        agency_fee: 240000,
        legal_fee: 120000,
        caution_fee: 150000,
        bedrooms: 2,
        bathrooms: 2,
        furnished: false,
        amenities: ["prepaid_meter", "borehole", "fenced_gated", "parking", "tiled_floor"],
        state: "FCT",
        lga: "Abuja Municipal",
        area: "Gwarinpa",
        address_line: "Close 05 Demo Estate (Demo Address)",
        cover_path: "/images/demo/kitchen-abuja.webp",
        cover_thumb_path: "/images/demo/kitchen-abuja-thumb.webp",
        status: "published",
        created_at: "2026-11-14T10:00:00.000Z",
        published_at: "2026-11-16T10:00:00.000Z",
      },
      env: {
        listing_id: "22222222-2222-4222-8222-222222222205",
        power_grid: "fair",
        grid_hours_per_day: 12,
        power_backup: ["inverter"],
        road_surface: "tarred",
        road_condition: "good",
        flooding: "none",
        waste: "regular",
        water: "borehole",
        security: "good",
        network: "good",
        note: "Reliable borehole with overhead tank; calm family neighborhood.",
      },
      rooms: [
        {
          id: "33333333-0005-4000-8000-000000000001",
          name: "Kitchen",
          kind: "flat",
          photo_path: "/images/demo/kitchen-abuja.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0005-4000-8000-000000000002",
          name: "Living room",
          kind: "flat",
          photo_path: "/images/demo/living-lagos.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0005-4000-8000-000000000003",
          name: "Bedroom 1",
          kind: "flat",
          photo_path: "/images/demo/bedroom-lekki.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0005-4000-8000-000000000004",
          name: "Compound",
          kind: "flat",
          photo_path: "/images/demo/duplex-wuse.webp",
          width: 1200,
          height: 900,
        },
      ],
    },
    {
      listing: {
        id: "22222222-2222-4222-8222-222222222206",
        landlord_id: landlordAbujaId,
        title: "Affordable Boys Quarters Room in Lugbe",
        description:
          "Neat private room and bath in a shared compound. Honest note: access road is untarred and grid power is limited.",
        property_type: "boys_quarters",
        rent_amount: 450000,
        rent_period: "year",
        agency_fee: 45000,
        legal_fee: 25000,
        caution_fee: 50000,
        bedrooms: 1,
        bathrooms: 1,
        furnished: false,
        amenities: ["fenced_gated", "tiled_floor"],
        state: "FCT",
        lga: "Abuja Municipal",
        area: "Lugbe",
        address_line: "Plot 06 Sample Road (Demo Address)",
        cover_path: "/images/demo/bedroom-lekki.webp",
        cover_thumb_path: "/images/demo/bedroom-lekki-thumb.webp",
        status: "published",
        created_at: "2026-11-15T10:00:00.000Z",
        published_at: "2026-11-15T10:00:00.000Z",
      },
      env: {
        listing_id: "22222222-2222-4222-8222-222222222206",
        power_grid: "poor",
        grid_hours_per_day: 4,
        power_backup: ["none"],
        road_surface: "untarred",
        road_condition: "bad",
        flooding: "sometimes",
        waste: "none",
        water: "vendor_well",
        security: "fair",
        network: "fair",
        note: "Last 400m from expressway is untarred red earth; bring a small power bank.",
      },
      rooms: [
        {
          id: "33333333-0006-4000-8000-000000000001",
          name: "Bedroom 1",
          kind: "flat",
          photo_path: "/images/demo/bedroom-lekki.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0006-4000-8000-000000000002",
          name: "Kitchen",
          kind: "flat",
          photo_path: "/images/demo/kitchen-abuja.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0006-4000-8000-000000000003",
          name: "Living room",
          kind: "flat",
          photo_path: "/images/demo/living-lagos.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0006-4000-8000-000000000004",
          name: "Compound",
          kind: "flat",
          photo_path: "/images/demo/duplex-wuse.webp",
          width: 1200,
          height: 900,
        },
      ],
    },
    {
      listing: {
        id: "22222222-2222-4222-8222-222222222207",
        landlord_id: landlordLagosId,
        title: "2-Bedroom Flat in New GRA Port Harcourt",
        description:
          "Bright apartment off Tombia Extension with POP ceiling, borehole water, and tarred estate street.",
        property_type: "flat",
        rent_amount: 2200000,
        rent_period: "year",
        agency_fee: 220000,
        legal_fee: 110000,
        caution_fee: 150000,
        bedrooms: 2,
        bathrooms: 2,
        furnished: false,
        amenities: [
          "prepaid_meter",
          "borehole",
          "fenced_gated",
          "parking",
          "pop_ceiling",
          "tiled_floor",
        ],
        state: "Rivers",
        lga: "Port Harcourt",
        area: "New GRA",
        address_line: "Street 07 Sample Layout (Demo Address)",
        cover_path: "/images/demo/living-lagos.webp",
        cover_thumb_path: "/images/demo/living-lagos-thumb.webp",
        status: "published",
        created_at: "2026-11-16T10:00:00.000Z",
        published_at: "2026-11-14T10:00:00.000Z",
      },
      env: {
        listing_id: "22222222-2222-4222-8222-222222222207",
        power_grid: "fair",
        grid_hours_per_day: 11,
        power_backup: ["generator"],
        road_surface: "tarred",
        road_condition: "good",
        flooding: "none",
        waste: "regular",
        water: "borehole",
        security: "good",
        network: "good",
        note: "Smooth tarred estate street with good MTN and Airtel 4G.",
      },
      rooms: [
        {
          id: "33333333-0007-4000-8000-000000000001",
          name: "Living room",
          kind: "panorama",
          photo_path: "/images/demo/panorama-living.webp",
          width: 2048,
          height: 1024,
        },
        {
          id: "33333333-0007-4000-8000-000000000002",
          name: "Kitchen",
          kind: "flat",
          photo_path: "/images/demo/kitchen-abuja.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0007-4000-8000-000000000003",
          name: "Bedroom 1",
          kind: "flat",
          photo_path: "/images/demo/bedroom-lekki.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0007-4000-8000-000000000004",
          name: "Compound",
          kind: "flat",
          photo_path: "/images/demo/duplex-wuse.webp",
          width: 1200,
          height: 900,
        },
      ],
    },
    {
      listing: {
        id: "22222222-2222-4222-8222-222222222208",
        landlord_id: landlordLagosId,
        title: "Single Room in Choba Near Uniport",
        description:
          "Simple clean room with shared compound water tap and security gate. Monthly rent accepted.",
        property_type: "room",
        rent_amount: 30000,
        rent_period: "month",
        agency_fee: 30000,
        legal_fee: 0,
        caution_fee: 30000,
        bedrooms: 1,
        bathrooms: 1,
        furnished: false,
        amenities: ["fenced_gated", "borehole"],
        state: "Rivers",
        lga: "Obio/Akpor",
        area: "Choba",
        address_line: "Lane 08 Example Compound (Demo Address)",
        cover_path: "/images/demo/kitchen-abuja.webp",
        cover_thumb_path: "/images/demo/kitchen-abuja-thumb.webp",
        status: "published",
        created_at: "2026-11-17T10:00:00.000Z",
        published_at: "2026-11-13T10:00:00.000Z",
      },
      env: {
        listing_id: "22222222-2222-4222-8222-222222222208",
        power_grid: "poor",
        grid_hours_per_day: 5,
        power_backup: ["generator"],
        road_surface: "partly_tarred",
        road_condition: "fair",
        flooding: "sometimes",
        waste: "irregular",
        water: "borehole",
        security: "fair",
        network: "good",
        note: "Close to campus gate; compound runs backup generator 7pm-11pm.",
      },
      rooms: [
        {
          id: "33333333-0008-4000-8000-000000000001",
          name: "Bedroom 1",
          kind: "flat",
          photo_path: "/images/demo/bedroom-lekki.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0008-4000-8000-000000000002",
          name: "Kitchen",
          kind: "flat",
          photo_path: "/images/demo/kitchen-abuja.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0008-4000-8000-000000000003",
          name: "Living room",
          kind: "flat",
          photo_path: "/images/demo/living-lagos.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0008-4000-8000-000000000004",
          name: "Compound",
          kind: "flat",
          photo_path: "/images/demo/duplex-wuse.webp",
          width: 1200,
          height: 900,
        },
      ],
    },
    {
      listing: {
        id: "22222222-2222-4222-8222-222222222209",
        landlord_id: landlordAbujaId,
        title: "3-Bedroom Bungalow in Bodija Ibadan",
        description:
          "Peaceful family home in Old Bodija with large compound, solar inverter wiring, and tarred street access.",
        property_type: "bungalow",
        rent_amount: 1600000,
        rent_period: "year",
        agency_fee: 160000,
        legal_fee: 80000,
        caution_fee: 100000,
        bedrooms: 3,
        bathrooms: 2,
        furnished: false,
        amenities: ["prepaid_meter", "borehole", "fenced_gated", "parking", "tiled_floor"],
        state: "Oyo",
        lga: "Ibadan North",
        area: "Old Bodija",
        address_line: "Road 09 Demo Crescent (Demo Address)",
        cover_path: "/images/demo/duplex-wuse.webp",
        cover_thumb_path: "/images/demo/duplex-wuse-thumb.webp",
        status: "published",
        created_at: "2026-11-18T10:00:00.000Z",
        published_at: "2026-11-12T10:00:00.000Z",
      },
      env: {
        listing_id: "22222222-2222-4222-8222-222222222209",
        power_grid: "fair",
        grid_hours_per_day: 10,
        power_backup: ["solar"],
        road_surface: "tarred",
        road_condition: "good",
        flooding: "none",
        waste: "regular",
        water: "borehole",
        security: "good",
        network: "good",
        note: "Shaded quiet street, solid drainage channels.",
      },
      rooms: [
        {
          id: "33333333-0009-4000-8000-000000000001",
          name: "Compound",
          kind: "flat",
          photo_path: "/images/demo/duplex-wuse.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0009-4000-8000-000000000002",
          name: "Living room",
          kind: "flat",
          photo_path: "/images/demo/living-lagos.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0009-4000-8000-000000000003",
          name: "Kitchen",
          kind: "flat",
          photo_path: "/images/demo/kitchen-abuja.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0009-4000-8000-000000000004",
          name: "Bedroom 1",
          kind: "flat",
          photo_path: "/images/demo/bedroom-lekki.webp",
          width: 1200,
          height: 900,
        },
      ],
    },
    {
      listing: {
        id: "22222222-2222-4222-8222-222222222210",
        landlord_id: landlordAbujaId,
        title: "2-Bedroom Flat in Nassarawa GRA Kano",
        description:
          "Spacious ground-floor flat with wide compound, tiled rooms, and regular municipal waste pickup.",
        property_type: "flat",
        rent_amount: 1400000,
        rent_period: "year",
        agency_fee: 140000,
        legal_fee: 70000,
        caution_fee: 100000,
        bedrooms: 2,
        bathrooms: 2,
        furnished: false,
        amenities: [
          "prepaid_meter",
          "borehole",
          "fenced_gated",
          "parking",
          "tiled_floor",
          "security_post",
        ],
        state: "Kano",
        lga: "Nasarawa",
        area: "Nassarawa GRA",
        address_line: "Avenue 10 Sample Quarters (Demo Address)",
        cover_path: "/images/demo/panorama-living.webp",
        cover_thumb_path: "/images/demo/panorama-living-thumb.webp",
        status: "published",
        created_at: "2026-11-19T10:00:00.000Z",
        published_at: "2026-11-11T10:00:00.000Z",
      },
      env: {
        listing_id: "22222222-2222-4222-8222-222222222210",
        power_grid: "steady",
        grid_hours_per_day: 15,
        power_backup: ["inverter"],
        road_surface: "tarred",
        road_condition: "good",
        flooding: "none",
        waste: "regular",
        water: "running_water",
        security: "good",
        network: "good",
        note: "Clean GRA street with steady morning and evening water pressure.",
      },
      rooms: [
        {
          id: "33333333-0010-4000-8000-000000000001",
          name: "Living room",
          kind: "panorama",
          photo_path: "/images/demo/panorama-living.webp",
          width: 2048,
          height: 1024,
        },
        {
          id: "33333333-0010-4000-8000-000000000002",
          name: "Kitchen",
          kind: "flat",
          photo_path: "/images/demo/kitchen-abuja.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0010-4000-8000-000000000003",
          name: "Bedroom 1",
          kind: "flat",
          photo_path: "/images/demo/bedroom-lekki.webp",
          width: 1200,
          height: 900,
        },
        {
          id: "33333333-0010-4000-8000-000000000004",
          name: "Compound",
          kind: "flat",
          photo_path: "/images/demo/duplex-wuse.webp",
          width: 1200,
          height: 900,
        },
      ],
    },
  ];

  const listings: Record<string, Listing> = {};
  const environments: Record<string, ListingEnvironment> = {};
  const rooms: Record<string, Room> = {};
  const roomLinks: Record<string, RoomLink> = {};

  const demoCoords: Record<
    string,
    { lat: number; lng: number; sizeSqm: number }
  > = {
    "22222222-2222-4222-8222-222222222201": { lat: 6.5854, lng: 3.3562, sizeSqm: 110 },
    "22222222-2222-4222-8222-222222222202": { lat: 6.5152, lng: 3.3774, sizeSqm: 42 },
    "22222222-2222-4222-8222-222222222203": { lat: 6.4472, lng: 3.4743, sizeSqm: 145 },
    "22222222-2222-4222-8222-222222222204": { lat: 9.0764, lng: 7.4791, sizeSqm: 240 },
    "22222222-2222-4222-8222-222222222205": { lat: 9.1089, lng: 7.4041, sizeSqm: 115 },
    "22222222-2222-4222-8222-222222222206": { lat: 8.9721, lng: 7.3772, sizeSqm: 26 },
    "22222222-2222-4222-8222-222222222207": { lat: 4.8242, lng: 7.0011, sizeSqm: 108 },
    "22222222-2222-4222-8222-222222222208": { lat: 4.8961, lng: 6.9122, sizeSqm: 24 },
    "22222222-2222-4222-8222-222222222209": { lat: 7.4231, lng: 3.9082, sizeSqm: 138 },
    "22222222-2222-4222-8222-222222222210": { lat: 11.9961, lng: 8.5452, sizeSqm: 105 },
  };

  for (const item of seedListings) {
    const coordInfo = demoCoords[item.listing.id];
    const step = 0.0035;
    listings[item.listing.id] = {
      ...item.listing,
      size_sqm: coordInfo?.sizeSqm ?? null,
      latitude: coordInfo?.lat ?? null,
      longitude: coordInfo?.lng ?? null,
      approx_latitude: coordInfo
        ? Number((Math.round(coordInfo.lat / step) * step).toFixed(5))
        : null,
      approx_longitude: coordInfo
        ? Number((Math.round(coordInfo.lng / step) * step).toFixed(5))
        : null,
      matterport_url: null,
    };
    environments[item.listing.id] = item.env;
    item.rooms.forEach((r, idx) => {
      rooms[r.id] = {
        ...r,
        listing_id: item.listing.id,
        sort_order: idx,
      };
    });

    // Connect room 0 -> room 1 and room 1 -> room 0 & room 2 so tours have working hotspots
    const r0 = item.rooms[0];
    const r1 = item.rooms[1];
    const r2 = item.rooms[2];
    const r3 = item.rooms[3];
    if (r0 && r1) {
      const link1Id = `link-${r0.id}-to-${r1.id}`;
      roomLinks[link1Id] = {
        id: link1Id,
        from_room_id: r0.id,
        to_room_id: r1.id,
        yaw: r0.kind === "panorama" ? 1.1 : null,
        pitch: r0.kind === "panorama" ? -0.05 : null,
        x_pct: r0.kind === "flat" ? 72 : null,
        y_pct: r0.kind === "flat" ? 56 : null,
        label: `Go to ${r1.name}`,
      };
      const link2Id = `link-${r1.id}-to-${r0.id}`;
      roomLinks[link2Id] = {
        id: link2Id,
        from_room_id: r1.id,
        to_room_id: r0.id,
        yaw: r1.kind === "panorama" ? -0.6 : null,
        pitch: r1.kind === "panorama" ? -0.05 : null,
        x_pct: r1.kind === "flat" ? 20 : null,
        y_pct: r1.kind === "flat" ? 54 : null,
        label: `Back to ${r0.name}`,
      };
    }
    if (r0 && r2) {
      const link3Id = `link-${r0.id}-to-${r2.id}`;
      roomLinks[link3Id] = {
        id: link3Id,
        from_room_id: r0.id,
        to_room_id: r2.id,
        yaw: r0.kind === "panorama" ? 2.15 : null,
        pitch: r0.kind === "panorama" ? -0.03 : null,
        x_pct: r0.kind === "flat" ? 45 : null,
        y_pct: r0.kind === "flat" ? 52 : null,
        label: `Enter ${r2.name}`,
      };
    }
    if (r2 && r3) {
      const link4Id = `link-${r2.id}-to-${r3.id}`;
      roomLinks[link4Id] = {
        id: link4Id,
        from_room_id: r2.id,
        to_room_id: r3.id,
        yaw: null,
        pitch: null,
        x_pct: 80,
        y_pct: 50,
        label: `View ${r3.name}`,
      };
    }
  }

  const floorPlans: Record<string, ListingFloorPlan> = {
    "22222222-2222-4222-8222-222222222201": {
      id: "55555555-0001-4000-8000-000000000001",
      listing_id: "22222222-2222-4222-8222-222222222201",
      model: "seeded-illustrative",
      generated_at: "2026-11-22T09:00:00.000Z",
      is_illustrative: true,
      plan: {
        rooms: [
          { id: "living", name: "Living room", type: "living", xPct: 8, yPct: 12, widthPct: 44, heightPct: 44 },
          { id: "kitchen", name: "Kitchen", type: "kitchen", xPct: 52, yPct: 12, widthPct: 40, heightPct: 28 },
          { id: "hall", name: "Hallway", type: "hallway", xPct: 52, yPct: 40, widthPct: 14, heightPct: 16 },
          { id: "bath1", name: "Bath 1", type: "bathroom", xPct: 66, yPct: 40, widthPct: 26, heightPct: 16 },
          { id: "bed1", name: "Bedroom 1", type: "bedroom", xPct: 8, yPct: 56, widthPct: 42, heightPct: 32 },
          { id: "bed2", name: "Bedroom 2", type: "bedroom", xPct: 50, yPct: 56, widthPct: 42, heightPct: 32 },
        ],
        openings: [
          { kind: "door", roomId: "living", wall: "top", offsetPct: 30, widthPct: 18 },
          { kind: "window", roomId: "living", wall: "left", offsetPct: 45, widthPct: 36 },
          { kind: "door", roomId: "kitchen", wall: "left", offsetPct: 50, widthPct: 22 },
          { kind: "window", roomId: "kitchen", wall: "right", offsetPct: 45, widthPct: 34 },
          { kind: "door", roomId: "bed1", wall: "top", offsetPct: 72, widthPct: 18 },
          { kind: "window", roomId: "bed1", wall: "bottom", offsetPct: 48, widthPct: 35 },
          { kind: "door", roomId: "bed2", wall: "top", offsetPct: 24, widthPct: 18 },
          { kind: "window", roomId: "bed2", wall: "bottom", offsetPct: 52, widthPct: 35 },
        ],
        summary:
          "2-bedroom flat arranged around a bright central living room with separate kitchen and front entry.",
        isIllustrative: true,
      },
    },
  };

  return {
    users,
    listings,
    environments,
    rooms,
    roomLinks,
    floorPlans,
    depthMaps: {},
    saved: {
      [demoRenterId]: ["22222222-2222-4222-8222-222222222201"],
    },
    viewings: {
      "44444444-4444-4444-8444-444444444401": {
        id: "44444444-4444-4444-8444-444444444401",
        listing_id: "22222222-2222-4222-8222-222222222201",
        renter_id: demoRenterId,
        preferred_date: "2026-11-28",
        time_window: "Morning (9:00 AM - 12:00 PM)",
        note: "Coming from Ikeja Along around 10am.",
        status: "pending",
        created_at: "2026-11-22T08:00:00.000Z",
      },
    },
    reports: [],
  };
}

const globalForDemo = globalThis as unknown as {
  __keyhausDemoStore?: DemoStoreState;
};

export function getDemoStore(): DemoStoreState {
  if (!globalForDemo.__keyhausDemoStore) {
    globalForDemo.__keyhausDemoStore = buildInitialDemoState();
  }
  return globalForDemo.__keyhausDemoStore;
}

export const DEMO_SESSION_COOKIE = "keyhaus_demo_uid";
