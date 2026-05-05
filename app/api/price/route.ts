import yahooFinance from "yahoo-finance2";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  try {
    const quote: any = await yahooFinance.quote(symbol!);

    return NextResponse.json({
      price: quote.regularMarketPrice ?? 0,
      time: quote.regularMarketTime ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch price" });
  }
}