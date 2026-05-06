import YahooFinance from "yahoo-finance2";
import { NextResponse } from "next/server";

// ✅ Create Yahoo instance
const yahooFinance = new YahooFinance();

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

    // ✅ Fetch live quote
    const quote: any = await yahooFinance.quote(symbol);

    console.log("LIVE:", quote.regularMarketPrice);

    return NextResponse.json({
      price: quote.regularMarketPrice || 0,
      symbol: quote.symbol || symbol,
      time: quote.regularMarketTime || null,
    });

  } catch (err) {

    console.log("YAHOO ERROR:", err);

    return NextResponse.json(
      { error: "Failed to fetch price" },
      { status: 500 }
    );

  }
}