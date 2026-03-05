alter table profiles enable row level security;
alter table members enable row level security;
alter table events enable row level security;
alter table galleries enable row level security;
alter table gallery_items enable row level security;
alter table invoices enable row level security;
alter table audit_logs enable row level security;

-- Helper: check role
create or replace function has_role(role_name text)
returns boolean language sql stable as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = role_name
  );
$$;

create or replace function can_edit()
returns boolean language sql stable as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('admin','editor')
  );
$$;

-- profiles: user can read own, admin can read all
create policy "profiles_read_own" on profiles
for select using (id = auth.uid() or has_role('admin'));

create policy "profiles_update_own" on profiles
for update using (id = auth.uid());

-- members: everyone logged-in can read, only editor/admin can write
create policy "members_read" on members
for select using (auth.uid() is not null);

create policy "members_write" on members
for insert with check (can_edit());

create policy "members_update" on members
for update using (can_edit());

create policy "members_delete" on members
for delete using (has_role('admin'));

-- audit logs: only admin
create policy "audit_admin_only" on audit_logs
for select using (has_role('admin'));
