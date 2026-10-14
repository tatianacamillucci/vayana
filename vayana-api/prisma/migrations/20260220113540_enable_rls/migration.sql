-- Enable Row-Level Security on organization_members table
ALTER TABLE "organization_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_members" FORCE ROW LEVEL SECURITY;

-- Policy: SELECT — users can only read rows belonging to their tenant
CREATE POLICY tenant_select_policy ON "organization_members"
  FOR SELECT
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));

-- Policy: INSERT — users can only insert rows for their tenant
CREATE POLICY tenant_insert_policy ON "organization_members"
  FOR INSERT
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

-- Policy: UPDATE — users can only update rows belonging to their tenant
CREATE POLICY tenant_update_policy ON "organization_members"
  FOR UPDATE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("organization_id"::text = current_setting('app.current_tenant_id', true));

-- Policy: DELETE — users can only delete rows belonging to their tenant
CREATE POLICY tenant_delete_policy ON "organization_members"
  FOR DELETE
  USING ("organization_id"::text = current_setting('app.current_tenant_id', true));
