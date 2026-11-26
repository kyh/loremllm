import { auth } from "./auth";

/**
 * Mints a sign-in code for `email` straight into the database, so a script or a suite signs in
 * through the real email-code endpoint without reading an inbox.
 */
export const mintSignInCode = async (email: string) =>
  await auth.api.createVerificationOTP({ body: { email, type: "sign-in" } });

/** Signs `email` in with a freshly minted code, creating the account, named `name`, when it has none. */
export const signInWithCode = async (email: string, name: string) =>
  await auth.api.signInEmailOTP({ body: { email, name, otp: await mintSignInCode(email) } });
