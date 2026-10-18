import { useRouter } from 'expo-router';
import { StyleSheet, Switch, View } from 'react-native';

import { Button, Chip, colors, Screen, SectionHeader, spacing, Surface, Text } from '@/design-system';
import { usePreferences, type MotionPreference } from '@/lib/preferences';

const MOTION_OPTIONS: { key: MotionPreference; label: string }[] = [
  { key: 'system', label: 'Selon l’appareil' },
  { key: 'reduced', label: 'Réduites' },
  { key: 'full', label: 'Complètes' },
];

export default function SettingsScreen() {
  const { preferences, reduceMotion, update } = usePreferences();
  const router = useRouter();

  return (
    <Screen back title="Paramètres">
      <SectionHeader title="Confort" />
      <Surface>
        <Text variant="bodyStrong">Animations</Text>
        <Text variant="caption" color={colors.textMuted}>
          Les animations réduites remplacent les mouvements par de simples fondus, y compris à l’ouverture des paquets.
        </Text>
        <View style={styles.row}>
          {MOTION_OPTIONS.map((option) => (
            <Chip
              key={option.key}
              label={option.label}
              selected={preferences.motion === option.key}
              onPress={() => update({ motion: option.key })}
            />
          ))}
        </View>
        <Text variant="caption" color={colors.textFaint}>
          Actuellement : {reduceMotion ? 'animations réduites' : 'animations complètes'}.
        </Text>
      </Surface>
      <Surface>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text variant="bodyStrong">Vibrations</Text>
            <Text variant="caption" color={colors.textMuted}>
              Retour tactile discret lors des interactions et des révélations.
            </Text>
          </View>
          <Switch
            value={preferences.haptics}
            onValueChange={(haptics) => update({ haptics })}
            accessibilityLabel="Vibrations"
            trackColor={{ true: colors.turquoise, false: colors.slateRaised }}
            thumbColor={colors.text}
          />
        </View>
      </Surface>
      <Text variant="caption" color={colors.textMuted}>
        Atlas ne diffuse aucun son pour le moment et n’envoie aucune notification.
      </Text>

      <SectionHeader title="Compte" />
      <Button label="Mentions et confidentialité" variant="secondary" onPress={() => router.push('/legal')} />
      <Button
        label="Supprimer mon compte"
        icon="trash"
        variant="danger"
        onPress={() => router.push('/delete-account')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
});
