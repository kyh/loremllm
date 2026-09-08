import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { safeNextPath } from "@/app/(auth)/_components/next-path";

export const metadata: Metadata = {
  title: "Login",
};

interface PageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);

  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
      <div className="flex flex-col text-center">
        <h1 className="text-lg font-light">Welcome back</h1>
      </div>
      <AuthForm type="login" nextPath={nextPath} />
      <p className="text-muted-foreground px-8 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="underline">
          Register
        </Link>
      </p>
    </div>
  );
};

export default Page;
