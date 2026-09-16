import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const symbolsParam = searchParams.get("symbols");

    if (!symbolsParam) {
      return NextResponse.json(
        { error: "No symbols provided" },
        { status: 400 }
      );
    }

    // Convert comma-separated symbols into an array
    const symbols = symbolsParam
      .split(",")
      .map((symbol) => symbol.trim())
      .filter(Boolean);

    if (symbols.length === 0) {
      return NextResponse.json(
        { error: "No valid symbols provided" },
        { status: 400 }
      );
    }

    console.log("Fetching prices for:", symbols);

    // Fetch all quotes in one Yahoo request
    const quotes: any[] = await yahooFinance.quote(symbols);

    const prices = quotes.map((quote) => ({
      symbol: quote.symbol,
      price: quote.regularMarketPrice ?? 0,
      time: quote.regularMarketTime ?? null,
    }));

    return NextResponse.json({
      prices,
    });
  } catch (err) {
    console.error("Yahoo Finance Error:", err);

    return NextResponse.json(
      {
        error: "Failed to fetch prices",
        prices: [],
      },
      { status: 500 }
    );
  }
}