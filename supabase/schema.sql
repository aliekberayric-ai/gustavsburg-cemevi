-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Roles: admin, editor, viewer (you can extend)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer',
  created_at timestamptz not null default now()
);

-- Generic audit log (tracks INSERT/UPDATE/DELETE with actor + row snapshot)
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor uuid references auth.users(id),
  actor_email text,
  action text not null,              -- INSERT / UPDATE / DELETE
  table_name text not null,
  row_id uuid,
  before jsonb,
  after jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- MEMBERS (mit Typen: Familie/Ehepartner/Single/Rentner + Filterfelder)
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  member_type text not null,         -- family | spouse | single | pensioner
  first_name text not null,
  last_name text not null,
  birthdate date,
  phone text,
  email text,
  address text,
  notes text,
  status text not null default 'active', -- active | archived
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Funeral planning (Bestattungsvorsorge) with categorization
create table if not exists funeral_plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete set null,
  plan_category text not null,        -- e.g. "self", "partner", "family"
  age_group text,                    -- e.g. "0-17", "18-39", "40-64", "65+"
  data jsonb not null,               -- flexible form payload
  status text not null default 'open',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- EVENTS for calendar
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null,              -- {de:"", tr:"", en:""}
  description jsonb,
  location text,
  start_time timestamptz not null,
  end_time timestamptz,
  category text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PEOPLE / TASKS page (persons with preview images + tasks)
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_title jsonb,                  -- multilingual role title
  bio jsonb,
  avatar_url text,
  tasks jsonb,                       -- array of tasks / responsibilities
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- GALLERIES + GALLERY ITEMS (archivable, sortable, editable)
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

-- FORM SUBMISSIONS (membership application, funeral plan, etc.)
create table if not exists form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,          -- membership | funeral | contact | ...
  payload jsonb not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- INVOICES (generate online + store PDF URLs)
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null,
  customer jsonb not null,          -- name/address etc
  items jsonb not null,             -- list of invoice rows
  totals jsonb not null,            -- net/vat/gross
  pdf_url text,
  status text not null default 'draft', -- draft | sent | paid | archived
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='trg_members_updated_at') then
    create trigger trg_members_updated_at before update on members
    for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='trg_events_updated_at') then
    create trigger trg_events_updated_at before update on events
    for each row execute function set_updated_at();
  end if;
end $$;

-- AUDIT trigger function (logs before/after snapshots)
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

  if tg_op='DELETE' then
    return old;
  else
    return new;
  end if;
end $$;

-- Attach audit triggers to key tables
do $$
begin
  -- list tables you want logged:
  perform 1;
end $$;

create trigger audit_members
after insert or update or delete on members
for each row execute function audit_row_changes();

create trigger audit_events
after insert or update or delete on events
for each row execute function audit_row_changes();

create trigger audit_galleries
after insert or update or delete on galleries
for each row execute function audit_row_changes();

create trigger audit_gallery_items
after insert or update or delete on gallery_items
for each row execute function audit_row_changes();

create trigger audit_invoices
after insert or update or delete on invoices
for each row execute function audit_row_changes();
