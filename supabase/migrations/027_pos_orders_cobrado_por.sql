-- 027 - Agregar cobrado_por a pos_orders
-- Separa el usuario que atendio (waiter_id) del que cobro
-- Parte del Bloque A.2

alter table pos_orders
  add column if not exists cobrado_por uuid references zytek_users(id);

create index if not exists idx_orders_cobrado_por
  on pos_orders(cobrado_por)
  where cobrado_por is not null;

comment on column pos_orders.cobrado_por is
  'Usuario (nivel 4+) que proceso el cobro. Distinto de waiter_id cuando mesero atiende y cajero cobra.';
