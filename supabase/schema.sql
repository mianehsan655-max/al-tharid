-- Backend-only restaurant storage. This schema is not exposed through Supabase's Data API.
begin;
create schema if not exists al_tharid;
revoke all on schema al_tharid from public, anon, authenticated;

create table if not exists al_tharid.state (
  key text primary key check (key in ('site', 'business', 'checkout')),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

create table if not exists al_tharid.orders (
  request_id uuid primary key,
  number text not null unique,
  created_at timestamptz not null,
  phone text not null,
  source text not null check (source in ('website', 'walk-in', 'phone', 'whatsapp')),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  check ((data ->> 'requestId')::uuid = request_id),
  check (data ->> 'number' = number)
);
create unique index if not exists orders_internal_id on al_tharid.orders ((data ->> 'id'));
create index if not exists orders_recent on al_tharid.orders (created_at desc);
create index if not exists orders_phone_rate on al_tharid.orders (phone, created_at desc) where source = 'website';

create table if not exists al_tharid.order_sequences (
  day text primary key check (day ~ '^[0-9]{8}$'),
  last bigint not null check (last >= 0)
);

-- No customer browser or anonymous API access to orders or financial records.
alter table al_tharid.state enable row level security;
alter table al_tharid.orders enable row level security;
alter table al_tharid.order_sequences enable row level security;
revoke all on all tables in schema al_tharid from public, anon, authenticated;
commit;
