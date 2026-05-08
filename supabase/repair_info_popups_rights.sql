-- Info-Popups Rechte reparieren
-- Diese Datei im Supabase SQL Editor ausfuehren, wenn Speichern nicht funktioniert.

create extension if not exists "pgcrypto";

-- 1) Admin-Profil fuer bekannten Login sicherstellen.
-- Falls du eine andere Admin-Mail verwendest, die E-Mail unten anpassen.
insert into public.profiles (id, full_name, role)
select id, coalesce(raw_user_meta_data->>'full_name', email), 'admin'
from auth.users
where lower(email) = lower('kunstai633@gmail.com')
on conflict (id) do update
set role = 'admin';

-- 2) Tabelle sicherstellen.
create table if not exists public.info_popups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title jsonb not null default '{"de":"","tr":"","en":""}'::jsonb,
  content jsonb not null default '{"de":"","tr":"","en":""}'::jsonb,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.info_popups add column if not exists slug text;
alter table public.info_popups add column if not exists title jsonb not null default '{"de":"","tr":"","en":""}'::jsonb;
alter table public.info_popups add column if not exists content jsonb not null default '{"de":"","tr":"","en":""}'::jsonb;
alter table public.info_popups add column if not exists image_url text;
alter table public.info_popups add column if not exists sort_order int not null default 0;
alter table public.info_popups add column if not exists is_active boolean not null default true;
alter table public.info_popups add column if not exists created_by uuid references auth.users(id);
alter table public.info_popups add column if not exists created_at timestamptz not null default now();
alter table public.info_popups add column if not exists updated_at timestamptz not null default now();

create unique index if not exists info_popups_slug_unique on public.info_popups(slug);

-- 3) Rollenfunktionen sicherstellen.
create or replace function public.has_role(role_name text)
returns boolean language sql stable as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = role_name
  );
$$;

create or replace function public.can_edit()
returns boolean language sql stable as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin','editor')
  );
$$;

-- 4) updated_at Trigger.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_info_popups_updated_at on public.info_popups;
create trigger trg_info_popups_updated_at
before update on public.info_popups
for each row execute function public.set_updated_at();

-- 5) RLS und Policies.
alter table public.info_popups enable row level security;

drop policy if exists "info_popups_public_read" on public.info_popups;
drop policy if exists "info_popups_write_editor_admin" on public.info_popups;
drop policy if exists "info_popups_update_editor_admin" on public.info_popups;
drop policy if exists "info_popups_delete_admin" on public.info_popups;

create policy "info_popups_public_read" on public.info_popups
for select using (true);

create policy "info_popups_write_editor_admin" on public.info_popups
for insert with check (public.can_edit());

create policy "info_popups_update_editor_admin" on public.info_popups
for update using (public.can_edit()) with check (public.can_edit());

create policy "info_popups_delete_admin" on public.info_popups
for delete using (public.has_role('admin'));

-- 6) Storage fuer Popup-Bilder.
insert into storage.buckets (id, name, public)
values ('info-popups', 'info-popups', true)
on conflict (id) do update set public = true;

drop policy if exists "info_popups_images_public_read" on storage.objects;
drop policy if exists "info_popups_images_editor_upload" on storage.objects;
drop policy if exists "info_popups_images_editor_update" on storage.objects;
drop policy if exists "info_popups_images_admin_delete" on storage.objects;

create policy "info_popups_images_public_read" on storage.objects
for select using (bucket_id = 'info-popups');

create policy "info_popups_images_editor_upload" on storage.objects
for insert with check (bucket_id = 'info-popups' and public.can_edit());

create policy "info_popups_images_editor_update" on storage.objects
for update using (bucket_id = 'info-popups' and public.can_edit())
with check (bucket_id = 'info-popups' and public.can_edit());

create policy "info_popups_images_admin_delete" on storage.objects
for delete using (bucket_id = 'info-popups' and public.has_role('admin'));

-- 7) Kontrolle nach Reparatur.
select
  u.email,
  p.role,
  case
    when p.role in ('admin','editor') then 'OK: Admin/Editor darf Info-Popups speichern'
    else 'FEHLER: Rolle stimmt noch nicht'
  end as result
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = lower('kunstai633@gmail.com');
