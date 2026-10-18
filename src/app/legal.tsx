import { colors, Screen, SectionHeader, Surface, Text } from '@/design-system';

/**
 * Résumé factuel des données traitées par l'application. L'identité de l'éditeur, le contact
 * et la version juridique définitive doivent être fournis par le porteur du projet (voir docs/SECURITY.md).
 */
export default function LegalScreen() {
  return (
    <Screen back title="Mentions et confidentialité">
      <Surface tone="precious">
        <Text variant="caption">
          Version de travail : l’identité de l’éditeur, l’adresse de contact et les conditions d’utilisation définitives
          seront publiées avant la mise à disposition publique d’Atlas.
        </Text>
      </Surface>

      <SectionHeader title="Données conservées" />
      <Text color={colors.textMuted}>
        • Votre adresse e-mail et votre mot de passe (chiffré) servent uniquement à vous connecter.{'\n'}• Votre pseudo
        et votre code explorateur sont visibles par vos amis.{'\n'}• Votre collection, vos paquets, vos fragments, vos
        expéditions, vos objectifs, vos amitiés et vos défis sont enregistrés pour retrouver votre progression sur tous
        vos appareils.{'\n'}• Les préférences d’animation et de vibration restent sur votre téléphone.
      </Text>

      <SectionHeader title="Ce qu’Atlas ne fait pas" />
      <Text color={colors.textMuted}>
        Atlas n’affiche aucune publicité, ne vend aucun paquet, n’utilise pas de traceur publicitaire et n’envoie pas de
        notification.
      </Text>

      <SectionHeader title="Visibilité" />
      <Text color={colors.textMuted}>
        Par défaut, vos amis voient vos statistiques de collection. Vous pouvez les masquer à tout moment depuis votre
        profil. Votre adresse e-mail n’est jamais visible par les autres joueurs.
      </Text>

      <SectionHeader title="Suppression" />
      <Text color={colors.textMuted}>
        Depuis Paramètres › Supprimer mon compte, vous pouvez effacer immédiatement et définitivement votre compte et
        toutes les données associées.
      </Text>

      <SectionHeader title="Contenus et crédits" />
      <Text color={colors.textMuted}>
        Les contours des pays proviennent de Natural Earth (domaine public), via le jeu de données world-atlas. Les
        textes culturels sont rédigés pour Atlas et accompagnés de leurs sources ; signalez toute erreur à l’équipe.
        Polices : Fraunces et Inter (licence SIL Open Font).
      </Text>
    </Screen>
  );
}
