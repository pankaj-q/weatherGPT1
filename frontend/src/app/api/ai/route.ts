import { NextRequest, NextResponse } from "next/server";
import { runAi, type GroqInput } from "../../../lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: GroqInput;
  try {
    body = (await req.json()) as GroqInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await runAi(body);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: msg.includes("GROQ_API_KEY") ? 501 : 502 });
  }
}