"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/components/button";
import { toast } from "@repo/ui/components/sonner";

import { authClient } from "@/lib/auth-client";

export const SignOutButton = () => {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await authClient.signOut({
      fetchOptions: {
        onError: () => {
          toast.error("Failed to sign out");
          setSigningOut(false);
        },
        onSuccess: () => {
          router.replace("/auth/login");
          router.refresh();
        },
      },
    });
  };

  return (
    <Button variant="ghost" size="sm" loading={signingOut} onClick={handleSignOut}>
      Sign out
    </Button>
  );
};
