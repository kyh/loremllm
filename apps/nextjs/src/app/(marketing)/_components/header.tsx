"use client";

import Link from "next/link";
import { buttonVariants } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";

import { authClient } from "@/auth/auth-client";

export const Header = () => {
  const { data: organization, isPending } = authClient.useActiveOrganization();

  return (
    <header className="flex items-center justify-end pt-16">
      <div className="flex flex-1 justify-end">
        {isPending ? (
          <span
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "pointer-events-none w-16 animate-pulse",
            )}
          />
        ) : organization ? (
          <Link
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "w-20",
            )}
            href={`/dashboard/${organization.slug}`}
          >
            Dashboard
          </Link>
        ) : (
          <Link
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "w-16",
            )}
            href="/auth/login"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
};
