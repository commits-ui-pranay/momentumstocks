"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";


export default function Home() {
  const isAdmin = true;
  
  const [stocks, setStocks] = useState<any[]>([]);
  const [pastTrades, setPastTrades] = useState<any[]>([]);
  const [name, setName] = useState("");
  

  async function loadStocks() {
    const { data } = await supabase.from("active_stocks").select("*");
    setStocks(data || []);
  }

  async function loadPastTrades() {
    const { data } = await supabase.from("past_trades").select("*");
    setPastTrades(data || []);
  }

  async function addStock() {
    if (!name) return;

    const symbol = name.toUpperCase() + ".NS";

    try {
      // 🔥 Fetch live price
      const res = await fetch(`/api/price?symbol=${symbol}`);
      const data = await res.json();

      const livePrice = data.price;

      if (!livePrice) {
        alert("Invalid stock or price not found");
        return;
      }

      // ✅ Insert correct price
      await supabase.from("active_stocks").insert({
        stock_name: name.toUpperCase(),
        buy_price: livePrice,        // ✅ FIXED
        current_price: livePrice,    // ✅ FIXED
        qty: 1,
        momentum: "High",
        valuation: "Fair",
      });

      setName("");
      loadStocks();

    } catch (err) {
      console.error(err);
      alert("Error fetching stock price");
    }
  }
  async function updatePrices() {
    if (stocks.length > 10) {
      alert("Too many stocks, refresh manually");
      return;
    }
    
    const updatedStocks = [];

    for (const s of stocks) {
      const symbol = s.stock_name + ".NS";

      try {
        const res = await fetch(`/api/price?symbol=${symbol}`);
        const data = await res.json();

        if (data.price) {
          updatedStocks.push({
            id: s.id,
            price: data.price,
          });
        }
      } catch (err) {
        console.log("Error updating:", s.stock_name);
      }
    }

    // 🔥 Batch update Supabase
    for (const stock of updatedStocks) {
      await supabase
        .from("active_stocks")
        .update({ current_price: stock.price })
        .eq("id", stock.id);
    }

    loadStocks();
  }
  useEffect(() => {
    loadStocks();
    loadPastTrades();

    const interval = setInterval(() => {
      updatePrices();
    }, 30000);

    return () => clearInterval(interval);
  }, []);   // ✅ IMPORTANT

  

  return (
    <main className="p-10 min-h-screen bg-black text-white">
      
      <h1 className="text-4xl font-bold text-blue-500">
        Jacks Terminal | Momentum Stocks Dashboard
      </h1>
    {isAdmin && (
      <div className="mt-6 flex gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Stock name"
          className="border px-4 py-2 rounded-xl"
        />

        <button
          onClick={addStock}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl"
        >
          Add Stock
        </button>
        <button
          onClick={updatePrices}
          className="bg-green-500 hover:bg-green-600 transition text-white px-4 py-2 rounded-xl"
        >
          Refresh Prices
        </button>
      </div>
    )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-8 shadow-lg">

        <h2 className="text-xl font-semibold text-gray-300 mb-4">
          Current Trending Stocks
        </h2>

        <div className="space-y-4">
          {stocks.map((s) => {
            const profit = s.current_price - s.buy_price;

            const percent =
              s.buy_price > 0
                ? ((profit / s.buy_price) * 100).toFixed(2)
                : "0";

            async function sellStock() {
              await supabase.from("past_trades").insert({
                stock_name: s.stock_name,
                buy_price: s.buy_price,
                sell_price: s.current_price,
                profit: profit,
              });

              await supabase.from("active_stocks").delete().eq("id", s.id);

              loadStocks();
              loadPastTrades();
            }

            return (
              <div
                key={s.id}
                className="flex justify-between items-center bg-black border border-gray-800 p-4 rounded-xl"
              >
                <div>
                  <p className="font-bold">{s.stock_name}</p>
                  <p className="text-gray-400 text-sm">
                    Buy ₹{s.buy_price} → ₹{s.current_price}
                  </p>

                  <p
                    className={`text-sm font-semibold ${
                      profit >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    ₹{profit.toFixed(2)} ({profit >= 0 ? "+" : ""}
                    {percent}%)
                  </p>
                </div>

                <button
                  onClick={sellStock}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg"
                >
                  Sell
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <h2 className="text-2xl font-bold mt-10">Past Trades</h2>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        {pastTrades.map((p) => (
          <div key={p.id} className="bg-white p-5 rounded-2xl shadow">
            <h3 className="font-bold">{p.stock_name}</h3>
            <p>Buy: ₹{p.buy_price}</p>
            <p>Sell: ₹{p.sell_price}</p>
            <p className="text-green-600 font-bold">
              Profit: ₹{p.profit}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
