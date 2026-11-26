import { mintSignInCode } from "../src/auth/sign-in-code";

const [email = "dev@loremllm.local"] = process.argv.slice(2);

try {
  console.log(await mintSignInCode(email));
  process.exit(0);
} catch (error: unknown) {
  console.error(error);
  process.exit(1);
}
