-- Enable RLS for Phase 8 tenant-scoped tables
-- Tables: tags, sections, attachments, stories, custom_fields, portfolios
-- Tables without organizationId (pivot tables) are protected via parent RLS:
--   task_tags, custom_field_values, task_followers, portfolio_projects

-- === TAGS ===
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tags" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_policy ON "tags"
  FOR SELECT
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_insert_policy ON "tags"
  FOR INSERT
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_update_policy ON "tags"
  FOR UPDATE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_delete_policy ON "tags"
  FOR DELETE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

-- === SECTIONS ===
ALTER TABLE "sections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sections" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_policy ON "sections"
  FOR SELECT
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_insert_policy ON "sections"
  FOR INSERT
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_update_policy ON "sections"
  FOR UPDATE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_delete_policy ON "sections"
  FOR DELETE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

-- === ATTACHMENTS ===
ALTER TABLE "attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attachments" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_policy ON "attachments"
  FOR SELECT
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_insert_policy ON "attachments"
  FOR INSERT
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_update_policy ON "attachments"
  FOR UPDATE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_delete_policy ON "attachments"
  FOR DELETE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

-- === STORIES ===
ALTER TABLE "stories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stories" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_policy ON "stories"
  FOR SELECT
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_insert_policy ON "stories"
  FOR INSERT
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_update_policy ON "stories"
  FOR UPDATE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_delete_policy ON "stories"
  FOR DELETE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

-- === CUSTOM_FIELDS ===
ALTER TABLE "custom_fields" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_fields" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_policy ON "custom_fields"
  FOR SELECT
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_insert_policy ON "custom_fields"
  FOR INSERT
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_update_policy ON "custom_fields"
  FOR UPDATE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_delete_policy ON "custom_fields"
  FOR DELETE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

-- === PORTFOLIOS ===
ALTER TABLE "portfolios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolios" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_policy ON "portfolios"
  FOR SELECT
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_insert_policy ON "portfolios"
  FOR INSERT
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_update_policy ON "portfolios"
  FOR UPDATE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_delete_policy ON "portfolios"
  FOR DELETE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));
