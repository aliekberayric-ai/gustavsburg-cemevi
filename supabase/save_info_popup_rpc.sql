-- Stabile Speicherfunktion fuer Info-Popups
-- Diese Datei im Supabase SQL Editor ausfuehren.

create extension if not exists "pgcrypto";

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

create or replace function public.can_edit()
returns boolean language sql stable as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin','editor')
  );
$$;

create or replace function public.save_info_popup(
  p_id uuid,
  p_slug text,
  p_title jsonb,
  p_content jsonb,
  p_image_url text,
  p_sort_order int,
  p_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.can_edit() then
    raise exception 'Keine Berechtigung: Nur admin/editor darf Info-Popups speichern.';
  end if;

  if coalesce(trim(p_slug), '') = '' then
    raise exception 'Slug fehlt.';
  end if;

  if p_id is null then
    insert into public.info_popups (
      slug,
      title,
      content,
      image_url,
      sort_order,
      is_active,
      created_by,
      updated_at
    )
    values (
      trim(p_slug),
      coalesce(p_title, '{"de":"","tr":"","en":""}'::jsonb),
      coalesce(p_content, '{"de":"","tr":"","en":""}'::jsonb),
      nullif(p_image_url, ''),
      coalesce(p_sort_order, 0),
      coalesce(p_is_active, true),
      auth.uid(),
      now()
    )
    returning id into v_id;
  else
    update public.info_popups
    set
      slug = trim(p_slug),
      title = coalesce(p_title, title),
      content = coalesce(p_content, content),
      image_url = nullif(p_image_url, ''),
      sort_order = coalesce(p_sort_order, sort_order),
      is_active = coalesce(p_is_active, is_active),
      updated_at = now()
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Info-Popup mit dieser ID wurde nicht gefunden: %', p_id;
    end if;
  end if;

  return v_id;
end;
$$;

grant execute on function public.save_info_popup(uuid, text, jsonb, jsonb, text, int, boolean) to authenticated;

-- Kontrolle:
select 'save_info_popup RPC ist angelegt' as result;
