create extension if not exists "pgcrypto";

create table if not exists info_popups (
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

alter table info_popups add column if not exists slug text;
alter table info_popups add column if not exists title jsonb not null default '{"de":"","tr":"","en":""}'::jsonb;
alter table info_popups add column if not exists content jsonb not null default '{"de":"","tr":"","en":""}'::jsonb;
alter table info_popups add column if not exists image_url text;
alter table info_popups add column if not exists sort_order int not null default 0;
alter table info_popups add column if not exists is_active boolean not null default true;
alter table info_popups add column if not exists created_by uuid references auth.users(id);
alter table info_popups add column if not exists created_at timestamptz not null default now();
alter table info_popups add column if not exists updated_at timestamptz not null default now();

create unique index if not exists info_popups_slug_unique on info_popups(slug);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_info_popups_updated_at on info_popups;
create trigger trg_info_popups_updated_at
before update on info_popups
for each row execute function set_updated_at();

alter table info_popups enable row level security;

create or replace function has_role(role_name text)
returns boolean language sql stable as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.role = role_name);
$$;

create or replace function can_edit()
returns boolean language sql stable as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','editor'));
$$;

drop policy if exists "info_popups_public_read" on info_popups;
drop policy if exists "info_popups_write_editor_admin" on info_popups;
drop policy if exists "info_popups_update_editor_admin" on info_popups;
drop policy if exists "info_popups_delete_admin" on info_popups;

create policy "info_popups_public_read" on info_popups
for select using (true);

create policy "info_popups_write_editor_admin" on info_popups
for insert with check (can_edit());

create policy "info_popups_update_editor_admin" on info_popups
for update using (can_edit());

create policy "info_popups_delete_admin" on info_popups
for delete using (has_role('admin'));

insert into storage.buckets (id, name, public)
values ('info-popups', 'info-popups', true)
on conflict (id) do update set public = true;

drop policy if exists "info_popups_images_public_read" on storage.objects;
drop policy if exists "info_popups_images_editor_upload" on storage.objects;

create policy "info_popups_images_public_read" on storage.objects
for select using (bucket_id = 'info-popups');

create policy "info_popups_images_editor_upload" on storage.objects
for insert with check (bucket_id = 'info-popups' and public.can_edit());
