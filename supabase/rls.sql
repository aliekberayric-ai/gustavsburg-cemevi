alter table profiles enable row level security;
alter table events enable row level security;
alter table people enable row level security;
alter table galleries enable row level security;
alter table gallery_items enable row level security;
alter table form_submissions enable row level security;
alter table audit_logs enable row level security;

create or replace function has_role(role_name text)
returns boolean language sql stable as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.role = role_name);
$$;

create or replace function can_edit()
returns boolean language sql stable as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','editor'));
$$;

-- profiles
create policy "profiles_read_own_or_admin" on profiles
for select using (id = auth.uid() or has_role('admin'));

create policy "profiles_update_own" on profiles
for update using (id = auth.uid());

-- events
create policy "events_public_read" on events
for select using (true);

create policy "events_write_editor_admin" on events
for insert with check (can_edit());

create policy "events_update_editor_admin" on events
for update using (can_edit());

create policy "events_delete_admin" on events
for delete using (has_role('admin'));

-- people (public read visible)
create policy "people_public_read" on people
for select using (true);

create policy "people_write_editor_admin" on people
for insert with check (can_edit());

create policy "people_update_editor_admin" on people
for update using (can_edit());

create policy "people_delete_admin" on people
for delete using (has_role('admin'));

-- galleries & items public read
create policy "galleries_public_read" on galleries
for select using (true);

create policy "gallery_items_public_read" on gallery_items
for select using (true);

create policy "galleries_write_editor_admin" on galleries
for insert with check (can_edit());
create policy "galleries_update_editor_admin" on galleries
for update using (can_edit());
create policy "galleries_delete_admin" on galleries
for delete using (has_role('admin'));

create policy "gallery_items_write_editor_admin" on gallery_items
for insert with check (can_edit());
create policy "gallery_items_update_editor_admin" on gallery_items
for update using (can_edit());
create policy "gallery_items_delete_admin" on gallery_items
for delete using (has_role('admin'));

-- form submissions: anyone can insert (public forms), only editor/admin can read/manage
create policy "forms_public_insert" on form_submissions
for insert with check (true);

create policy "forms_admin_read" on form_submissions
for select using (can_edit());

create policy "forms_admin_update" on form_submissions
for update using (can_edit());

-- audit logs: admin only
create policy "audit_admin_only" on audit_logs
for select using (has_role('admin'));
