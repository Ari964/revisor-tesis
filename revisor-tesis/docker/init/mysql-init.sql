-- ============================================================
-- Inicialización de MySQL para Revisor de Tesis
-- Se ejecuta automáticamente al primer arranque del contenedor
-- ============================================================

-- Asegurar charset UTF-8
ALTER DATABASE IF EXISTS revisor_tesis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Otorgar privilegios completos al usuario de la aplicación
GRANT ALL PRIVILEGES ON revisor_tesis.* TO 'revisor'@'%';
FLUSH PRIVILEGES;
