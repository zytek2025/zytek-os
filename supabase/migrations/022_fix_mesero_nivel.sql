-- Fix Mesero Demo nivel: 4 → 5 (convención: 1=admin, 5=mesero)
UPDATE zytek_users
SET nivel = 5
WHERE id = '00000000-0000-0000-0100-000000000002'
  AND nivel != 5;
