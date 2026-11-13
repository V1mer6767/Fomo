import type { Direction } from "../types";
export interface ImpactTpl { asset: string; dir: Direction; direct: boolean; mech: string; alt: string; factors: string[]; monitor: string[] }
export interface Rule { id: string; label: string; test: RegExp; tpl: (t: string) => ImpactTpl[]; watch: string[]; hist?: string }

const hawk = /\b(hike|hikes|raise[sd]? rates?|higher for longer|hawkish|tighten|hot(ter)? (cpi|inflation)|inflation (rises|accelerat|jumps|surges))/i;
const dove = /\b(cut|cuts|lower(s|ed)? rates?|dovish|ease|easing|pause|cooling|inflation (falls|eases|slows|cools))/i;

export const RULES: Rule[] = [
  { id: "central-bank", label: "Central bank / interest rates", test: /\b(fed|fomc|federal reserve|powell|ecb|lagarde|bank of england|boe|bank of japan|boj|snb|rba|boc|rate decision|interest rates?|rate (hike|cut)|monetary policy)\b/i,
    watch: ["Official statement and press-conference wording", "Updated rate projections / dot plot", "Next inflation and jobs releases", "Treasury yield reaction"],
    tpl: t => {
      const h = hawk.test(t), d = dove.test(t) && !h;
      const usd: Direction = h ? "positive" : d ? "negative" : "uncertain";
      return [
        { asset: "DXY", dir: usd, direct: true, mech: h ? "Higher expected rates raise the yield advantage of the currency, which has historically supported it." : d ? "Lower expected rates narrow the yield advantage, which has historically weighed on the currency." : "Direction depends on whether the decision/guidance is more hawkish or dovish than markets had priced.",
          alt: "If the move was already priced in, the reaction can be small or opposite (\"sell the news\").", factors: ["Market pricing before the decision", "Forward guidance tone", "Global rate differentials"], monitor: ["Treasury 2y yield", "Fed funds futures"] },
        { asset: "XAU", dir: h ? "negative" : d ? "positive" : "uncertain", direct: false, mech: "Gold pays no yield; real yields and the dollar are its main rate-linked drivers.", alt: "Safe-haven or central-bank buying can offset rate effects.", factors: ["Real yields", "Dollar trend", "Geopolitical demand"], monitor: ["US 10y real yield", "DXY"] },
        { asset: "SPX", dir: h ? "negative" : d ? "positive" : "mixed", direct: false, mech: "Rates change discount rates for equities; growth stocks are usually more rate-sensitive. A cut driven by weak growth can be negative for earnings.", alt: "Cuts made because the economy is weakening may not support equities.", factors: ["Reason for the move (inflation vs growth)", "Earnings outlook"], monitor: ["Yield curve", "Sector rotation"] },
        { asset: "BTC", dir: "uncertain", direct: false, mech: "Crypto has often moved with liquidity expectations, but the relationship is unstable and correlation is not causation.", alt: "Crypto-specific news can dominate rate effects.", factors: ["Risk appetite", "ETF flows", "Dollar liquidity"], monitor: ["Nasdaq correlation", "DXY"] },
        { asset: "EURUSD", dir: h ? "negative" : d ? "positive" : "uncertain", direct: true, mech: "EUR/USD is quoted in dollars, so a stronger USD tends to push it lower, subject to ECB policy differences.", alt: "ECB or euro-area data may move the euro independently.", factors: ["ECB vs Fed path"], monitor: ["Euro-area inflation"] },
        { asset: "USDJPY", dir: h ? "positive" : d ? "negative" : "uncertain", direct: true, mech: "USD/JPY has tracked US–Japan yield differentials; Bank of Japan policy and intervention risk can reverse this.", alt: "Japanese intervention or BoJ shifts can dominate.", factors: ["US–Japan yield gap", "MoF intervention"], monitor: ["JGB yields"] },
      ];
    } },
  { id: "inflation", label: "Inflation data", test: /\b(cpi|pce|inflation|consumer prices?|producer prices?|ppi)\b/i,
    watch: ["Core vs headline gap", "Revisions to previous months", "Central-bank reaction", "Rate-futures repricing"],
    tpl: t => { const h = /(rise|accelerat|jump|surge|hotter|higher|above)/i.test(t), c = /(fall|eas|slow|cool|lower|below|drop)/i.test(t) && !h;
      return [
        { asset: "DXY", dir: h ? "positive" : c ? "negative" : "uncertain", direct: false, mech: "Hotter inflation tends to raise expected policy rates; cooler data lowers them. Effect depends on how it compares with forecasts.", alt: "A reading in line with forecasts often moves prices little.", factors: ["Consensus forecast", "Core component"], monitor: ["Fed funds futures"] },
        { asset: "XAU", dir: "mixed", direct: false, mech: "Gold can be supported as an inflation hedge but pressured if inflation lifts real yields.", alt: "Which effect dominates changes by regime.", factors: ["Real yields"], monitor: ["TIPS yields"] },
        { asset: "SPX", dir: h ? "negative" : c ? "positive" : "mixed", direct: false, mech: "Rate expectations feed through discount rates and valuations.", alt: "Strong earnings can outweigh rate worries.", factors: ["Earnings season", "Yields"], monitor: ["10y yield"] },
      ]; } },
  { id: "jobs", label: "Labour market", test: /\b(nonfarm|non-farm|payrolls?|unemployment|jobless claims|jobs report|labou?r market)\b/i,
    watch: ["Wage growth", "Revisions", "Participation rate"],
    tpl: () => [
      { asset: "DXY", dir: "mixed", direct: false, mech: "Strong jobs data can lift rate expectations (supports USD); very weak data raises growth fears and cut expectations.", alt: "\"Good news is bad news\" regimes flip equity reaction.", factors: ["Consensus", "Wage component"], monitor: ["2y yield"] },
      { asset: "SPX", dir: "mixed", direct: false, mech: "Equities weigh growth against rate expectations.", alt: "Reaction depends on the prevailing macro narrative.", factors: ["Rate path"], monitor: ["Yields"] },
    ] },
  { id: "conflict", label: "Armed conflict / geopolitical escalation", test: /\b(war|invasion|missile|airstrike|air strike|ceasefire|cease-fire|military|troops|drone attack|shelling|military escalation|hostilities|attack on)\b/i,
    watch: ["Official government / UN statements", "Energy infrastructure involvement", "Shipping-route disruption", "Sanctions announcements"],
    tpl: t => { const peace = /(ceasefire|cease-fire|peace|truce|de-escalat)/i.test(t);
      return [
        { asset: "XAU", dir: peace ? "uncertain" : "positive", direct: false, mech: "Gold has often attracted safe-haven demand during geopolitical stress.", alt: "Gains often fade if escalation fears recede or the dollar/yields rise.", factors: ["Escalation scale", "Dollar & yields"], monitor: ["Gold vs DXY"] },
        { asset: "WTI", dir: peace ? "negative" : "positive", direct: false, mech: "Conflict near producing regions or shipping lanes can raise supply-risk premia.", alt: "If supply is not actually disrupted, the premium can unwind quickly.", factors: ["Is oil infrastructure/route involved?", "OPEC spare capacity"], monitor: ["Brent–WTI spread", "Tanker rates"] },
        { asset: "SPX", dir: peace ? "uncertain" : "negative", direct: false, mech: "Risk aversion and higher energy costs can weigh on equities.", alt: "Markets have often looked through localised conflicts.", factors: ["Contagion risk", "Energy prices"], monitor: ["VIX", "Defence sector"] },
        { asset: "USDCHF", dir: "mixed", direct: false, mech: "CHF and JPY are traditional safe-haven currencies; USD can also benefit from flight to safety.", alt: "Safe-haven behaviour is not guaranteed in every episode.", factors: ["Risk sentiment"], monitor: ["VIX"] },
        { asset: "BTC", dir: "uncertain", direct: false, mech: "Bitcoin has traded both as a risk asset and occasionally as an alternative store of value during crises; no stable pattern.", alt: "Often sells off with other risk assets initially.", factors: ["Liquidity", "Risk appetite"], monitor: ["Nasdaq", "Funding rates"] },
      ]; } },
  { id: "energy", label: "Oil & energy supply", test: /\b(opec|oil prices?|crude|brent|natural gas|lng|pipeline|refiner\w*|energy prices?)\b/i,
    watch: ["Inventory data", "OPEC+ decisions", "Demand indicators (China, US)"],
    tpl: t => { const up = /(cut|cuts|curb|disrupt|outage|surge|rise|jump)/i.test(t); return [
      { asset: "WTI", dir: up ? "positive" : "mixed", direct: true, mech: "Supply cuts/outages raise prices; demand worries or output increases lower them.", alt: "Demand weakness can outweigh supply news.", factors: ["Inventories", "Demand outlook"], monitor: ["EIA data", "Brent"] },
      { asset: "USDCAD", dir: "mixed", direct: false, mech: "CAD is a commodity currency sensitive to oil.", alt: "BoC policy and US data can dominate.", factors: ["Oil", "BoC"], monitor: ["WTI"] },
      { asset: "SPX", dir: "mixed", direct: false, mech: "Higher oil lifts energy-sector earnings but raises input costs and inflation expectations elsewhere.", alt: "Net effect varies by sector mix.", factors: ["Sector weights"], monitor: ["Energy sector"] },
    ]; } },
  { id: "trade", label: "Tariffs & trade policy", test: /\b(tariffs?|trade war|trade deal|trade talks|export controls?|import dut(y|ies)|customs)\b/i,
    watch: ["Effective date and scope", "Retaliation announcements", "Exemptions", "Court challenges"],
    tpl: () => [
      { asset: "SPX", dir: "negative", direct: false, mech: "Tariffs can raise costs and reduce margins for import-reliant companies; a de-escalation could ease this.", alt: "A trade deal/de-escalation reverses the sign.", factors: ["Scope", "Retaliation"], monitor: ["Affected sectors"] },
      { asset: "DXY", dir: "mixed", direct: false, mech: "Tariffs have at times supported the dollar, but retaliation and growth concerns can offset it.", alt: "Effects differed across episodes.", factors: ["Growth impact"], monitor: ["CNY", "EUR"] },
      { asset: "USDJPY", dir: "uncertain", direct: false, mech: "Risk sentiment and the specific trade partner determine moves.", alt: "BoJ and yield differentials dominate.", factors: ["Partner involved"], monitor: ["Risk sentiment"] },
      { asset: "AUDUSD", dir: "negative", direct: false, mech: "AUD is sensitive to China and global trade volumes.", alt: "Commodity prices can offset.", factors: ["China demand"], monitor: ["Iron ore", "CNH"] },
    ] },
  { id: "election", label: "Elections & political change", test: /\b(election|elections|vote|voters|ballot|poll(s|ing)?|president-elect|prime minister|coalition|referendum|snap election|parliament)\b/i,
    watch: ["Official results / certification", "Fiscal & trade platform of winner", "Market-implied probabilities vs polls"],
    tpl: () => [
      { asset: "SPX", dir: "uncertain", direct: false, mech: "Policy expectations (tax, regulation, trade) can shift sector pricing; uncertainty itself often raises volatility.", alt: "Historically, election effects have been short-lived and hard to attribute.", factors: ["Policy platform", "Legislative control"], monitor: ["Volatility index"] },
      { asset: "DXY", dir: "uncertain", direct: false, mech: "Fiscal-policy and trade expectations may affect currency demand.", alt: "Rate path usually dominates.", factors: ["Fiscal outlook"], monitor: ["Yields"] },
      { asset: "BTC", dir: "uncertain", direct: false, mech: "Crypto policy stances can matter for sentiment; evidence of direct causality is limited.", alt: "Macro liquidity dominates.", factors: ["Regulatory stance"], monitor: ["Policy statements"] },
    ] },
  { id: "crypto-reg", label: "Crypto regulation / ETFs", test: /\b(sec|cftc|crypto regulation|stablecoin|etf (approval|filing|flows?)|spot (bitcoin|ether) etf|mica|crypto bill|digital asset)\b.*|.*\b(crypto|bitcoin)\b.*\b(ban|lawsuit|approv\w+|regulat\w+|bill|law)\b/i,
    watch: ["Official agency/legislative text", "Effective dates", "Exchange/ETF issuer responses"],
    tpl: t => { const pos = /(approv|clear|legal|friendly|allow)/i.test(t), neg = /(ban|lawsuit|sues|crackdown|reject|deny|fine)/i.test(t) && !pos; return [
      { asset: "BTC", dir: pos ? "positive" : neg ? "negative" : "mixed", direct: true, mech: "Regulatory clarity or access (e.g. ETFs) can broaden demand; restrictions can reduce it.", alt: "\"Buy the rumour, sell the news\" is common around approvals.", factors: ["Scope of rule", "Jurisdiction"], monitor: ["ETF flows", "Exchange volumes"] },
      { asset: "ETH", dir: pos ? "positive" : neg ? "negative" : "mixed", direct: true, mech: "Treatment of ETH/staking/tokens specifically may differ from BTC.", alt: "Classification questions can cut the other way.", factors: ["Security-vs-commodity treatment"], monitor: ["Staking rules"] },
      { asset: "XRP", dir: "uncertain", direct: false, mech: "Individual tokens are sensitive to their own legal status.", alt: "Case-specific outcomes dominate.", factors: ["Litigation status"], monitor: ["Court filings"] },
    ]; } },
  { id: "crypto-security", label: "Crypto exchange / security incident", test: /\b(hack(ed|s)?|exploit(ed)?|stolen|breach|exchange (collapse|insolven\w+|halts? withdrawals)|rug pull|depeg(ged)?)\b/i,
    watch: ["Confirmed amount lost", "Exchange/protocol statements", "On-chain flows"],
    tpl: () => [
      { asset: "BTC", dir: "mixed", direct: false, mech: "Large incidents can dent confidence market-wide; isolated protocol hacks usually have limited effect on BTC.", alt: "Impact scales with size and counterparty exposure.", factors: ["Size of loss", "Contagion"], monitor: ["Exchange outflows"] },
      { asset: "ETH", dir: "mixed", direct: false, mech: "Most DeFi protocols run on Ethereum, so DeFi incidents can affect ETH sentiment.", alt: "Often confined to the affected token.", factors: ["DeFi exposure"], monitor: ["DeFi TVL"] },
    ] },
  { id: "crypto-general", label: "Crypto market news", test: /\b(bitcoin|btc|ethereum|ether|solana|crypto(currency|currencies)?|altcoins?|halving|whales?)\b/i,
    watch: ["Spot ETF flows", "Exchange reserves", "Macro liquidity"],
    tpl: () => [
      { asset: "BTC", dir: "uncertain", direct: true, mech: "Direct subject of the story; direction depends on the specific development.", alt: "Headline may already be priced in.", factors: ["Positioning", "Liquidity"], monitor: ["Funding rates", "ETF flows"] },
      { asset: "ETH", dir: "uncertain", direct: false, mech: "Typically moves with BTC with higher beta, though not always.", alt: "ETH-specific catalysts can diverge.", factors: ["BTC trend"], monitor: ["ETH/BTC ratio"] },
    ] },
  { id: "china", label: "China economy / policy", test: /\b(china|chinese|beijing|pboc|yuan|renminbi)\b.*\b(stimulus|economy|growth|property|gdp|exports?|pmi|rate cut|data)\b/i,
    watch: ["Official data (NBS/PMI)", "Property-sector measures", "PBoC actions"],
    tpl: () => [
      { asset: "AUDUSD", dir: "mixed", direct: false, mech: "AUD is a proxy for China demand via commodity exports.", alt: "Fed/US data can outweigh.", factors: ["China demand"], monitor: ["Iron ore"] },
      { asset: "WTI", dir: "mixed", direct: false, mech: "China is a large oil importer; demand signals matter.", alt: "Supply-side news can dominate.", factors: ["Demand"], monitor: ["Refinery runs"] },
      { asset: "DAX", dir: "mixed", direct: false, mech: "German exporters have notable China exposure.", alt: "Domestic factors dominate.", factors: ["Export orders"], monitor: ["German Ifo"] },
    ] },
  { id: "tech-earnings", label: "Earnings & big tech / AI", test: /\b(earnings|nvidia|apple|microsoft|alphabet|google|amazon|meta|tesla|semiconductors?|chips?|artificial intelligence|ai (boom|spending|demand))\b/i,
    watch: ["Guidance vs consensus", "Capex commentary", "Reaction in sector peers"],
    tpl: () => [
      { asset: "NDX", dir: "uncertain", direct: true, mech: "Mega-cap tech is heavily weighted in the Nasdaq 100; results/guidance vs expectations drive the move.", alt: "A beat can still sell off if expectations were higher.", factors: ["Expectations", "Guidance"], monitor: ["Sector peers"] },
      { asset: "SPX", dir: "uncertain", direct: false, mech: "Large weights in the S&P 500 transmit to the index.", alt: "Breadth may diverge.", factors: ["Weight in index"], monitor: ["Equal-weight index"] },
    ] },
  { id: "banking", label: "Banking / credit stress", test: /\b(bank (run|failure|collapse)|bank stress|credit crunch|default|downgrade|sovereign debt|bailout|liquidity crisis|credit rating)\b/i,
    watch: ["Regulator / central-bank statements", "Credit spreads", "Deposit data"],
    tpl: () => [
      { asset: "SPX", dir: "negative", direct: false, mech: "Financial stress can tighten credit and raise risk aversion.", alt: "Swift policy backstops can limit damage.", factors: ["Contagion", "Policy response"], monitor: ["Bank index", "Credit spreads"] },
      { asset: "XAU", dir: "positive", direct: false, mech: "Gold has at times benefited from financial-stability concerns.", alt: "Dollar liquidity squeezes can hit gold initially.", factors: ["Severity"], monitor: ["Yields"] },
      { asset: "USDCHF", dir: "mixed", direct: false, mech: "CHF is a traditional haven but Swiss-bank issues can break that pattern.", alt: "Case-specific.", factors: ["Origin of stress"], monitor: ["Swiss yields"] },
    ] },
];
