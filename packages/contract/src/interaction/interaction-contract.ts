import type { mockInteraction } from "@repo/db/drizzle-schema";
import { type } from "@orpc/contract";

import { organizationBase, publicBase } from "../base";
import {
  createInteractionInput,
  deleteInteractionInput,
  queryInteractionInput,
  updateInteractionInput,
} from "./interaction-schema";

type Interaction = Pick<
  typeof mockInteraction.$inferSelect,
  | "collectionId"
  | "createdAt"
  | "description"
  | "id"
  | "input"
  | "output"
  | "responseSchema"
  | "title"
  | "updatedAt"
>;

interface InteractionMatch {
  description: string | null;
  id: string;
  input: string;
  output: string;
  responseSchema: string;
  similarity: number;
  title: string | null;
}

interface InteractionQueryResult {
  collectionId: string;
  collectionName: string | null;
  matches: InteractionMatch[];
}

export const interactionContract = {
  create: organizationBase.input(createInteractionInput).output(type<Interaction>()),
  delete: organizationBase.input(deleteInteractionInput).output(type<{ readonly success: true }>()),
  query: publicBase.input(queryInteractionInput).output(type<InteractionQueryResult>()),
  update: organizationBase.input(updateInteractionInput).output(type<Interaction>()),
};
