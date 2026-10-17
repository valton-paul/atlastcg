-- Atlas — stockage des illustrations du catalogue.
-- Bucket public en lecture (URL publiques, compatibles CDN). Aucune politique d'écriture sur
-- `storage.objects` : seuls le rôle service (script d'import serveur) et le tableau de bord
-- peuvent déposer ou modifier des fichiers.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-illustrations',
  'card-illustrations',
  true,
  1048576,
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;
