import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@repo/ui/components/logo";
import { Spinner } from "@repo/ui/components/spinner";

import { getSession } from "@/lib/auth-server";
import { SignOutButton } from "./_components/sign-out-button";

/** Signed-in app surfaces: never indexed. */
export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Dashboard",
};

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * The session is per-request, so it is read inside Suspense: the header chrome
 * is the static App Shell a <Link> prefetches, and the session check streams in
 * behind it. `getSession` is React-cached, so the two reads below are one lookup.
 */
const RequireSession = async (props: LayoutProps) => {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  return props.children;
};

const Account = async () => {
  const session = await getSession();

  // RequireSession redirects in its own boundary; until then, no account chrome.
  if (!session) {
    return null;
  }

  return (
    <>
      <span className="text-muted-foreground hidden text-xs sm:inline">{session.user.email}</span>
      <SignOutButton />
    </>
  );
};

const Layout = (props: LayoutProps) => (
  <div className="flex min-h-dvh flex-col">
    <header className="border-border/60 bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <Suspense>
            <Account />
          </Suspense>
        </div>
      </div>
    </header>
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        }
      >
        <RequireSession>{props.children}</RequireSession>
      </Suspense>
    </main>
  </div>
);

export default Layout;
