import { cookies } from "next/headers";
import { BROWSE_PAGE_SIZE, PROPERTY_TYPES } from "@/lib/constants";
import { isSupabaseConfigured, resolveDepthMapUrl, resolveListingPhotoUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  BrowseFilters,
  DepthMap,
  Listing,
  ListingCardData,
  ListingCoordinates,
  ListingDetailData,
  ListingEnvironment,
  ListingFloorPlan,
  Profile,
  PublicProfile,
  Room,
  RoomLink,
  ViewingRequest,
} from "@/types/database";
import { DEMO_SESSION_COOKIE, getDemoStore } from "./demo-store";

export interface CurrentSessionInfo {
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  isDemoMode: boolean;
}

export async function getCurrentSession(): Promise<CurrentSessionInfo> {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    const uid = cookieStore.get(DEMO_SESSION_COOKIE)?.value ?? null;
    const store = getDemoStore();
    if (!uid || !store.users[uid]) {
      return { userId: null, email: null, profile: null, isDemoMode: true };
    }
    return {
      userId: uid,
      email: store.users[uid].email,
      profile: store.users[uid].profile,
      isDemoMode: true,
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { userId: null, email: null, profile: null, isDemoMode: false };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, email: null, profile: null, isDemoMode: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profile as Profile | null) ?? null,
    isDemoMode: false,
  };
}

function matchesChipGroup(
  propertyType: Listing["property_type"],
  chip: BrowseFilters["chip"]
): boolean {
  if (!chip || chip === "all") return true;
  const def = PROPERTY_TYPES.find((item) => item.value === propertyType);
  return def?.group === chip;
}

export async function browseListings(
  filters: BrowseFilters = {}
): Promise<{ items: ListingCardData[]; hasMore: boolean }> {
  const session = await getCurrentSession();
  const limit = filters.limit ?? BROWSE_PAGE_SIZE;
  const offset = filters.offset ?? 0;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const savedSet = new Set(
      session.userId ? (store.saved[session.userId] ?? []) : []
    );

    const allPublished = Object.values(store.listings)
      .filter((item) => item.status === "published")
      .sort((a, b) =>
        (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at)
      );

    const filtered = allPublished.filter((item) => {
      const env = store.environments[item.id] ?? null;
      if (filters.state && item.state !== filters.state) return false;
      if (filters.lga && item.lga !== filters.lga) return false;
      if (filters.chip && !matchesChipGroup(item.property_type, filters.chip)) {
        return false;
      }
      if (filters.propertyType && item.property_type !== filters.propertyType) {
        return false;
      }
      if (typeof filters.maxRent === "number" && filters.maxRent > 0) {
        if (item.rent_amount > filters.maxRent) return false;
      }
      if (typeof filters.minBedrooms === "number" && filters.minBedrooms > 0) {
        if (item.bedrooms < filters.minBedrooms) return false;
      }
      if (filters.furnishedOnly && !item.furnished) return false;

      if (filters.q && filters.q.trim().length > 0) {
        const q = filters.q.trim().toLowerCase();
        const hay = `${item.title} ${item.area} ${item.lga} ${item.state}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (filters.tarredRoad && env?.road_surface !== "tarred") return false;
      if (filters.steadyElectricity && env?.power_grid !== "steady") return false;
      if (filters.regularWaste && env?.waste !== "regular") return false;
      if (filters.waterAvailable && (!env || env.water === "none")) return false;
      if (filters.lowFloodRisk && env?.flooding !== "none") return false;

      return true;
    });

    const sliced = filtered.slice(offset, offset + limit);
    const items: ListingCardData[] = sliced.map((listing) => {
      const listingRooms = Object.values(store.rooms).filter(
        (r) => r.listing_id === listing.id
      );
      return {
        id: listing.id,
        title: listing.title,
        property_type: listing.property_type,
        rent_amount: listing.rent_amount,
        rent_period: listing.rent_period,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        furnished: listing.furnished,
        state: listing.state,
        lga: listing.lga,
        area: listing.area,
        cover_thumb_path: listing.cover_thumb_path,
        cover_path: listing.cover_path,
        status: listing.status,
        published_at: listing.published_at,
        environment: store.environments[listing.id] ?? null,
        room_count: listingRooms.length,
        has_panorama: listingRooms.some((r) => r.kind === "panorama"),
        is_saved: savedSet.has(listing.id),
      };
    });

    return {
      items,
      hasMore: offset + sliced.length < filtered.length,
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { items: [], hasMore: false };

  let query = supabase
    .from("listings")
    .select(
      "id, title, property_type, rent_amount, rent_period, bedrooms, bathrooms, furnished, state, lga, area, cover_thumb_path, cover_path, status, published_at, listing_environment!inner(*), rooms(id, kind)"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(offset, offset + limit);

  if (filters.state) query = query.eq("state", filters.state);
  if (filters.lga) query = query.eq("lga", filters.lga);
  if (filters.propertyType) {
    query = query.eq("property_type", filters.propertyType);
  } else if (filters.chip && filters.chip !== "all") {
    const typesInGroup = PROPERTY_TYPES.filter((p) => p.group === filters.chip).map(
      (p) => p.value
    );
    query = query.in("property_type", typesInGroup);
  }
  if (typeof filters.maxRent === "number" && filters.maxRent > 0) {
    query = query.lte("rent_amount", filters.maxRent);
  }
  if (typeof filters.minBedrooms === "number" && filters.minBedrooms > 0) {
    query = query.gte("bedrooms", filters.minBedrooms);
  }
  if (filters.furnishedOnly) query = query.eq("furnished", true);
  if (filters.q && filters.q.trim().length > 0) {
    const safeQ = filters.q.trim().replace(/[%_,()]/g, "");
    query = query.or(
      `area.ilike.%${safeQ}%,lga.ilike.%${safeQ}%,state.ilike.%${safeQ}%,title.ilike.%${safeQ}%`
    );
  }

  if (filters.tarredRoad) {
    query = query.eq("listing_environment.has_tarred_road", true);
  }
  if (filters.steadyElectricity) {
    query = query.eq("listing_environment.has_steady_electricity", true);
  }
  if (filters.regularWaste) {
    query = query.eq("listing_environment.has_regular_waste", true);
  }
  if (filters.waterAvailable) {
    query = query.eq("listing_environment.has_water_available", true);
  }
  if (filters.lowFloodRisk) {
    query = query.eq("listing_environment.has_low_flood_risk", true);
  }

  const { data, error } = await query;
  if (error || !data) {
    return { items: [], hasMore: false };
  }

  let savedIds = new Set<string>();
  if (session.userId) {
    const { data: savedRows } = await supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", session.userId);
    savedIds = new Set(
      (savedRows ?? []).map((row) => (row as { listing_id: string }).listing_id)
    );
  }

  const rows = data as unknown as Array<
    Listing & {
      listing_environment: ListingEnvironment | ListingEnvironment[] | null;
      rooms: Array<{ id: string; kind: "flat" | "panorama" }> | null;
    }
  >;

  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);

  const items: ListingCardData[] = pageRows.map((row) => {
    const env = Array.isArray(row.listing_environment)
      ? (row.listing_environment[0] ?? null)
      : row.listing_environment;
    const roomList = row.rooms ?? [];
    return {
      id: row.id,
      title: row.title,
      property_type: row.property_type,
      rent_amount: row.rent_amount,
      rent_period: row.rent_period,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      furnished: row.furnished,
      state: row.state,
      lga: row.lga,
      area: row.area,
      cover_thumb_path: row.cover_thumb_path
        ? resolveListingPhotoUrl(row.cover_thumb_path)
        : null,
      cover_path: row.cover_path ? resolveListingPhotoUrl(row.cover_path) : null,
      status: row.status,
      published_at: row.published_at,
      environment: env,
      room_count: roomList.length,
      has_panorama: roomList.some((r) => r.kind === "panorama"),
      is_saved: savedIds.has(row.id),
    };
  });

  return { items, hasMore };
}

export async function getListingDetail(
  listingId: string
): Promise<ListingDetailData | null> {
  const session = await getCurrentSession();
  const isAdmin = Boolean(session.profile?.is_admin);

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const raw = store.listings[listingId];
    if (!raw) return null;
    if (raw.status !== "published" && raw.landlord_id !== session.userId && !isAdmin) {
      return null;
    }

    const { address_line, latitude, longitude, ...safeListing } = raw;
    const env = store.environments[listingId] ?? null;
    const rooms = Object.values(store.rooms)
      .filter((r) => r.listing_id === listingId)
      .sort((a, b) => a.sort_order - b.sort_order);

    const roomIdSet = new Set(rooms.map((r) => r.id));
    const roomLinks = Object.values(store.roomLinks).filter((link) =>
      roomIdSet.has(link.from_room_id)
    );

    const landlordRecord = store.users[raw.landlord_id]?.profile ?? null;
    const landlord: PublicProfile | null = landlordRecord
      ? {
          id: landlordRecord.id,
          full_name: landlordRecord.full_name,
          avatar_url: landlordRecord.avatar_url,
          role: landlordRecord.role,
          created_at: landlordRecord.created_at,
        }
      : null;

    const isSaved = session.userId
      ? (store.saved[session.userId] ?? []).includes(listingId)
      : false;

    const myViewingRequest = session.userId
      ? (Object.values(store.viewings).find(
          (v) => v.listing_id === listingId && v.renter_id === session.userId
        ) ?? null)
      : null;

    const canViewExactLocation =
      session.userId === raw.landlord_id ||
      isAdmin ||
      myViewingRequest?.status === "accepted";

    const exactLocation: ListingCoordinates | null =
      canViewExactLocation &&
      typeof latitude === "number" &&
      typeof longitude === "number"
        ? { latitude, longitude }
        : null;

    const floorPlan = store.floorPlans[listingId] ?? null;
    const depthMaps = Object.values(store.depthMaps).filter(
      (d) => d.listing_id === listingId
    );

    return {
      listing: safeListing,
      environment: env,
      rooms,
      roomLinks,
      landlord,
      isSaved,
      myViewingRequest,
      revealedAddress: canViewExactLocation ? (address_line ?? null) : null,
      exactLocation,
      canViewExactLocation,
      floorPlan,
      depthMaps,
      landlordPhone: session.userId ? (landlordRecord?.phone ?? null) : null,
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: listingRow, error } = await supabase
    .from("listings")
    .select(
      "id, landlord_id, title, description, property_type, rent_amount, rent_period, agency_fee, legal_fee, caution_fee, bedrooms, bathrooms, size_sqm, furnished, amenities, state, lga, area, approx_latitude, approx_longitude, matterport_url, cover_path, cover_thumb_path, status, created_at, published_at"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error || !listingRow) return null;
  const listing = listingRow as Omit<Listing, "address_line" | "latitude" | "longitude">;

  const [
    { data: envData },
    { data: roomRows },
    { data: landlordRow },
    { data: floorPlanRow },
    { data: depthMapRows },
  ] = await Promise.all([
    supabase
      .from("listing_environment")
      .select("*")
      .eq("listing_id", listingId)
      .maybeSingle(),
    supabase
      .from("rooms")
      .select("*")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("public_profiles")
      .select("*")
      .eq("id", listing.landlord_id)
      .maybeSingle(),
    supabase
      .from("listing_floor_plans")
      .select("*")
      .eq("listing_id", listingId)
      .maybeSingle(),
    supabase
      .from("listing_depth_maps")
      .select("*")
      .eq("listing_id", listingId),
  ]);

  const rooms = ((roomRows ?? []) as Room[]).map((r) => ({
    ...r,
    photo_path: resolveListingPhotoUrl(r.photo_path),
  }));
  const roomIds = rooms.map((r) => r.id);

  let roomLinks: RoomLink[] = [];
  if (roomIds.length > 0) {
    const { data: linkRows } = await supabase
      .from("room_links")
      .select("*")
      .in("from_room_id", roomIds);
    roomLinks = (linkRows ?? []) as RoomLink[];
  }

  let isSaved = false;
  let myViewingRequest: ViewingRequest | null = null;
  let revealedAddress: string | null = null;
  let exactLocation: ListingCoordinates | null = null;
  let landlordPhone: string | null = null;

  if (session.userId) {
    const [savedRes, viewingRes, addressRes, locationRes, contactRes] = await Promise.all([
      supabase
        .from("saved_listings")
        .select("listing_id")
        .eq("user_id", session.userId)
        .eq("listing_id", listingId)
        .maybeSingle(),
      supabase
        .from("viewing_requests")
        .select("*")
        .eq("listing_id", listingId)
        .eq("renter_id", session.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.rpc("get_listing_address", { p_listing_id: listingId }),
      supabase.rpc("get_listing_location", { p_listing_id: listingId }),
      supabase.rpc("get_landlord_contact", { p_listing_id: listingId }),
    ]);

    isSaved = Boolean(savedRes.data);
    myViewingRequest = (viewingRes.data as ViewingRequest | null) ?? null;
    revealedAddress = (addressRes.data as string | null) ?? null;
    const locRows = locationRes.data as ListingCoordinates[] | null;
    if (locRows && locRows.length > 0 && typeof locRows[0]?.latitude === "number" && typeof locRows[0]?.longitude === "number") {
      exactLocation = {
        latitude: locRows[0].latitude,
        longitude: locRows[0].longitude,
      };
    }
    const contactArr = contactRes.data as
      | Array<{ full_name: string | null; phone: string | null }>
      | null;
    landlordPhone = contactArr?.[0]?.phone ?? null;
  }

  const canViewExactLocation =
    session.userId === listing.landlord_id ||
    isAdmin ||
    myViewingRequest?.status === "accepted" ||
    Boolean(exactLocation);

  const depthMaps = ((depthMapRows ?? []) as DepthMap[]).map((dm) => ({
    ...dm,
    photo_path: resolveListingPhotoUrl(dm.photo_path),
    depth_path: resolveDepthMapUrl(dm.depth_path) ?? dm.depth_path,
  }));

  return {
    listing: {
      ...listing,
      cover_path: listing.cover_path ? resolveListingPhotoUrl(listing.cover_path) : null,
      cover_thumb_path: listing.cover_thumb_path
        ? resolveListingPhotoUrl(listing.cover_thumb_path)
        : null,
    },
    environment: (envData as ListingEnvironment | null) ?? null,
    rooms,
    roomLinks,
    landlord: (landlordRow as PublicProfile | null) ?? null,
    isSaved,
    myViewingRequest,
    revealedAddress,
    exactLocation,
    canViewExactLocation,
    floorPlan: (floorPlanRow as ListingFloorPlan | null) ?? null,
    depthMaps,
    landlordPhone,
  };
}

export async function getSavedListings(): Promise<ListingCardData[]> {
  const session = await getCurrentSession();
  if (!session.userId) return [];

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const ids = store.saved[session.userId] ?? [];
    return ids
      .map((id) => store.listings[id])
      .filter((l): l is Listing => Boolean(l && l.status === "published"))
      .map((listing) => {
        const listingRooms = Object.values(store.rooms).filter(
          (r) => r.listing_id === listing.id
        );
        return {
          id: listing.id,
          title: listing.title,
          property_type: listing.property_type,
          rent_amount: listing.rent_amount,
          rent_period: listing.rent_period,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          furnished: listing.furnished,
          state: listing.state,
          lga: listing.lga,
          area: listing.area,
          cover_thumb_path: listing.cover_thumb_path,
          cover_path: listing.cover_path,
          status: listing.status,
          published_at: listing.published_at,
          environment: store.environments[listing.id] ?? null,
          room_count: listingRooms.length,
          has_panorama: listingRooms.some((r) => r.kind === "panorama"),
          is_saved: true,
        };
      });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("saved_listings")
    .select(
      "listing_id, listings!inner(id, title, property_type, rent_amount, rent_period, bedrooms, bathrooms, furnished, state, lga, area, cover_thumb_path, cover_path, status, published_at, listing_environment(*), rooms(id, kind))"
    )
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  return data
    .map((row): ListingCardData | null => {
      const l = (
        row as unknown as {
          listings: Listing & {
            listing_environment: ListingEnvironment | ListingEnvironment[] | null;
            rooms: Array<{ id: string; kind: "flat" | "panorama" }> | null;
          };
        }
      ).listings;
      if (!l || l.status !== "published") return null;
      const env = Array.isArray(l.listing_environment)
        ? (l.listing_environment[0] ?? null)
        : l.listing_environment;
      const roomList = l.rooms ?? [];
      return {
        id: l.id,
        title: l.title,
        property_type: l.property_type,
        rent_amount: l.rent_amount,
        rent_period: l.rent_period,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        furnished: l.furnished,
        state: l.state,
        lga: l.lga,
        area: l.area,
        cover_thumb_path: l.cover_thumb_path
          ? resolveListingPhotoUrl(l.cover_thumb_path)
          : null,
        cover_path: l.cover_path ? resolveListingPhotoUrl(l.cover_path) : null,
        status: l.status,
        published_at: l.published_at,
        environment: env,
        room_count: roomList.length,
        has_panorama: roomList.some((r) => r.kind === "panorama"),
        is_saved: true,
      };
    })
    .filter((item): item is ListingCardData => item !== null);
}

export interface RenterViewingItem {
  request: ViewingRequest;
  listing: Pick<
    Listing,
    | "id"
    | "title"
    | "area"
    | "lga"
    | "state"
    | "rent_amount"
    | "rent_period"
    | "cover_thumb_path"
  >;
  landlordName: string | null;
  landlordPhone: string | null;
  revealedAddress: string | null;
}

export async function getRenterViewings(): Promise<RenterViewingItem[]> {
  const session = await getCurrentSession();
  if (!session.userId) return [];

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    return Object.values(store.viewings)
      .filter((v) => v.renter_id === session.userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((req) => {
        const listing = store.listings[req.listing_id];
        if (!listing) return null;
        const landlord = store.users[listing.landlord_id]?.profile ?? null;
        return {
          request: req,
          listing: {
            id: listing.id,
            title: listing.title,
            area: listing.area,
            lga: listing.lga,
            state: listing.state,
            rent_amount: listing.rent_amount,
            rent_period: listing.rent_period,
            cover_thumb_path: listing.cover_thumb_path,
          },
          landlordName: landlord?.full_name ?? null,
          landlordPhone: landlord?.phone ?? null,
          revealedAddress:
            req.status === "accepted" ? (listing.address_line ?? null) : null,
        };
      })
      .filter((item): item is RenterViewingItem => item !== null);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("viewing_requests")
    .select(
      "*, listings!inner(id, title, area, lga, state, rent_amount, rent_period, cover_thumb_path, landlord_id)"
    )
    .eq("renter_id", session.userId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  const items = await Promise.all(
    data.map(async (row) => {
      const typed = row as unknown as ViewingRequest & {
        listings: Pick<
          Listing,
          | "id"
          | "title"
          | "area"
          | "lga"
          | "state"
          | "rent_amount"
          | "rent_period"
          | "cover_thumb_path"
          | "landlord_id"
        >;
      };
      const [contactRes, addrRes] = await Promise.all([
        supabase.rpc("get_landlord_contact", { p_listing_id: typed.listing_id }),
        typed.status === "accepted"
          ? supabase.rpc("get_listing_address", { p_listing_id: typed.listing_id })
          : Promise.resolve({ data: null }),
      ]);
      const contact = (
        contactRes.data as Array<{ full_name: string | null; phone: string | null }> | null
      )?.[0];

      return {
        request: {
          id: typed.id,
          listing_id: typed.listing_id,
          renter_id: typed.renter_id,
          preferred_date: typed.preferred_date,
          time_window: typed.time_window,
          note: typed.note,
          status: typed.status,
          created_at: typed.created_at,
        },
        listing: {
          id: typed.listings.id,
          title: typed.listings.title,
          area: typed.listings.area,
          lga: typed.listings.lga,
          state: typed.listings.state,
          rent_amount: typed.listings.rent_amount,
          rent_period: typed.listings.rent_period,
          cover_thumb_path: typed.listings.cover_thumb_path
            ? resolveListingPhotoUrl(typed.listings.cover_thumb_path)
            : null,
        },
        landlordName: contact?.full_name ?? null,
        landlordPhone: contact?.phone ?? null,
        revealedAddress: (addrRes.data as string | null) ?? null,
      };
    })
  );

  return items;
}

export async function getLandlordListings(): Promise<ListingCardData[]> {
  const session = await getCurrentSession();
  if (!session.userId) return [];

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    return Object.values(store.listings)
      .filter((l) => l.landlord_id === session.userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((listing) => {
        const listingRooms = Object.values(store.rooms).filter(
          (r) => r.listing_id === listing.id
        );
        return {
          id: listing.id,
          title: listing.title,
          property_type: listing.property_type,
          rent_amount: listing.rent_amount,
          rent_period: listing.rent_period,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          furnished: listing.furnished,
          state: listing.state,
          lga: listing.lga,
          area: listing.area,
          cover_thumb_path: listing.cover_thumb_path,
          cover_path: listing.cover_path,
          status: listing.status,
          published_at: listing.published_at,
          environment: store.environments[listing.id] ?? null,
          room_count: listingRooms.length,
          has_panorama: listingRooms.some((r) => r.kind === "panorama"),
        };
      });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("listings")
    .select(
      "id, title, property_type, rent_amount, rent_period, bedrooms, bathrooms, furnished, state, lga, area, cover_thumb_path, cover_path, status, published_at, listing_environment(*), rooms(id, kind)"
    )
    .eq("landlord_id", session.userId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  return (
    data as unknown as Array<
      Listing & {
        listing_environment: ListingEnvironment | ListingEnvironment[] | null;
        rooms: Array<{ id: string; kind: "flat" | "panorama" }> | null;
      }
    >
  ).map((row) => {
    const env = Array.isArray(row.listing_environment)
      ? (row.listing_environment[0] ?? null)
      : row.listing_environment;
    const roomList = row.rooms ?? [];
    return {
      id: row.id,
      title: row.title,
      property_type: row.property_type,
      rent_amount: row.rent_amount,
      rent_period: row.rent_period,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      furnished: row.furnished,
      state: row.state,
      lga: row.lga,
      area: row.area,
      cover_thumb_path: row.cover_thumb_path
        ? resolveListingPhotoUrl(row.cover_thumb_path)
        : null,
      cover_path: row.cover_path ? resolveListingPhotoUrl(row.cover_path) : null,
      status: row.status,
      published_at: row.published_at,
      environment: env,
      room_count: roomList.length,
      has_panorama: roomList.some((r) => r.kind === "panorama"),
    };
  });
}

export interface LandlordRequestItem {
  request: ViewingRequest;
  listingId: string;
  listingTitle: string;
  listingArea: string;
  renterName: string | null;
}

export async function getLandlordViewingRequests(): Promise<LandlordRequestItem[]> {
  const session = await getCurrentSession();
  if (!session.userId) return [];

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const myListingIds = new Set(
      Object.values(store.listings)
        .filter((l) => l.landlord_id === session.userId)
        .map((l) => l.id)
    );

    return Object.values(store.viewings)
      .filter((v) => myListingIds.has(v.listing_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((req) => {
        const listing = store.listings[req.listing_id];
        const renter = store.users[req.renter_id]?.profile ?? null;
        return {
          request: req,
          listingId: listing.id,
          listingTitle: listing.title,
          listingArea: `${listing.area}, ${listing.state}`,
          renterName: renter?.full_name ?? "Interested renter",
        };
      });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("viewing_requests")
    .select("*, listings!inner(id, title, area, state, landlord_id)")
    .eq("listings.landlord_id", session.userId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  const rows = data as unknown as Array<
    ViewingRequest & {
      listings: { id: string; title: string; area: string; state: string };
    }
  >;

  const renterIds = Array.from(new Set(rows.map((r) => r.renter_id)));
  const profileMap = new Map<string, string | null>();
  if (renterIds.length > 0) {
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, full_name")
      .in("id", renterIds);
    for (const p of (profiles ?? []) as Array<{ id: string; full_name: string | null }>) {
      profileMap.set(p.id, p.full_name);
    }
  }

  return rows.map((row) => ({
    request: {
      id: row.id,
      listing_id: row.listing_id,
      renter_id: row.renter_id,
      preferred_date: row.preferred_date,
      time_window: row.time_window,
      note: row.note,
      status: row.status,
      created_at: row.created_at,
    },
    listingId: row.listings.id,
    listingTitle: row.listings.title,
    listingArea: `${row.listings.area}, ${row.listings.state}`,
    renterName: profileMap.get(row.renter_id) ?? "Interested renter",
  }));
}
