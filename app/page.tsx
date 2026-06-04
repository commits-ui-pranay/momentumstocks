"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";


export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [stocks, setStocks] = useState<any[]>([]);
  const [pastTrades, setPastTrades] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [country, setCountry] = useState("India");
  
  async function loadStocks() {
    const { data } = await supabase
      .from("active_stocks")
      .select("*")
      .order("country")
      .order("buy_date", { ascending: false });

    setStocks(data || []);
  }

  async function loadPastTrades() {
    const { data } = await supabase
      .from("past_trades")
      .select("*")
      .order("sell_date", { ascending: false });
    setPastTrades(data || []);
  }

  const groupedStocks = stocks.reduce((acc: any, stock: any) => {
    const country = stock.country || "India";

    if (!acc[country]) {
      acc[country] = [];
    }

    acc[country].push(stock);

    return acc;
  }, {});

  async function addStock() {
    if (!isAdmin) return;

    const symbol =
      country === "India"
        ? name.toUpperCase().endsWith(".NS")
          ? name.toUpperCase()
          : name.toUpperCase() + ".NS"
        : name.toUpperCase();

    const res = await fetch(`/api/price?symbol=${symbol}`);
    const data = await res.json();

    const finalSymbol =
      country === "India"
        ? name.toUpperCase().endsWith(".NS")
          ? name.toUpperCase()
          : name.toUpperCase() + ".NS"
        : name.toUpperCase();

    await supabase.from("active_stocks").insert({
      stock_name: finalSymbol,
      buy_price: data.price,
      current_price: data.price,
      country: country,
      buy_date: new Date().toISOString(),
    });

    setName("");
    loadStocks();
  }
  function handleBuy(stockName: string) {

    const cleanSymbol = stockName.replace(".NS", "");

    const broker = prompt(
      "Choose Broker:\n1 = Zerodha\n2 = Groww\n3 = Angel One\n4 = Upstox\n5 = 5Paisa\n6 = Dhan"
    );

    let url = "";

    switch (broker) {

      case "1":
        url = `https://kite.zerodha.com/chart/ext/ciq/NSE/${cleanSymbol}/${cleanSymbol}`;
        break;

      case "2":
        url = `https://groww.in/stocks/${cleanSymbol.toLowerCase()}`;
        break;

      case "3":
        url = `https://www.angelone.in/stocks/${cleanSymbol.toLowerCase()}`;
        break;

      case "4":
        url = `https://upstox.com/stocks/${cleanSymbol.toLowerCase()}`;
        break;

      case "5":
        url = `https://www.5paisa.com/stocks/${cleanSymbol.toLowerCase()}-share-price`;
        break;

      case "6":
        url = `https://dhan.co/stocks/${cleanSymbol.toLowerCase()}/`;
        break;

      default:
        return;
    }

    window.open(url, "_blank");
  }
  async function updatePrices() {
    if (stocks.length > 10) {
      alert("Too many stocks, refresh manually");
      return;
    }
    
    const updatedStocks = [];

    for (const s of stocks) {

      const symbol = s.stock_name;

      try {

        const res = await fetch(
          `/api/price?symbol=${symbol}`,
          {
            cache: "no-store",
          }
        );

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
    setLastUpdated(new Date().toLocaleTimeString());
  }
  useEffect(() => {

    async function initializeApp() {

      // ✅ CHECK LOGIN SESSION
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // ❌ No login found
      if (!session) {
        window.location.href = "/login";
        return;
      }

      // ✅ Save user
      setUser(session.user);

      // ✅ ADMIN CHECK
      const email = session.user.email;

      if (email === "momentumstocksind@gmail.com") {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }

      // ✅ LOAD STOCK DATA
      loadStocks();
      loadPastTrades();

      // =========================
      // ✅ DISCLAIMER POPUP LOGIC
      // =========================

      const now = Date.now();

      const disclaimerData =
        localStorage.getItem("disclaimerPrompt");

      if (!disclaimerData) {

        localStorage.setItem(
          "disclaimerPrompt",
          JSON.stringify({
            count: 1,
            lastShown: now,
          })
        );

        setShowDisclaimer(true);

      } else {

        const parsed = JSON.parse(disclaimerData);

        const twelveHours =
          12 * 60 * 60 * 1000;

        const within24Hours =
          now - parsed.lastShown <
          24 * 60 * 60 * 1000;

        const canShowAgain =
          parsed.count < 2 &&
          now - parsed.lastShown >= twelveHours;

        if (within24Hours && canShowAgain) {

          localStorage.setItem(
            "disclaimerPrompt",
            JSON.stringify({
              count: parsed.count + 1,
              lastShown: now,
            })
          );

          setShowDisclaimer(true);

        }

        if (!within24Hours) {

          localStorage.setItem(
            "disclaimerPrompt",
            JSON.stringify({
              count: 1,
              lastShown: now,
            })
          );

          setShowDisclaimer(true);
        }
      }

      // ✅ FINISHED LOADING
      setLoading(false);
    }

    initializeApp();

    // =========================
    // ✅ AUTO REFRESH PRICES
    // =========================

    const interval = setInterval(() => {
      updatePrices();
    }, 30000);

    // ✅ CLEANUP
    return () => clearInterval(interval);

  }, []);

  const projectedPercent =
  stocks.length > 0
    ? (
        stocks.reduce((acc, s) => {
          const profit = s.current_price - s.buy_price;
          const percent =
            s.buy_price > 0 ? (profit / s.buy_price) * 100 : 0;
          return acc + percent;
        }, 0) / stocks.length
      ).toFixed(2)
    : "0.00";
  
  const accruedPercent =
    pastTrades.length > 0
      ? (
          pastTrades.reduce(
            (acc, t) => acc + (t.percent || 0),
            0
          ) / pastTrades.length
        ).toFixed(2)
      : "0.00";
  if (loading) {
    return (
      <div className="text-white p-10">
        Loading...
      </div>
    );
  }
  
  return (
    <main className="p-10 min-h-screen bg-black text-white">
      {showDisclaimer && (

        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">

          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-2xl mx-4 shadow-2xl">

            <h2 className="text-2xl font-bold text-blue-400 mb-6">
              Important Investment Disclaimer
            </h2>

            <ul className="space-y-4 text-gray-300 text-sm leading-7">

              <li>
                • The stocks displayed on Jacks Terminal are provided strictly for educational and informational purposes only. Investors are advised to consult a qualified financial advisor before making any investment decisions.
              </li>

              <li>
                • Stocks featured on Jacks Terminal are periodically refreshed and reviewed on a quarter-over-quarter (QoQ) basis to align with evolving market trends and company performance.
              </li>

              <li>
                • The stocks showcased on this platform are selected based on strong market momentum, relative strength, and notable quarter-over-quarter business performance indicators.
              </li>

            </ul>

            <div className="mt-8 flex justify-end">

              <button
                onClick={() => setShowDisclaimer(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold"
              >
                OK
              </button>

            </div>

          </div>

        </div>
      )}
      <h1 className="text-4xl font-bold text-blue-500">
        Jacks Terminal | Momentum Stocks Dashboard
      </h1>
    
      <div className="mt-6 flex gap-3 items-center">

        {/* ✅ ADMIN ONLY */}
        {isAdmin && (
          <>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="bg-gray-800 text-white px-3 py-2 rounded"
            >
              <option value="India">🇮🇳 India</option>
              <option value="USA">🇺🇸 USA</option>
              <option value="China">🇨🇳 China</option>
              <option value="Japan">🇯🇵 Japan</option>
              <option value="Australia">🇦🇺 Australia</option>
              <option value="Brazil">🇧🇷 Brazil</option>
              <option value="Russia">🇷🇺 Russia</option>
              <option value="United Kingdom">🇬🇧 United Kingdom</option>
            </select>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Stock name"
              className="bg-gray-800 border border-gray-700 px-4 py-2 rounded-xl text-white"
            />

            <button
              onClick={addStock}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl"
            >
              Add Stock
            </button>
          </>
        )}

        {/* ✅ ALWAYS VISIBLE */}
        <button
          onClick={updatePrices}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl ml-auto"
        >
          🔄 Refresh Prices
        </button>
        <p className="text-xs text-green-400 mt-2">
          ● Live Updated: {lastUpdated || "Waiting..."}
        </p>
        {/* ✅ ADD THIS LOGOUT BUTTON */}
        <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl"
        >
            Logout
        </button>

      </div>
    

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-8 shadow-lg">

        <h2 className="text-xl font-semibold text-gray-300 mb-4">
          Current Trending Stocks
        </h2>
        <p
          className={`text-sm mb-3 font-semibold ${
            Number(projectedPercent) >= 0
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          Projected P/L: {projectedPercent}%
        </p>

        <div className="space-y-8">

          {Object.entries(groupedStocks).map(
            ([countryName, countryStocks]: any) => (
              <div key={countryName}>

                <h2 className="text-2xl font-bold text-yellow-400 mt-8 mb-4">
                  🌍 {countryName}
                </h2>

                <div className="space-y-4">

                  {countryStocks.map((s: any) => {
            const profit = s.current_price - s.buy_price;

            const percent =
              s.buy_price > 0
                ? ((profit / s.buy_price) * 100).toFixed(2)
                : "0";

            async function sellStock() {
              const profit = s.current_price - s.buy_price;

              const percent =
                s.buy_price > 0
                  ? (profit / s.buy_price) * 100
                  : 0;

              const { error: insertError } = await supabase
                .from("past_trades")
                .insert({
                  stock_name: s.stock_name,
                  buy_price: s.buy_price,
                  sell_price: s.current_price,
                  profit: profit,
                  percent: percent,
                  country: s.country,
                  buy_date: s.buy_date,
                  sell_date: new Date().toISOString(),
                });

              // console.log("Insert Error:", insertError);
              if (insertError) {
                console.error(insertError);
                return;
              }
              await supabase.from("active_stocks").delete().eq("id", s.id);

              loadStocks();
              loadPastTrades();
            }
            const priceDifferencePercent =
              ((s.current_price - s.buy_price) / s.buy_price) * 100;

            const canBuy = priceDifferencePercent <= 2;

            
              

            return (
              <div
                key={s.id}
                className="flex justify-between items-center bg-black border border-gray-800 p-4 rounded-xl"
              >
                <div>
                  <div className="flex gap-2 items-center">
                    <p className="font-bold">{s.stock_name}</p>

                    <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                      🌍 {s.country}
                    </span>
                  </div>

                  <p className="text-gray-400 text-sm">
                    Buy ₹{s.buy_price} → ₹{s.current_price}
                  </p>

                  {/* ✅ ADD THIS LINE HERE */}
                  <p className="text-xs text-gray-500">
                    Buy Date: {new Date(s.buy_date).toLocaleDateString()}
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

                <div className="flex gap-2 mt-2 items-center">

                  {/* ✅ BUY BUTTON */}
                  {canBuy && (
                    <button
                      onClick={() => handleBuy(s.stock_name)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl"
                    >
                      Buy
                    </button>
                  )}

                  {/* ❌ SHOW MESSAGE WHEN BUY CLOSED */}
                  {!canBuy && (
                    <p className="text-xs text-red-400 font-medium">
                      Stock moved beyond ideal buy range
                    </p>
                  )}

                  {/* 🔒 SELL BUTTON (ADMIN ONLY) */}
                  {isAdmin && (
                    <button
                      onClick={sellStock}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl"
                    >
                      Sell
                    </button>
                  )}
                </div>
              </div>
            );  
          })}
        </div> 
      </div>
    )
  )}    
</div>
</div>
      <h2 className="text-2xl font-bold mt-10">Past Trades</h2>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        {pastTrades.map((p) => {
          return (
            <div
              key={p.id}
              className="bg-gray-900 border border-gray-800 p-5 rounded-2xl text-white"
            >
              <h3 className="font-bold">{p.stock_name}</h3>
              <p className="text-yellow-400 text-sm">
                🌍 {p.country || "India"}
              </p>
              <p>Buy: INR {p.buy_price}</p>
              <p>Sell: INR {p.sell_price}</p>

              <p className="text-xs text-gray-500">
                Buy Date: {new Date(p.buy_date).toLocaleDateString()}
              </p>

              <p className="text-xs text-gray-500">
                Sell Date: {new Date(p.sell_date).toLocaleDateString()}
              </p>

              <p
                className={`font-bold ${
                  p.profit >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                Profit: ₹{Number(p.profit || 0).toFixed(2)}
                {" "}
                ({Number(p.percent || 0).toFixed(2)}%)
              </p>
            </div>
          );
        })}
      </div>
    {/* ❤️ Support Button */}
    <button
      onClick={() => setShowSupportModal(true)}
      className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl animate-bounce z-40"
    >
      ❤️
    </button>
    {/* 💙 Support Modal */}
    {showSupportModal && (

      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">

        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">

          <h2 className="text-2xl font-bold text-blue-400 mb-4">
            ❤️ Support Jacks Terminal
          </h2>

          <p className="text-gray-300 text-sm leading-6 mb-6">
            Your support helps us continue improving Jacks Terminal with better market insights, stronger momentum tracking, and advanced analytics tools for the community.
          </p>

          <div className="flex justify-center mb-6">

            <img
              src="/jacks_terminal_upi_qr.png"
              alt="Support Jacks Terminal QR"
              className="w-64 h-64 rounded-2xl border border-gray-700 bg-white p-2"
            />

          </div>
          
          

          <p className="text-gray-300 text-sm leading-6 mb-6">
            If you find Jacks Terminal valuable, you can support the project by scanning the QR code with any upi app ❤️ . Your contribution helps us improve market analytics, momentum tracking, and platform performance for the community.
          </p>

          <button
            onClick={() => setShowSupportModal(false)}
            className="w-full border border-gray-600 hover:bg-gray-800 text-gray-300 py-3 rounded-xl"
          >
            Close
          </button>

        </div>

      </div>
    )}
    </main>
  );
}
