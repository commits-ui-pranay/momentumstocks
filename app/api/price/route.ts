import yahooFinance from "yahoo-finance2";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { error: "No symbol provided" },
        { status: 400 }
      );
    }

    // 🔥 Fetch live quote
    const quote: any = await yahooFinance.quote(symbol);

    return NextResponse.json({
      price: quote.regularMarketPrice || 0,
      time: quote.regularMarketTime || null,
      symbol: quote.symbol || symbol,
    });

  } catch (error) {
    console.error("Yahoo Finance Error:", error);

    return NextResponse.json(
      { error: "Failed to fetch price" },
      { status: 500 }
    );
  }
}