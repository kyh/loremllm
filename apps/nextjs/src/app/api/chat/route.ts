export { maxDuration } from "./[scenarioId]/route";

export function POST() {
  return new Response(
    JSON.stringify({ error: "Add a scenario id to the request URL (POST /api/chat/{scenarioId})" }),
    {
      status: 400,
      headers: { "content-type": "application/json" },
    },
  );
}
