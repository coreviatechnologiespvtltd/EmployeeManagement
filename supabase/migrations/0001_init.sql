-- =============================================================================
-- Corevia EMS — initial schema
--
-- Target: PostgreSQL 14+ (developed against 18). Also runs unchanged on
-- Supabase, which is PostgreSQL underneath.
--
-- Conventions
--   * Primary keys are `text` so the public identifiers keep the shape the
--     application already exposes: emp-1001, tsk-3001, lv-2001, ann-4001.
--     Values come from per-table sequences declared below, never from the
--     client, so two concurrent inserts can never collide.
--   * Money and hours are `numeric`, never `float` — payroll must not drift.
--   * `date` columns are calendar dates (rendered YYYY-MM); `timestamptz`
--     columns are instants. Both shapes match what the UI helpers expect.
--   * Password hashes live in `user_credentials`, kept off `employees` so that
--     no ordinary employee query can accidentally select a credential.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Identifier sequences
--
-- Declared first: the column defaults below call nextval() on them, so they
-- must already exist when the tables are created. Each starts at the next free
-- number so that seeded rows (emp-1001, tsk-3001, ...) and generated rows look
-- the same. The prefix is applied in the column default, not the sequence.
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS departments_id_seq                START WITH 1;
CREATE SEQUENCE IF NOT EXISTS salary_component_templates_id_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS employees_id_seq                   START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS attendance_records_id_seq         START WITH 1;
CREATE SEQUENCE IF NOT EXISTS tasks_id_seq                       START WITH 3001;
CREATE SEQUENCE IF NOT EXISTS salary_records_id_seq              START WITH 1;
CREATE SEQUENCE IF NOT EXISTS leave_requests_id_seq              START WITH 2001;
CREATE SEQUENCE IF NOT EXISTS announcements_id_seq              START WITH 4001;

-- -----------------------------------------------------------------------------
-- Reference data
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS departments (
  id         text PRIMARY KEY DEFAULT 'dept-' || nextval('departments_id_seq'),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT departments_name_key UNIQUE (name),
  CONSTRAINT departments_name_not_blank CHECK (btrim(name) <> '')
);

-- Key/value company policy. Replaces the hardcoded constants that used to live
-- in `src/lib/constants.ts` (leave allocation, workday start, late threshold,
-- standard day length).
CREATE TABLE IF NOT EXISTS company_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  label      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Allowance / deduction presets offered on the payroll form.
CREATE TABLE IF NOT EXISTS salary_component_templates (
  id         text PRIMARY KEY DEFAULT 'sct-' || nextval('salary_component_templates_id_seq'),
  kind       text NOT NULL CHECK (kind IN ('allowance', 'deduction')),
  label      text NOT NULL,
  amount     numeric(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT salary_component_templates_kind_label_key UNIQUE (kind, label)
);

-- -----------------------------------------------------------------------------
-- Identity
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS employees (
  id            text PRIMARY KEY DEFAULT 'emp-' || nextval('employees_id_seq'),
  employee_code text NOT NULL,
  full_name     text NOT NULL,
  username      text NOT NULL,
  email         text NOT NULL,
  phone         text NOT NULL DEFAULT '',
  address       text NOT NULL DEFAULT '',
  department_id text NOT NULL REFERENCES departments (id) ON DELETE RESTRICT,
  position      text NOT NULL,
  joining_date  date NOT NULL,
  role          text NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  avatar_url    text,
  basic_salary  numeric(12, 2) NOT NULL DEFAULT 0 CHECK (basic_salary >= 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employees_full_name_not_blank CHECK (btrim(full_name) <> '')
);

-- Case-insensitive uniqueness, expressed as indexes because a UNIQUE constraint
-- requires bare columns. Sign-in looks an account up with `lower(...)`, so
-- "Aarav" and "aarav" must not both exist.
CREATE UNIQUE INDEX IF NOT EXISTS employees_username_lower_key ON employees (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS employees_email_lower_key    ON employees (lower(email));

CREATE INDEX IF NOT EXISTS employees_department_id_idx  ON employees (department_id);
CREATE INDEX IF NOT EXISTS employees_status_idx         ON employees (status);
CREATE INDEX IF NOT EXISTS employees_role_idx           ON employees (role);
CREATE INDEX IF NOT EXISTS employees_joining_date_idx   ON employees (joining_date);

-- One credential row per employee. `password_hash` is a bcrypt digest; no
-- plaintext password is ever written to the database.
CREATE TABLE IF NOT EXISTS user_credentials (
  employee_id        text PRIMARY KEY REFERENCES employees (id) ON DELETE CASCADE,
  password_hash      text NOT NULL,
  password_updated_at timestamptz NOT NULL DEFAULT now(),
  failed_attempts    integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until       timestamptz,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Sessions are keyed by sha256(rawToken); the raw token exists only in the
-- httpOnly cookie, so a dump of this table cannot be replayed as a login.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash   text PRIMARY KEY,
  employee_id  text NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sessions_expires_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS sessions_employee_id_idx ON sessions (employee_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

-- -----------------------------------------------------------------------------
-- Work
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tasks (
  id             text PRIMARY KEY DEFAULT 'tsk-' || nextval('tasks_id_seq'),
  title          text NOT NULL,
  description    text NOT NULL DEFAULT '',
  assigned_to_id text NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  assigned_by_id text REFERENCES employees (id) ON DELETE SET NULL,
  start_date     date NOT NULL,
  due_date       date NOT NULL,
  priority       text NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  -- 'overdue' is normally derived (due_date < today() AND status <> 'completed')
  -- but is accepted as a stored value because the existing status controls and
  -- validators offer it as an input.
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tasks_due_not_before_start CHECK (due_date >= start_date)
);

CREATE INDEX IF NOT EXISTS tasks_assigned_to_id_idx ON tasks (assigned_to_id, due_date);
CREATE INDEX IF NOT EXISTS tasks_status_idx        ON tasks (status);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx      ON tasks (due_date);

CREATE TABLE IF NOT EXISTS attendance_records (
  id            text PRIMARY KEY DEFAULT 'att-' || nextval('attendance_records_id_seq'),
  employee_id   text NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  work_date     date NOT NULL,
  status        text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave')),
  check_in      timestamptz,
  check_out     timestamptz,
  working_hours numeric(5, 2) CHECK (working_hours IS NULL OR working_hours >= 0),
  remarks       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- One row per employee per day. This is what makes an attendance correction
  -- a safe upsert instead of a duplicate insert.
  CONSTRAINT attendance_records_employee_id_work_date_key UNIQUE (employee_id, work_date)
);

CREATE INDEX IF NOT EXISTS attendance_records_work_date_idx ON attendance_records (work_date);

-- -----------------------------------------------------------------------------
-- Payroll
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS salary_records (
  id             text PRIMARY KEY DEFAULT 'sal-' || nextval('salary_records_id_seq'),
  employee_id    text NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  -- Always normalised to the first day of the month; rendered as YYYY-MM.
  month          date NOT NULL,
  basic_salary   numeric(12, 2) NOT NULL CHECK (basic_salary >= 0),
  allowances     numeric(12, 2) NOT NULL DEFAULT 0 CHECK (allowances >= 0),
  bonus          numeric(12, 2) NOT NULL DEFAULT 0 CHECK (bonus >= 0),
  deductions     numeric(12, 2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
  net_salary     numeric(12, 2) NOT NULL CHECK (net_salary >= 0),
  payment_status text NOT NULL DEFAULT 'pending'
                 CHECK (payment_status IN ('paid', 'pending', 'processing')),
  paid_at        timestamptz,
  remarks        text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- One payslip per employee per month: this turns `upsertSalary` into a real
  -- ON CONFLICT DO UPDATE, so create and correct share one code path.
  CONSTRAINT salary_records_employee_id_month_key UNIQUE (employee_id, month),
  CONSTRAINT salary_records_month_is_first_of_month CHECK (date_part('day', month) = 1)
);

CREATE INDEX IF NOT EXISTS salary_records_month_idx           ON salary_records (month);
CREATE INDEX IF NOT EXISTS salary_records_payment_status_idx ON salary_records (payment_status);

-- -----------------------------------------------------------------------------
-- Leave
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS leave_requests (
  id              text PRIMARY KEY DEFAULT 'lv-' || nextval('leave_requests_id_seq'),
  employee_id     text NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  leave_type      text NOT NULL
                  CHECK (leave_type IN ('casual', 'sick', 'annual', 'unpaid', 'maternity')),
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  total_days      integer NOT NULL CHECK (total_days > 0),
  reason          text NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_comment   text,
  reviewed_by_id  text REFERENCES employees (id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  applied_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leave_requests_end_not_before_start CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS leave_requests_employee_id_idx ON leave_requests (employee_id, applied_at);
CREATE INDEX IF NOT EXISTS leave_requests_status_idx      ON leave_requests (status);

-- -----------------------------------------------------------------------------
-- Notices
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS announcements (
  id           text PRIMARY KEY DEFAULT 'ann-' || nextval('announcements_id_seq'),
  title        text NOT NULL,
  description  text NOT NULL DEFAULT '',
  body         text NOT NULL DEFAULT '',
  author_id    text REFERENCES employees (id) ON DELETE SET NULL,
  priority     text NOT NULL DEFAULT 'normal'
               CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status       text NOT NULL DEFAULT 'draft'
               CHECK (status IN ('published', 'draft', 'archived')),
  published_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_status_published_at_idx
  ON announcements (status, published_at DESC);

-- Replaces the `readBy: string[]` array the in-memory mock kept on each notice.
-- The composite key makes a repeat read a no-op.
CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id text NOT NULL REFERENCES announcements (id) ON DELETE CASCADE,
  employee_id     text NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, employee_id)
);

CREATE INDEX IF NOT EXISTS announcement_reads_employee_id_idx ON announcement_reads (employee_id);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
CREATE TRIGGER departments_set_updated_at   BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER employees_set_updated_at     BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER credentials_set_updated_at   BEFORE UPDATE ON user_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tasks_set_updated_at         BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER attendance_set_updated_at    BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER salary_set_updated_at        BEFORE UPDATE ON salary_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER announcements_set_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER settings_set_updated_at      BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();