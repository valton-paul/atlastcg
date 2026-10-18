-- Fichier généré par `npm run content:build` — ne pas modifier à la main.

begin;

insert into public.rarities (rarity, rank, label, duplicate_fragments) values
  ('common', 1, 'Commune', 5),
  ('uncommon', 2, 'Peu commune', 10),
  ('rare', 3, 'Rare', 25),
  ('epic', 4, 'Épique', 50),
  ('legendary', 5, 'Légendaire', 100)
on conflict (rarity) do update set
  rank = excluded.rank, label = excluded.label, duplicate_fragments = excluded.duplicate_fragments;

insert into public.countries (iso_code, iso_numeric, name, name_with_article, name_genitive, capital, continent, region, status) values
  ('FR', '250', 'France', 'la France', 'de la France', 'Paris', 'europe', 'Europe de l''Ouest', 'published'),
  ('IT', '380', 'Italie', 'l''Italie', 'de l''Italie', 'Rome', 'europe', 'Europe du Sud', 'published'),
  ('ES', '724', 'Espagne', 'l''Espagne', 'de l''Espagne', 'Madrid', 'europe', 'Europe du Sud', 'published'),
  ('GR', '300', 'Grèce', 'la Grèce', 'de la Grèce', 'Athènes', 'europe', 'Europe du Sud', 'published'),
  ('DE', '276', 'Allemagne', 'l''Allemagne', 'de l''Allemagne', 'Berlin', 'europe', 'Europe de l''Ouest', 'published'),
  ('NO', '578', 'Norvège', 'la Norvège', 'de la Norvège', 'Oslo', 'europe', 'Europe du Nord', 'published'),
  ('IS', '352', 'Islande', 'l''Islande', 'de l''Islande', 'Reykjavik', 'europe', 'Europe du Nord', 'published'),
  ('JP', '392', 'Japon', 'le Japon', 'du Japon', 'Tokyo', 'asia', 'Asie de l''Est', 'published'),
  ('CN', '156', 'Chine', 'la Chine', 'de la Chine', 'Pékin', 'asia', 'Asie de l''Est', 'published'),
  ('IN', '356', 'Inde', 'l''Inde', 'de l''Inde', 'New Delhi', 'asia', 'Asie du Sud', 'published'),
  ('KR', '410', 'Corée du Sud', 'la Corée du Sud', 'de la Corée du Sud', 'Séoul', 'asia', 'Asie de l''Est', 'published'),
  ('VN', '704', 'Viêt Nam', 'le Viêt Nam', 'du Viêt Nam', 'Hanoï', 'asia', 'Asie du Sud-Est', 'published'),
  ('KH', '116', 'Cambodge', 'le Cambodge', 'du Cambodge', 'Phnom Penh', 'asia', 'Asie du Sud-Est', 'published'),
  ('JO', '400', 'Jordanie', 'la Jordanie', 'de la Jordanie', 'Amman', 'asia', 'Asie de l''Ouest', 'published'),
  ('TR', '792', 'Turquie', 'la Turquie', 'de la Turquie', 'Ankara', 'asia', 'Asie de l''Ouest', 'published'),
  ('EG', '818', 'Égypte', 'l''Égypte', 'de l''Égypte', 'Le Caire', 'africa', 'Afrique du Nord', 'published'),
  ('MA', '504', 'Maroc', 'le Maroc', 'du Maroc', 'Rabat', 'africa', 'Afrique du Nord', 'published'),
  ('SN', '686', 'Sénégal', 'le Sénégal', 'du Sénégal', 'Dakar', 'africa', 'Afrique de l''Ouest', 'published'),
  ('ET', '231', 'Éthiopie', 'l''Éthiopie', 'de l''Éthiopie', 'Addis-Abeba', 'africa', 'Afrique de l''Est', 'published'),
  ('TZ', '834', 'Tanzanie', 'la Tanzanie', 'de la Tanzanie', 'Dodoma', 'africa', 'Afrique de l''Est', 'published'),
  ('ZA', '710', 'Afrique du Sud', 'l''Afrique du Sud', 'de l''Afrique du Sud', 'Pretoria', 'africa', 'Afrique australe', 'published'),
  ('CA', '124', 'Canada', 'le Canada', 'du Canada', 'Ottawa', 'north_america', 'Amérique septentrionale', 'published'),
  ('US', '840', 'États-Unis', 'les États-Unis', 'des États-Unis', 'Washington', 'north_america', 'Amérique septentrionale', 'published'),
  ('MX', '484', 'Mexique', 'le Mexique', 'du Mexique', 'Mexico', 'north_america', 'Amérique centrale', 'published'),
  ('BR', '076', 'Brésil', 'le Brésil', 'du Brésil', 'Brasília', 'south_america', 'Amérique du Sud', 'published'),
  ('AR', '032', 'Argentine', 'l''Argentine', 'de l''Argentine', 'Buenos Aires', 'south_america', 'Amérique du Sud', 'published'),
  ('PE', '604', 'Pérou', 'le Pérou', 'du Pérou', 'Lima', 'south_america', 'Amérique du Sud', 'published'),
  ('CL', '152', 'Chili', 'le Chili', 'du Chili', 'Santiago', 'south_america', 'Amérique du Sud', 'published'),
  ('AU', '036', 'Australie', 'l''Australie', 'de l''Australie', 'Canberra', 'oceania', 'Australie et Nouvelle-Zélande', 'published'),
  ('NZ', '554', 'Nouvelle-Zélande', 'la Nouvelle-Zélande', 'de la Nouvelle-Zélande', 'Wellington', 'oceania', 'Australie et Nouvelle-Zélande', 'published')
on conflict (iso_code) do update set
  iso_numeric = excluded.iso_numeric, name = excluded.name, name_with_article = excluded.name_with_article,
  name_genitive = excluded.name_genitive, capital = excluded.capital, continent = excluded.continent,
  region = excluded.region, status = excluded.status;

insert into public.cards (slug, title, subtitle, category, rarity, country_code, illustration_path, illustration_credit, status, published_at) values
  ('pays-fr', 'France', 'Europe de l''Ouest', 'country', 'common', 'FR', null, null, 'published', now()),
  ('capitale-fr', 'Paris', 'Capitale de la France', 'capital', 'common', 'FR', null, null, 'published', now()),
  ('tour-eiffel', 'Tour Eiffel', 'Paris', 'monument', 'rare', 'FR', null, null, 'published', now()),
  ('pays-it', 'Italie', 'Europe du Sud', 'country', 'common', 'IT', null, null, 'published', now()),
  ('capitale-it', 'Rome', 'Capitale de l''Italie', 'capital', 'uncommon', 'IT', null, null, 'published', now()),
  ('colisee', 'Colisée', 'Rome', 'monument', 'epic', 'IT', null, null, 'published', now()),
  ('pays-es', 'Espagne', 'Europe du Sud', 'country', 'common', 'ES', null, null, 'published', now()),
  ('capitale-es', 'Madrid', 'Capitale de l''Espagne', 'capital', 'common', 'ES', null, null, 'published', now()),
  ('sagrada-familia', 'Sagrada Família', 'Barcelone', 'monument', 'rare', 'ES', null, null, 'published', now()),
  ('pays-gr', 'Grèce', 'Europe du Sud', 'country', 'uncommon', 'GR', null, null, 'published', now()),
  ('capitale-gr', 'Athènes', 'Capitale de la Grèce', 'capital', 'common', 'GR', null, null, 'published', now()),
  ('acropole-athenes', 'Acropole d''Athènes', 'Athènes', 'monument', 'epic', 'GR', null, null, 'published', now()),
  ('pays-de', 'Allemagne', 'Europe de l''Ouest', 'country', 'common', 'DE', null, null, 'published', now()),
  ('capitale-de', 'Berlin', 'Capitale de l''Allemagne', 'capital', 'common', 'DE', null, null, 'published', now()),
  ('porte-de-brandebourg', 'Porte de Brandebourg', 'Berlin', 'monument', 'rare', 'DE', null, null, 'published', now()),
  ('pays-no', 'Norvège', 'Europe du Nord', 'country', 'common', 'NO', null, null, 'published', now()),
  ('capitale-no', 'Oslo', 'Capitale de la Norvège', 'capital', 'uncommon', 'NO', null, null, 'published', now()),
  ('fjords-de-norvege', 'Fjords de l''Ouest norvégien', 'Geirangerfjord et Nærøyfjord', 'geography', 'epic', 'NO', null, null, 'published', now()),
  ('pays-is', 'Islande', 'Europe du Nord', 'country', 'uncommon', 'IS', null, null, 'published', now()),
  ('capitale-is', 'Reykjavik', 'Capitale de l''Islande', 'capital', 'uncommon', 'IS', null, null, 'published', now()),
  ('geysir', 'Geysir', 'Vallée de Haukadalur', 'geography', 'rare', 'IS', null, null, 'published', now()),
  ('pays-jp', 'Japon', 'Asie de l''Est', 'country', 'common', 'JP', null, null, 'published', now()),
  ('capitale-jp', 'Tokyo', 'Capitale du Japon', 'capital', 'common', 'JP', null, null, 'published', now()),
  ('mont-fuji', 'Mont Fuji', 'Honshū', 'culture', 'epic', 'JP', null, null, 'published', now()),
  ('pays-cn', 'Chine', 'Asie de l''Est', 'country', 'common', 'CN', null, null, 'published', now()),
  ('capitale-cn', 'Pékin', 'Capitale de la Chine', 'capital', 'common', 'CN', null, null, 'published', now()),
  ('grande-muraille', 'Grande Muraille', 'Nord de la Chine', 'monument', 'legendary', 'CN', null, null, 'published', now()),
  ('pays-in', 'Inde', 'Asie du Sud', 'country', 'common', 'IN', null, null, 'published', now()),
  ('capitale-in', 'New Delhi', 'Capitale de l''Inde', 'capital', 'uncommon', 'IN', null, null, 'published', now()),
  ('taj-mahal', 'Taj Mahal', 'Agra', 'monument', 'legendary', 'IN', null, null, 'published', now()),
  ('pays-kr', 'Corée du Sud', 'Asie de l''Est', 'country', 'common', 'KR', null, null, 'published', now()),
  ('capitale-kr', 'Séoul', 'Capitale de la Corée du Sud', 'capital', 'common', 'KR', null, null, 'published', now()),
  ('hangeul', 'Hangeul', 'Alphabet coréen', 'culture', 'rare', 'KR', null, null, 'published', now()),
  ('pays-vn', 'Viêt Nam', 'Asie du Sud-Est', 'country', 'common', 'VN', null, null, 'published', now()),
  ('capitale-vn', 'Hanoï', 'Capitale du Viêt Nam', 'capital', 'common', 'VN', null, null, 'published', now()),
  ('baie-ha-long', 'Baie d''Hạ Long', 'Golfe du Tonkin', 'geography', 'epic', 'VN', null, null, 'published', now()),
  ('pays-kh', 'Cambodge', 'Asie du Sud-Est', 'country', 'uncommon', 'KH', null, null, 'published', now()),
  ('capitale-kh', 'Phnom Penh', 'Capitale du Cambodge', 'capital', 'uncommon', 'KH', null, null, 'published', now()),
  ('angkor', 'Angkor', 'Siem Reap', 'monument', 'legendary', 'KH', null, null, 'published', now()),
  ('pays-jo', 'Jordanie', 'Asie de l''Ouest', 'country', 'uncommon', 'JO', null, null, 'published', now()),
  ('capitale-jo', 'Amman', 'Capitale de la Jordanie', 'capital', 'common', 'JO', null, null, 'published', now()),
  ('petra', 'Pétra', 'Wadi Musa', 'monument', 'epic', 'JO', null, null, 'published', now()),
  ('pays-tr', 'Turquie', 'Asie de l''Ouest', 'country', 'common', 'TR', null, null, 'published', now()),
  ('capitale-tr', 'Ankara', 'Capitale de la Turquie', 'capital', 'uncommon', 'TR', null, null, 'published', now()),
  ('sainte-sophie', 'Sainte-Sophie', 'Istanbul', 'monument', 'epic', 'TR', null, null, 'published', now()),
  ('pays-eg', 'Égypte', 'Afrique du Nord', 'country', 'common', 'EG', null, null, 'published', now()),
  ('capitale-eg', 'Le Caire', 'Capitale de l''Égypte', 'capital', 'common', 'EG', null, null, 'published', now()),
  ('pyramides-de-gizeh', 'Pyramides de Gizeh', 'Gizeh', 'monument', 'legendary', 'EG', null, null, 'published', now()),
  ('pays-ma', 'Maroc', 'Afrique du Nord', 'country', 'common', 'MA', null, null, 'published', now()),
  ('capitale-ma', 'Rabat', 'Capitale du Maroc', 'capital', 'uncommon', 'MA', null, null, 'published', now()),
  ('medina-de-fes', 'Médina de Fès', 'Fès', 'monument', 'rare', 'MA', null, null, 'published', now()),
  ('pays-sn', 'Sénégal', 'Afrique de l''Ouest', 'country', 'common', 'SN', null, null, 'published', now()),
  ('capitale-sn', 'Dakar', 'Capitale du Sénégal', 'capital', 'common', 'SN', null, null, 'published', now()),
  ('ile-de-goree', 'Île de Gorée', 'Dakar', 'history', 'rare', 'SN', null, null, 'published', now()),
  ('pays-et', 'Éthiopie', 'Afrique de l''Est', 'country', 'uncommon', 'ET', null, null, 'published', now()),
  ('capitale-et', 'Addis-Abeba', 'Capitale de l''Éthiopie', 'capital', 'common', 'ET', null, null, 'published', now()),
  ('eglises-de-lalibela', 'Églises de Lalibela', 'Amhara', 'monument', 'epic', 'ET', null, null, 'published', now()),
  ('pays-tz', 'Tanzanie', 'Afrique de l''Est', 'country', 'common', 'TZ', null, null, 'published', now()),
  ('capitale-tz', 'Dodoma', 'Capitale de la Tanzanie', 'capital', 'uncommon', 'TZ', null, null, 'published', now()),
  ('kilimandjaro', 'Kilimandjaro', 'Nord de la Tanzanie', 'geography', 'epic', 'TZ', null, null, 'published', now()),
  ('pays-za', 'Afrique du Sud', 'Afrique australe', 'country', 'common', 'ZA', null, null, 'published', now()),
  ('capitale-za', 'Pretoria', 'Capitale de l''Afrique du Sud', 'capital', 'uncommon', 'ZA', null, null, 'published', now()),
  ('robben-island', 'Robben Island', 'Baie de la Table', 'history', 'rare', 'ZA', null, null, 'published', now()),
  ('pays-ca', 'Canada', 'Amérique septentrionale', 'country', 'common', 'CA', null, null, 'published', now()),
  ('capitale-ca', 'Ottawa', 'Capitale du Canada', 'capital', 'common', 'CA', null, null, 'published', now()),
  ('bilinguisme-canadien', 'Bilinguisme canadien', 'Langues officielles', 'culture', 'uncommon', 'CA', null, null, 'published', now()),
  ('pays-us', 'États-Unis', 'Amérique septentrionale', 'country', 'common', 'US', null, null, 'published', now()),
  ('capitale-us', 'Washington', 'Capitale des États-Unis', 'capital', 'common', 'US', null, null, 'published', now()),
  ('grand-canyon', 'Grand Canyon', 'Arizona', 'geography', 'epic', 'US', null, null, 'published', now()),
  ('pays-mx', 'Mexique', 'Amérique centrale', 'country', 'common', 'MX', null, null, 'published', now()),
  ('capitale-mx', 'Mexico', 'Capitale du Mexique', 'capital', 'common', 'MX', null, null, 'published', now()),
  ('chichen-itza', 'Chichén Itzá', 'Yucatán', 'monument', 'epic', 'MX', null, null, 'published', now()),
  ('pays-br', 'Brésil', 'Amérique du Sud', 'country', 'common', 'BR', null, null, 'published', now()),
  ('capitale-br', 'Brasília', 'Capitale du Brésil', 'capital', 'uncommon', 'BR', null, null, 'published', now()),
  ('foret-amazonienne', 'Forêt amazonienne', 'Bassin amazonien', 'geography', 'epic', 'BR', null, null, 'published', now()),
  ('pays-ar', 'Argentine', 'Amérique du Sud', 'country', 'common', 'AR', null, null, 'published', now()),
  ('capitale-ar', 'Buenos Aires', 'Capitale de l''Argentine', 'capital', 'common', 'AR', null, null, 'published', now()),
  ('tango', 'Tango', 'Río de la Plata', 'culture', 'rare', 'AR', null, null, 'published', now()),
  ('pays-pe', 'Pérou', 'Amérique du Sud', 'country', 'common', 'PE', null, null, 'published', now()),
  ('capitale-pe', 'Lima', 'Capitale du Pérou', 'capital', 'common', 'PE', null, null, 'published', now()),
  ('machu-picchu', 'Machu Picchu', 'Cusco', 'monument', 'legendary', 'PE', null, null, 'published', now()),
  ('pays-cl', 'Chili', 'Amérique du Sud', 'country', 'uncommon', 'CL', null, null, 'published', now()),
  ('capitale-cl', 'Santiago', 'Capitale du Chili', 'capital', 'common', 'CL', null, null, 'published', now()),
  ('moai-rapa-nui', 'Moaï de Rapa Nui', 'Île de Pâques', 'monument', 'epic', 'CL', null, null, 'published', now()),
  ('pays-au', 'Australie', 'Australie et Nouvelle-Zélande', 'country', 'common', 'AU', null, null, 'published', now()),
  ('capitale-au', 'Canberra', 'Capitale de l''Australie', 'capital', 'uncommon', 'AU', null, null, 'published', now()),
  ('grande-barriere-de-corail', 'Grande Barrière de corail', 'Queensland', 'geography', 'legendary', 'AU', null, null, 'published', now()),
  ('pays-nz', 'Nouvelle-Zélande', 'Australie et Nouvelle-Zélande', 'country', 'uncommon', 'NZ', null, null, 'published', now()),
  ('capitale-nz', 'Wellington', 'Capitale de la Nouvelle-Zélande', 'capital', 'common', 'NZ', null, null, 'published', now()),
  ('te-reo-maori', 'Te reo māori', 'Langue māori', 'culture', 'rare', 'NZ', null, null, 'published', now())
on conflict (slug) do update set
  title = excluded.title, subtitle = excluded.subtitle, category = excluded.category, rarity = excluded.rarity,
  country_code = excluded.country_code, illustration_path = excluded.illustration_path,
  illustration_credit = excluded.illustration_credit, status = excluded.status,
  published_at = coalesce(public.cards.published_at, excluded.published_at),
  content_version = public.cards.content_version + case
    when (public.cards.title, public.cards.subtitle, public.cards.category, public.cards.rarity)
         is distinct from (excluded.title, excluded.subtitle, excluded.category, excluded.rarity)
    then 1 else 0 end;

insert into public.card_contents (card_id, discovery_text, fun_fact, sources)
select c.id, v.discovery_text, v.fun_fact, v.sources
  from (values
    ('pays-fr', 'Pays d''Europe de l''Ouest ouvert sur la Manche, l''océan Atlantique et la mer Méditerranée.', 'La France métropolitaine est souvent surnommée « l''Hexagone » en raison de sa forme.', array['Encyclopædia Britannica — France']::text[]),
    ('capitale-fr', 'Capitale de la France, traversée par la Seine.', 'L''île de la Cité est le berceau historique de la ville.', array['Encyclopædia Britannica — Paris']::text[]),
    ('tour-eiffel', 'Tour de fer construite par l''entreprise de Gustave Eiffel pour l''Exposition universelle de 1889.', 'Haute d''environ 300 mètres à son inauguration, elle est restée la plus haute structure du monde jusqu''en 1930.', array['Société d''exploitation de la tour Eiffel — Histoire', 'Encyclopædia Britannica — Eiffel Tower']::text[]),
    ('pays-it', 'Péninsule en forme de botte qui s''avance dans la mer Méditerranée.', 'Le territoire italien entoure deux États indépendants : le Vatican et Saint-Marin.', array['CIA — The World Factbook : Italy']::text[]),
    ('capitale-it', 'Capitale de l''Italie, bâtie selon la tradition sur sept collines.', 'La Cité du Vatican, plus petit État du monde, est enclavée dans Rome.', array['Encyclopædia Britannica — Rome']::text[]),
    ('colisee', 'Amphithéâtre de la Rome antique, commencé sous Vespasien et inauguré par l''empereur Titus en 80 apr. J.-C.', 'Il pouvait accueillir plusieurs dizaines de milliers de spectateurs.', array['UNESCO — Centre historique de Rome', 'Encyclopædia Britannica — Colosseum']::text[]),
    ('pays-es', 'Pays qui occupe la majeure partie de la péninsule Ibérique.', 'L''Espagne comprend aussi les archipels des Baléares et des Canaries.', array['CIA — The World Factbook : Spain']::text[]),
    ('capitale-es', 'Capitale de l''Espagne, située au centre de la péninsule Ibérique.', 'Le roi Philippe II y installe la cour en 1561.', array['Encyclopædia Britannica — Madrid']::text[]),
    ('sagrada-familia', 'Basilique de Barcelone dont la construction a commencé en 1882 et à laquelle Antoni Gaudí a consacré la fin de sa vie.', 'Sa façade de la Nativité et sa crypte font partie des œuvres de Gaudí inscrites au patrimoine mondial.', array['UNESCO — Œuvres d''Antoni Gaudí']::text[]),
    ('pays-gr', 'Pays du sud-est de l''Europe formé d''une partie continentale et de milliers d''îles.', 'Le mont Olympe, son plus haut sommet, était considéré comme la demeure des dieux dans la mythologie grecque.', array['Encyclopædia Britannica — Greece', 'Encyclopædia Britannica — Mount Olympus']::text[]),
    ('capitale-gr', 'Capitale de la Grèce et l''une des plus anciennes villes d''Europe.', 'Athènes a accueilli les premiers Jeux olympiques modernes en 1896.', array['Comité international olympique — Athènes 1896']::text[]),
    ('acropole-athenes', 'Colline fortifiée dominant Athènes, couronnée de temples du Ve siècle av. J.-C., dont le Parthénon.', 'Le Parthénon était dédié à la déesse Athéna.', array['UNESCO — Acropole d''Athènes']::text[]),
    ('pays-de', 'Pays d''Europe centrale, le plus peuplé de l''Union européenne.', 'L''Allemagne est un État fédéral composé de 16 Länder.', array['CIA — The World Factbook : Germany']::text[]),
    ('capitale-de', 'Capitale de l''Allemagne réunifiée depuis 1990.', 'Le mur de Berlin a divisé la ville de 1961 à 1989.', array['Encyclopædia Britannica — Berlin Wall']::text[]),
    ('porte-de-brandebourg', 'Porte monumentale néoclassique édifiée à Berlin entre 1788 et 1791.', 'Longtemps située près du mur, elle est devenue un symbole de la réunification allemande.', array['Encyclopædia Britannica — Brandenburg Gate']::text[]),
    ('pays-no', 'Pays nordique qui s''étire le long de la côte occidentale de la péninsule scandinave.', 'Au nord du cercle polaire, le soleil ne se couche pas pendant une partie de l''été.', array['Encyclopædia Britannica — Norway']::text[]),
    ('capitale-no', 'Capitale de la Norvège, au fond de l''Oslofjord.', 'Le prix Nobel de la paix y est remis chaque année.', array['The Nobel Prize — Nobel Peace Prize award ceremony']::text[]),
    ('fjords-de-norvege', 'Longues vallées marines aux parois abruptes, inscrites au patrimoine mondial en 2005.', 'Les fjords sont d''anciennes vallées creusées par les glaciers puis envahies par la mer.', array['UNESCO — Fjords de l''Ouest de la Norvège']::text[]),
    ('pays-is', 'Île de l''Atlantique Nord située sur la dorsale médio-atlantique.', 'L''activité volcanique et géothermique y est particulièrement intense.', array['Encyclopædia Britannica — Iceland']::text[]),
    ('capitale-is', 'Capitale de l''Islande, sur la côte sud-ouest de l''île.', 'C''est la capitale d''État souverain la plus septentrionale du monde.', array['Encyclopædia Britannica — Reykjavík']::text[]),
    ('geysir', 'Source chaude jaillissante du sud-ouest de l''Islande, au cœur d''un champ géothermique.', 'Le mot « geyser » vient du nom de cette source.', array['Encyclopædia Britannica — Geysir']::text[]),
    ('pays-jp', 'Archipel d''Asie de l''Est formé de quatre îles principales et de milliers d''îles plus petites.', 'Les quatre îles principales sont Honshū, Hokkaidō, Kyūshū et Shikoku.', array['CIA — The World Factbook : Japan']::text[]),
    ('capitale-jp', 'Capitale du Japon, située sur l''île de Honshū.', 'La ville s''appelait Edo avant d''être renommée Tokyo en 1868.', array['Encyclopædia Britannica — Tokyo']::text[]),
    ('mont-fuji', 'Volcan culminant à 3 776 mètres, plus haut sommet du Japon.', 'Il est inscrit au patrimoine mondial depuis 2013 comme lieu sacré et source d''inspiration artistique.', array['UNESCO — Fujisan, lieu sacré et source d''inspiration artistique']::text[]),
    ('pays-cn', 'Pays d''Asie de l''Est parmi les plus vastes du monde.', 'Le Yangzi Jiang est le plus long fleuve d''Asie.', array['Encyclopædia Britannica — Yangtze River']::text[]),
    ('capitale-cn', 'Capitale de la Chine, dans le nord du pays.', 'La Cité interdite fut le palais impérial des dynasties Ming et Qing.', array['UNESCO — Palais impériaux des dynasties Ming et Qing']::text[]),
    ('grande-muraille', 'Ensemble de fortifications construites et reconstruites pendant plus de deux millénaires pour protéger les frontières du nord.', 'Contrairement à une idée répandue, elle n''est pas visible à l''œil nu depuis la Lune.', array['UNESCO — La Grande Muraille', 'NASA — China''s Wall Less Great in View from Space']::text[]),
    ('pays-in', 'Pays d''Asie du Sud qui occupe la majeure partie du sous-continent indien.', 'La Constitution indienne reconnaît 22 langues dans sa huitième annexe.', array['Gouvernement de l''Inde — Constitution, huitième annexe']::text[]),
    ('capitale-in', 'Capitale de l''Inde, intégrée au territoire de Delhi.', 'New Delhi a été inaugurée comme capitale en 1931.', array['Encyclopædia Britannica — New Delhi']::text[]),
    ('taj-mahal', 'Mausolée de marbre blanc construit au XVIIe siècle sur ordre de l''empereur moghol Shah Jahan.', 'Il a été édifié en mémoire de son épouse Mumtaz Mahal.', array['UNESCO — Taj Mahal']::text[]),
    ('pays-kr', 'Pays d''Asie de l''Est occupant la moitié sud de la péninsule coréenne.', 'Environ 70 % de son territoire est montagneux.', array['Encyclopædia Britannica — South Korea']::text[]),
    ('capitale-kr', 'Capitale de la Corée du Sud, traversée par le fleuve Han.', 'Le palais Gyeongbokgung y a été construit en 1395.', array['Encyclopædia Britannica — Gyeongbok Palace']::text[]),
    ('hangeul', 'Alphabet créé pour écrire la langue coréenne et promulgué en 1446 sous le roi Sejong le Grand.', 'Il a été conçu pour être appris facilement par l''ensemble de la population.', array['UNESCO — Mémoire du monde : Hunminjeongeum Manuscript']::text[]),
    ('pays-vn', 'Pays d''Asie du Sud-Est en forme de S, bordé par la mer de Chine méridionale.', 'Le delta du Mékong, au sud, est une grande région rizicole.', array['Encyclopædia Britannica — Vietnam']::text[]),
    ('capitale-vn', 'Capitale du Viêt Nam, sur le fleuve Rouge.', 'Hanoï a célébré le millénaire de sa fondation en 2010.', array['Encyclopædia Britannica — Hanoi']::text[]),
    ('baie-ha-long', 'Baie parsemée de milliers d''îlots calcaires, inscrite au patrimoine mondial en 1994.', 'Ses îlots et pitons ont été façonnés par l''érosion du calcaire pendant des millions d''années.', array['UNESCO — Baie d''Ha Long']::text[]),
    ('pays-kh', 'Pays d''Asie du Sud-Est traversé par le Mékong.', 'Le Tonlé Sap est le plus grand lac d''eau douce d''Asie du Sud-Est.', array['UNESCO — Réserve de biosphère du Tonlé Sap']::text[]),
    ('capitale-kh', 'Capitale du Cambodge, au confluent du Mékong et du Tonlé Sap.', 'Selon la tradition, son nom évoque une colline (« phnom ») et une femme appelée Penh.', array['Encyclopædia Britannica — Phnom Penh']::text[]),
    ('angkor', 'Site des capitales successives de l''Empire khmer, du IXe au XVe siècle, dont le temple d''Angkor Vat.', 'Angkor Vat figure sur le drapeau national du Cambodge.', array['UNESCO — Angkor']::text[]),
    ('pays-jo', 'Pays du Proche-Orient bordé par la mer Morte.', 'Les rives de la mer Morte sont le point le plus bas des terres émergées.', array['Encyclopædia Britannica — Dead Sea']::text[]),
    ('capitale-jo', 'Capitale de la Jordanie, bâtie à l''origine sur plusieurs collines.', 'Dans l''Antiquité, la ville portait le nom de Philadelphie.', array['Encyclopædia Britannica — Amman']::text[]),
    ('petra', 'Cité nabatéenne aux façades taillées dans le grès, inscrite au patrimoine mondial en 1985.', 'Pétra était un carrefour des routes caravanières entre l''Arabie, l''Égypte et la Méditerranée.', array['UNESCO — Petra']::text[]),
    ('pays-tr', 'Pays situé à cheval entre l''Asie et l''Europe.', 'Istanbul, sa plus grande ville, s''étend sur les deux rives du Bosphore.', array['Encyclopædia Britannica — Turkey']::text[]),
    ('capitale-tr', 'Capitale de la Turquie, au cœur de l''Anatolie.', 'Ankara est devenue la capitale en 1923, à la place d''Istanbul.', array['Encyclopædia Britannica — Ankara']::text[]),
    ('sainte-sophie', 'Édifice achevé en 537 sous l''empereur byzantin Justinien, célèbre pour sa vaste coupole.', 'Elle fait partie des zones historiques d''Istanbul inscrites au patrimoine mondial.', array['UNESCO — Zones historiques d''Istanbul']::text[]),
    ('pays-eg', 'Pays d''Afrique du Nord-Est traversé par le Nil.', 'La grande majorité de la population vit le long du Nil et dans son delta.', array['CIA — The World Factbook : Egypt']::text[]),
    ('capitale-eg', 'Capitale de l''Égypte, sur les rives du Nil.', 'Le Caire historique est inscrit au patrimoine mondial depuis 1979.', array['UNESCO — Le Caire historique']::text[]),
    ('pyramides-de-gizeh', 'Nécropole royale de l''Ancien Empire, dont la Grande Pyramide construite pour le pharaon Khéops.', 'La Grande Pyramide est la seule des Sept Merveilles du monde antique encore debout.', array['UNESCO — Memphis et sa nécropole', 'Encyclopædia Britannica — Pyramids of Giza']::text[]),
    ('pays-ma', 'Pays d''Afrique du Nord bordé par l''océan Atlantique et la mer Méditerranée.', 'Les montagnes de l''Atlas traversent le pays.', array['Encyclopædia Britannica — Morocco']::text[]),
    ('capitale-ma', 'Capitale du Maroc, sur la côte atlantique.', 'Rabat est inscrite au patrimoine mondial depuis 2012.', array['UNESCO — Rabat, capitale moderne et ville historique']::text[]),
    ('medina-de-fes', 'Vieille ville de Fès, inscrite au patrimoine mondial en 1981.', 'On y trouve la mosquée-université al-Qaraouiyine, fondée selon la tradition en 859.', array['UNESCO — Médina de Fès']::text[]),
    ('pays-sn', 'Pays d''Afrique de l''Ouest ouvert sur l''océan Atlantique.', 'Le fleuve Sénégal marque une partie de sa frontière nord.', array['Encyclopædia Britannica — Senegal']::text[]),
    ('capitale-sn', 'Capitale du Sénégal, sur la presqu''île du Cap-Vert.', 'La pointe des Almadies, près de Dakar, est le point le plus occidental de l''Afrique continentale.', array['Encyclopædia Britannica — Dakar']::text[]),
    ('ile-de-goree', 'Petite île au large de Dakar, inscrite au patrimoine mondial en 1978.', 'Elle est devenue un lieu de mémoire de la traite atlantique des esclaves.', array['UNESCO — Île de Gorée']::text[]),
    ('pays-et', 'Pays de la Corne de l''Afrique dominé par de hauts plateaux.', 'L''Éthiopie utilise son propre calendrier, qui compte treize mois.', array['Encyclopædia Britannica — Ethiopian calendar']::text[]),
    ('capitale-et', 'Capitale de l''Éthiopie et l''une des capitales les plus élevées du monde.', 'La ville accueille le siège de l''Union africaine.', array['Union africaine — Siège']::text[]),
    ('eglises-de-lalibela', 'Onze églises médiévales taillées directement dans la roche, inscrites au patrimoine mondial en 1978.', 'Elles demeurent un lieu de pèlerinage pour les chrétiens orthodoxes éthiopiens.', array['UNESCO — Églises creusées dans le roc de Lalibela']::text[]),
    ('pays-tz', 'Pays d''Afrique de l''Est bordé par l''océan Indien.', 'L''archipel de Zanzibar fait partie de la Tanzanie.', array['CIA — The World Factbook : Tanzania']::text[]),
    ('capitale-tz', 'Capitale officielle de la Tanzanie, au centre du pays.', 'Dar es Salaam, la plus grande ville, reste le principal centre économique.', array['Encyclopædia Britannica — Dodoma']::text[]),
    ('kilimandjaro', 'Massif volcanique isolé qui culmine à 5 895 mètres.', 'C''est le plus haut sommet d''Afrique.', array['UNESCO — Parc national du Kilimandjaro']::text[]),
    ('pays-za', 'Pays situé à la pointe sud du continent africain.', 'Le pays reconnaît douze langues officielles, dont la langue des signes sud-africaine depuis 2023.', array['Gouvernement sud-africain — Constitution Eighteenth Amendment Act (2023)']::text[]),
    ('capitale-za', 'Siège du gouvernement de l''Afrique du Sud.', 'Le pays compte trois capitales : Pretoria (exécutif), Le Cap (législatif) et Bloemfontein (judiciaire).', array['Gouvernement sud-africain — South Africa''s provinces']::text[]),
    ('robben-island', 'Île au large du Cap qui servit de prison politique, inscrite au patrimoine mondial en 1999.', 'Nelson Mandela y a passé 18 de ses 27 années de détention.', array['UNESCO — Robben Island', 'Nelson Mandela Foundation — Biographie']::text[]),
    ('pays-ca', 'Deuxième plus grand pays du monde par la superficie.', 'Le Canada possède le plus long littoral du monde.', array['CIA — The World Factbook : Canada']::text[]),
    ('capitale-ca', 'Capitale du Canada, en Ontario, à la frontière du Québec.', 'Le canal Rideau, qui traverse la ville, est inscrit au patrimoine mondial depuis 2007.', array['UNESCO — Canal Rideau']::text[]),
    ('bilinguisme-canadien', 'Au niveau fédéral, le Canada reconnaît deux langues officielles : l''anglais et le français.', 'La Loi sur les langues officielles a été adoptée en 1969.', array['Commissariat aux langues officielles du Canada']::text[]),
    ('pays-us', 'Pays d''Amérique du Nord composé de 50 États.', 'L''Alaska et Hawaï ne sont pas contigus aux 48 autres États.', array['CIA — The World Factbook : United States']::text[]),
    ('capitale-us', 'Capitale fédérale des États-Unis, dans le district de Columbia.', 'La ville porte le nom de George Washington, premier président du pays.', array['Encyclopædia Britannica — Washington, D.C.']::text[]),
    ('grand-canyon', 'Gorge spectaculaire creusée par le fleuve Colorado, inscrite au patrimoine mondial en 1979.', 'Ses parois révèlent des couches rocheuses formées sur des centaines de millions d''années.', array['UNESCO — Parc national du Grand Canyon', 'U.S. National Park Service — Grand Canyon']::text[]),
    ('pays-mx', 'Pays bordé par l''océan Pacifique et le golfe du Mexique.', 'Le Mexique est le pays hispanophone le plus peuplé du monde.', array['Instituto Cervantes — El español: una lengua viva']::text[]),
    ('capitale-mx', 'Capitale du Mexique, bâtie sur le site de l''ancienne Tenochtitlan aztèque.', 'La ville se situe à plus de 2 200 mètres d''altitude.', array['Encyclopædia Britannica — Mexico City']::text[]),
    ('chichen-itza', 'Grande cité maya de la péninsule du Yucatán, inscrite au patrimoine mondial en 1988.', 'Sa pyramide principale, El Castillo, est aussi appelée temple de Kukulcán.', array['UNESCO — Ville préhispanique de Chichen-Itza']::text[]),
    ('pays-br', 'Le plus grand pays d''Amérique du Sud.', 'Le portugais y est la langue officielle.', array['CIA — The World Factbook : Brazil']::text[]),
    ('capitale-br', 'Capitale du Brésil depuis 1960, construite spécialement pour ce rôle.', 'Son plan, conçu par Lúcio Costa, évoque la silhouette d''un avion ou d''un oiseau.', array['UNESCO — Brasilia']::text[]),
    ('foret-amazonienne', 'Plus grande forêt tropicale du monde, dont environ 60 % se trouve au Brésil.', 'Elle est traversée par l''Amazone et ses nombreux affluents.', array['Encyclopædia Britannica — Amazon Rainforest']::text[]),
    ('pays-ar', 'Pays d''Amérique du Sud qui s''étend des Andes à l''océan Atlantique.', 'L''Aconcagua, plus haut sommet des Amériques, se trouve en Argentine.', array['Encyclopædia Britannica — Aconcagua']::text[]),
    ('capitale-ar', 'Capitale de l''Argentine, sur le Río de la Plata.', 'Ses habitants sont appelés les « porteños ».', array['Encyclopædia Britannica — Buenos Aires']::text[]),
    ('tango', 'Musique et danse nées dans la région du Río de la Plata, entre l''Argentine et l''Uruguay.', 'Le tango est inscrit au patrimoine culturel immatériel de l''UNESCO depuis 2009.', array['UNESCO — Le tango']::text[]),
    ('pays-pe', 'Pays d''Amérique du Sud traversé par la cordillère des Andes.', 'Le lac Titicaca est partagé avec la Bolivie.', array['Encyclopædia Britannica — Lake Titicaca']::text[]),
    ('capitale-pe', 'Capitale du Pérou, sur la côte pacifique.', 'Lima a été fondée en 1535 par le conquistador Francisco Pizarro.', array['Encyclopædia Britannica — Lima']::text[]),
    ('machu-picchu', 'Citadelle inca du XVe siècle perchée dans les Andes, inscrite au patrimoine mondial en 1983.', 'Le site domine la vallée de l''Urubamba à environ 2 400 mètres d''altitude.', array['UNESCO — Sanctuaire historique de Machu Picchu']::text[]),
    ('pays-cl', 'Pays long et étroit entre la cordillère des Andes et l''océan Pacifique.', 'Le désert d''Atacama, au nord, est l''un des plus arides du monde.', array['Encyclopædia Britannica — Atacama Desert']::text[]),
    ('capitale-cl', 'Capitale du Chili, au pied de la cordillère des Andes.', 'Elle a été fondée en 1541 par Pedro de Valdivia.', array['Encyclopædia Britannica — Santiago']::text[]),
    ('moai-rapa-nui', 'Statues monumentales sculptées par les habitants de Rapa Nui, l''île de Pâques.', 'Le parc national de Rapa Nui est inscrit au patrimoine mondial depuis 1995.', array['UNESCO — Parc national de Rapa Nui']::text[]),
    ('pays-au', 'Vaste pays de l''hémisphère Sud, entre l''océan Indien et l''océan Pacifique.', 'L''Australie est une fédération de six États et de plusieurs territoires.', array['CIA — The World Factbook : Australia']::text[]),
    ('capitale-au', 'Capitale de l''Australie, ville entièrement planifiée.', 'Son emplacement a été choisi comme compromis entre Sydney et Melbourne.', array['Encyclopædia Britannica — Canberra']::text[]),
    ('grande-barriere-de-corail', 'Plus grand ensemble de récifs coralliens du monde, au large du Queensland.', 'Elle est inscrite au patrimoine mondial depuis 1981.', array['UNESCO — Grande Barrière']::text[]),
    ('pays-nz', 'Pays insulaire du Pacifique Sud composé de deux îles principales.', 'En langue māori, le pays est appelé Aotearoa.', array['Encyclopædia Britannica — New Zealand']::text[]),
    ('capitale-nz', 'Capitale de la Nouvelle-Zélande, à la pointe sud de l''île du Nord.', 'C''est la capitale d''État souverain la plus australe du monde.', array['Encyclopædia Britannica — Wellington']::text[]),
    ('te-reo-maori', 'Langue du peuple māori, reconnue langue officielle de la Nouvelle-Zélande en 1987.', 'Sa reconnaissance officielle découle de la loi sur la langue māori (Maori Language Act).', array['Te Taura Whiri i te Reo Māori — Commission de la langue māori']::text[])
  ) as v (slug, discovery_text, fun_fact, sources)
  join public.cards c on c.slug = v.slug
on conflict (card_id) do update set
  discovery_text = excluded.discovery_text, fun_fact = excluded.fun_fact, sources = excluded.sources;

insert into public.collections (slug, title, description, collection_type, continent, status, position) values
  ('pays-afrique', 'Pays d''Afrique', 'Les cartes Pays du continent africain.', 'geographic', 'africa', 'published', 1),
  ('pays-amerique-du-nord', 'Pays d''Amérique du Nord', 'Les cartes Pays d''Amérique du Nord et d''Amérique centrale.', 'geographic', 'north_america', 'published', 2),
  ('pays-amerique-du-sud', 'Pays d''Amérique du Sud', 'Les cartes Pays d''Amérique du Sud.', 'geographic', 'south_america', 'published', 3),
  ('pays-asie', 'Pays d''Asie', 'Les cartes Pays du continent asiatique.', 'geographic', 'asia', 'published', 4),
  ('pays-europe', 'Pays d''Europe', 'Les cartes Pays du continent européen.', 'geographic', 'europe', 'published', 5),
  ('pays-oceanie', 'Pays d''Océanie', 'Les cartes Pays d''Océanie.', 'geographic', 'oceania', 'published', 6),
  ('capitales-du-monde', 'Capitales du monde', 'Toutes les capitales du catalogue.', 'geographic', null, 'published', 7),
  ('patrimoine-bati', 'Patrimoine bâti', 'Monuments et sites construits par les sociétés humaines.', 'cultural', null, 'published', 8),
  ('paysages-remarquables', 'Paysages remarquables', 'Reliefs, côtes et milieux naturels d''exception.', 'thematic', null, 'published', 9),
  ('cultures-et-memoires', 'Cultures et mémoires', 'Langues, traditions et lieux de mémoire.', 'cultural', null, 'published', 10)
on conflict (slug) do update set
  title = excluded.title, description = excluded.description, collection_type = excluded.collection_type,
  continent = excluded.continent, status = excluded.status, position = excluded.position;

delete from public.collection_cards
 where collection_id in (select id from public.collections where slug in ('pays-afrique', 'pays-amerique-du-nord', 'pays-amerique-du-sud', 'pays-asie', 'pays-europe', 'pays-oceanie', 'capitales-du-monde', 'patrimoine-bati', 'paysages-remarquables', 'cultures-et-memoires'));

insert into public.collection_cards (collection_id, card_id, position)
select col.id, c.id, v.position
  from (values
    ('pays-afrique', 'pays-eg', 1),
    ('pays-afrique', 'pays-ma', 2),
    ('pays-afrique', 'pays-sn', 3),
    ('pays-afrique', 'pays-et', 4),
    ('pays-afrique', 'pays-tz', 5),
    ('pays-afrique', 'pays-za', 6),
    ('pays-amerique-du-nord', 'pays-ca', 1),
    ('pays-amerique-du-nord', 'pays-us', 2),
    ('pays-amerique-du-nord', 'pays-mx', 3),
    ('pays-amerique-du-sud', 'pays-br', 1),
    ('pays-amerique-du-sud', 'pays-ar', 2),
    ('pays-amerique-du-sud', 'pays-pe', 3),
    ('pays-amerique-du-sud', 'pays-cl', 4),
    ('pays-asie', 'pays-jp', 1),
    ('pays-asie', 'pays-cn', 2),
    ('pays-asie', 'pays-in', 3),
    ('pays-asie', 'pays-kr', 4),
    ('pays-asie', 'pays-vn', 5),
    ('pays-asie', 'pays-kh', 6),
    ('pays-asie', 'pays-jo', 7),
    ('pays-asie', 'pays-tr', 8),
    ('pays-europe', 'pays-fr', 1),
    ('pays-europe', 'pays-it', 2),
    ('pays-europe', 'pays-es', 3),
    ('pays-europe', 'pays-gr', 4),
    ('pays-europe', 'pays-de', 5),
    ('pays-europe', 'pays-no', 6),
    ('pays-europe', 'pays-is', 7),
    ('pays-oceanie', 'pays-au', 1),
    ('pays-oceanie', 'pays-nz', 2),
    ('capitales-du-monde', 'capitale-fr', 1),
    ('capitales-du-monde', 'capitale-it', 2),
    ('capitales-du-monde', 'capitale-es', 3),
    ('capitales-du-monde', 'capitale-gr', 4),
    ('capitales-du-monde', 'capitale-de', 5),
    ('capitales-du-monde', 'capitale-no', 6),
    ('capitales-du-monde', 'capitale-is', 7),
    ('capitales-du-monde', 'capitale-jp', 8),
    ('capitales-du-monde', 'capitale-cn', 9),
    ('capitales-du-monde', 'capitale-in', 10),
    ('capitales-du-monde', 'capitale-kr', 11),
    ('capitales-du-monde', 'capitale-vn', 12),
    ('capitales-du-monde', 'capitale-kh', 13),
    ('capitales-du-monde', 'capitale-jo', 14),
    ('capitales-du-monde', 'capitale-tr', 15),
    ('capitales-du-monde', 'capitale-eg', 16),
    ('capitales-du-monde', 'capitale-ma', 17),
    ('capitales-du-monde', 'capitale-sn', 18),
    ('capitales-du-monde', 'capitale-et', 19),
    ('capitales-du-monde', 'capitale-tz', 20),
    ('capitales-du-monde', 'capitale-za', 21),
    ('capitales-du-monde', 'capitale-ca', 22),
    ('capitales-du-monde', 'capitale-us', 23),
    ('capitales-du-monde', 'capitale-mx', 24),
    ('capitales-du-monde', 'capitale-br', 25),
    ('capitales-du-monde', 'capitale-ar', 26),
    ('capitales-du-monde', 'capitale-pe', 27),
    ('capitales-du-monde', 'capitale-cl', 28),
    ('capitales-du-monde', 'capitale-au', 29),
    ('capitales-du-monde', 'capitale-nz', 30),
    ('patrimoine-bati', 'tour-eiffel', 1),
    ('patrimoine-bati', 'colisee', 2),
    ('patrimoine-bati', 'sagrada-familia', 3),
    ('patrimoine-bati', 'acropole-athenes', 4),
    ('patrimoine-bati', 'porte-de-brandebourg', 5),
    ('patrimoine-bati', 'grande-muraille', 6),
    ('patrimoine-bati', 'taj-mahal', 7),
    ('patrimoine-bati', 'angkor', 8),
    ('patrimoine-bati', 'petra', 9),
    ('patrimoine-bati', 'sainte-sophie', 10),
    ('patrimoine-bati', 'pyramides-de-gizeh', 11),
    ('patrimoine-bati', 'medina-de-fes', 12),
    ('patrimoine-bati', 'eglises-de-lalibela', 13),
    ('patrimoine-bati', 'chichen-itza', 14),
    ('patrimoine-bati', 'machu-picchu', 15),
    ('patrimoine-bati', 'moai-rapa-nui', 16),
    ('paysages-remarquables', 'fjords-de-norvege', 1),
    ('paysages-remarquables', 'geysir', 2),
    ('paysages-remarquables', 'baie-ha-long', 3),
    ('paysages-remarquables', 'kilimandjaro', 4),
    ('paysages-remarquables', 'grand-canyon', 5),
    ('paysages-remarquables', 'foret-amazonienne', 6),
    ('paysages-remarquables', 'grande-barriere-de-corail', 7),
    ('cultures-et-memoires', 'mont-fuji', 1),
    ('cultures-et-memoires', 'hangeul', 2),
    ('cultures-et-memoires', 'ile-de-goree', 3),
    ('cultures-et-memoires', 'robben-island', 4),
    ('cultures-et-memoires', 'bilinguisme-canadien', 5),
    ('cultures-et-memoires', 'tango', 6),
    ('cultures-et-memoires', 'te-reo-maori', 7)
  ) as v (collection_slug, card_slug, position)
  join public.collections col on col.slug = v.collection_slug
  join public.cards c on c.slug = v.card_slug;

insert into public.pack_definitions (slug, name, description, status, cards_per_pack, card_categories, configuration_version, position) values
  ('decouverte', 'Paquet Découverte', 'Le paquet des premiers pas : des pays et leurs capitales.', 'published', 5, array['country', 'capital']::public.card_category[], 1, 1),
  ('exploration', 'Paquet Exploration', 'Le paquet standard : toutes les cartes du catalogue.', 'published', 5, null, 1, 2),
  ('patrimoine', 'Paquet Thématique Patrimoine', 'Monuments, paysages, cultures et lieux de mémoire du monde.', 'published', 5, array['monument', 'geography', 'culture', 'history']::public.card_category[], 1, 3)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, status = excluded.status,
  cards_per_pack = excluded.cards_per_pack, card_categories = excluded.card_categories,
  configuration_version = excluded.configuration_version, position = excluded.position;

create temporary table seed_drop_rates (pack_slug text, configuration_version int, rarity public.card_rarity, probability numeric) on commit drop;
insert into seed_drop_rates values
    ('decouverte', 1, 'common', 0.7),
    ('decouverte', 1, 'uncommon', 0.3),
    ('exploration', 1, 'common', 0.55),
    ('exploration', 1, 'uncommon', 0.27),
    ('exploration', 1, 'rare', 0.11),
    ('exploration', 1, 'epic', 0.06),
    ('exploration', 1, 'legendary', 0.01),
    ('patrimoine', 1, 'uncommon', 0.1),
    ('patrimoine', 1, 'rare', 0.5),
    ('patrimoine', 1, 'epic', 0.32),
    ('patrimoine', 1, 'legendary', 0.08);

insert into public.pack_drop_rates (pack_id, configuration_version, rarity, probability)
select p.id, s.configuration_version, s.rarity, s.probability
  from seed_drop_rates s join public.pack_definitions p on p.slug = s.pack_slug
on conflict (pack_id, configuration_version, rarity) do nothing;

-- Une version publiée est immuable : toute modification des probabilités impose une nouvelle version.
do $$
begin
  if exists (
    select 1
      from public.pack_definitions p
      join public.pack_drop_rates r on r.pack_id = p.id
      left join seed_drop_rates s
        on s.pack_slug = p.slug and s.configuration_version = r.configuration_version and s.rarity = r.rarity
     where r.configuration_version = p.configuration_version
       and p.slug in (select distinct pack_slug from seed_drop_rates)
       and (s.probability is null or s.probability <> r.probability)
  ) then
    raise exception 'DROP_RATES_CHANGED_WITHOUT_VERSION_BUMP';
  end if;
end;
$$;

insert into public.economy_settings (key, value, description) values
  ('starter_reward', '{"pack_slug":"decouverte","quantity":2}'::jsonb, 'Paquets offerts à la création du compte.'),
  ('timed_packs', '{"pack_slug":"exploration","interval_seconds":600,"max_stored":15}'::jsonb, 'Paquets régénérés : un paquet par intervalle, tant que la réserve est sous le plafond.'),
  ('fragment_exchange', '{"pack_slug":"exploration","cost":100}'::jsonb, 'Coût en fragments d''un paquet obtenu par échange.')
on conflict (key) do update set value = excluded.value, description = excluded.description;

insert into public.expeditions (slug, country_code, title, summary, status, reward_pack_id, reward_pack_quantity)
select v.slug, v.country_code, v.title, v.summary, 'published', p.id, 1
  from (values
    ('expedition-fr', 'FR', 'Expédition : France', 'Situe la France, découvre Tour Eiffel et relève un défi de connaissances.'),
    ('expedition-it', 'IT', 'Expédition : Italie', 'Situe l''Italie, découvre Colisée et relève un défi de connaissances.'),
    ('expedition-es', 'ES', 'Expédition : Espagne', 'Situe l''Espagne, découvre Sagrada Família et relève un défi de connaissances.'),
    ('expedition-gr', 'GR', 'Expédition : Grèce', 'Situe la Grèce, découvre Acropole d''Athènes et relève un défi de connaissances.'),
    ('expedition-de', 'DE', 'Expédition : Allemagne', 'Situe l''Allemagne, découvre Porte de Brandebourg et relève un défi de connaissances.'),
    ('expedition-no', 'NO', 'Expédition : Norvège', 'Situe la Norvège, découvre Fjords de l''Ouest norvégien et relève un défi de connaissances.'),
    ('expedition-is', 'IS', 'Expédition : Islande', 'Situe l''Islande, découvre Geysir et relève un défi de connaissances.'),
    ('expedition-jp', 'JP', 'Expédition : Japon', 'Situe le Japon, découvre Mont Fuji et relève un défi de connaissances.'),
    ('expedition-cn', 'CN', 'Expédition : Chine', 'Situe la Chine, découvre Grande Muraille et relève un défi de connaissances.'),
    ('expedition-in', 'IN', 'Expédition : Inde', 'Situe l''Inde, découvre Taj Mahal et relève un défi de connaissances.'),
    ('expedition-kr', 'KR', 'Expédition : Corée du Sud', 'Situe la Corée du Sud, découvre Hangeul et relève un défi de connaissances.'),
    ('expedition-vn', 'VN', 'Expédition : Viêt Nam', 'Situe le Viêt Nam, découvre Baie d''Hạ Long et relève un défi de connaissances.'),
    ('expedition-kh', 'KH', 'Expédition : Cambodge', 'Situe le Cambodge, découvre Angkor et relève un défi de connaissances.'),
    ('expedition-jo', 'JO', 'Expédition : Jordanie', 'Situe la Jordanie, découvre Pétra et relève un défi de connaissances.'),
    ('expedition-tr', 'TR', 'Expédition : Turquie', 'Situe la Turquie, découvre Sainte-Sophie et relève un défi de connaissances.'),
    ('expedition-eg', 'EG', 'Expédition : Égypte', 'Situe l''Égypte, découvre Pyramides de Gizeh et relève un défi de connaissances.'),
    ('expedition-ma', 'MA', 'Expédition : Maroc', 'Situe le Maroc, découvre Médina de Fès et relève un défi de connaissances.'),
    ('expedition-sn', 'SN', 'Expédition : Sénégal', 'Situe le Sénégal, découvre Île de Gorée et relève un défi de connaissances.'),
    ('expedition-et', 'ET', 'Expédition : Éthiopie', 'Situe l''Éthiopie, découvre Églises de Lalibela et relève un défi de connaissances.'),
    ('expedition-tz', 'TZ', 'Expédition : Tanzanie', 'Situe la Tanzanie, découvre Kilimandjaro et relève un défi de connaissances.'),
    ('expedition-za', 'ZA', 'Expédition : Afrique du Sud', 'Situe l''Afrique du Sud, découvre Robben Island et relève un défi de connaissances.'),
    ('expedition-ca', 'CA', 'Expédition : Canada', 'Situe le Canada, découvre Bilinguisme canadien et relève un défi de connaissances.'),
    ('expedition-us', 'US', 'Expédition : États-Unis', 'Situe les États-Unis, découvre Grand Canyon et relève un défi de connaissances.'),
    ('expedition-mx', 'MX', 'Expédition : Mexique', 'Situe le Mexique, découvre Chichén Itzá et relève un défi de connaissances.'),
    ('expedition-br', 'BR', 'Expédition : Brésil', 'Situe le Brésil, découvre Forêt amazonienne et relève un défi de connaissances.'),
    ('expedition-ar', 'AR', 'Expédition : Argentine', 'Situe l''Argentine, découvre Tango et relève un défi de connaissances.'),
    ('expedition-pe', 'PE', 'Expédition : Pérou', 'Situe le Pérou, découvre Machu Picchu et relève un défi de connaissances.'),
    ('expedition-cl', 'CL', 'Expédition : Chili', 'Situe le Chili, découvre Moaï de Rapa Nui et relève un défi de connaissances.'),
    ('expedition-au', 'AU', 'Expédition : Australie', 'Situe l''Australie, découvre Grande Barrière de corail et relève un défi de connaissances.'),
    ('expedition-nz', 'NZ', 'Expédition : Nouvelle-Zélande', 'Situe la Nouvelle-Zélande, découvre Te reo māori et relève un défi de connaissances.')
  ) as v (slug, country_code, title, summary)
  join public.pack_definitions p on p.slug = 'exploration'
on conflict (slug) do update set
  country_code = excluded.country_code, title = excluded.title, summary = excluded.summary,
  status = excluded.status, reward_pack_id = excluded.reward_pack_id,
  reward_pack_quantity = excluded.reward_pack_quantity;

create temporary table seed_steps (expedition_slug text, position smallint, kind public.expedition_step_kind, title text, prompt text, body text, choices text[], explanation text, correct_choice smallint) on commit drop;
insert into seed_steps values
    ('expedition-fr', 1, 'locate', 'Situer la France', 'La France se trouve en Europe (Europe de l''Ouest). Quelle est sa capitale ?', null, array['Paris', 'Athènes', 'Berlin', 'Madrid']::text[], 'Paris est la capitale de la France.', 0),
    ('expedition-fr', 2, 'discover', 'Découvrir : Tour Eiffel', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Tour de fer construite par l''entreprise de Gustave Eiffel pour l''Exposition universelle de 1889. Haute d''environ 300 mètres à son inauguration, elle est restée la plus haute structure du monde jusqu''en 1930.', null, 'Tour Eiffel fait désormais partie de ton carnet de route.', null),
    ('expedition-fr', 3, 'quiz', 'Défi de connaissances', 'Pour quel événement la tour Eiffel a-t-elle été construite ?', null, array['L''Exposition universelle de 1889', 'Les Jeux olympiques de 1924', 'Le sacre de Napoléon Ier', 'L''inauguration du métro de Paris']::text[], 'La tour a été construite pour l''Exposition universelle de 1889 à Paris.', 0),
    ('expedition-it', 1, 'locate', 'Situer l''Italie', 'L''Italie se trouve en Europe (Europe du Sud). Quelle est sa capitale ?', null, array['Athènes', 'Berlin', 'Madrid', 'Rome']::text[], 'Rome est la capitale de l''Italie.', 3),
    ('expedition-it', 2, 'discover', 'Découvrir : Colisée', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Amphithéâtre de la Rome antique, commencé sous Vespasien et inauguré par l''empereur Titus en 80 apr. J.-C. Il pouvait accueillir plusieurs dizaines de milliers de spectateurs.', null, 'Colisée fait désormais partie de ton carnet de route.', null),
    ('expedition-it', 3, 'quiz', 'Défi de connaissances', 'Sous quel empereur le Colisée a-t-il été inauguré ?', null, array['Néron', 'Titus', 'Auguste', 'Constantin']::text[], 'Commencé sous Vespasien, le Colisée a été inauguré par son fils Titus en 80 apr. J.-C.', 1),
    ('expedition-es', 1, 'locate', 'Situer l''Espagne', 'L''Espagne se trouve en Europe (Europe du Sud). Quelle est sa capitale ?', null, array['Athènes', 'Berlin', 'Madrid', 'Oslo']::text[], 'Madrid est la capitale de l''Espagne.', 2),
    ('expedition-es', 2, 'discover', 'Découvrir : Sagrada Família', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Basilique de Barcelone dont la construction a commencé en 1882 et à laquelle Antoni Gaudí a consacré la fin de sa vie. Sa façade de la Nativité et sa crypte font partie des œuvres de Gaudí inscrites au patrimoine mondial.', null, 'Sagrada Família fait désormais partie de ton carnet de route.', null),
    ('expedition-es', 3, 'quiz', 'Défi de connaissances', 'Quel architecte est associé à la Sagrada Família ?', null, array['Le Corbusier', 'Oscar Niemeyer', 'Antoni Gaudí', 'Frank Gehry']::text[], 'Antoni Gaudí a repris le projet en 1883 et y a travaillé jusqu''à sa mort en 1926.', 2),
    ('expedition-gr', 1, 'locate', 'Situer la Grèce', 'La Grèce se trouve en Europe (Europe du Sud). Quelle est sa capitale ?', null, array['Berlin', 'Madrid', 'Oslo', 'Athènes']::text[], 'Athènes est la capitale de la Grèce.', 3),
    ('expedition-gr', 2, 'discover', 'Découvrir : Acropole d''Athènes', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Colline fortifiée dominant Athènes, couronnée de temples du Ve siècle av. J.-C., dont le Parthénon. Le Parthénon était dédié à la déesse Athéna.', null, 'Acropole d''Athènes fait désormais partie de ton carnet de route.', null),
    ('expedition-gr', 3, 'quiz', 'Défi de connaissances', 'À quelle divinité le Parthénon est-il dédié ?', null, array['Zeus', 'Poséidon', 'Apollon', 'Athéna']::text[], 'Le Parthénon, sur l''Acropole, était le temple d''Athéna, protectrice de la cité.', 3),
    ('expedition-de', 1, 'locate', 'Situer l''Allemagne', 'L''Allemagne se trouve en Europe (Europe de l''Ouest). Quelle est sa capitale ?', null, array['Athènes', 'Berlin', 'Madrid', 'Oslo']::text[], 'Berlin est la capitale de l''Allemagne.', 1),
    ('expedition-de', 2, 'discover', 'Découvrir : Porte de Brandebourg', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Porte monumentale néoclassique édifiée à Berlin entre 1788 et 1791. Longtemps située près du mur, elle est devenue un symbole de la réunification allemande.', null, 'Porte de Brandebourg fait désormais partie de ton carnet de route.', null),
    ('expedition-de', 3, 'quiz', 'Défi de connaissances', 'Que symbolise aujourd''hui la porte de Brandebourg ?', null, array['La réunification allemande', 'La Révolution française', 'La fondation de l''Union européenne', 'Le traité de Versailles']::text[], 'Proche du tracé du mur, la porte a été rouverte en 1989 et symbolise la réunification.', 0),
    ('expedition-no', 1, 'locate', 'Situer la Norvège', 'La Norvège se trouve en Europe (Europe du Nord). Quelle est sa capitale ?', null, array['Athènes', 'Oslo', 'Berlin', 'Madrid']::text[], 'Oslo est la capitale de la Norvège.', 1),
    ('expedition-no', 2, 'discover', 'Découvrir : Fjords de l''Ouest norvégien', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Longues vallées marines aux parois abruptes, inscrites au patrimoine mondial en 2005. Les fjords sont d''anciennes vallées creusées par les glaciers puis envahies par la mer.', null, 'Fjords de l''Ouest norvégien fait désormais partie de ton carnet de route.', null),
    ('expedition-no', 3, 'quiz', 'Défi de connaissances', 'Comment les fjords norvégiens se sont-ils formés ?', null, array['Par des éruptions volcaniques', 'Par l''érosion des glaciers', 'Par la chute de météorites', 'Par des travaux humains']::text[], 'Les glaciers ont creusé de profondes vallées que la mer a envahies après leur retrait.', 1),
    ('expedition-is', 1, 'locate', 'Situer l''Islande', 'L''Islande se trouve en Europe (Europe du Nord). Quelle est sa capitale ?', null, array['Athènes', 'Berlin', 'Reykjavik', 'Madrid']::text[], 'Reykjavik est la capitale de l''Islande.', 2),
    ('expedition-is', 2, 'discover', 'Découvrir : Geysir', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Source chaude jaillissante du sud-ouest de l''Islande, au cœur d''un champ géothermique. Le mot « geyser » vient du nom de cette source.', null, 'Geysir fait désormais partie de ton carnet de route.', null),
    ('expedition-is', 3, 'quiz', 'Défi de connaissances', 'D''où vient le mot « geyser » ?', null, array['D''un mot latin signifiant vapeur', 'D''un volcan japonais', 'D''une source jaillissante islandaise', 'D''un explorateur norvégien']::text[], 'Le Geysir islandais a donné son nom à toutes les sources jaillissantes de ce type.', 2),
    ('expedition-jp', 1, 'locate', 'Situer le Japon', 'Le Japon se trouve en Asie (Asie de l''Est). Quelle est sa capitale ?', null, array['Amman', 'Ankara', 'Tokyo', 'Hanoï']::text[], 'Tokyo est la capitale du Japon.', 2),
    ('expedition-jp', 2, 'discover', 'Découvrir : Mont Fuji', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Volcan culminant à 3 776 mètres, plus haut sommet du Japon. Il est inscrit au patrimoine mondial depuis 2013 comme lieu sacré et source d''inspiration artistique.', null, 'Mont Fuji fait désormais partie de ton carnet de route.', null),
    ('expedition-jp', 3, 'quiz', 'Défi de connaissances', 'Quelle est l''altitude du mont Fuji ?', null, array['1 250 mètres', '3 776 mètres', '5 895 mètres', '8 849 mètres']::text[], 'Le mont Fuji culmine à 3 776 mètres ; 5 895 mètres est l''altitude du Kilimandjaro et 8 849 mètres celle de l''Everest.', 1),
    ('expedition-cn', 1, 'locate', 'Situer la Chine', 'La Chine se trouve en Asie (Asie de l''Est). Quelle est sa capitale ?', null, array['Amman', 'Ankara', 'Hanoï', 'Pékin']::text[], 'Pékin est la capitale de la Chine.', 3),
    ('expedition-cn', 2, 'discover', 'Découvrir : Grande Muraille', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Ensemble de fortifications construites et reconstruites pendant plus de deux millénaires pour protéger les frontières du nord. Contrairement à une idée répandue, elle n''est pas visible à l''œil nu depuis la Lune.', null, 'Grande Muraille fait désormais partie de ton carnet de route.', null),
    ('expedition-cn', 3, 'quiz', 'Défi de connaissances', 'Quel était le rôle principal de la Grande Muraille ?', null, array['Irriguer les cultures', 'Défendre les frontières du nord', 'Servir d''observatoire astronomique', 'Délimiter les provinces']::text[], 'La muraille servait à protéger les territoires chinois des incursions venues du nord.', 1),
    ('expedition-in', 1, 'locate', 'Situer l''Inde', 'L''Inde se trouve en Asie (Asie du Sud). Quelle est sa capitale ?', null, array['Amman', 'New Delhi', 'Ankara', 'Hanoï']::text[], 'New Delhi est la capitale de l''Inde.', 1),
    ('expedition-in', 2, 'discover', 'Découvrir : Taj Mahal', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Mausolée de marbre blanc construit au XVIIe siècle sur ordre de l''empereur moghol Shah Jahan. Il a été édifié en mémoire de son épouse Mumtaz Mahal.', null, 'Taj Mahal fait désormais partie de ton carnet de route.', null),
    ('expedition-in', 3, 'quiz', 'Défi de connaissances', 'Qui a fait construire le Taj Mahal ?', null, array['L''empereur Akbar', 'L''empereur Ashoka', 'L''empereur Shah Jahan', 'Le roi Rajaraja']::text[], 'Shah Jahan a fait bâtir le Taj Mahal en mémoire de son épouse Mumtaz Mahal.', 2),
    ('expedition-kr', 1, 'locate', 'Situer la Corée du Sud', 'La Corée du Sud se trouve en Asie (Asie de l''Est). Quelle est sa capitale ?', null, array['Amman', 'Ankara', 'Hanoï', 'Séoul']::text[], 'Séoul est la capitale de la Corée du Sud.', 3),
    ('expedition-kr', 2, 'discover', 'Découvrir : Hangeul', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Alphabet créé pour écrire la langue coréenne et promulgué en 1446 sous le roi Sejong le Grand. Il a été conçu pour être appris facilement par l''ensemble de la population.', null, 'Hangeul fait désormais partie de ton carnet de route.', null),
    ('expedition-kr', 3, 'quiz', 'Défi de connaissances', 'Sous quel roi l''alphabet hangeul a-t-il été promulgué ?', null, array['Sejong le Grand', 'Taejo', 'Gojong', 'Gwanggaeto']::text[], 'Le hangeul a été promulgué en 1446 sous le règne de Sejong le Grand.', 0),
    ('expedition-vn', 1, 'locate', 'Situer le Viêt Nam', 'Le Viêt Nam se trouve en Asie (Asie du Sud-Est). Quelle est sa capitale ?', null, array['Hanoï', 'Amman', 'Ankara', 'New Delhi']::text[], 'Hanoï est la capitale du Viêt Nam.', 0),
    ('expedition-vn', 2, 'discover', 'Découvrir : Baie d''Hạ Long', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Baie parsemée de milliers d''îlots calcaires, inscrite au patrimoine mondial en 1994. Ses îlots et pitons ont été façonnés par l''érosion du calcaire pendant des millions d''années.', null, 'Baie d''Hạ Long fait désormais partie de ton carnet de route.', null),
    ('expedition-vn', 3, 'quiz', 'Défi de connaissances', 'De quoi sont principalement composés les îlots de la baie d''Hạ Long ?', null, array['De granite', 'De basalte volcanique', 'De corail', 'De calcaire']::text[], 'La baie est un paysage karstique : ses îlots sont en calcaire érodé.', 3),
    ('expedition-kh', 1, 'locate', 'Situer le Cambodge', 'Le Cambodge se trouve en Asie (Asie du Sud-Est). Quelle est sa capitale ?', null, array['Amman', 'Phnom Penh', 'Ankara', 'Hanoï']::text[], 'Phnom Penh est la capitale du Cambodge.', 1),
    ('expedition-kh', 2, 'discover', 'Découvrir : Angkor', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Site des capitales successives de l''Empire khmer, du IXe au XVe siècle, dont le temple d''Angkor Vat. Angkor Vat figure sur le drapeau national du Cambodge.', null, 'Angkor fait désormais partie de ton carnet de route.', null),
    ('expedition-kh', 3, 'quiz', 'Défi de connaissances', 'Quel monument figure sur le drapeau du Cambodge ?', null, array['La pagode d''Argent', 'Angkor Vat', 'Borobudur', 'Le Palais royal']::text[], 'La silhouette du temple d''Angkor Vat est représentée au centre du drapeau cambodgien.', 1),
    ('expedition-jo', 1, 'locate', 'Situer la Jordanie', 'La Jordanie se trouve en Asie (Asie de l''Ouest). Quelle est sa capitale ?', null, array['Ankara', 'Amman', 'Hanoï', 'New Delhi']::text[], 'Amman est la capitale de la Jordanie.', 1),
    ('expedition-jo', 2, 'discover', 'Découvrir : Pétra', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Cité nabatéenne aux façades taillées dans le grès, inscrite au patrimoine mondial en 1985. Pétra était un carrefour des routes caravanières entre l''Arabie, l''Égypte et la Méditerranée.', null, 'Pétra fait désormais partie de ton carnet de route.', null),
    ('expedition-jo', 3, 'quiz', 'Défi de connaissances', 'Quel peuple a fait de Pétra sa capitale ?', null, array['Les Romains', 'Les Phéniciens', 'Les Nabatéens', 'Les Ottomans']::text[], 'Pétra était la capitale du royaume nabatéen avant son annexion par Rome.', 2),
    ('expedition-tr', 1, 'locate', 'Situer la Turquie', 'La Turquie se trouve en Asie (Asie de l''Ouest). Quelle est sa capitale ?', null, array['Amman', 'Hanoï', 'Ankara', 'New Delhi']::text[], 'Ankara est la capitale de la Turquie.', 2),
    ('expedition-tr', 2, 'discover', 'Découvrir : Sainte-Sophie', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Édifice achevé en 537 sous l''empereur byzantin Justinien, célèbre pour sa vaste coupole. Elle fait partie des zones historiques d''Istanbul inscrites au patrimoine mondial.', null, 'Sainte-Sophie fait désormais partie de ton carnet de route.', null),
    ('expedition-tr', 3, 'quiz', 'Défi de connaissances', 'Sous quel empereur byzantin l''actuelle Sainte-Sophie a-t-elle été construite ?', null, array['Justinien', 'Constantin', 'Théodose', 'Basile II']::text[], 'L''édifice actuel a été construit sous Justinien et achevé en 537.', 0),
    ('expedition-eg', 1, 'locate', 'Situer l''Égypte', 'L''Égypte se trouve en Afrique (Afrique du Nord). Quelle est sa capitale ?', null, array['Addis-Abeba', 'Dakar', 'Le Caire', 'Dodoma']::text[], 'Le Caire est la capitale de l''Égypte.', 2),
    ('expedition-eg', 2, 'discover', 'Découvrir : Pyramides de Gizeh', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Nécropole royale de l''Ancien Empire, dont la Grande Pyramide construite pour le pharaon Khéops. La Grande Pyramide est la seule des Sept Merveilles du monde antique encore debout.', null, 'Pyramides de Gizeh fait désormais partie de ton carnet de route.', null),
    ('expedition-eg', 3, 'quiz', 'Défi de connaissances', 'Pour quel pharaon la Grande Pyramide de Gizeh a-t-elle été construite ?', null, array['Ramsès II', 'Toutânkhamon', 'Akhenaton', 'Khéops']::text[], 'La Grande Pyramide est le tombeau du pharaon Khéops, de la IVe dynastie.', 3),
    ('expedition-ma', 1, 'locate', 'Situer le Maroc', 'Le Maroc se trouve en Afrique (Afrique du Nord). Quelle est sa capitale ?', null, array['Rabat', 'Addis-Abeba', 'Dakar', 'Dodoma']::text[], 'Rabat est la capitale du Maroc.', 0),
    ('expedition-ma', 2, 'discover', 'Découvrir : Médina de Fès', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Vieille ville de Fès, inscrite au patrimoine mondial en 1981. On y trouve la mosquée-université al-Qaraouiyine, fondée selon la tradition en 859.', null, 'Médina de Fès fait désormais partie de ton carnet de route.', null),
    ('expedition-ma', 3, 'quiz', 'Défi de connaissances', 'En quelle année la mosquée-université al-Qaraouiyine a-t-elle été fondée selon la tradition ?', null, array['859', '1200', '1453', '1789']::text[], 'La tradition fait remonter sa fondation à 859, par Fatima al-Fihri.', 0),
    ('expedition-sn', 1, 'locate', 'Situer le Sénégal', 'Le Sénégal se trouve en Afrique (Afrique de l''Ouest). Quelle est sa capitale ?', null, array['Addis-Abeba', 'Dodoma', 'Le Caire', 'Dakar']::text[], 'Dakar est la capitale du Sénégal.', 3),
    ('expedition-sn', 2, 'discover', 'Découvrir : Île de Gorée', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Petite île au large de Dakar, inscrite au patrimoine mondial en 1978. Elle est devenue un lieu de mémoire de la traite atlantique des esclaves.', null, 'Île de Gorée fait désormais partie de ton carnet de route.', null),
    ('expedition-sn', 3, 'quiz', 'Défi de connaissances', 'Que commémore aujourd''hui l''île de Gorée ?', null, array['L''indépendance du Sénégal', 'La traite atlantique des esclaves', 'La fondation de Dakar', 'Les grandes explorations portugaises']::text[], 'Gorée est un lieu de mémoire de la traite atlantique, symbole de la souffrance des personnes déportées.', 1),
    ('expedition-et', 1, 'locate', 'Situer l''Éthiopie', 'L''Éthiopie se trouve en Afrique (Afrique de l''Est). Quelle est sa capitale ?', null, array['Dakar', 'Dodoma', 'Le Caire', 'Addis-Abeba']::text[], 'Addis-Abeba est la capitale de l''Éthiopie.', 3),
    ('expedition-et', 2, 'discover', 'Découvrir : Églises de Lalibela', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Onze églises médiévales taillées directement dans la roche, inscrites au patrimoine mondial en 1978. Elles demeurent un lieu de pèlerinage pour les chrétiens orthodoxes éthiopiens.', null, 'Églises de Lalibela fait désormais partie de ton carnet de route.', null),
    ('expedition-et', 3, 'quiz', 'Défi de connaissances', 'Comment les églises de Lalibela ont-elles été construites ?', null, array['En briques cuites', 'En bois de cèdre', 'Taillées directement dans la roche', 'En pierres importées']::text[], 'Les églises ont été creusées et sculptées dans la roche volcanique, d''un seul bloc.', 2),
    ('expedition-tz', 1, 'locate', 'Situer la Tanzanie', 'La Tanzanie se trouve en Afrique (Afrique de l''Est). Quelle est sa capitale ?', null, array['Addis-Abeba', 'Dakar', 'Dodoma', 'Le Caire']::text[], 'Dodoma est la capitale de la Tanzanie.', 2),
    ('expedition-tz', 2, 'discover', 'Découvrir : Kilimandjaro', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Massif volcanique isolé qui culmine à 5 895 mètres. C''est le plus haut sommet d''Afrique.', null, 'Kilimandjaro fait désormais partie de ton carnet de route.', null),
    ('expedition-tz', 3, 'quiz', 'Défi de connaissances', 'Quel est le plus haut sommet d''Afrique ?', null, array['Le mont Kenya', 'Le Ras Dashen', 'Le mont Cameroun', 'Le Kilimandjaro']::text[], 'Le Kilimandjaro, en Tanzanie, culmine à 5 895 mètres.', 3),
    ('expedition-za', 1, 'locate', 'Situer l''Afrique du Sud', 'L''Afrique du Sud se trouve en Afrique (Afrique australe). Quelle est sa capitale ?', null, array['Addis-Abeba', 'Dakar', 'Dodoma', 'Pretoria']::text[], 'Pretoria est la capitale de l''Afrique du Sud.', 3),
    ('expedition-za', 2, 'discover', 'Découvrir : Robben Island', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Île au large du Cap qui servit de prison politique, inscrite au patrimoine mondial en 1999. Nelson Mandela y a passé 18 de ses 27 années de détention.', null, 'Robben Island fait désormais partie de ton carnet de route.', null),
    ('expedition-za', 3, 'quiz', 'Défi de connaissances', 'Quelle personnalité a été emprisonnée pendant 18 ans sur Robben Island ?', null, array['Desmond Tutu', 'Nelson Mandela', 'Steve Biko', 'Thabo Mbeki']::text[], 'Nelson Mandela a passé 18 années sur Robben Island avant d''être transféré, puis libéré en 1990.', 1),
    ('expedition-ca', 1, 'locate', 'Situer le Canada', 'Le Canada se trouve en Amérique du Nord (Amérique septentrionale). Quelle est sa capitale ?', null, array['Mexico', 'Washington', 'Ottawa', 'Addis-Abeba']::text[], 'Ottawa est la capitale du Canada.', 2),
    ('expedition-ca', 2, 'discover', 'Découvrir : Bilinguisme canadien', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Au niveau fédéral, le Canada reconnaît deux langues officielles : l''anglais et le français. La Loi sur les langues officielles a été adoptée en 1969.', null, 'Bilinguisme canadien fait désormais partie de ton carnet de route.', null),
    ('expedition-ca', 3, 'quiz', 'Défi de connaissances', 'Quelles sont les langues officielles du Canada au niveau fédéral ?', null, array['L''anglais seulement', 'L''anglais et le français', 'Le français et l''inuktitut', 'L''anglais et l''espagnol']::text[], 'L''anglais et le français sont les deux langues officielles fédérales depuis 1969.', 1),
    ('expedition-us', 1, 'locate', 'Situer les États-Unis', 'Les États-Unis se trouve en Amérique du Nord (Amérique septentrionale). Quelle est sa capitale ?', null, array['Mexico', 'Ottawa', 'Washington', 'Addis-Abeba']::text[], 'Washington est la capitale des États-Unis.', 2),
    ('expedition-us', 2, 'discover', 'Découvrir : Grand Canyon', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Gorge spectaculaire creusée par le fleuve Colorado, inscrite au patrimoine mondial en 1979. Ses parois révèlent des couches rocheuses formées sur des centaines de millions d''années.', null, 'Grand Canyon fait désormais partie de ton carnet de route.', null),
    ('expedition-us', 3, 'quiz', 'Défi de connaissances', 'Quel cours d''eau a creusé le Grand Canyon ?', null, array['Le Mississippi', 'Le Missouri', 'Le Colorado', 'Le Rio Grande']::text[], 'Le fleuve Colorado a creusé le canyon au fil de millions d''années.', 2),
    ('expedition-mx', 1, 'locate', 'Situer le Mexique', 'Le Mexique se trouve en Amérique du Nord (Amérique centrale). Quelle est sa capitale ?', null, array['Ottawa', 'Washington', 'Addis-Abeba', 'Mexico']::text[], 'Mexico est la capitale du Mexique.', 3),
    ('expedition-mx', 2, 'discover', 'Découvrir : Chichén Itzá', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Grande cité maya de la péninsule du Yucatán, inscrite au patrimoine mondial en 1988. Sa pyramide principale, El Castillo, est aussi appelée temple de Kukulcán.', null, 'Chichén Itzá fait désormais partie de ton carnet de route.', null),
    ('expedition-mx', 3, 'quiz', 'Défi de connaissances', 'Quelle civilisation a bâti Chichén Itzá ?', null, array['Les Mayas', 'Les Aztèques', 'Les Incas', 'Les Olmèques']::text[], 'Chichén Itzá est une cité maya du Yucatán.', 0),
    ('expedition-br', 1, 'locate', 'Situer le Brésil', 'Le Brésil se trouve en Amérique du Sud (Amérique du Sud). Quelle est sa capitale ?', null, array['Brasília', 'Buenos Aires', 'Lima', 'Santiago']::text[], 'Brasília est la capitale du Brésil.', 0),
    ('expedition-br', 2, 'discover', 'Découvrir : Forêt amazonienne', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Plus grande forêt tropicale du monde, dont environ 60 % se trouve au Brésil. Elle est traversée par l''Amazone et ses nombreux affluents.', null, 'Forêt amazonienne fait désormais partie de ton carnet de route.', null),
    ('expedition-br', 3, 'quiz', 'Défi de connaissances', 'Quel fleuve traverse la forêt amazonienne ?', null, array['Le Paraná', 'L''Orénoque', 'L''Amazone', 'Le São Francisco']::text[], 'L''Amazone et ses affluents drainent l''ensemble du bassin amazonien.', 2),
    ('expedition-ar', 1, 'locate', 'Situer l''Argentine', 'L''Argentine se trouve en Amérique du Sud (Amérique du Sud). Quelle est sa capitale ?', null, array['Brasília', 'Buenos Aires', 'Lima', 'Santiago']::text[], 'Buenos Aires est la capitale de l''Argentine.', 1),
    ('expedition-ar', 2, 'discover', 'Découvrir : Tango', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Musique et danse nées dans la région du Río de la Plata, entre l''Argentine et l''Uruguay. Le tango est inscrit au patrimoine culturel immatériel de l''UNESCO depuis 2009.', null, 'Tango fait désormais partie de ton carnet de route.', null),
    ('expedition-ar', 3, 'quiz', 'Défi de connaissances', 'Dans quelle région le tango est-il né ?', null, array['La Patagonie', 'Le Río de la Plata', 'La cordillère des Andes', 'La Terre de Feu']::text[], 'Le tango est né dans les villes du Río de la Plata, notamment Buenos Aires et Montevideo.', 1),
    ('expedition-pe', 1, 'locate', 'Situer le Pérou', 'Le Pérou se trouve en Amérique du Sud (Amérique du Sud). Quelle est sa capitale ?', null, array['Brasília', 'Lima', 'Buenos Aires', 'Santiago']::text[], 'Lima est la capitale du Pérou.', 1),
    ('expedition-pe', 2, 'discover', 'Découvrir : Machu Picchu', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Citadelle inca du XVe siècle perchée dans les Andes, inscrite au patrimoine mondial en 1983. Le site domine la vallée de l''Urubamba à environ 2 400 mètres d''altitude.', null, 'Machu Picchu fait désormais partie de ton carnet de route.', null),
    ('expedition-pe', 3, 'quiz', 'Défi de connaissances', 'Quelle civilisation a bâti le Machu Picchu ?', null, array['Les Mayas', 'Les Aztèques', 'Les Olmèques', 'Les Incas']::text[], 'Le Machu Picchu a été construit par les Incas au XVe siècle.', 3),
    ('expedition-cl', 1, 'locate', 'Situer le Chili', 'Le Chili se trouve en Amérique du Sud (Amérique du Sud). Quelle est sa capitale ?', null, array['Brasília', 'Santiago', 'Buenos Aires', 'Lima']::text[], 'Santiago est la capitale du Chili.', 1),
    ('expedition-cl', 2, 'discover', 'Découvrir : Moaï de Rapa Nui', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Statues monumentales sculptées par les habitants de Rapa Nui, l''île de Pâques. Le parc national de Rapa Nui est inscrit au patrimoine mondial depuis 1995.', null, 'Moaï de Rapa Nui fait désormais partie de ton carnet de route.', null),
    ('expedition-cl', 3, 'quiz', 'Défi de connaissances', 'Comment s''appellent les statues monumentales de l''île de Pâques ?', null, array['Les moaï', 'Les menhirs', 'Les totems', 'Les inukshuks']::text[], 'Les moaï ont été sculptés par la population rapanui.', 0),
    ('expedition-au', 1, 'locate', 'Situer l''Australie', 'L''Australie se trouve en Océanie (Australie et Nouvelle-Zélande). Quelle est sa capitale ?', null, array['Canberra', 'Wellington', 'Addis-Abeba', 'Amman']::text[], 'Canberra est la capitale de l''Australie.', 0),
    ('expedition-au', 2, 'discover', 'Découvrir : Grande Barrière de corail', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Plus grand ensemble de récifs coralliens du monde, au large du Queensland. Elle est inscrite au patrimoine mondial depuis 1981.', null, 'Grande Barrière de corail fait désormais partie de ton carnet de route.', null),
    ('expedition-au', 3, 'quiz', 'Défi de connaissances', 'Au large de quel État australien se trouve la Grande Barrière de corail ?', null, array['Victoria', 'Tasmanie', 'Australie-Occidentale', 'Queensland']::text[], 'La Grande Barrière s''étend le long de la côte nord-est, au large du Queensland.', 3),
    ('expedition-nz', 1, 'locate', 'Situer la Nouvelle-Zélande', 'La Nouvelle-Zélande se trouve en Océanie (Australie et Nouvelle-Zélande). Quelle est sa capitale ?', null, array['Wellington', 'Canberra', 'Addis-Abeba', 'Amman']::text[], 'Wellington est la capitale de la Nouvelle-Zélande.', 0),
    ('expedition-nz', 2, 'discover', 'Découvrir : Te reo māori', 'Prends le temps de lire cette découverte, puis poursuis ton expédition.', 'Langue du peuple māori, reconnue langue officielle de la Nouvelle-Zélande en 1987. Sa reconnaissance officielle découle de la loi sur la langue māori (Maori Language Act).', null, 'Te reo māori fait désormais partie de ton carnet de route.', null),
    ('expedition-nz', 3, 'quiz', 'Défi de connaissances', 'En quelle année le te reo māori est-il devenu langue officielle ?', null, array['1840', '1907', '1987', '2015']::text[], 'Le Maori Language Act de 1987 a fait du te reo māori une langue officielle.', 2);

insert into public.expedition_steps (expedition_id, position, kind, title, prompt, body, choices, explanation)
select e.id, s.position, s.kind, s.title, s.prompt, s.body, s.choices, s.explanation
  from seed_steps s join public.expeditions e on e.slug = s.expedition_slug
on conflict (expedition_id, position) do update set
  kind = excluded.kind, title = excluded.title, prompt = excluded.prompt, body = excluded.body,
  choices = excluded.choices, explanation = excluded.explanation;

insert into atlas_private.expedition_step_solutions (step_id, correct_choice)
select st.id, s.correct_choice
  from seed_steps s
  join public.expeditions e on e.slug = s.expedition_slug
  join public.expedition_steps st on st.expedition_id = e.id and st.position = s.position
 where s.correct_choice is not null
on conflict (step_id) do update set correct_choice = excluded.correct_choice;

insert into public.objectives (slug, title, description, kind, target, collection_id, reward_pack_id, reward_pack_quantity, status, position)
select v.slug, v.title, v.description, v.kind::public.objective_kind, v.target, col.id, p.id, v.quantity, 'published', v.position
  from (values
    ('premiers-pas', 'Premiers pas', 'Possède 10 cartes différentes.', 'cards_owned', 10, null, 'exploration', 1, 1),
    ('voyageur', 'Voyageur', 'Découvre 10 pays.', 'countries_discovered', 10, null, 'exploration', 1, 2),
    ('premiere-expedition', 'Première expédition', 'Termine une expédition.', 'expeditions_completed', 1, null, 'patrimoine', 1, 3),
    ('collectionneur', 'Collectionneur', 'Possède 30 cartes différentes.', 'cards_owned', 30, null, 'patrimoine', 1, 4),
    ('six-continents', 'Six continents', 'Découvre au moins un pays sur chaque continent.', 'continents_discovered', 6, null, 'patrimoine', 1, 5),
    ('explorateur-confirme', 'Explorateur confirmé', 'Termine 5 expéditions.', 'expeditions_completed', 5, null, 'exploration', 2, 6),
    ('grand-collectionneur', 'Grand collectionneur', 'Possède 60 cartes différentes.', 'cards_owned', 60, null, 'exploration', 2, 7),
    ('album-pays-europe', 'Album complet : Europe', 'Complète la collection Pays d''Europe.', 'collection_completed', 1, 'pays-europe', 'patrimoine', 1, 8),
    ('album-pays-asie', 'Album complet : Asie', 'Complète la collection Pays d''Asie.', 'collection_completed', 1, 'pays-asie', 'patrimoine', 1, 9),
    ('album-pays-afrique', 'Album complet : Afrique', 'Complète la collection Pays d''Afrique.', 'collection_completed', 1, 'pays-afrique', 'patrimoine', 1, 10),
    ('album-capitales', 'Album complet : Capitales', 'Complète la collection Capitales du monde.', 'collection_completed', 1, 'capitales-du-monde', 'exploration', 2, 11)
  ) as v (slug, title, description, kind, target, collection_slug, pack_slug, quantity, position)
  join public.pack_definitions p on p.slug = v.pack_slug
  left join public.collections col on col.slug = v.collection_slug
on conflict (slug) do update set
  title = excluded.title, description = excluded.description, kind = excluded.kind, target = excluded.target,
  collection_id = excluded.collection_id, reward_pack_id = excluded.reward_pack_id,
  reward_pack_quantity = excluded.reward_pack_quantity, status = excluded.status, position = excluded.position;

commit;
