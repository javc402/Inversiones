-- Este script debe ejecutarse DESPUÉS de crear el usuario admin via Supabase Auth
-- Instrucciones:
-- 1. Ve a Supabase Auth > Users
-- 2. Crea usuario: jorgeac.villalobos@gmail.com con contraseña: Admin@Inversiones2026!
-- 3. Copia el UUID del usuario
-- 4. Reemplaza 'YOUR_ADMIN_UUID' en el siguiente comando:

-- Insertar perfil de admin (después de crear el usuario en Auth)
-- Reemplazar YOUR_ADMIN_UUID con el UUID real del usuario creado
INSERT INTO user_profiles (user_id, role_id, status)
SELECT 'YOUR_ADMIN_UUID'::UUID, id, 'active'
FROM roles WHERE name = 'admin'
ON CONFLICT (user_id) DO NOTHING;
