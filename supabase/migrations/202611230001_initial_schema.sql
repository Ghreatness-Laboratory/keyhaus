-- Keyhaus initial database schema, RLS policies, functions, triggers, and storage policies
-- Designed for Supabase Free Tier (Postgres + Auth + Storage)

create extension if not exists "pgcrypto";

-- 1. Enums
create type public.user_role as enum ('renter', 'landlord');
create type public.property_type as enum (
  'self_contained',
  'room',
  'flat',
  'bungalow',
  'duplex',
  'boys_quarters'
);
create type public.rent_period as enum ('year', 'month');
create type public.listing_status as enum ('draft', 'published', 'rented', 'archived');
create type public.power_grid_rating as enum ('steady', 'fair', 'poor', 'none');
create type public.road_surface_type as enum ('tarred', 'partly_tarred', 'untarred');
create type public.road_condition_rating as enum ('good', 'fair', 'bad');
create type public.flooding_rating as enum ('none', 'sometimes', 'often');
create type public.waste_rating as enum ('regular', 'irregular', 'none');
create type public.water_source_type as enum ('running_water', 'borehole', 'vendor_well', 'none');
create type public.quality_rating as enum ('good', 'fair', 'poor');
create type public.room_kind as enum ('flat', 'panorama');
create type public.viewing_status as enum ('pending', 'accepted', 'declined');

-- 2. Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint chk_profiles_ng_phone check (
    phone is null or phone ~ '^\+234[789][01]\d{8}$'
  )
);

-- Public safe profile view (never exposes phone)
create or replace view public.public_profiles
with (security_invoker = false) as
select
  id,
  full_name,
  avatar_url,
  role,
  created_at
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- Trigger to create a profile row on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Listings
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '' check (char_length(description) <= 1000),
  property_type public.property_type not null,
  rent_amount integer not null check (rent_amount > 0),
  rent_period public.rent_period not null default 'year',
  agency_fee integer check (agency_fee is null or agency_fee >= 0),
  legal_fee integer check (legal_fee is null or legal_fee >= 0),
  caution_fee integer check (caution_fee is null or caution_fee >= 0),
  bedrooms integer not null default 1 check (bedrooms >= 0),
  bathrooms integer not null default 1 check (bathrooms >= 0),
  furnished boolean not null default false,
  amenities text[] not null default '{}',
  state text not null,
  lga text not null,
  area text not null,
  address_line text not null default '',
  cover_path text,
  cover_thumb_path text,
  status public.listing_status not null default 'draft',
  created_at timestamptz not null default now(),
  published_at timestamptz
);

-- Column-level privilege protection: hide address_line from direct table selects by anon/authenticated.
-- Owners and accepted renters obtain address_line strictly via public.get_listing_address(listing_id).
revoke select on public.listings from anon, authenticated;
grant select (
  id,
  landlord_id,
  title,
  description,
  property_type,
  rent_amount,
  rent_period,
  agency_fee,
  legal_fee,
  caution_fee,
  bedrooms,
  bathrooms,
  furnished,
  amenities,
  state,
  lga,
  area,
  cover_path,
  cover_thumb_path,
  status,
  created_at,
  published_at
) on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;

create index idx_listings_state_lga on public.listings (state, lga);
create index idx_listings_status_published on public.listings (status, published_at desc);
create index idx_listings_rent_amount on public.listings (rent_amount);
create index idx_listings_amenities_gin on public.listings using gin (amenities);

-- 4. Listing Environment (Honest Neighborhood Report)
create table public.listing_environment (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  power_grid public.power_grid_rating not null,
  grid_hours_per_day integer check (grid_hours_per_day is null or (grid_hours_per_day >= 0 and grid_hours_per_day <= 24)),
  power_backup text[] not null default '{}',
  road_surface public.road_surface_type not null,
  road_condition public.road_condition_rating not null,
  flooding public.flooding_rating not null,
  waste public.waste_rating not null,
  water public.water_source_type not null,
  security public.quality_rating not null,
  network public.quality_rating not null,
  note text check (note is null or char_length(note) <= 300),
  has_tarred_road boolean generated always as (road_surface = 'tarred') stored,
  has_steady_electricity boolean generated always as (power_grid = 'steady') stored,
  has_regular_waste boolean generated always as (waste = 'regular') stored,
  has_water_available boolean generated always as (water <> 'none') stored,
  has_low_flood_risk boolean generated always as (flooding = 'none') stored
);

create index idx_env_tarred_road on public.listing_environment (has_tarred_road) where has_tarred_road = true;
create index idx_env_steady_power on public.listing_environment (has_steady_electricity) where has_steady_electricity = true;
create index idx_env_regular_waste on public.listing_environment (has_regular_waste) where has_regular_waste = true;
create index idx_env_water on public.listing_environment (has_water_available) where has_water_available = true;
create index idx_env_low_flood on public.listing_environment (has_low_flood_risk) where has_low_flood_risk = true;

-- 5. Rooms & Room Links (Tour)
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  name text not null,
  kind public.room_kind not null default 'flat',
  photo_path text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  sort_order integer not null default 0
);

create index idx_rooms_listing_order on public.rooms (listing_id, sort_order);

create or replace function public.enforce_max_rooms_per_listing()
returns trigger
language plpgsql
as $$
declare
  room_count integer;
begin
  select count(*) into room_count
  from public.rooms
  where listing_id = new.listing_id;

  if room_count >= 12 then
    raise exception 'A listing can have at most 12 rooms.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_max_rooms on public.rooms;
create trigger trg_enforce_max_rooms
  before insert on public.rooms
  for each row execute function public.enforce_max_rooms_per_listing();

create table public.room_links (
  id uuid primary key default gen_random_uuid(),
  from_room_id uuid not null references public.rooms(id) on delete cascade,
  to_room_id uuid not null references public.rooms(id) on delete cascade,
  yaw double precision,
  pitch double precision,
  x_pct double precision check (x_pct is null or (x_pct >= 0 and x_pct <= 100)),
  y_pct double precision check (y_pct is null or (y_pct >= 0 and y_pct <= 100)),
  label text not null,
  constraint chk_room_links_different check (from_room_id <> to_room_id)
);

create index idx_room_links_from on public.room_links (from_room_id);

-- 6. Saved Listings
create table public.saved_listings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- 7. Viewing Requests
create table public.viewing_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  renter_id uuid not null references public.profiles(id) on delete cascade,
  preferred_date date not null,
  time_window text not null,
  note text check (note is null or char_length(note) <= 300),
  status public.viewing_status not null default 'pending',
  created_at timestamptz not null default now()
);

create unique index idx_one_open_viewing_per_listing
  on public.viewing_requests (listing_id, renter_id)
  where status = 'pending';

create index idx_viewing_requests_listing on public.viewing_requests (listing_id, created_at desc);
create index idx_viewing_requests_renter on public.viewing_requests (renter_id, created_at desc);

-- 8. Reports (Inaccurate Info)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 5 and 500),
  created_at timestamptz not null default now()
);

-- 9. Phase 2 Schema (Designed now, UI built in Phase 2): Renter Ground Reports
create table public.ground_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  renter_id uuid not null references public.profiles(id) on delete cascade,
  viewing_request_id uuid not null references public.viewing_requests(id) on delete cascade,
  power_grid public.power_grid_rating not null,
  road_surface public.road_surface_type not null,
  road_condition public.road_condition_rating not null,
  flooding public.flooding_rating not null,
  waste public.waste_rating not null,
  water public.water_source_type not null,
  security public.quality_rating not null,
  network public.quality_rating not null,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (listing_id, renter_id)
);

-- 10. Publish Guard Trigger
create or replace function public.publish_listing_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_name text;
  v_env_exists boolean;
  v_room_count integer;
  v_published_count integer;
begin
  if new.status = 'published' then
    if char_length(trim(coalesce(new.title, ''))) < 5
      or char_length(trim(coalesce(new.description, ''))) < 20
      or char_length(trim(coalesce(new.state, ''))) = 0
      or char_length(trim(coalesce(new.lga, ''))) = 0
      or char_length(trim(coalesce(new.area, ''))) = 0
      or char_length(trim(coalesce(new.address_line, ''))) < 5
      or coalesce(new.rent_amount, 0) <= 0 then
      raise exception 'Listing is missing required details before publishing.';
    end if;

    select full_name, phone into v_name, v_phone
    from public.profiles
    where id = new.landlord_id;

    if char_length(trim(coalesce(v_name, ''))) < 2
      or v_phone is null
      or v_phone !~ '^\+234[789][01]\d{8}$' then
      raise exception 'Landlord profile must include a name and valid Nigerian phone number before publishing.';
    end if;

    select exists(
      select 1 from public.listing_environment where listing_id = new.id
    ) into v_env_exists;

    if not v_env_exists then
      raise exception 'Complete the neighborhood and environment report before publishing.';
    end if;

    select count(*) into v_room_count
    from public.rooms
    where listing_id = new.id;

    if v_room_count < 1 then
      raise exception 'Add at least one room photo before publishing.';
    end if;

    select count(*) into v_published_count
    from public.listings
    where landlord_id = new.landlord_id
      and status = 'published'
      and id <> new.id;

    if v_published_count >= 10 then
      raise exception 'You have reached the maximum of 10 published listings.';
    end if;

    new.published_at := coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_publish_listing_guard on public.listings;
create trigger trg_publish_listing_guard
  before insert or update on public.listings
  for each row execute function public.publish_listing_guard();

-- 11. Security Definer RPC Functions
create or replace function public.get_landlord_contact(p_listing_id uuid)
returns table (full_name text, phone text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required to view landlord contact.';
  end if;

  return query
  select p.full_name, p.phone
  from public.listings l
  join public.profiles p on p.id = l.landlord_id
  where l.id = p_listing_id
    and (l.status = 'published' or l.landlord_id = auth.uid());
end;
$$;

revoke all on function public.get_landlord_contact(uuid) from public;
grant execute on function public.get_landlord_contact(uuid) to authenticated;

create or replace function public.get_listing_address(p_listing_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_address text;
begin
  if auth.uid() is null then
    return null;
  end if;

  select l.address_line into v_address
  from public.listings l
  where l.id = p_listing_id
    and (
      l.landlord_id = auth.uid()
      or exists (
        select 1
        from public.viewing_requests vr
        where vr.listing_id = l.id
          and vr.renter_id = auth.uid()
          and vr.status = 'accepted'
      )
    );

  return v_address;
end;
$$;

revoke all on function public.get_listing_address(uuid) from public;
grant execute on function public.get_listing_address(uuid) to authenticated;

-- 12. Enable Row Level Security on every table (deny by default)
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_environment enable row level security;
alter table public.rooms enable row level security;
alter table public.room_links enable row level security;
alter table public.saved_listings enable row level security;
alter table public.viewing_requests enable row level security;
alter table public.reports enable row level security;
alter table public.ground_reports enable row level security;

-- Profiles policies
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and (role is null or role in ('renter', 'landlord')));

-- Listings policies
create policy "listings_select_published_or_owner"
  on public.listings for select
  to anon, authenticated
  using (status = 'published' or landlord_id = auth.uid());

create policy "listings_insert_owner"
  on public.listings for insert
  to authenticated
  with check (landlord_id = auth.uid());

create policy "listings_update_owner"
  on public.listings for update
  to authenticated
  using (landlord_id = auth.uid())
  with check (landlord_id = auth.uid());

create policy "listings_delete_owner"
  on public.listings for delete
  to authenticated
  using (landlord_id = auth.uid());

-- Listing environment policies
create policy "env_select_published_or_owner"
  on public.listing_environment for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'published' or l.landlord_id = auth.uid())
    )
  );

create policy "env_write_owner"
  on public.listing_environment for all
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.landlord_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.landlord_id = auth.uid()
    )
  );

-- Rooms policies
create policy "rooms_select_published_or_owner"
  on public.rooms for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'published' or l.landlord_id = auth.uid())
    )
  );

create policy "rooms_write_owner"
  on public.rooms for all
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.landlord_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.landlord_id = auth.uid()
    )
  );

-- Room links policies
create policy "room_links_select_published_or_owner"
  on public.room_links for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.rooms r
      join public.listings l on l.id = r.listing_id
      where r.id = from_room_id
        and (l.status = 'published' or l.landlord_id = auth.uid())
    )
  );

create policy "room_links_write_owner"
  on public.room_links for all
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      join public.listings l on l.id = r.listing_id
      where r.id = from_room_id and l.landlord_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rooms r
      join public.listings l on l.id = r.listing_id
      where r.id = from_room_id and l.landlord_id = auth.uid()
    )
  );

-- Saved listings policies
create policy "saved_manage_own"
  on public.saved_listings for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Viewing requests policies
create policy "viewing_renter_insert_own"
  on public.viewing_requests for insert
  to authenticated
  with check (
    renter_id = auth.uid()
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status = 'published' and l.landlord_id <> auth.uid()
    )
  );

create policy "viewing_select_renter_or_landlord"
  on public.viewing_requests for select
  to authenticated
  using (
    renter_id = auth.uid()
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.landlord_id = auth.uid()
    )
  );

create policy "viewing_landlord_update_status"
  on public.viewing_requests for update
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.landlord_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.landlord_id = auth.uid()
    )
  );

-- Reports policies: any signed-in user can insert; nobody can read via anon/authenticated
create policy "reports_insert_authenticated"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- Phase 2 Ground Reports RLS
create policy "ground_reports_insert_accepted_renter"
  on public.ground_reports for insert
  to authenticated
  with check (
    renter_id = auth.uid()
    and exists (
      select 1 from public.viewing_requests vr
      where vr.id = viewing_request_id
        and vr.listing_id = listing_id
        and vr.renter_id = auth.uid()
        and vr.status = 'accepted'
    )
  );

create policy "ground_reports_select_when_three_exist"
  on public.ground_reports for select
  to anon, authenticated
  using (
    (select count(*) from public.ground_reports gr where gr.listing_id = listing_id) >= 3
  );

-- 13. Storage Bucket & Folder-Scoped Policies
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,
  1048576,
  array['image/webp', 'image/jpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "listing_photos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'listing-photos');

create policy "listing_photos_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing_photos_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing_photos_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
