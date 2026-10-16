import { connection } from "next/server";

import { HydrateClient, orpc, prefetch } from "@/orpc/server";
import { MockDashboard } from "./_components/mock-dashboard";

const Page = async () => {
  // Per-user data, so render at request time (inside the layout's Suspense).
  await connection();
  prefetch(orpc.collection.list.queryOptions());

  return (
    <HydrateClient>
      <MockDashboard />
    </HydrateClient>
  );
};

export default Page;
