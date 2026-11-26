import { aboutPage } from "@/lib/agent/site-pages";

import { ProsePageView, prosePageMetadata } from "@/components/marketing/prose-page";

export const metadata = prosePageMetadata(aboutPage);

const Page = () => <ProsePageView page={aboutPage} />;

export default Page;
