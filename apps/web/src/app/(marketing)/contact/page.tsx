import { contactPage } from "@/lib/agent/site-pages";

import { ProsePageView, prosePageMetadata } from "@/components/marketing/prose-page";

export const metadata = prosePageMetadata(contactPage);

const Page = () => <ProsePageView page={contactPage} />;

export default Page;
