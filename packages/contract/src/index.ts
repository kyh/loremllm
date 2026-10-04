import type {
  InferContractRouterInputs,
  InferContractRouterOutputs,
  RouterContractClient,
} from "@orpc/contract";

import { collectionContract } from "./collection/collection-contract";
import { interactionContract } from "./interaction/interaction-contract";
import { organizationContract } from "./organization/organization-contract";
import { waitlistContract } from "./waitlist/waitlist-contract";

/** The API's single source of truth: @repo/service implements it, clients type against it. */
export const contract = {
  collection: collectionContract,
  interaction: interactionContract,
  organization: organizationContract,
  waitlist: waitlistContract,
};

export type Contract = typeof contract;

export type ContractClient = RouterContractClient<Contract>;

/**
 * Inference helpers for input types
 * @example
 * type PostByIdInput = RouterInputs['post']['byId']
 *      ^? { id: number }
 **/
export type RouterInputs = InferContractRouterInputs<Contract>;

/**
 * Inference helpers for output types
 * @example
 * type AllPostsOutput = RouterOutputs['post']['all']
 *      ^? Post[]
 **/
export type RouterOutputs = InferContractRouterOutputs<Contract>;
