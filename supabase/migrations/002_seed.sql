-- ═══════════════════════════════════════════════════════════════
--  ZytekOS — Seed Data (dev/testing only)
--  All PINs stored as bcrypt hashes (cost 10)
--  PIN map: Daniel=1369, Admin=2580, Cajero=1234, Mesero=5678
--
--  To generate fresh hashes:
--    node -e "const b=require('bcryptjs'); console.log(b.hashSync('1369',10))"
-- ═══════════════════════════════════════════════════════════════

-- Demo tenant
INSERT INTO tenants (id, nombre, pais, tasa, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Restaurante Demo', 've', 36.5, 'pro')
ON CONFLICT (id) DO NOTHING;

-- Demo users — bcrypt hashed PINs (cost=10, no plain text ever)
-- PINs: Daniel=1369, Admin=1234, Cajero=4321, Mesero=5678
-- Re-run: node -e "require('bcryptjs').hashSync('PIN',10)" to regenerate
INSERT INTO zytek_users (id, tenant_id, nombre, pin_hash, nivel, rol, color) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001',
   'Daniel F.', '$2a$10$vNaSuoBt4W.xz1NeXymmmuRxpvNJGFqZosOIRKJO6Hzau/KXqFtUW', 1, 'Super Admin',   '#ff7c20'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
   'Admin',     '$2a$10$ZDFJlcpXS8QokblQI7mofedIIVafX90P6DRzPOCTxvK3VwLljRX4S', 2, 'Administrador', '#38b6ff'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001',
   'Cajero',    '$2a$10$FE9Nn/6PvG/7Y4yLgjjv.OZbsB3VUfNkR/ZiWV4fn34CQBl.t5ypC', 4, 'Cajero',        '#2ee87a'),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001',
   'Mesero 1',  '$2a$10$QsjrybU6LxlTII9t8jRgm.KcORqdpxfb10PUsrmmyS4gpE5T7/mTG', 5, 'Mesero',        '#a855f7')
ON CONFLICT (id) DO NOTHING;

-- Demo menu items
INSERT INTO menu_items (id, tenant_id, nombre, cat, precio, emoji, kds_station, activo) VALUES
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000001', 'Pabellón Criollo',  'Platos',   12.50, '🍛', 'cocina',   true),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000001', 'Arepa de Pollo',   'Entradas',  5.00, '🫓', 'cocina',   true),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000001', 'Churrasco',         'Platos',   18.00, '🥩', 'parrilla', true),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000001', 'Jugo Natural',      'Bebidas',   4.00, '🧃', 'barra',    true),
  ('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0000-000000000001', 'Coca Cola',         'Bebidas',   3.50, '🥤', 'barra',    true),
  ('00000000-0000-0000-0002-000000000006', '00000000-0000-0000-0000-000000000001', 'Agua Mineral',      'Bebidas',   2.00, '💧', 'barra',    true),
  ('00000000-0000-0000-0002-000000000007', '00000000-0000-0000-0000-000000000001', 'Pastel de Pollo',   'Postres',   6.00, '🥧', 'cocina',   true),
  ('00000000-0000-0000-0002-000000000008', '00000000-0000-0000-0000-000000000001', 'Quesillo',          'Postres',   5.50, '🍮', 'cocina',   true)
ON CONFLICT (id) DO NOTHING;

-- Demo inventario
INSERT INTO inventario (tenant_id, nom, cat, uni, stock, min, costo) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Carne de Res',    'Carnes',    'kg',   15.0,  5.0, 8.00),
  ('00000000-0000-0000-0000-000000000001', 'Pollo',           'Carnes',    'kg',   20.0,  8.0, 4.50),
  ('00000000-0000-0000-0000-000000000001', 'Harina PAN',      'Harinas',   'kg',   30.0, 10.0, 1.20),
  ('00000000-0000-0000-0000-000000000001', 'Caraotas Negras', 'Granos',    'kg',    8.0,  3.0, 2.00),
  ('00000000-0000-0000-0000-000000000001', 'Arroz Blanco',    'Granos',    'kg',   25.0,  8.0, 1.50),
  ('00000000-0000-0000-0000-000000000001', 'Coca Cola 250ml', 'Bebidas',   'und',  48.0, 12.0, 0.80),
  ('00000000-0000-0000-0000-000000000001', 'Agua Mineral',    'Bebidas',   'und',  36.0, 12.0, 0.50)
ON CONFLICT DO NOTHING;

-- Demo clientes
INSERT INTO clientes (tenant_id, nombre, tel, visitas, gasto, puntos, nivel, tipo) VALUES
  ('00000000-0000-0000-0000-000000000001', 'María González',   '0414-1234567', 12,  245.50,  245, 'Bronce', 'regular'),
  ('00000000-0000-0000-0000-000000000001', 'Carlos Rodríguez', '0424-9876543', 28,  892.00,  892, 'Plata',  'regular'),
  ('00000000-0000-0000-0000-000000000001', 'Ana Martínez',     '0412-5551234', 45, 1850.00, 1850, 'Oro',    'corporativo'),
  ('00000000-0000-0000-0000-000000000001', 'Luis Pérez',       '0416-7778888',  5,   98.50,   98, 'Bronce', 'regular')
ON CONFLICT DO NOTHING;

-- Demo license
INSERT INTO zytek_licenses (key, tenant_id, tenant_name, plan, modules, max_users, expires_at) VALUES
  ('ZYTEK-REST-PRO1-2025', '00000000-0000-0000-0000-000000000001',
   'Restaurante Demo', 'pro', ARRAY['pos','mesero','kds','admin','crm','retail'], 10, '2026-12-31')
ON CONFLICT (key) DO NOTHING;
