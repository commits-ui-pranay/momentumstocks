"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
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
    await supabase.from("active_stocks").insert({
      stock_name: name,
      buy_price: 100,
      current_price: 120,
      qty: 1,
      momentum: "High",
      valuation: "Fair",
    });

    setName("");
    loadStocks();
  }
  async function updatePrices() {
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
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="p-10 min-h-screen bg-slate-50">
      <h1 className="text-4xl font-bold text-blue-700">
        momentumstocks Dashboard
      </h1>

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

      <div className="grid md:grid-cols-3 gap-4 mt-8">
        {stocks.map((s) => {
          const profit = s.current_price - s.buy_price;

          async function sellStock() {
            // 1. insert into past trades
            await supabase.from("past_trades").insert({
              stock_name: s.stock_name,
              buy_price: s.buy_price,
              sell_price: s.current_price,
              profit: profit,
            });

            // 2. delete from active stocks
            await supabase.from("active_stocks").delete().eq("id", s.id);

            // 3. reload UI
            loadStocks();
          }

          return (
            <div key={s.id} className="bg-white p-5 rounded-2xl shadow">
              <h2 className="text-xl font-bold">{s.stock_name}</h2>
              <p>Buy: ₹{s.buy_price}</p>
              <p>Current: ₹{s.current_price}</p>

              <p className="text-green-600 font-bold">
                Profit: ₹{profit}
              </p>

              <button
                onClick={sellStock}
                className="mt-4 bg-red-500 text-white px-4 py-2 rounded-xl"
              >
                Sell
              </button>
            </div>
          );
        })}
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