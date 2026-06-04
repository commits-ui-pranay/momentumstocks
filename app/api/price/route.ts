import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

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

    // 🔥 Search NSE symbol
    const result: any = await yahooFinance.search(symbol);

    if (
      !result ||
      !result.quotes ||
      result.quotes.length === 0
    ) {
      return NextResponse.json({
        price: 0,
        error: "No quote found",
      });
    }

    // 🔥 Get exact Yahoo symbol
    const quoteSymbol = result.quotes[0].symbol;
    console.log("Yahoo matched:", quoteSymbol);

    // 🔥 Fetch live market quote
    const quote: any = await yahooFinance.quote(quoteSymbol);

    return NextResponse.json({
      price: quote.regularMarketPrice || 0,
      time: quote.regularMarketTime || null,
    });

  } catch (err) {

    console.error("Yahoo Finance Error:", err);

    return NextResponse.json({
      price: 0,
      error: "Failed to fetch price",
    });
  }
}