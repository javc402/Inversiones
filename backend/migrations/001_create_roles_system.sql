-- Crear tabla de roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Insertar roles por defecto
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrador del sistema'),
  ('user', 'Usuario regular')
ON CONFLICT (name) DO NOTHING;

-- Habilitar RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede ver roles
CREATE POLICY "allow_view_roles" ON roles
  FOR SELECT USING (true);

-- Política: Solo admins pueden ver todos los perfiles
CREATE POLICY "admin_view_all_profiles" ON user_profiles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT up.user_id FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE r.name = 'admin' AND up.status = 'active'
    )
  );

-- Política: Usuarios ven su propio perfil
CREATE POLICY "user_view_own_profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Política: Solo admins pueden actualizar perfiles
CREATE POLICY "admin_update_profiles" ON user_profiles
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT up.user_id FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE r.name = 'admin' AND up.status = 'active'
    )
  );

-- Política: Solo admins pueden insertar perfiles
CREATE POLICY "admin_insert_profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT up.user_id FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE r.name = 'admin' AND up.status = 'active'
    )
  );
