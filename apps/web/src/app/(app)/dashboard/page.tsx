import { HydrateClient } from "@/orpc/server";
import { MockDashboard } from "./_components/mock-dashboard";

const Page = () => {
  return (
    <HydrateClient>
      <MockDashboard />
    </HydrateClient>
  );
};

export default Page;
