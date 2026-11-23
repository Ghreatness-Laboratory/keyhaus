-- Keyhaus additive migration: Viewing Modes (Area View, Street View, 2D Plan, 3D View),
-- Admin support, Privacy-preserving coordinates, Size (sqm), and Depth Maps.

-- 1. Admin flag on profiles with self-escalation protection
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Prevent authenticated users from modifying is_admin via client updates
revoke update (is_admin) on public.profiles from authenticated;

create or replace function public.prevent_profile_admin_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
       and current_user not in ('postgres', 'supabase_admin') then
      raise exception 'Only administrators or service role can modify is_admin.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_profile_admin_escalation on public.profiles;
create trigger trg_prevent_profile_admin_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_admin_escalation();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2. Extend public.listings additively
-- Exact coordinates (latitude, longitude) are NOT in the anon/authenticated GRANT SELECT!
-- Approximate coordinates (approx_latitude, approx_longitude) are public for Area View circles.
alter table public.listings
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists approx_latitude double precision,
  add column if not exists approx_longitude double precision,
  add column if not exists matterport_url text,
  add column if not exists size_sqm integer;

alter table public.listings
  drop constraint if exists chk_listings_size_sqm,
  add constraint chk_listings_size_sqm check (size_sqm is null or (size_sqm > 0 and size_sqm <= 50000));

alter table public.listings
  drop constraint if exists chk_listings_matterport_url,
  add constraint chk_listings_matterport_url check (
    matterport_url is null or matterport_url ~ '^https://(my\.)?matterport\.com/'
  );

-- Explicitly grant SELECT ONLY on public/safe columns (never latitude or longitude)
grant select (
  approx_latitude,
  approx_longitude,
  matterport_url,
  size_sqm
) on public.listings to anon, authenticated;

-- Allow admins to manage listings & child tables
drop policy if exists "listings_select_published_or_owner" on public.listings;
create policy "listings_select_published_or_owner"
  on public.listings for select
  to anon, authenticated
  using (status = 'published' or landlord_id = auth.uid() or public.is_admin());

drop policy if exists "listings_update_owner" on public.listings;
create policy "listings_update_owner"
  on public.listings for update
  to authenticated
  using (landlord_id = auth.uid() or public.is_admin())
  with check (landlord_id = auth.uid() or public.is_admin());

-- 3. Privacy-gated RPC for exact Street View coordinates
create or replace function public.get_listing_location(p_listing_id uuid)
returns table (latitude double precision, longitude double precision)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  return query
  select l.latitude, l.longitude
  from public.listings l
  where l.id = p_listing_id
    and l.latitude is not null
    and l.longitude is not null
    and (
      l.landlord_id = auth.uid()
      or public.is_admin()
      or exists (
        select 1
        from public.viewing_requests vr
        where vr.listing_id = l.id
          and vr.renter_id = auth.uid()
          and vr.status = 'accepted'
      )
    );
end;
$$;

revoke all on function public.get_listing_location(uuid) from public;
grant execute on function public.get_listing_location(uuid) to authenticated;

-- 4. Floor Plans table (2D Plan)
create table if not exists public.listing_floor_plans (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references public.listings(id) on delete cascade,
  plan jsonb not null,
  model text,
  generated_at timestamptz not null default now(),
  is_illustrative boolean not null default true
);

alter table public.listing_floor_plans enable row level security;

create policy "floor_plans_select_published_or_owner"
  on public.listing_floor_plans for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'published' or l.landlord_id = auth.uid() or public.is_admin())
    )
  );

create policy "floor_plans_insert_owner_or_admin"
  on public.listing_floor_plans for insert
  to authenticated
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.landlord_id = auth.uid() or public.is_admin())
    )
  );

create policy "floor_plans_update_owner_or_admin"
  on public.listing_floor_plans for update
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.landlord_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.landlord_id = auth.uid() or public.is_admin())
    )
  );

create policy "floor_plans_delete_admin"
  on public.listing_floor_plans for delete
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.landlord_id = auth.uid() or public.is_admin())
    )
  );

-- 5. Depth Maps table (Pseudo-3D 2.5D parallax viewer)
create table if not exists public.listing_depth_maps (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  photo_path text not null,
  depth_path text not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  created_at timestamptz not null default now(),
  unique (listing_id, photo_path)
);

create index if not exists idx_depth_maps_listing on public.listing_depth_maps (listing_id);

alter table public.listing_depth_maps enable row level security;

create policy "depth_maps_select_published_or_owner"
  on public.listing_depth_maps for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'published' or l.landlord_id = auth.uid() or public.is_admin())
    )
  );

create policy "depth_maps_write_owner_or_admin"
  on public.listing_depth_maps for all
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.landlord_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.landlord_id = auth.uid() or public.is_admin())
    )
  );

-- 6. Storage Bucket for small WebP depth maps (skip panoramas bucket; reuse listing-photos + Photo Sphere Viewer)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'depth-maps',
  'depth-maps',
  true,
  524288,
  array['image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "depth_maps_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'depth-maps');

create policy "depth_maps_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'depth-maps'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "depth_maps_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'depth-maps'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  )
  with check (
    bucket_id = 'depth-maps'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "depth_maps_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'depth-maps'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
