-- Info-Popups Rechte pruefen
-- Diese Datei im Supabase SQL Editor ausfuehren.
-- Danach die Ergebnis-Tabellen ansehen oder als Screenshot schicken.

-- 1) Gibt es die Tabelle und ist RLS aktiv?
select
  '01_table_rls' as check_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'info_popups';

-- 2) Sind alle Spalten vorhanden, die der Admin-Bereich speichert?
select
  '02_columns' as check_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'info_popups'
order by ordinal_position;

-- 3) Welche Policies/Rechte gibt es fuer info_popups?
select
  '03_policies' as check_name,
  policyname,
  cmd,
  permissive,
  roles,
  qual as using_rule,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'info_popups'
order by policyname;

-- 4) Gibt es die Rollenfunktionen?
select
  '04_functions' as check_name,
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('can_edit', 'has_role')
order by p.proname;

-- 5) Welche Benutzerprofile gibt es und welche Rolle haben sie?
select
  '05_profiles' as check_name,
  u.email,
  p.id,
  p.role,
  p.full_name,
  u.created_at as user_created_at
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc;

-- 6) Speziell fuer deinen bekannten Admin-Login pruefen.
-- Wenn die Rolle nicht admin oder editor ist, kann Speichern nicht funktionieren.
select
  '06_known_admin_email' as check_name,
  u.email,
  p.id,
  p.role,
  case
    when p.role in ('admin', 'editor') then 'OK: darf speichern'
    when p.role is null then 'FEHLT: kein Profil-Eintrag in public.profiles'
    else 'FEHLER: Rolle ist nicht admin/editor'
  end as result
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = lower('kunstai633@gmail.com');

-- 7) Existierende Info-Popups anzeigen.
select
  '07_existing_info_popups' as check_name,
  id,
  slug,
  title,
  is_active,
  sort_order,
  updated_at
from public.info_popups
order by sort_order, slug;

-- 8) Gibt es den Storage-Bucket fuer Popup-Bilder?
select
  '08_storage_bucket' as check_name,
  id,
  name,
  public
from storage.buckets
where id = 'info-popups';

-- 9) Storage Policies fuer Popup-Bilder.
select
  '09_storage_policies' as check_name,
  policyname,
  cmd,
  qual as using_rule,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'info_popups%';
