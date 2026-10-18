-- Atlas — sixième rareté « mythique », au-dessus de « légendaire ».
-- La nouvelle valeur d'enum ne peut pas être utilisée dans la transaction qui la crée :
-- la ligne de `public.rarities` et les cartes concernées sont fournies par le seed.

alter type public.card_rarity add value if not exists 'mythic' after 'legendary';

alter table public.rarities drop constraint rarities_rank_check;
alter table public.rarities add constraint rarities_rank_check check (rank between 1 and 6);
