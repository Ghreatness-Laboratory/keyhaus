-- Keyhaus Demo Seed Data
-- 10 clearly fake demo listings across Lagos, Abuja (FCT), Rivers, Oyo, and Kano.
-- Uses deterministic UUIDs so seed.sql can be re-run cleanly in local/dev environments.

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, aud, role)
values
  ('11111111-1111-4111-8111-111111111101', 'demo-landlord-lagos@example.test', crypt('DemoPass123!', gen_salt('bf')), now(), '{"full_name": "Chinedu Okafor (Demo)"}', now(), now(), 'authenticated', 'authenticated'),
  ('11111111-1111-4111-8111-111111111102', 'demo-landlord-abuja@example.test', crypt('DemoPass123!', gen_salt('bf')), now(), '{"full_name": "Amina Bello (Demo)"}', now(), now(), 'authenticated', 'authenticated')
on conflict (id) do nothing;

update public.profiles
set full_name = 'Chinedu Okafor (Demo)', phone = '+2348030000001', role = 'landlord'
where id = '11111111-1111-4111-8111-111111111101';

update public.profiles
set full_name = 'Amina Bello (Demo)', phone = '+2348090000002', role = 'landlord'
where id = '11111111-1111-4111-8111-111111111102';

-- Insert listings as draft first, then insert environment & rooms, then publish so publish_listing_guard passes.
insert into public.listings (
  id, landlord_id, title, description, property_type, rent_amount, rent_period,
  agency_fee, legal_fee, caution_fee, bedrooms, bathrooms, furnished, amenities,
  state, lga, area, address_line, cover_path, cover_thumb_path, status
) values
  (
    '22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111101',
    'Sunlit 2-Bedroom Flat in Ikeja GRA',
    'Clean 2-bedroom upstairs flat with POP ceiling, fitted kitchen cabinets, and reliable borehole water. Quiet residential close.',
    'flat', 2800000, 'year', 280000, 140000, 200000, 2, 2, false,
    array['prepaid_meter', 'borehole', 'fenced_gated', 'parking', 'pop_ceiling', 'tiled_floor'],
    'Lagos', 'Ikeja', 'Ikeja GRA', 'Plot 01 Demo Lane, Sample Close (Fake Address)',
    '/images/demo/living-lagos.webp', '/images/demo/living-lagos-thumb.webp', 'draft'
  ),
  (
    '22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111101',
    'Serviced Self-Contained Studio in Yaba',
    'Compact self-contained studio close to UNILAG and Herbert Macaulay Way. Ideal for young professionals.',
    'self_contained', 950000, 'year', 95000, 50000, 100000, 1, 1, true,
    array['prepaid_meter', 'borehole', 'fenced_gated', 'tiled_floor'],
    'Lagos', 'Lagos Mainland', 'Yaba', 'No. 02 Demo Street, Sample Quarters (Fake Address)',
    '/images/demo/bedroom-lekki.webp', '/images/demo/bedroom-lekki-thumb.webp', 'draft'
  ),
  (
    '22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111101',
    '3-Bedroom Terrace Flat in Lekki Phase 1',
    'Spacious flat with cross-ventilation, balcony, and steady compound security. Note: street drainage floods after heavy rain.',
    'flat', 4500000, 'year', 450000, 225000, 300000, 3, 3, false,
    array['prepaid_meter', 'borehole', 'fenced_gated', 'parking', 'pop_ceiling', 'tiled_floor', 'security_post'],
    'Lagos', 'Eti-Osa', 'Lekki Phase 1', 'Block 03 Sample Crescent (Fake Address)',
    '/images/demo/panorama-living.webp', '/images/demo/panorama-living-thumb.webp', 'draft'
  ),
  (
    '22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111102',
    '4-Bedroom Semi-Detached Duplex in Wuse II',
    'Well-maintained family duplex with interlocking paved compound, dedicated prepaid meter, and two-car carport.',
    'duplex', 6500000, 'year', 650000, 325000, 500000, 4, 4, false,
    array['prepaid_meter', 'borehole', 'fenced_gated', 'parking', 'pop_ceiling', 'tiled_floor', 'security_post'],
    'FCT', 'Abuja Municipal', 'Wuse II', 'House 04 Example Avenue (Fake Address)',
    '/images/demo/duplex-wuse.webp', '/images/demo/duplex-wuse-thumb.webp', 'draft'
  ),
  (
    '22222222-2222-4222-8222-222222222205', '11111111-1111-4111-8111-111111111102',
    '2-Bedroom Bungalow in Gwarinpa',
    'Quiet standalone bungalow in a gated estate with steady water and good mobile reception.',
    'bungalow', 2400000, 'year', 240000, 120000, 150000, 2, 2, false,
    array['prepaid_meter', 'borehole', 'fenced_gated', 'parking', 'tiled_floor'],
    'FCT', 'Abuja Municipal', 'Gwarinpa', 'Close 05 Demo Estate (Fake Address)',
    '/images/demo/kitchen-abuja.webp', '/images/demo/kitchen-abuja-thumb.webp', 'draft'
  ),
  (
    '22222222-2222-4222-8222-222222222206', '11111111-1111-4111-8111-111111111102',
    'Affordable Boys Quarters Room in Lugbe',
    'Neat private room and bath in a shared compound. Honest note: access road is untarred and grid power is limited.',
    'boys_quarters', 450000, 'year', 45000, 25000, 50000, 1, 1, false,
    array['fenced_gated', 'tiled_floor'],
    'FCT', 'Abuja Municipal', 'Lugbe', 'Plot 06 Sample Road (Fake Address)',
    '/images/demo/bedroom-lekki.webp', '/images/demo/bedroom-lekki-thumb.webp', 'draft'
  ),
  (
    '22222222-2222-4222-8222-222222222207', '11111111-1111-4111-8111-111111111101',
    '2-Bedroom Flat in New GRA Port Harcourt',
    'Bright apartment off Tombia Extension with POP ceiling, borehole water, and tarred estate street.',
    'flat', 2200000, 'year', 220000, 110000, 150000, 2, 2, false,
    array['prepaid_meter', 'borehole', 'fenced_gated', 'parking', 'pop_ceiling', 'tiled_floor'],
    'Rivers', 'Port Harcourt', 'New GRA', 'Street 07 Sample Layout (Fake Address)',
    '/images/demo/living-lagos.webp', '/images/demo/living-lagos-thumb.webp', 'draft'
  ),
  (
    '22222222-2222-4222-8222-222222222208', '11111111-1111-4111-8111-111111111101',
    'Single Room in Choba Near Uniport',
    'Simple clean room with shared compound water tap and security gate. Monthly payment accepted.',
    'room', 30000, 'month', 30000, 0, 30000, 1, 1, false,
    array['fenced_gated', 'borehole'],
    'Rivers', 'Obio/Akpor', 'Choba', 'Lane 08 Example Compound (Fake Address)',
    '/images/demo/kitchen-abuja.webp', '/images/demo/kitchen-abuja-thumb.webp', 'draft'
  ),
  (
    '22222222-2222-4222-8222-222222222209', '11111111-1111-4111-8111-111111111102',
    '3-Bedroom Bungalow in Bodija Ibadan',
    'Peaceful family home in Old Bodija with large compound, solar inverter wiring, and tarred street access.',
    'bungalow', 1600000, 'year', 160000, 80000, 100000, 3, 2, false,
    array['prepaid_meter', 'borehole', 'fenced_gated', 'parking', 'tiled_floor'],
    'Oyo', 'Ibadan North', 'Old Bodija', 'Road 09 Demo Crescent (Fake Address)',
    '/images/demo/duplex-wuse.webp', '/images/demo/duplex-wuse-thumb.webp', 'draft'
  ),
  (
    '22222222-2222-4222-8222-222222222210', '11111111-1111-4111-8111-111111111102',
    '2-Bedroom Flat in Nassarawa GRA Kano',
    'Spacious ground-floor flat with wide compound, tiled rooms, and regular municipal waste pickup.',
    'flat', 1400000, 'year', 140000, 70000, 100000, 2, 2, false,
    array['prepaid_meter', 'borehole', 'fenced_gated', 'parking', 'tiled_floor', 'security_post'],
    'Kano', 'Nasarawa', 'Nassarawa GRA', 'Avenue 10 Sample Quarters (Fake Address)',
    '/images/demo/panorama-living.webp', '/images/demo/panorama-living-thumb.webp', 'draft'
  )
on conflict (id) do nothing;

insert into public.listing_environment (
  listing_id, power_grid, grid_hours_per_day, power_backup, road_surface, road_condition,
  flooding, waste, water, security, network, note
) values
  ('22222222-2222-4222-8222-222222222201', 'steady', 16, array['inverter', 'generator'], 'tarred', 'good', 'none', 'regular', 'borehole', 'good', 'good', 'Band A feeder line; LAWMA picks up every Tuesday morning.'),
  ('22222222-2222-4222-8222-222222222202', 'fair', 10, array['generator'], 'tarred', 'fair', 'sometimes', 'regular', 'borehole', 'good', 'good', 'Slight puddle near junction after heavy storms, clears within 2 hours.'),
  ('22222222-2222-4222-8222-222222222203', 'steady', 18, array['solar', 'inverter'], 'tarred', 'fair', 'often', 'regular', 'running_water', 'good', 'good', 'Compound is raised, but approach road floods in July and September.'),
  ('22222222-2222-4222-8222-222222222204', 'steady', 19, array['solar', 'generator'], 'tarred', 'good', 'none', 'regular', 'running_water', 'good', 'good', 'Quiet cul-de-sac with uniformed estate guards 24/7.'),
  ('22222222-2222-4222-8222-222222222205', 'fair', 12, array['inverter'], 'tarred', 'good', 'none', 'regular', 'borehole', 'good', 'good', 'Reliable borehole with overhead tank; calm family neighborhood.'),
  ('22222222-2222-4222-8222-222222222206', 'poor', 4, array['none'], 'untarred', 'bad', 'sometimes', 'none', 'vendor_well', 'fair', 'fair', 'Last 400m from expressway is untarred red earth; bring a small power bank.'),
  ('22222222-2222-4222-8222-222222222207', 'fair', 11, array['generator'], 'tarred', 'good', 'none', 'regular', 'borehole', 'good', 'good', 'Smooth tarred estate street with good MTN and Airtel 4G.'),
  ('22222222-2222-4222-8222-222222222208', 'poor', 5, array['generator'], 'partly_tarred', 'fair', 'sometimes', 'irregular', 'borehole', 'fair', 'good', 'Close to campus gate; compound runs backup generator 7pm-11pm.'),
  ('22222222-2222-4222-8222-222222222209', 'fair', 10, array['solar'], 'tarred', 'good', 'none', 'regular', 'borehole', 'good', 'good', 'Shaded quiet street, solid drainage channels.'),
  ('22222222-2222-4222-8222-222222222210', 'steady', 15, array['inverter'], 'tarred', 'good', 'none', 'regular', 'running_water', 'good', 'good', 'Clean GRA street with steady morning and evening water pressure.')
on conflict (listing_id) do nothing;

-- Seed 4 rooms for each demo listing
insert into public.rooms (id, listing_id, name, kind, photo_path, width, height, sort_order)
select
  gen_random_uuid(),
  l.id,
  r.name,
  r.kind::public.room_kind,
  r.photo_path,
  r.width,
  r.height,
  r.sort_order
from public.listings l
cross join (
  values
    ('Living room', 'panorama', '/images/demo/panorama-living.webp', 2048, 1024, 0),
    ('Kitchen', 'flat', '/images/demo/kitchen-abuja.webp', 1200, 900, 1),
    ('Bedroom 1', 'flat', '/images/demo/bedroom-lekki.webp', 1200, 900, 2),
    ('Compound', 'flat', '/images/demo/duplex-wuse.webp', 1200, 900, 3)
) as r(name, kind, photo_path, width, height, sort_order)
where not exists (select 1 from public.rooms existing where existing.listing_id = l.id);

-- Publish all 10 seeded listings and populate sample Nigerian coordinates + size_sqm
update public.listings l
set
  status = 'published',
  published_at = now() - (sub.rn || ' hours')::interval,
  size_sqm = sub.sqm,
  latitude = sub.lat,
  longitude = sub.lng,
  approx_latitude = round((sub.lat / 0.0035)::numeric) * 0.0035,
  approx_longitude = round((sub.lng / 0.0035)::numeric) * 0.0035
from (
  values
    ('22222222-2222-4222-8222-222222222201'::uuid, 1, 110, 6.5854, 3.3562),
    ('22222222-2222-4222-8222-222222222202'::uuid, 2, 42, 6.5152, 3.3774),
    ('22222222-2222-4222-8222-222222222203'::uuid, 3, 145, 6.4472, 3.4743),
    ('22222222-2222-4222-8222-222222222204'::uuid, 4, 240, 9.0764, 7.4791),
    ('22222222-2222-4222-8222-222222222205'::uuid, 5, 115, 9.1089, 7.4041),
    ('22222222-2222-4222-8222-222222222206'::uuid, 6, 26, 8.9721, 7.3772),
    ('22222222-2222-4222-8222-222222222207'::uuid, 7, 108, 4.8242, 7.0011),
    ('22222222-2222-4222-8222-222222222208'::uuid, 8, 24, 4.8961, 6.9122),
    ('22222222-2222-4222-8222-222222222209'::uuid, 9, 138, 7.4231, 3.9082),
    ('22222222-2222-4222-8222-222222222210'::uuid, 10, 105, 11.9961, 8.5452)
) as sub(id, rn, sqm, lat, lng)
where l.id = sub.id and l.status = 'draft';

insert into public.listing_floor_plans (listing_id, plan, model, is_illustrative)
values (
  '22222222-2222-4222-8222-222222222201',
  '{
    "rooms": [
      {"id": "living", "name": "Living room", "type": "living", "xPct": 8, "yPct": 12, "widthPct": 44, "heightPct": 44},
      {"id": "kitchen", "name": "Kitchen", "type": "kitchen", "xPct": 52, "yPct": 12, "widthPct": 40, "heightPct": 28},
      {"id": "hall", "name": "Hallway", "type": "hallway", "xPct": 52, "yPct": 40, "widthPct": 14, "heightPct": 16},
      {"id": "bath1", "name": "Bath 1", "type": "bathroom", "xPct": 66, "yPct": 40, "widthPct": 26, "heightPct": 16},
      {"id": "bed1", "name": "Bedroom 1", "type": "bedroom", "xPct": 8, "yPct": 56, "widthPct": 42, "heightPct": 32},
      {"id": "bed2", "name": "Bedroom 2", "type": "bedroom", "xPct": 50, "yPct": 56, "widthPct": 42, "heightPct": 32}
    ],
    "openings": [
      {"kind": "door", "roomId": "living", "wall": "top", "offsetPct": 30, "widthPct": 18},
      {"kind": "window", "roomId": "living", "wall": "left", "offsetPct": 45, "widthPct": 36},
      {"kind": "door", "roomId": "kitchen", "wall": "left", "offsetPct": 50, "widthPct": 22},
      {"kind": "window", "roomId": "kitchen", "wall": "right", "offsetPct": 45, "widthPct": 34},
      {"kind": "door", "roomId": "bed1", "wall": "top", "offsetPct": 72, "widthPct": 18},
      {"kind": "window", "roomId": "bed1", "wall": "bottom", "offsetPct": 48, "widthPct": 35},
      {"kind": "door", "roomId": "bed2", "wall": "top", "offsetPct": 24, "widthPct": 18},
      {"kind": "window", "roomId": "bed2", "wall": "bottom", "offsetPct": 52, "widthPct": 35}
    ],
    "summary": "2-bedroom flat arranged around a bright central living room with separate kitchen and front entry.",
    "isIllustrative": true
  }'::jsonb,
  'seeded-illustrative',
  true
)
on conflict (listing_id) do nothing;
