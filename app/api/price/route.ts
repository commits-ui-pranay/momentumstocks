import YahooFinance from "yahoo-finance2";
import { NextResponse } from "next/server";

// ✅ Initialize client
const yahooFinance = new YahooFinance();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "No symbol provided" });
  }

  try {
    const data = await yahooFinance.quote(symbol);

    return NextResponse.json({
      price: data.regularMarketPrice || 0,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch price" });
  }
}