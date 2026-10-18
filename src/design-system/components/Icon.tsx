import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../tokens';

export type IconName =
  | 'home'
  | 'globe'
  | 'cards'
  | 'friends'
  | 'pack'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'close'
  | 'plus'
  | 'minus'
  | 'recenter'
  | 'settings'
  | 'user'
  | 'check'
  | 'lock'
  | 'sparkle'
  | 'share'
  | 'list'
  | 'map'
  | 'fragment'
  | 'compass'
  | 'trophy'
  | 'refresh'
  | 'alert'
  | 'info'
  | 'calendar'
  | 'logout'
  | 'trash'
  | 'link'
  | 'filter'
  | 'eye-off';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

/** Icônes dessinées pour Atlas (trait 24×24), sans dépendance externe. */
export function Icon({ name, size = 24, color = colors.text, strokeWidth = 1.8 }: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {renderGlyph(name, common, color)}
    </Svg>
  );
}

type Common = {
  stroke: string;
  strokeWidth: number;
  fill: 'none';
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
};

function renderGlyph(name: IconName, c: Common, color: string) {
  switch (name) {
    case 'home':
      return <Path {...c} d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />;
    case 'globe':
      return (
        <>
          <Circle {...c} cx={12} cy={12} r={9} />
          <Path {...c} d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
        </>
      );
    case 'cards':
      return (
        <>
          <Rect {...c} x={7} y={3} width={13} height={17} rx={2} />
          <Path {...c} d="M4 7v12a2 2 0 0 0 2 2h9" />
        </>
      );
    case 'friends':
      return (
        <>
          <Circle {...c} cx={9} cy={8} r={3.5} />
          <Path {...c} d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
          <Path {...c} d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2" />
        </>
      );
    case 'pack':
      return (
        <>
          <Rect {...c} x={4} y={3} width={16} height={18} rx={2.5} />
          <Path {...c} d="M4 8h16M12 11l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 17l-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z" />
        </>
      );
    case 'chevron-left':
      return <Path {...c} d="M15 5l-7 7 7 7" />;
    case 'chevron-right':
      return <Path {...c} d="M9 5l7 7-7 7" />;
    case 'chevron-down':
      return <Path {...c} d="M5 9l7 7 7-7" />;
    case 'close':
      return <Path {...c} d="M6 6l12 12M18 6 6 18" />;
    case 'plus':
      return <Path {...c} d="M12 5v14M5 12h14" />;
    case 'minus':
      return <Path {...c} d="M5 12h14" />;
    case 'recenter':
      return (
        <>
          <Circle {...c} cx={12} cy={12} r={3} />
          <Path {...c} d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </>
      );
    case 'settings':
      return (
        <>
          <Circle {...c} cx={12} cy={12} r={3} />
          <Path
            {...c}
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
          />
        </>
      );
    case 'user':
      return (
        <>
          <Circle {...c} cx={12} cy={8} r={4} />
          <Path {...c} d="M4 21c.8-4.2 4-6.5 8-6.5s7.2 2.3 8 6.5" />
        </>
      );
    case 'check':
      return <Path {...c} d="M5 12.5l4.5 4.5L19 7" />;
    case 'lock':
      return (
        <>
          <Rect {...c} x={5} y={11} width={14} height={10} rx={2} />
          <Path {...c} d="M8 11V7.5a4 4 0 0 1 8 0V11" />
        </>
      );
    case 'sparkle':
      return (
        <Path
          {...c}
          d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6zM19 16l.7 2.1L22 19l-2.3.9L19 22l-.7-2.1L16 19l2.3-.9z"
        />
      );
    case 'share':
      return <Path {...c} d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />;
    case 'list':
      return <Path {...c} d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />;
    case 'map':
      return <Path {...c} d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5zM9 4v13.5M15 6.5V20" />;
    case 'fragment':
      return <Path {...c} d="M7 4h10l4 5-9 11L3 9zM3 9h18M12 20 8.5 9 10 4M12 20l3.5-11L14 4" />;
    case 'compass':
      return (
        <>
          <Circle {...c} cx={12} cy={12} r={9} />
          <Path {...c} d="M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5z" />
        </>
      );
    case 'trophy':
      return (
        <Path
          {...c}
          d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 21h7M9.5 17h5v4h-5z"
        />
      );
    case 'refresh':
      return <Path {...c} d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" />;
    case 'alert':
      return <Path {...c} d="M12 4 2.5 20h19zM12 10v4.5M12 17.5h.01" />;
    case 'info':
      return (
        <>
          <Circle {...c} cx={12} cy={12} r={9} />
          <Path {...c} d="M12 11v6M12 7.5h.01" />
        </>
      );
    case 'calendar':
      return (
        <>
          <Rect {...c} x={3.5} y={5} width={17} height={16} rx={2} />
          <Path {...c} d="M3.5 10h17M8 3v4M16 3v4" />
        </>
      );
    case 'logout':
      return <Path {...c} d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />;
    case 'trash':
      return <Path {...c} d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3" />;
    case 'link':
      return (
        <Path
          {...c}
          d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"
        />
      );
    case 'filter':
      return <Path {...c} d="M4 5h16l-6 7.5V19l-4 2v-8.5z" />;
    case 'eye-off':
      return (
        <>
          <Path
            {...c}
            d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4 9.5 6a12.6 12.6 0 0 1-2.6 3.4M6.6 7.6C4.6 8.9 3.2 10.7 2.5 12c1 2 4.5 6 9.5 6a9.6 9.6 0 0 0 4.4-1.1"
          />
          <Path {...c} d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
      );
    default: {
      const exhaustive: never = name;
      return <Circle cx={12} cy={12} r={2} fill={color} key={String(exhaustive)} />;
    }
  }
}
