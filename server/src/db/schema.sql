-- ============================================================
-- PERMIT PLATFORM — DATABASE SCHEMA
-- ============================================================

-- TENANTS (agencies / jurisdictions)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'staff', -- superadmin | admin | staff | readonly
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- PERMIT TYPES (configurable per tenant)
CREATE TABLE IF NOT EXISTS permit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  description TEXT,
  fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  renewal_period_days INTEGER,
  form_schema JSONB NOT NULL DEFAULT '[]', -- array of field definitions
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- WORKFLOW DEFINITIONS (per permit type)
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  permit_type_id UUID REFERENCES permit_types(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WORKFLOW STAGES
CREATE TABLE IF NOT EXISTS workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  stage_order INTEGER NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1', -- hex color for UI
  sla_days INTEGER, -- expected days to complete
  required_checklist JSONB NOT NULL DEFAULT '[]', -- items required before advancing
  auto_assign_role VARCHAR(50), -- role to auto-assign when entering stage
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WORKFLOW TRANSITIONS (which stages can go where, with conditions)
CREATE TABLE IF NOT EXISTS workflow_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES workflow_stages(id) ON DELETE CASCADE,
  to_stage_id UUID NOT NULL REFERENCES workflow_stages(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL DEFAULT 'Next Stage',
  conditions JSONB NOT NULL DEFAULT '[]', -- array of condition rules
  requires_note BOOLEAN NOT NULL DEFAULT false,
  allowed_roles JSONB NOT NULL DEFAULT '[]', -- empty = all roles
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CONTACTS (applicants, owners, representatives)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  date_of_birth DATE,
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(50),
  address_zip VARCHAR(20),
  address_country VARCHAR(100) DEFAULT 'USA',
  preferred_contact VARCHAR(50) DEFAULT 'email',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ENTITIES / BUSINESSES
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  dba VARCHAR(255),
  entity_type VARCHAR(100), -- LLC, Corp, Sole Proprietor, etc.
  ein VARCHAR(50),
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(50),
  address_zip VARCHAR(20),
  phone VARCHAR(50),
  website VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LOCATIONS / PREMISES
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  address_street VARCHAR(255) NOT NULL,
  address_city VARCHAR(100) NOT NULL,
  address_state VARCHAR(50) NOT NULL,
  address_zip VARCHAR(20) NOT NULL,
  parcel_number VARCHAR(100),
  zoning VARCHAR(100),
  square_footage INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- APPLICATIONS (core record)
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  application_number VARCHAR(50) NOT NULL,
  permit_type_id UUID NOT NULL REFERENCES permit_types(id),
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  current_stage_id UUID REFERENCES workflow_stages(id),
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft | active | approved | denied | withdrawn | expired
  transaction_type VARCHAR(50) NOT NULL DEFAULT 'original', -- original | renewal | transfer | amendment
  applicant_contact_id UUID REFERENCES contacts(id),
  entity_id UUID REFERENCES entities(id),
  location_id UUID REFERENCES locations(id),
  assigned_to UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  form_data JSONB NOT NULL DEFAULT '{}', -- stores all dynamic form field values
  checklist JSONB NOT NULL DEFAULT '{}', -- checklist item completion state
  fee_amount NUMERIC(10,2),
  fee_paid BOOLEAN NOT NULL DEFAULT false,
  fee_paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, application_number)
);

-- APPLICATION STAGE HISTORY
CREATE TABLE IF NOT EXISTS application_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES workflow_stages(id),
  to_stage_id UUID NOT NULL REFERENCES workflow_stages(id),
  transitioned_by UUID REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES users(id),
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  storage_path VARCHAR(512) NOT NULL,
  document_type VARCHAR(100), -- birth_cert | business_license | insurance | etc.
  description TEXT,
  is_approved BOOLEAN,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INSPECTIONS
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  inspector_id UUID REFERENCES users(id),
  contact_id UUID REFERENCES contacts(id),
  inspection_type VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- scheduled | in_progress | passed | failed | cancelled
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  passed BOOLEAN,
  notes TEXT,
  findings JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BACKGROUND CHECKS
CREATE TABLE IF NOT EXISTS background_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id),
  tcr_number VARCHAR(100),
  reason VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending | submitted | approved | denied | review
  approval_note TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  sent_to_applicant_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ACTIVITY TIMELINE
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL, -- note | email | phone_call | stage_change | document | system | portal_comment
  subject VARCHAR(500),
  body TEXT,
  direction VARCHAR(20), -- inbound | outbound (for comms)
  is_closed BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LICENSES (issued after approval)
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id),
  license_number VARCHAR(100) NOT NULL,
  permit_type_id UUID NOT NULL REFERENCES permit_types(id),
  entity_id UUID REFERENCES entities(id),
  location_id UUID REFERENCES locations(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active | suspended | revoked | expired
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  conditions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, license_number)
);

-- ENFORCEMENTS
CREATE TABLE IF NOT EXISTS enforcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id),
  license_id UUID REFERENCES licenses(id),
  entity_id UUID REFERENCES entities(id),
  assigned_to UUID REFERENCES users(id),
  enforcement_type VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  description TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_applications_tenant ON applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_stage ON applications(current_stage_id);
CREATE INDEX IF NOT EXISTS idx_activities_application ON activities(application_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inspections_application ON inspections(application_id);
CREATE INDEX IF NOT EXISTS idx_background_checks_application ON background_checks(application_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_stages_workflow ON workflow_stages(workflow_id);
