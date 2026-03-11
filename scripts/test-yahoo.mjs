const symbol = 'AAPL'
const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d&includePrePost=false`
try {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(10000),
  })
  console.log('Status:', res.status)
  console.log('OK:', res.ok)
  if (res.ok) {
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    console.log('Price:', meta?.regularMarketPrice)
    console.log('Name:', meta?.longName)
    console.log('52wk High:', meta?.fiftyTwoWeekHigh)
  } else {
    console.log('Body:', await res.text())
  }
} catch(e) {
  console.error('Error:', e.message)
}
