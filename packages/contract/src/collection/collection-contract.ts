import type { mockCollection, mockInteraction } from "@repo/db/drizzle-schema";
import { type } from "@orpc/contract";

import { organizationBase } from "../base";
import {
  collectionByIdInput,
  createCollectionInput,
  deleteCollectionInput,
  updateCollectionInput,
} from "./collection-schema";

type Collection = Pick<
  typeof mockCollection.$inferSelect,
  | "createdAt"
  | "description"
  | "id"
  | "isPublic"
  | "metadata"
  | "minSimilarity"
  | "name"
  | "publicId"
  | "updatedAt"
>;

interface CollectionSummary extends Collection {
  interactionCount: number;
}

interface CollectionDetail extends Collection {
  interactions: Pick<
    typeof mockInteraction.$inferSelect,
    | "createdAt"
    | "description"
    | "id"
    | "input"
    | "output"
    | "responseSchema"
    | "title"
    | "updatedAt"
  >[];
}

export const collectionContract = {
  byId: organizationBase.input(collectionByIdInput).output(type<CollectionDetail>()),
  create: organizationBase.input(createCollectionInput).output(type<CollectionSummary>()),
  delete: organizationBase.input(deleteCollectionInput).output(type<{ readonly success: true }>()),
  list: organizationBase.output(type<CollectionSummary[]>()),
  update: organizationBase.input(updateCollectionInput).output(type<Collection>()),
};
