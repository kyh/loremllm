import { Suspense } from "react";
import type { Metadata } from "next";

import { UpdatePasswordForm } from "@/app/(auth)/_components/auth-form";

export const metadata: Metadata = {
  title: "Update Password",
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

const Form = async ({ searchParams }: PageProps) => {
  const { token } = await searchParams;

  return <UpdatePasswordForm token={token} />;
};

const Page = ({ searchParams }: PageProps) => (
  <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
    <div className="flex flex-col gap-2 text-center">
      <h1 className="text-lg font-light">Update your Password</h1>
    </div>
    <Suspense>
      <Form searchParams={searchParams} />
    </Suspense>
  </div>
);

export default Page;
