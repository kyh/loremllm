import { authMetadata } from "@repo/contract/organization/organization-schema";
import type { z } from "zod";

import { zJsonString } from "./utils";

export const authMetadataSchema = zJsonString.pipe(authMetadata);
export type AuthMetadata = z.infer<typeof authMetadataSchema>;
