-- ============================================================
-- TABELA PRINCIPAL DE LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  address    TEXT,
  phone      TEXT,
  site       TEXT,
  email      TEXT,
  niche      TEXT NOT NULL,
  city       TEXT,
  source     TEXT,
  status     TEXT DEFAULT 'novo',
  notes      TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_phone_email
ON leads (phone, email)
WHERE phone IS NOT NULL AND email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_niche ON leads (niche);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads (city);

-- ============================================================
-- TABELA DE DISPAROS
-- ============================================================
CREATE TABLE IF NOT EXISTS disparos (
  id         SERIAL PRIMARY KEY,
  lead_id    INTEGER REFERENCES leads(id) ON DELETE CASCADE,
  canal      TEXT NOT NULL,
  template   TEXT NOT NULL,
  status     TEXT DEFAULT 'pendente',
  sent_at    TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disparos_lead ON disparos (lead_id);
CREATE INDEX IF NOT EXISTS idx_disparos_status ON disparos (status);
