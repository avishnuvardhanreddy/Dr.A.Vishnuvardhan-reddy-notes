BEGIN;

CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin')),
  roll_number TEXT,
  department TEXT,
  avatar TEXT,
  auth_provider TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
  ON public.users (LOWER(email));

CREATE TABLE IF NOT EXISTS public.sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx
  ON public.sessions (user_id);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx
  ON public.sessions (expires_at);

CREATE TABLE IF NOT EXISTS public.shared_student_credentials (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  user_id TEXT NOT NULL,
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.otp_requests (
  email TEXT PRIMARY KEY,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.academic_years (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.semesters (
  id TEXT PRIMARY KEY,
  year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  number INTEGER NOT NULL UNIQUE CHECK (number > 0),
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY,
  semester_id TEXT NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('theory', 'lab')),
  description TEXT NOT NULL DEFAULT '',
  credits NUMERIC(4, 1) NOT NULL DEFAULT 0 CHECK (credits >= 0),
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.units (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  unit_number INTEGER NOT NULL CHECK (unit_number > 0),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subject_id, unit_number)
);

CREATE TABLE IF NOT EXISTS public.resources (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('note', 'code', 'file')),
  content TEXT NOT NULL DEFAULT '',
  code_language TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  author_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.resource_files (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  storage_path TEXT NOT NULL,
  uploader_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('subject', 'unit', 'resource', 'notification', 'user', 'file')),
  entity_id TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS semesters_year_id_idx
  ON public.semesters (year_id);
CREATE INDEX IF NOT EXISTS subjects_semester_id_idx
  ON public.subjects (semester_id);
CREATE INDEX IF NOT EXISTS units_subject_order_idx
  ON public.units (subject_id, order_index);
CREATE INDEX IF NOT EXISTS resources_unit_id_idx
  ON public.resources (unit_id);
CREATE INDEX IF NOT EXISTS resource_files_resource_id_idx
  ON public.resource_files (resource_id);
CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx
  ON public.audit_logs (timestamp DESC);

INSERT INTO public.academic_years (id, name, order_index)
VALUES
  ('year-1', '1st Year (B.Tech)', 1),
  ('year-2', '2nd Year (B.Tech)', 2),
  ('year-3', '3rd Year (B.Tech)', 3),
  ('year-4', '4th Year (B.Tech)', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.semesters (id, year_id, number, name)
VALUES
  ('sem-1', 'year-1', 1, 'Semester 1'),
  ('sem-2', 'year-1', 2, 'Semester 2'),
  ('sem-3', 'year-2', 3, 'Semester 3'),
  ('sem-4', 'year-2', 4, 'Semester 4'),
  ('sem-5', 'year-3', 5, 'Semester 5'),
  ('sem-6', 'year-3', 6, 'Semester 6'),
  ('sem-7', 'year-4', 7, 'Semester 7'),
  ('sem-8', 'year-4', 8, 'Semester 8')
ON CONFLICT (id) DO NOTHING;

COMMIT;
