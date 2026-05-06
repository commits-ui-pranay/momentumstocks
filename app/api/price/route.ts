import yahooFinance from "yahoo-finance2";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json({
        error: "No symbol provided",
      });
    }

    const quote: any = await yahooFinance.quote(symbol);

    return NextResponse.json({
      price: quote.regularMarketPrice || 0,
      name: quote.shortName || symbol,
      time: quote.regularMarketTime || null,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json({
      error: "Failed to fetch price",
    });
  }
}