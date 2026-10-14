-- Enable Row-Level Security on all new tenant-scoped tables
-- Tables: projects, phases, tasks, project_members, project_templates, team_invitations
-- Note: task_assignments and task_project_links do NOT need RLS (no organization_id, protected via parent)

-- === PROJECTS ===
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_policy ON "projects"
  FOR SELECT
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_insert_policy ON "projects"
  FOR INSERT
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_update_policy ON "projects"
  FOR UPDATE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_delete_policy ON "projects"
  FOR DELETE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

-- === PHASES ===
ALTER TABLE "phases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "phases" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_policy ON "phases"
  FOR SELECT
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_insert_policy ON "phases"
  FOR INSERT
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_update_policy ON "phases"
  FOR UPDATE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_delete_policy ON "phases"
  FOR DELETE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

-- === TASKS ===
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_policy ON "tasks"
  FOR SELECT
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_insert_policy ON "tasks"
  FOR INSERT
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_update_policy ON "tasks"
  FOR UPDATE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_delete_policy ON "tasks"
  FOR DELETE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

-- === PROJECT_MEMBERS ===
ALTER TABLE "project_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_members" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_policy ON "project_members"
  FOR SELECT
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_insert_policy ON "project_members"
  FOR INSERT
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_update_policy ON "project_members"
  FOR UPDATE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_delete_policy ON "project_members"
  FOR DELETE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

-- === PROJECT_TEMPLATES ===
ALTER TABLE "project_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_templates" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_policy ON "project_templates"
  FOR SELECT
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_insert_policy ON "project_templates"
  FOR INSERT
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_update_policy ON "project_templates"
  FOR UPDATE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_delete_policy ON "project_templates"
  FOR DELETE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

-- === TEAM_INVITATIONS ===
ALTER TABLE "team_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "team_invitations" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_policy ON "team_invitations"
  FOR SELECT
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_insert_policy ON "team_invitations"
  FOR INSERT
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_update_policy ON "team_invitations"
  FOR UPDATE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_delete_policy ON "team_invitations"
  FOR DELETE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));
