/**
 * In-app browser (embedded WebView) detection.
 *
 * Google blocks OAuth sign-in inside embedded WebViews with
 * `403: disallowed_useragent`. Common offenders are the in-app browsers of
 * LINE, Facebook/Messenger, Instagram, Threads, WeChat, KakaoTalk, etc.
 *
 * When detected we prompt the user to reopen the site in the real system
 * browser (Safari/Chrome) so the Google login can succeed.
 */

export interface InAppBrowserInfo {
  /** True when the page is running inside an embedded in-app WebView. */
  isInApp: boolean;
  isAndroid: boolean;
  isIOS: boolean;
}

// Known in-app browser user-agent signatures.
const IN_APP_SIGNATURES = [
  "FBAN",
  "FBAV",
  "FB_IAB",
  "Instagram",
  "Threads",
  "Line/",
  " Line ",
  "LINECubeApp",
  "Twitter",
  "MicroMessenger", // WeChat
  "KAKAOTALK",
  "WhatsApp",
  "Snapchat",
  "Pinterest",
  "TikTok",
  "musical_ly",
  "DingTalk",
];

export function detectInAppBrowser(userAgent?: string): InAppBrowserInfo {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  const matchesSignature = IN_APP_SIGNATURES.some((sig) => ua.includes(sig));

  // Generic WebView heuristics that aren't covered by an explicit signature.
  // Android WebViews include the "; wv)" token.
  const isAndroidWebView = isAndroid && /; wv\)/.test(ua);
  // iOS WebViews report as AppleWebKit/Mobile but omit the "Safari" token that
  // the real Safari browser always includes.
  const isIOSWebView =
    isIOS && /AppleWebKit/.test(ua) && /Mobile/.test(ua) && !/Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);

  return {
    isInApp: matchesSignature || isAndroidWebView || isIOSWebView,
    isAndroid,
    isIOS,
  };
}

/**
 * Build an Android Chrome `intent://` URL that breaks the user out of the
 * in-app WebView and reopens the given https URL in Chrome.
 */
export function buildAndroidChromeIntent(url: string): string {
  const stripped = url.replace(/^https?:\/\//, "");
  return `intent://${stripped}#Intent;scheme=https;package=com.android.chrome;end`;
}
