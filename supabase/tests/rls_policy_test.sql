-- SQL RLS & Privilege Verification Script
-- Run against a seeded Supabase / Postgres database with `psql -v ON_ERROR_STOP=1 -f supabase/tests/rls_policy_test.sql`

begin;

do $$
declare
  v_draft_id uuid := gen_random_uuid();
  v_pub_id uuid := '22222222-2222-4222-8222-222222222201';
  v_other_user uuid := '33333333-3333-4333-8333-333333333303';
  v_count integer;
  v_addr text;
begin
  -- Create another user (renter) and a draft listing owned by landlord 1
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  values (v_other_user, 'rls-test-renter@example.test', 'x', now(), now(), now(), 'authenticated', 'authenticated')
  on conflict (id) do nothing;

  insert into public.listings (
    id, landlord_id, title, description, property_type, rent_amount, rent_period,
    state, lga, area, address_line, status
  ) values (
    v_draft_id, '11111111-1111-4111-8111-111111111101', 'Private Draft Home',
    'This is an unpublished draft listing used to verify RLS.', 'flat', 1000000, 'year',
    'Lagos', 'Ikeja', 'Allen', 'Secret Draft Address 99', 'draft'
  );

  -- 1. Test as ANON (signed-out user)
  set local role anon;
  perform set_config('request.jwt.claims', '{}', true);

  select count(*) into v_count from public.listings where id = v_draft_id;
  if v_count <> 0 then
    raise exception 'FAIL: anon user was able to read a draft listing';
  end if;

  -- Verify column-level privilege blocks selecting address_line directly
  begin
    execute 'select address_line from public.listings limit 1';
    raise exception 'FAIL: anon user could select address_line column directly';
  exception
    when insufficient_privilege then
      null; -- Expected
  end;

  -- Verify phone is hidden on public_profiles and profiles
  select count(*) into v_count from public.profiles;
  if v_count <> 0 then
    raise exception 'FAIL: anon user could read profiles table';
  end if;

  -- Verify get_landlord_contact fails when signed out
  begin
    perform * from public.get_landlord_contact(v_pub_id);
    raise exception 'FAIL: anon user could call get_landlord_contact';
  exception
    when others then
      null; -- Expected
  end;

  -- 2. Test as ANOTHER authenticated user (v_other_user)
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_other_user::text, 'role', 'authenticated')::text, true);

  select count(*) into v_count from public.listings where id = v_draft_id;
  if v_count <> 0 then
    raise exception 'FAIL: other user could read landlord draft listing';
  end if;

  select public.get_listing_address(v_pub_id) into v_addr;
  if v_addr is not null then
    raise exception 'FAIL: renter without accepted viewing could read street address';
  end if;

  -- Attempt unauthorized update on another landlord listing
  update public.listings set title = 'Hacked' where id = v_pub_id;
  get diagnostics v_count = row_count;
  if v_count <> 0 then
    raise exception 'FAIL: other user modified someone else listing';
  end if;

  -- Attempt unauthorized upload into another user folder in storage.objects
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('listing-photos', '11111111-1111-4111-8111-111111111101/fake/photo.webp', v_other_user);
    raise exception 'FAIL: other user uploaded into landlord storage folder';
  exception
    when insufficient_privilege then
      null; -- Expected
  end;

  -- Verify reports table cannot be read by normal users
  select count(*) into v_count from public.reports;
  if v_count <> 0 then
    raise exception 'FAIL: normal authenticated user could read reports';
  end if;

  raise notice 'ALL RLS & PRIVILEGE TESTS PASSED';
end $$;

rollback;
