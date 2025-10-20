-- Tabla de usuarios (gestionada principalmente por Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID REFERENCES auth.users PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    level TEXT DEFAULT 'Noob',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de máquinas
CREATE TABLE IF NOT EXISTS machines (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('Fácil', 'Media', 'Difícil', 'Insane')),
    ip TEXT,
    os TEXT NOT NULL,
    techniques TEXT[] DEFAULT '{}',
    certifications TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    video TEXT,
    platform TEXT DEFAULT 'HTB',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de relación usuario-máquina
CREATE TABLE IF NOT EXISTS user_machines (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('resuelta', 'deseada', 'none')) DEFAULT 'none',
    date_added TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    date_resolved TIMESTAMP WITH TIME ZONE,
    marked_in_calendar BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, machine_id)
);

-- Tabla de notas
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT DEFAULT '00:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de calendario
CREATE TABLE IF NOT EXISTS calendar (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, machine_id, date)
);

-- Tabla de trofeos
CREATE TABLE IF NOT EXISTS trophies (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de certificaciones
CREATE TABLE IF NOT EXISTS certifications (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    description TEXT,
    difficulty TEXT,
    estimated_time TEXT,
    machines_required INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de roadmap (certificación -> máquinas)
CREATE TABLE IF NOT EXISTS certification_machines (
    id SERIAL PRIMARY KEY,
    certification_id INTEGER REFERENCES certifications(id) ON DELETE CASCADE,
    machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    UNIQUE(certification_id, machine_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_user_machines_user_id ON user_machines(user_id);
CREATE INDEX IF NOT EXISTS idx_user_machines_status ON user_machines(status);
CREATE INDEX IF NOT EXISTS idx_notes_user_machine ON notes(user_id, machine_id);
CREATE INDEX IF NOT EXISTS idx_calendar_user_date ON calendar(user_id, date);
CREATE INDEX IF NOT EXISTS idx_machines_difficulty ON machines(difficulty);
CREATE INDEX IF NOT EXISTS idx_machines_os ON machines(os);

-- Políticas de seguridad RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE trophies ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_machines ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios (cada usuario solo ve sus datos)
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Políticas para máquinas (todos pueden ver, solo admin puede modificar)
CREATE POLICY "Anyone can view machines" ON machines FOR SELECT USING (true);
CREATE POLICY "Only admin can modify machines" ON machines FOR ALL USING (auth.jwt() ->> 'email' = 'admin@hacklearn.com');

-- Políticas para user_machines (cada usuario solo ve sus relaciones)
CREATE POLICY "Users can view own user_machines" ON user_machines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own user_machines" ON user_machines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own user_machines" ON user_machines FOR UPDATE USING (auth.uid() = user_id);

-- Políticas similares para las demás tablas...
CREATE POLICY "Users can view own notes" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own notes" ON notes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own calendar" ON calendar FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own calendar" ON calendar FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own trophies" ON trophies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trophies" ON trophies FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Datos de ejemplo para máquinas
INSERT INTO machines (name, difficulty, ip, os, techniques, certifications, tags, video) VALUES
('Lame', 'Fácil', '10.10.10.3', 'Linux', '{"SMB", "Metasploit"}', '{"OSCP"}', '{"Beginner", "SMB"}', 'dQw4w9WgXcQ'),
('Legacy', 'Fácil', '10.10.10.4', 'Windows', '{"SMB", "NetBIOS"}', '{"OSCP"}', '{"Beginner", "SMB"}', 'dQw4w9WgXcQ'),
('Devel', 'Fácil', '10.10.10.5', 'Windows', '{"FTP", "Web"}', '{"OSCP"}', '{"Beginner", "FTP"}', 'dQw4w9WgXcQ'),
('Beep', 'Media', '10.10.10.7', 'Linux', '{"Elastix", "SSH"}', '{"OSCP", "CEH"}', '{"VoIP", "Web"}', 'dQw4w9WgXcQ'),
('Optimum', 'Media', '10.10.10.8', 'Windows', '{"HTTP", "CMS"}', '{"OSCP"}', '{"Web", "CMS"}', 'dQw4w9WgXcQ'),
('Blue', 'Fácil', '10.10.10.9', 'Windows', '{"EternalBlue", "SMB"}', '{"eJPT"}', '{"MS17-010", "SMB"}', 'dQw4w9WgXcQ'),
('Jerry', 'Fácil', '10.10.10.10', 'Windows', '{"Tomcat", "HTTP"}', '{"eJPT"}', '{"Web", "Tomcat"}', 'dQw4w9WgXcQ'),
('Nibbles', 'Fácil', '10.10.10.11', 'Linux', '{"Web", "NibbleBlog"}', '{"CEH"}', '{"Web", "CMS"}', 'dQw4w9WgXcQ')
ON CONFLICT DO NOTHING;

-- Datos de ejemplo para certificaciones
INSERT INTO certifications (name, provider, description, difficulty, estimated_time, machines_required) VALUES
('OSCP (Offensive Security Certified Professional)', 'Offensive Security', 'Certificación de pentesting práctico reconocida mundialmente', 'Avanzado', '2-3 meses', 40),
('CEH (Certified Ethical Hacker)', 'EC-Council', 'Certificación fundamental en hacking ético', 'Intermedio', '1-2 meses', 25),
('eJPT (eLearnSecurity Junior Penetration Tester)', 'eLearnSecurity', 'Certificación inicial perfecta para empezar en pentesting', 'Principiante', '1 mes', 15)
ON CONFLICT DO NOTHING;