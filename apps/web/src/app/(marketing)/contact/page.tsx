import { contactPage } from "@/lib/agent/site-pages";

import { ProsePageView, prosePageMetadata } from "../_components/prose-page";

export const metadata = prosePageMetadata(contactPage);

const Page = () => <ProsePageView page={contactPage} />;

export default Page;
