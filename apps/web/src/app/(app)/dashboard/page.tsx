import { HydrateClient, orpc, prefetch } from "@/orpc/server";
import { MockDashboard } from "./_components/mock-dashboard";

const Page = () => {
  prefetch(orpc.collection.list.queryOptions());

  return (
    <HydrateClient>
      <MockDashboard />
    </HydrateClient>
  );
};

export default Page;
