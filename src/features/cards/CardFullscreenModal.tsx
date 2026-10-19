import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/design-system/components/IconButton';
import { Text } from '@/design-system/components/Text';
import { colors, spacing } from '@/design-system/tokens';

import { AtlasCard, type AtlasCardData } from './AtlasCard';

const CARD_RATIO = 1.5;
/** Plafond sur très grand écran pour garder une carte lisible, pas un panneau mural. */
const MAX_CARD_WIDTH = 420;

type Props = {
  visible: boolean;
  card: AtlasCardData;
  locked?: boolean;
  quantity?: number;
  onClose: () => void;
};

/** Carte agrandie en overlay pour l’admirer de près. */
export function CardFullscreenModal({ visible, card, locked = false, quantity, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const padX = spacing.lg;
  const padY = spacing.lg + Math.max(insets.top, spacing.md) + Math.max(insets.bottom, spacing.md);
  const maxW = width - padX * 2;
  const maxH = height - padY * 2 - 48;
  const cardWidth = Math.min(MAX_CARD_WIDTH, maxW, Math.floor(maxH / CARD_RATIO));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root} accessibilityViewIsModal>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer l’aperçu"
        />
        <View
          style={[
            styles.toolbar,
            { paddingTop: Math.max(insets.top, spacing.md), paddingHorizontal: spacing.md },
          ]}
          pointerEvents="box-none"
        >
          <Text variant="caption" color={colors.textMuted} style={styles.hint}>
            Touchez pour fermer
          </Text>
          <IconButton icon="close" label="Fermer l’aperçu" onPress={onClose} />
        </View>
        <View style={styles.stage} pointerEvents="box-none" accessible accessibilityLabel={card.title}>
          <AtlasCard card={card} locked={locked} quantity={quantity} width={cardWidth} size="large" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.overlay },
  backdrop: { backgroundColor: colors.nightDeep },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    zIndex: 1,
  },
  hint: { flex: 1 },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
