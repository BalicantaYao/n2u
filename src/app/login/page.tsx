"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { TrendingUp, AlertTriangle, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import {
  detectInAppBrowser,
  buildAndroidChromeIntent,
  type InAppBrowserInfo,
} from "@/lib/inAppBrowser";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function InAppBrowserWarning({ info }: { info: InAppBrowserInfo }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  const openInChrome = () => {
    window.location.href = buildAndroidChromeIntent(window.location.href);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (insecure context / blocked); ignore.
    }
  };

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-left dark:border-amber-800 dark:bg-amber-950/40">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <h2 className="font-semibold">{t("auth.inAppWarningTitle")}</h2>
      </div>
      <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">{t("auth.inAppWarningBody")}</p>
      <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
        {info.isIOS ? t("auth.inAppHintIOS") : t("auth.inAppHintAndroid")}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {info.isAndroid && (
          <Button variant="default" className="w-full gap-2" onClick={openInChrome}>
            <ExternalLink className="h-4 w-4" />
            {t("auth.openInChrome")}
          </Button>
        )}
        <Button variant="outline" className="w-full gap-2" onClick={copyLink}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t("auth.copied") : t("auth.copyLink")}
        </Button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useT();
  const [inApp, setInApp] = useState<InAppBrowserInfo | null>(null);

  useEffect(() => {
    setInApp(detectInAppBrowser());
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold tracking-tight">Nothing 2 You</span>
          </div>
          <p className="text-sm text-muted-foreground">{t("auth.description")}</p>
        </div>

        {inApp?.isInApp ? (
          <InAppBrowserWarning info={inApp} />
        ) : (
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h1 className="mb-6 text-lg font-semibold">{t("auth.login")}</h1>
            <Button
              variant="outline"
              className="w-full gap-3"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            >
              <GoogleIcon />
              {t("auth.loginWithGoogle")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
