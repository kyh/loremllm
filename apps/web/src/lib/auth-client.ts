import { adminClient, genericOAuthClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [adminClient(), organizationClient(), genericOAuthClient()],
});

// The shipped "Continue with Github" button. In dev, NEXT_PUBLIC_GITHUB_EMULATOR_URL
// routes it through the local `emulate` OAuth server via a dev-only genericOAuth
// provider (see packages/api/src/auth/auth.ts) so it works offline; unset (the
// default, and all of production) it uses the real GitHub social provider.
type GithubSignInOptions = {
  callbackURL?: string;
  fetchOptions?: Parameters<typeof authClient.signIn.social>[0]["fetchOptions"];
};

export const signInWithGithub = (options: GithubSignInOptions = {}) =>
  process.env.NEXT_PUBLIC_GITHUB_EMULATOR_URL
    ? authClient.signIn.oauth2({ providerId: "github", ...options })
    : authClient.signIn.social({ provider: "github", ...options });
