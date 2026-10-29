begin;

-- 1. Orders: one record per confirmed checkout.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id) on delete restrict,

  idempotency_key uuid not null,

  customer_email text not null,
  customer_name varchar(150) not null,
  customer_phone varchar(40) not null,

  shipping_address text not null,
  shipping_city varchar(120) not null,
  shipping_postal_code varchar(20),
  shipping_notes text,

  payment_method text not null default 'cash_on_delivery',
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'failed', 'refunded')),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled'
      )
    ),

  currency char(3) not null default 'TND'
    check (currency = 'TND'),

  subtotal numeric(10,3) not null check (subtotal >= 0),
  delivery_fee numeric(10,3) not null check (delivery_fee >= 0),
  total numeric(10,3) not null check (total = subtotal + delivery_fee),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint orders_user_idempotency_unique
    unique (user_id, idempotency_key),

  constraint orders_customer_name_not_empty
    check (length(btrim(customer_name)) > 0),

  constraint orders_customer_phone_not_empty
    check (length(btrim(customer_phone)) > 0),

  constraint orders_shipping_address_not_empty
    check (length(btrim(shipping_address)) > 0),

  constraint orders_shipping_city_not_empty
    check (length(btrim(shipping_city)) > 0)
);

create index if not exists orders_user_created_at_idx
  on public.orders (user_id, created_at desc);

create index if not exists orders_status_created_at_idx
  on public.orders (status, created_at desc);


-- 2. Order items: immutable snapshots of the purchased lines.
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references public.orders(id) on delete cascade,

  product_id uuid
    references public.products(id) on delete set null,

  item_type text not null
    check (item_type in ('product', 'beanbox')),

  product_name varchar(150) not null,
  product_slug varchar(180) not null,

  box_slug text,
  configuration_label text,

  quantity integer not null check (quantity > 0),
  unit_price numeric(10,3) not null check (unit_price >= 0),
  line_total numeric(10,3) not null check (line_total >= 0),

  created_at timestamptz not null default now(),

  constraint order_items_line_total_check
    check (line_total = unit_price * quantity),

  constraint order_items_type_check
    check (
      (
        item_type = 'product'
        and product_id is not null
        and box_slug is null
      )
      or
      (
        item_type = 'beanbox'
        and product_id is null
        and box_slug in (
          'discovery-box',
          'classic-box',
          'barista-box',
          'premium-box'
        )
      )
    )
);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);


-- 3. BeanBox components: snapshot each included product.
-- One BeanBox may consume stock from several catalogue products.
create table if not exists public.order_item_components (
  id uuid primary key default gen_random_uuid(),

  order_item_id uuid not null
    references public.order_items(id) on delete cascade,

  product_id uuid not null
    references public.products(id) on delete restrict,

  product_name varchar(150) not null,
  product_slug varchar(180) not null,

  quantity_per_box integer not null
    check (quantity_per_box > 0),

  unit_price numeric(10,3) not null
    check (unit_price >= 0),

  created_at timestamptz not null default now(),

  constraint order_item_component_product_unique
    unique (order_item_id, product_id)
);

create index if not exists order_item_components_product_id_idx
  on public.order_item_components (product_id);


-- 4. Enable RLS. Browser clients cannot directly create or modify orders.
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_components enable row level security;

revoke all on table public.orders
  from anon, authenticated;

revoke all on table public.order_items
  from anon, authenticated;

revoke all on table public.order_item_components
  from anon, authenticated;

grant select on table public.orders to authenticated;
grant select on table public.order_items to authenticated;
grant select on table public.order_item_components to authenticated;


-- Customers can read their own orders; admins can read all orders.
drop policy if exists orders_select_own_or_admin
  on public.orders;

create policy orders_select_own_or_admin
  on public.orders
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );


-- Order-line visibility follows the owning order.
drop policy if exists order_items_select_own_or_admin
  on public.order_items;

create policy order_items_select_own_or_admin
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and (
          o.user_id = (select auth.uid())
          or exists (
            select 1
            from public.profiles p
            where p.id = (select auth.uid())
              and p.role = 'admin'
          )
        )
    )
  );


-- Component visibility follows the owning order as well.
drop policy if exists order_item_components_select_own_or_admin
  on public.order_item_components;

create policy order_item_components_select_own_or_admin
  on public.order_item_components
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_id
        and (
          o.user_id = (select auth.uid())
          or exists (
            select 1
            from public.profiles p
            where p.id = (select auth.uid())
              and p.role = 'admin'
          )
        )
    )
  );

commit;
