# CryptoAI PRO 🪙 — සිංහල/English Crypto Terminal (Android + Web)

Market/chart/signal/trading terminal එක — WebView shell එකක් ඇතුළේ Android app එකක් විදිහටත්,
browser එකෙන්ම වැඩ කරන Web PWA එකක් විදිහටත් තියෙනවා.

```
crypto-app/               # Android app (Kotlin + WebView shell + APK build)
├── app/src/main/assets/  #   UI එක: index.html + ta.js (TA engine) + app.js (logic)
├── app/src/main/java/com/cryptoai/pro/  # WebView shell + HMAC signing bridge
├── INSTALL_SI.md         # 📖 සිංහල install + usage guide
└── README.md             # 📖 features + APK links

web/                      # මේ තමයි ඒ terminal එකම web version එක (PWA)
├── index.html            #   landing page (EN/සිංහල, live prices, FAQ)
├── app/                  #   terminal app එක (Android assets වලින් sync වෙනවා)
├── manifest.webmanifest · sw.js   # installable + offline shell
└── tools/make_icons.py   #   icons generate කරන script එක
```

## ✨ Features

| Tab | Contents |
|---|---|
| 📈 **Markets** | top-volume / gainers / losers / watchlist, search, live 24h change + sparkline |
| 🕯️ **Chart** | candlestick + EMA 20/50, Bollinger, volume, RSI(14), drag-inspect, TF 1m…1d |
| 🎯 **Signal** | STRONG BUY…STRONG SELL verdict + confidence, reasons, 12 indicators, ATR entry/target/stop, 500-candle backtest, 4-timeframe agreement |
| 💱 **Trade** | paper mode (10,000 USDT, 0.1% fee, long/short, TP/SL, limit) + live (Binance/Bybit, keys signed on-device) |
| 🤖 **Bot** | 5 strategies (🧠 AI brain / AI signal / trend / reversion / breakout), multi-symbol, risk limits, daily-loss stop |
| 🖥️ **System** | **Real-time මෙහෙයුම් එන්ජිම** — Process / Memory / Device / File / Security / Network management |

- **Account/keys ඕන නෑ** — prices, signals, charts, paper trading ඔක්කොම free.
- 🧠 **Self-learning AI brain (v37+)** — 16 factors (indicators 12 + 📚 Huntraders pattern knowledge 4) online-learn කරනවා: හැම trade close එකකදීම outcome එකෙන් weights adapt වෙනවා, trade history trainer එකෙන් bulk-train කරන්නත් පුළුවන්.
- 📚 **Huntraders book knowledge (v38)** — huntraders.com/books වල public pattern definitions (candlestick 24 + chart patterns 8, book reliability ratings High/Moderate/Low සමඟ) detection engine එකක් විදිහට encode කරලා brain එකට feed කරනවා. Book ratings = starting priors විතරයි — live outcomes මොනවා actually pay කරන්නේද කියලා brain එක තමන්ම ඉගෙන ගන්නවා.
- Exchange එකක් reach කරන්න බැරි වුණොත් clearly-labelled **simulated demo data** වලින් වැඩ කරනවා.
- Live trading සඳහා: trading-enabled, **withdrawal-disabled** API keys — secret එක phone එකෙන් පිටවෙන්නේ නෑ.
- ⚠️ Educational tool — financial advice එකක් නෙවෙයි.

## 📱 APK

Push එකක් `crypto-app/**` ට වෙනස් වුණාම GitHub Actions එකෙන් debug APK auto-build වෙලා
**cryptoai-apk-latest** release එකට දානවා:

- **මේ repo එකේ build:** https://github.com/Rusindu12/1/releases/tag/cryptoai-apk-latest
- **පරණ build (Rs-et):** https://github.com/Rusindu12/Rs-et/releases/download/cryptoai-apk-latest/CryptoAI-PRO.apk
- Manual build: Actions tab → "CryptoAI PRO APK" → Run workflow (or artifact: `CryptoAI-PRO-debug-apk`)

Install guide (සිංහල): [crypto-app/INSTALL_SI.md](crypto-app/INSTALL_SI.md)

## 🌐 Web / PWA

```bash
cd web && python3 -m http.server 8080   # → http://localhost:8080 (paper mode)
```

`ta.js` engine එක dependency-free — Node වලෙනුත් run කරන්න පුළුවන් (backtester test එකත් එනවා):

```bash
cd crypto-app/app/src/main/assets && node ta.js
```

GitHub Pages deploy එක `.github/workflows/pages.yml` (`main` branch → `web/`).
