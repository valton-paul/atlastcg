-- Atlas — boutique de paquets contre fragments (Premium et Légendaire).
-- Remplace l'ancien échange unique `fragment_exchange`.

create or replace function public.exchange_fragments(p_idempotency_key uuid, p_pack_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_shop jsonb := atlas_private.setting('fragment_shop');
  v_offer jsonb;
  v_cost integer;
  v_pack_id uuid;
  v_balance integer;
  v_granted integer;
  v_key text;
begin
  if p_idempotency_key is null or p_pack_slug is null or btrim(p_pack_slug) = '' then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  v_key := 'exchange:' || p_idempotency_key::text;

  select o into v_offer
    from jsonb_array_elements(v_shop -> 'offers') o
   where o ->> 'pack_slug' = p_pack_slug
   limit 1;
  if v_offer is null then
    raise exception 'PACK_UNAVAILABLE' using errcode = 'P0001';
  end if;
  v_cost := (v_offer ->> 'cost')::int;
  if v_cost is null or v_cost < 1 then
    raise exception 'SETTING_MISSING' using errcode = 'P0001';
  end if;

  select id into v_pack_id
    from public.pack_definitions
   where slug = p_pack_slug and status = 'published';
  if v_pack_id is null then
    raise exception 'PACK_UNAVAILABLE' using errcode = 'P0001';
  end if;

  -- Verrou du portefeuille : les échanges concurrents sont sérialisés.
  select fragments into v_balance from public.player_wallets where user_id = v_uid for update;
  if not found then
    raise exception 'INSUFFICIENT_FRAGMENTS' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.reward_grants where user_id = v_uid and grant_key = v_key) then
    return jsonb_build_object('replayed', true, 'packs_granted', 0, 'fragments_balance', v_balance, 'pack_slug', p_pack_slug);
  end if;

  if v_balance < v_cost then
    raise exception 'INSUFFICIENT_FRAGMENTS' using errcode = 'P0001';
  end if;

  v_granted := atlas_private.grant_reward_packs(v_uid, v_key, 'fragment_exchange', null, v_pack_id, 1);

  update public.player_wallets set fragments = fragments - v_cost
   where user_id = v_uid
  returning fragments into v_balance;

  insert into public.resource_ledger (user_id, delta, balance_after, reason, reference_id)
  values (v_uid, -v_cost, v_balance, 'fragment_exchange', null);

  return jsonb_build_object(
    'replayed', false,
    'packs_granted', v_granted,
    'fragments_balance', v_balance,
    'pack_slug', p_pack_slug
  );
end;
$$;

-- Ancienne signature à un seul argument : invalide les appels obsolètes.
drop function if exists public.exchange_fragments(uuid);

revoke all on function public.exchange_fragments(uuid, text) from public, anon;
grant execute on function public.exchange_fragments(uuid, text) to authenticated;

delete from public.economy_settings where key = 'fragment_exchange';
