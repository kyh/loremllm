import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { safeNextPath } from "@/app/(auth)/_components/next-path";

export const metadata: Metadata = {
  title: "Register",
};

interface PageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

// searchParams is per-request, so only the form waits on it; the rest is in the static shell.
const Form = async ({ searchParams }: PageProps) => {
  const { next } = await searchParams;
  return <AuthForm type="register" nextPath={safeNextPath(next)} />;
};

const Page = ({ searchParams }: PageProps) => (
  <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
    <div className="flex flex-col text-center">
      <h1 className="text-lg font-light">Create an account</h1>
    </div>
    <Suspense>
      <Form searchParams={searchParams} />
    </Suspense>
    <p className="text-muted-foreground px-8 text-center text-sm">
      Already have an account?{" "}
      <Link href="/auth/login" className="underline">
        Login
      </Link>
    </p>
  </div>
);

export default Page;
