create extension if not exists "pgcrypto";

-- User profiles with role
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer', -- admin | editor | viewer
  created_at timestamptz not null default now()
);

-- Audit log
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor uuid references auth.users(id),
  actor_email text,
  action text not null,               -- INSERT/UPDATE/DELETE
  table_name text not null,
  row_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- EVENTS
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null,               -- {de:"",tr:"",en:""}
  description jsonb,
  location text,
  start_time timestamptz not null,
  end_time timestamptz,
  category text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PEOPLE (Team page)
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_title jsonb,                   -- {de,tr,en}
  bio jsonb,
  avatar_url text,
  tasks jsonb,                        -- array of strings or objects
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- GALLERIES + ITEMS
create table if not exists galleries (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null,
  description jsonb,
  status text not null default 'active', -- active | archived
  sort_order int not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gallery_items (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid references galleries(id) on delete cascade,
  caption jsonb,
  file_url text not null,
  thumb_url text,
  sort_order int not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FORM SUBMISSIONS (membership, funeral, contact, etc.)
create table if not exists form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,            -- membership | funeral | contact
  payload jsonb not null,
  status text not null default 'new',  -- new | in_review | done | archived
  created_at timestamptz not null default now()
);

-- updated_at helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_events_updated_at
before update on events
for each row execute function set_updated_at();

create trigger trg_people_updated_at
before update on people
for each row execute function set_updated_at();

create trigger trg_galleries_updated_at
before update on galleries
for each row execute function set_updated_at();

create trigger trg_gallery_items_updated_at
before update on gallery_items
for each row execute function set_updated_at();

-- Audit trigger function
create or replace function audit_row_changes()
returns trigger language plpgsql as $$
declare
  v_actor uuid;
  v_email text;
begin
  v_actor := auth.uid();
  select email into v_email from auth.users where id = v_actor;

  insert into audit_logs(actor, actor_email, action, table_name, row_id, before, after)
  values (
    v_actor,
    v_email,
    tg_op,
    tg_table_name,
    coalesce((case when tg_op='DELETE' then old.id else new.id end), null),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );

  if tg_op='DELETE' then return old; else return new; end if;
end $$;

create trigger audit_events
after insert or update or delete on events
for each row execute function audit_row_changes();

create trigger audit_people
after insert or update or delete on people
for each row execute function audit_row_changes();

create trigger audit_galleries
after insert or update or delete on galleries
for each row execute function audit_row_changes();

create trigger audit_gallery_items
after insert or update or delete on gallery_items
for each row execute function audit_row_changes();
