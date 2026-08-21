import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "../i18n/LocaleProvider";

const AUTH_VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  steps?: ReactNode;
}

export function AuthShell({ eyebrow, title, description, children, steps }: AuthShellProps) {
  const { locale } = useLocale();
  const reducedMotion = useReducedMotion();
  const [largeViewport, setLargeViewport] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  const [videoFailed, setVideoFailed] = useState(false);
  const shouldPlay = largeViewport && !reducedMotion;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateViewport = () => setLargeViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  return (
    <main className="flex min-h-screen w-full bg-black p-2 text-white selection:bg-white/30 transition-all duration-500 lg:h-screen lg:overflow-hidden lg:p-4">
      <section
        className="relative hidden h-full w-[52%] flex-col items-center justify-end overflow-hidden rounded-3xl bg-gray-950 px-12 pb-32 shadow-2xl lg:flex"
        data-testid="auth-video-panel"
        data-video-state={reducedMotion ? "reduced-motion" : videoFailed ? "error" : shouldPlay ? "playing" : "inactive"}
        aria-label={locale === "pt" ? "Apresentação visual Growth Labs" : "Growth Labs visual presentation"}
      >
        <video
          autoPlay={shouldPlay}
          muted
          loop
          playsInline
          preload={shouldPlay ? "metadata" : "none"}
          aria-hidden="true"
          tabIndex={-1}
          onError={() => setVideoFailed(true)}
          className={`absolute inset-0 size-full object-cover ${videoFailed || !shouldPlay ? "invisible" : "visible"}`}
        >
          <source src={AUTH_VIDEO_URL} type="video/mp4" />
        </video>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-xl text-center [text-shadow:0_2px_22px_rgb(0_0_0/0.95)]"
        >
          <img src="/Logo-Vertical-White.svg" alt="Growth Labs" className="mx-auto h-24 w-fit object-contain drop-shadow-2xl" />
          <p className="mt-8 text-theme-xs font-semibold uppercase tracking-[0.22em] text-white/80">{eyebrow}</p>
          <h1 className="mt-3 text-title-md font-semibold tracking-tight text-white">{title}</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-white/85">{description}</p>
          {steps ? <div className="mx-auto mt-8 max-w-md text-left">{steps}</div> : null}
        </motion.div>
      </section>

      <section className="flex min-h-[calc(100vh-1rem)] flex-1 overflow-y-auto bg-gray-950 px-5 py-8 sm:px-10 lg:min-h-0 lg:px-14 lg:py-10">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto flex w-full max-w-lg flex-col"
          >
            <a href="/login" aria-label={locale === "pt" ? "Growth Labs — início de sessão" : "Growth Labs — sign in"} className="w-fit lg:hidden">
              <img src="/Logo-Vertical-White.svg" alt="Growth Labs" className="h-20 w-fit object-contain" />
            </a>
            <div className="my-auto py-10">
              {children}
            </div>
            <p className="text-theme-xs text-gray-500">Growth Labs · {locale === "pt" ? "Ambiente de IA protegido" : "Secure AI environment"}</p>
          </motion.div>
      </section>
    </main>
  );
}
