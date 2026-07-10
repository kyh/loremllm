import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@repo/api/auth/auth";
import { Logo } from "@repo/ui/components/logo";

import { SignOutButton } from "./_components/sign-out-button";

type LayoutProps = {
  children: React.ReactNode;
};

const Layout = async (props: LayoutProps) => {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border/60 bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-xs sm:inline">
              {session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{props.children}</main>
    </div>
  );
};

export default Layout;
