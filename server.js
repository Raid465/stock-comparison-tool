import express from "express";
import cors from "cors";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const app = express();
app.use(cors());

app.get("/api/stock/:ticker", async (req, res) => {
  const { ticker } = req.params;
  try {
    const quote = await yf.quote(ticker);
    let sum = {};
    try {
      sum = await yf.quoteSummary(ticker, {
        modules: ["financialData", "defaultKeyStatistics", "summaryDetail", "assetProfile"],
      });
    } catch {}

    const fin = sum.financialData || {};
    const key = sum.defaultKeyStatistics || {};
    const det = sum.summaryDetail || {};
    const prof = sum.assetProfile || {};

    res.json({
      ticker,
      name: quote.shortName || quote.longName || ticker,
      price: quote.regularMarketPrice ?? null,
      marketCap: quote.marketCap ?? null,
      pe: quote.trailingPE ?? null,
      forwardPE: quote.forwardPE ?? key.forwardPE ?? null,
      eps: quote.epsTrailingTwelveMonths ?? null,
      forwardEps: key.forwardEps ?? null,
      profitMargin: fin.profitMargins != null ? +(fin.profitMargins * 100).toFixed(2) : null,
      grossMargins: fin.grossMargins != null ? +(fin.grossMargins * 100).toFixed(2) : null,
      operatingMargins: fin.operatingMargins != null ? +(fin.operatingMargins * 100).toFixed(2) : null,
      revenueGrowth: fin.revenueGrowth != null ? +(fin.revenueGrowth * 100).toFixed(2) : null,
      earningsGrowth: fin.earningsGrowth != null ? +(fin.earningsGrowth * 100).toFixed(2) : null,
      dividendYield: quote.dividendYield ?? null,
      oneYearReturn: quote.fiftyTwoWeekChangePercent != null ? +quote.fiftyTwoWeekChangePercent.toFixed(2) : null,
      beta: key.beta ?? null,
      debtToEquity: fin.debtToEquity ?? null,
      returnOnEquity: fin.returnOnEquity != null ? +(fin.returnOnEquity * 100).toFixed(2) : null,
      returnOnAssets: fin.returnOnAssets != null ? +(fin.returnOnAssets * 100).toFixed(2) : null,
      currentRatio: fin.currentRatio ?? null,
      quickRatio: fin.quickRatio ?? null,
      targetPrice: fin.targetMeanPrice ?? null,
      targetHigh: fin.targetHighPrice ?? null,
      targetLow: fin.targetLowPrice ?? null,
      recommendation: fin.recommendationKey ?? null,
      analystCount: fin.numberOfAnalystOpinions ?? null,
      sector: prof.sector ?? null,
      industry: prof.industry ?? null,
      employees: prof.fullTimeEmployees ?? null,
      volume: quote.regularMarketVolume ?? null,
      avgVolume: quote.averageDailyVolume3Month ?? null,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
      bookValue: quote.bookValue ?? key.bookValue ?? null,
      priceToBook: quote.priceToBook ?? key.priceToBook ?? null,
      pegRatio: key.pegRatio ?? null,
      totalCash: fin.totalCash ?? null,
      totalDebt: fin.totalDebt ?? null,
      totalRevenue: fin.totalRevenue ?? null,
      freeCashflow: fin.freeCashflow ?? null,
      ebitda: fin.ebitda ?? null,
      heldPercentInsiders: key.heldPercentInsiders ?? null,
      heldPercentInstitutions: key.heldPercentInstitutions ?? null,
    });
  } catch (err) {
    console.error(`Error ${ticker}:`, err.message);
    res.status(404).json({ error: `لم يتم العثور على "${ticker}".` });
  }
});

app.get("/api/history/:ticker", async (req, res) => {
  const { ticker } = req.params;
  try {
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 10);
    const result = await yf.chart(ticker, {
      period1: period1.toISOString().split("T")[0],
      period2: new Date().toISOString().split("T")[0],
      interval: "1mo",
    });
    const history = result.quotes.map(q => ({
      date: q.date.toISOString().split("T")[0],
      price: q.close != null ? +q.close.toFixed(2) : null,
      volume: q.volume ?? null,
    })).filter(q => q.price != null);
    res.json({ ticker, history });
  } catch (err) {
    console.error(`History ${ticker}:`, err.message);
    res.status(404).json({ error: `لا بيانات تاريخية.` });
  }
});

app.get("/api/earnings/:ticker", async (req, res) => {
  const { ticker } = req.params;
  try {
    const quarterlyData = await yf.fundamentalsTimeSeries(ticker, {
      module: "financials",
      period1: "2024-01-01",
      period2: "2026-12-31",
      type: "quarterly",
    });

    const quarterly = quarterlyData.map(q => ({
      quarter: q.date ? new Date(q.date).toISOString().split("T")[0] : null,
      revenue: q.totalRevenue ?? null,
      earnings: q.netIncome ?? null,
      epsActual: q.dilutedEPS ?? null,
      epsEstimate: null,
      surprise: null,
    }));

    const yearlyData = await yf.fundamentalsTimeSeries(ticker, {
      module: "financials",
      period1: "2021-01-01",
      period2: "2026-12-31",
      type: "annual",
    });

    const yearly = yearlyData.map(q => ({
      year: q.date ? new Date(q.date).toISOString().split("T")[0].substring(0, 4) : null,
      revenue: q.totalRevenue ?? null,
      earnings: q.netIncome ?? null,
    }));

    res.json({ ticker, quarterly, yearly });
  } catch (err) {
    console.error(`Earnings ${ticker}:`, err.message);
    try {
      const q = await yf.quote(ticker);
      res.json({
        ticker,
        quarterly: [{ quarter: "TTM", revenue: null, earnings: null, epsActual: q.epsTrailingTwelveMonths, epsEstimate: null, surprise: null }],
        yearly: [],
      });
    } catch {
      res.json({ ticker, quarterly: [], yearly: [] });
    }
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`✅ Server on http://localhost:${PORT}`));
