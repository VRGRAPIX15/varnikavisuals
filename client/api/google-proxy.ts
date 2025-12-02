export const config = { runtime: "edge" };

const BACKEND_URL = "https://script.google.com/macros/s/AKfycbzgUs3RXLEvcjqh2Z-U1Izb91V3rCqtKCYmkzwWtSpeyYFtykZZVMMn6rOr-YMNP3fkDg/exec";

export default async function handler(req: Request) {
  const url = new URL(req.url);

  const target = BACKEND_URL + url.search;

  const res = await fetch(target, {
    method: req.method,
    headers: { "Content-Type": "application/json" },
    body: req.method !== "GET" ? await req.text() : undefined,
  });

  return new Response(await res.text(), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}