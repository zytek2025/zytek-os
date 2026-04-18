-- ═══════════════════════════════════════════════════════════════
--  ZytekOS — Professional Demo Organization Seed (RELATIONAL FIX)
--  Restaurante: Zytek Demo Lounge
--  PINs de Acceso: Admin (1234), Mesero (5678)
-- ═══════════════════════════════════════════════════════════════

DO $$ 
DECLARE 
    v_demotenant_id uuid := '00000000-0000-0000-0000-0000000000DE';
    v_admin_id      uuid := '00000000-0000-0000-0100-000000000001';
    
    -- IDs de Categorías
    v_cat_pizzas    uuid := '00000000-0000-0000-0200-000000000001';
    v_cat_burgers   uuid := '00000000-0000-0000-0200-000000000002';
    v_cat_bebidas   uuid := '00000000-0000-0000-0200-000000000003';

    -- IDs de Subgrupos (Tamaños)
    v_sg_grande     uuid := '00000000-0000-0000-0300-000000000001';
    v_sg_mediano    uuid := '00000000-0000-0000-0300-000000000002';
BEGIN

    -- 1. Crear el Tenant Demo (si no existe)
    INSERT INTO tenants (id, nombre, pais, tasa, plan)
    VALUES (v_demotenant_id, 'Zytek Demo Lounge', 've', 36.5, 'pro')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Configurar POS Settings
    INSERT INTO pos_settings (tenant_id, impuestos_activos, propinas_activas, propina_porcentaje, tipo_impresion)
    VALUES (v_demotenant_id, true, true, 10.00, 'dual')
    ON CONFLICT (tenant_id) DO NOTHING;

    -- 3. Crear Usuarios (PINs: 1234 y 5678)
    INSERT INTO zytek_users (id, tenant_id, nombre, pin_hash, nivel, rol, color)
    VALUES 
        (v_admin_id, v_demotenant_id, 'Admin Demo', '$2a$10$GtcSdmcSKgs1Rs8nkC0Dtu3NszkMXqiFAURVo09sJhfY/EUgo1tJy', 1, 'Administrador', '#ff7c20'),
        ('00000000-0000-0000-0100-000000000002', v_demotenant_id, 'Mesero Demo', '$2a$10$KJi.R7iNV4hKOdv5.ksDkOYEOsTVsUbeCTtkjM5tGDE9epGPbV466', 5, 'Mesero', '#38b6ff')
    ON CONFLICT (id) DO NOTHING;

    -- 4. Categorías con Lógica de Subgrupos
    DELETE FROM menu_categorias WHERE tenant_id = v_demotenant_id;
    INSERT INTO menu_categorias (id, tenant_id, nombre, emoji, orden, has_subgroups)
    VALUES 
        (v_cat_pizzas,  v_demotenant_id, 'Pizzas', '🍕', 1, true),   -- Tiene Subgrupos (Tamaños)
        (v_cat_burgers, v_demotenant_id, 'Hamburguesas', '🍔', 2, false),
        (v_cat_bebidas, v_demotenant_id, 'Bebidas', '🥤', 3, false);

    -- 5. Crear Subgrupos de Menú
    DELETE FROM menu_subgrupos WHERE tenant_id = v_demotenant_id;
    INSERT INTO menu_subgrupos (id, tenant_id, categoria_id, nombre, emoji, orden)
    VALUES 
        (v_sg_grande,  v_demotenant_id, v_cat_pizzas, 'Grande',  '⭐', 1),
        (v_sg_mediano, v_demotenant_id, v_cat_pizzas, 'Mediana', '◽', 2);

    -- 6. Crear Menú Demo Vinculado
    DELETE FROM menu_items WHERE tenant_id = v_demotenant_id;

    INSERT INTO menu_items (tenant_id, categoria_id, subgroup_id, nombre, precio, emoji, kds_station, activo)
    VALUES 
        -- Pizzas Grandes
        (v_demotenant_id, v_cat_pizzas, v_sg_grande, 'Pizza Margarita G', 18.00, '🍕', 'horno', true),
        (v_demotenant_id, v_cat_pizzas, v_sg_grande, 'Pizza Pepperoni G', 22.00, '🍕', 'horno', true),
        -- Pizzas Medianas
        (v_demotenant_id, v_cat_pizzas, v_sg_mediano, 'Pizza Margarita M', 12.00, '🍕', 'horno', true),
        (v_demotenant_id, v_cat_pizzas, v_sg_mediano, 'Pizza Pepperoni M', 15.00, '🍕', 'horno', true),
        -- Sin Subgrupos
        (v_demotenant_id, v_cat_burgers, NULL, 'Burger Clásica', 10.00, '🍔', 'cocina', true),
        (v_demotenant_id, v_cat_bebidas, NULL, 'Coca Cola 350ml', 2.00, '🥤', 'barra', true);

    -- 7. Licencias
    INSERT INTO zytek_licenses (key, tenant_id, tenant_name, plan, modules, max_users, expires_at)
    VALUES 
        ('ZYTEK-DEMO-BASIC-2025', v_demotenant_id, 'Zytek Demo Basic', 'basic', ARRAY['pos','mesero','kds'], 10, '2026-12-31'),
        ('ZYTEK-DEMO-PRO-2025', v_demotenant_id, 'Zytek Demo Lounge', 'pro', ARRAY['pos','mesero','kds','admin','crm','retail','storage'], 20, '2026-12-31')
    ON CONFLICT (key) DO NOTHING;

    RAISE NOTICE 'Seed mejorado con Subgrupos completado.';
END $$;
