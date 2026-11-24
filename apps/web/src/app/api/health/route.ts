import { connection } from "next/server";

export const GET = async () => {
  await connection();

  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
};
