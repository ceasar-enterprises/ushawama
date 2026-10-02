import { Platform, Text, TextInput } from 'react-native';

/**
 * Global font policy — iOS look everywhere:
 *  - iOS: system "San Francisco" (native, best quality)
 *  - Android: bundled Inter (via TextStyle patches on relevant components)
 *  - Web: bundled Inter applied via a global stylesheet. The font stack keeps
 *    'ionicons' last in the fallback chain so icon glyphs still resolve.
 */

const WEB_FONT_STACK =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'ionicons'";

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const tag = document.createElement('style');
  tag.id = 'ushawama-font-override';
  tag.textContent =
    'html,body,#root,div,span,h1,h2,h3,h4,h5,h6,p,li,a,button,input,textarea,label{' +
    `font-family:${WEB_FONT_STACK} !important;}`;
  (document.head || document.documentElement).appendChild(tag);
} else if (Platform.OS !== 'ios') {
  const base = { fontFamily: 'Inter' };
  const T = Text as any;
  const TI = TextInput as any;
  if (T.defaultProps) {
    T.defaultProps = { ...T.defaultProps, style: [base, T.defaultProps.style] };
  } else {
    T.defaultProps = { style: base };
  }
  if (TI.defaultProps) {
    TI.defaultProps = { ...TI.defaultProps, style: [base, TI.defaultProps.style] };
  } else {
    TI.defaultProps = { style: base };
  }
}