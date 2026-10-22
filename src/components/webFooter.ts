import { Platform, ViewStyle } from 'react-native';

/**
 * Mobile browsers — iOS 26 Safari especially — float their toolbar over the
 * bottom of the page. On the web mockup the page is exactly the window's
 * height and doesn't scroll, so a footer pinned to the bottom ended up under
 * that toolbar with no way to reach it (Rob's iPhone, 2026-10-22).
 *
 * On the web the footer therefore goes at the end of the scrolling content
 * instead: pushed to the bottom when the content is short, with room below it
 * on iPhones and iPads so it can always be scrolled clear of the toolbar. The
 * native apps keep their pinned footers.
 */
export const FOOTER_IN_SCROLL = Platform.OS === 'web';

/**
 * Only iOS browsers float a toolbar over the page bottom; Android's sits at
 * the top. iPadOS reports itself as a Mac, so a touch-screen "Mac" counts too.
 */
function isIOSBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

const TOOLBAR_CLEARANCE = FOOTER_IN_SCROLL && isIOSBrowser() ? 120 : 0;

/** Added to a ScrollView's contentContainerStyle on screens whose footer scrolls. */
export const footerScrollContent: ViewStyle | null = FOOTER_IN_SCROLL
  ? { flexGrow: 1, paddingBottom: TOOLBAR_CLEARANCE }
  : null;

/** Goes between the content and the footer inside the ScrollView, to push the footer down. */
export const footerSpacer: ViewStyle = { flexGrow: 1 };
