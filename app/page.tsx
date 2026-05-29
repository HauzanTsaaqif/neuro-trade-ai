'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import PriceChart from '@/components/PriceChart';
import SignalBadge from '@/components/SignalBadge';
import TypewriterText from '@/components/TypewriterText';

/* ── Types ── */
interface AssetInfo {
  name: string;
  sym: string;
  acc: string;
  glow: string;
}

interface DataPoint {
  price: number;
  label: string;
}

interface AdviceResult {
  signal: string;
  type: 'buy' | 'hold' | 'sell';
  text: string;
  target: string;
  support: string;
  conf: number;
  rsi: string;
  macd: string;
}

/* ── Constants ── */
const ASSETS: Record<string, AssetInfo> = {
  ETH: { name: 'Ethereum',  sym: 'ETH', acc: '#8b5cf6', glow: 'rgba(139,92,246,.45)' },
  BNB: { name: 'BNB Chain', sym: 'BNB', acc: '#f59e0b', glow: 'rgba(245,158,11,.45)' },
  SOL: { name: 'Solana',    sym: 'SOL', acc: '#14f195', glow: 'rgba(20,241,149,.45)'  },
};

const TFS = ['1D', '10D', '20D', '30D', '60D'] as const;
type TF = (typeof TFS)[number];

const TF_DAYS: Record<TF, number> = {
  '1D': 1, '10D': 10, '20D': 20, '30D': 30, '60D': 60,
};

const ICONS: Record<string, string> = { ETH: '⟠', BNB: '◆', SOL: '◎' };

function hr(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ── Navbar ── */
function Navbar() {
  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px',
        background: 'rgba(8,8,9,.9)', borderBottom: '1px solid rgba(255,255,255,.056)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg,#b8ff00,#7acc00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 900, color: '#080809', letterSpacing: '-.5px',
          }}
        >
          NT
        </div>
        <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff', letterSpacing: '-.3px' }}>
          NeuroTrade AI
        </span>
      </div>

      <div style={{ display: 'flex', gap: '30px', fontSize: '13px', color: 'rgba(255,255,255,.42)' }}>
        {['Markets', 'Signals', 'Portfolio', 'Alerts'].map((l) => (
          <a
            key={l}
            href="#"
            style={{ textDecoration: 'none', color: 'inherit', transition: 'color .2s' }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#fff')}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,.42)')}
          >
            {l}
          </a>
        ))}
      </div>

      <button
        style={{
          background: '#b8ff00', color: '#080809', border: 'none',
          padding: '7px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 800,
          cursor: 'pointer', letterSpacing: '-.2px',
        }}
      >
        Connect Wallet
      </button>
    </nav>
  );
}

/* ── AssetBtn ── */
function AssetBtn({
  sym, info, active, onClick,
}: {
  sym: string; info: AssetInfo; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 14px',
        borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
        background: active ? 'rgba(255,255,255,.09)' : 'transparent',
        color: active ? info.acc : 'rgba(255,255,255,.36)',
        boxShadow: active ? `0 0 18px ${hr(info.acc, .32)}` : 'none',
        transition: 'all .2s',
      }}
    >
      <span style={{ fontSize: '15px', lineHeight: 1, color: active ? info.acc : 'rgba(255,255,255,.28)' }}>
        {ICONS[sym]}
      </span>
      {sym}
    </button>
  );
}

function ChartSkeleton() {
  return <div className="shimmer-bar" style={{ width: '100%', height: '100%', borderRadius: '8px' }} />;
}

/* ── Main App ── */
export default function Home() {
  const [asset, setAsset] = useState<string>('ETH');
  const [tf, setTf] = useState<TF>('30D');
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [change24h, setChange24h] = useState<number>(0);
  const [flash, setFlash] = useState('');
  const [aiPhase, setAiPhase] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const info = ASSETS[asset];
  const isUp = change24h >= 0;

  const fetchChart = useCallback(async (a: string, t: TF) => {
    setChartLoading(true);
    try {
      const days = TF_DAYS[t];
      const res = await fetch(`/api/market-chart?asset=${a}&days=${days}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const raw: [number, number][] = json.prices ?? [];
      if (!raw.length) throw new Error('No price data');

      const isOneDay = days === 1;
      const parsed: DataPoint[] = raw.map(([ts, price]) => {
        const d = new Date(ts);
        const label = isOneDay
          ? d.getHours().toString().padStart(2, '0') + ':00'
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { price, label };
      });

      setChartData(parsed);
      const latest = raw[raw.length - 1][1];
      const first = raw[0][1];
      setCurrentPrice(latest);
      setChange24h(((latest - first) / first) * 100);
    } catch (e) {
      console.error('Chart fetch error:', e);
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    setAdvice(null);
    setAiPhase('idle');
    fetchChart(asset, tf);
  }, [asset, tf, fetchChart]);

  useEffect(() => {
    if (!currentPrice) return;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setCurrentPrice((prev) => {
        const delta = (Math.random() - 0.48) * prev * 0.0009;
        setFlash(delta > 0 ? 'flash-green' : 'flash-red');
        setTimeout(() => setFlash(''), 750);
        return prev + delta;
      });
    }, 2200);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, currentPrice > 0]);

  const doGenerate = async () => {
    if (aiPhase === 'loading' || !chartData.length) return;
    setAiPhase('loading');
    setAdvice(null);
    setErrorMsg('');
    try {
      const prices = chartData.map((d) => d.price);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, assetName: info.name, tf, prices }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data: AdviceResult = await res.json();
      setAdvice(data);
      setAiPhase('done');
    } catch (e) {
      setErrorMsg(String(e));
      setAiPhase('error');
    }
  };

  const fmtPrice = (p: number) =>
    p >= 1000
      ? p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : p.toFixed(2);

  const accentLine = {
    position: 'absolute' as const,
    top: 0, left: 0, right: 0, height: '1px',
    background: `linear-gradient(90deg,transparent,${info.acc}77,transparent)`,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080809' }}>
      <Navbar />

      {/* Hero */}
      <section className="hero-glow" style={{ padding: '100px 20px 36px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '4px 14px', borderRadius: '99px', marginBottom: '22px',
            background: 'rgba(184,255,0,.1)', border: '1px solid rgba(184,255,0,.22)',
            fontSize: '12px', fontWeight: 600, color: '#b8ff00',
          }}
        >
          <span className="live-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#b8ff00', display: 'inline-block' }} />
          Live AI Market Analysis · Real-Time Data
        </div>

        <h1 style={{ fontSize: 'clamp(30px,5.5vw,62px)', fontWeight: 900, letterSpacing: '-2.5px', lineHeight: 1.04, marginBottom: '16px' }}>
          <span style={{ background: 'linear-gradient(160deg,#ffffff 25%,rgba(255,255,255,.52))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Real-Time Crypto Analysis,
          </span>
          <br />
          <span style={{ background: 'linear-gradient(135deg,#b8ff00 20%,#78cc00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Powered by AI.
          </span>
        </h1>

        <p style={{ color: 'rgba(255,255,255,.36)', fontSize: 'clamp(14px,1.8vw,17px)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.65 }}>
          Dapatkan wawasan teknikal dan sinyal pasar untuk mengambil keputusan yang lebih cerdas,&nbsp;langsung dari browser Anda.
        </p>
      </section>

      {/* Dashboard Card */}
      <section style={{ padding: '0 16px 36px', maxWidth: '980px', margin: '0 auto' }}>
        <div className="glass" style={{ borderRadius: '24px', padding: '28px 28px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={accentLine} />

          {/* Controls Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '22px' }}>
            <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '12px' }}>
              {Object.entries(ASSETS).map(([sym, a]) => (
                <AssetBtn key={sym} sym={sym} info={a} active={asset === sym} onClick={() => setAsset(sym)} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '3px', padding: '3px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '12px' }}>
              {TFS.map((t) => {
                const active = tf === t;
                return (
                  <button key={t} onClick={() => setTf(t)} style={{ padding: '5px 13px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: active ? 700 : 500, background: active ? 'rgba(255,255,255,.11)' : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,.32)', transition: 'all .2s' }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Price */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: hr(info.acc, 0.15), border: `1px solid ${hr(info.acc, 0.25)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: info.acc }}>
                {ICONS[asset]}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.33)', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase' }}>{info.name}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.2)' }}>{tf} performance</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
              <span className={flash} style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 900, letterSpacing: '-1.5px', fontVariantNumeric: 'tabular-nums', color: '#f0f0f0' }}>
                {currentPrice > 0 ? `$${fmtPrice(currentPrice)}` : '—'}
              </span>
              {currentPrice > 0 && (
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', background: isUp ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)', color: isUp ? '#10b981' : '#ef4444' }}>
                  {isUp ? '+' : ''}{change24h.toFixed(2)}%
                </span>
              )}
            </div>
          </div>

          {/* Chart */}
          <div style={{ width: '100%', height: '260px', marginBottom: '20px' }}>
            {chartLoading ? (
              <ChartSkeleton />
            ) : chartData.length > 0 ? (
              <PriceChart data={chartData} info={info} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.2)', fontSize: '13px' }}>
                No chart data available
              </div>
            )}
          </div>

          {/* AI Section */}
          {aiPhase === 'idle' && (
            <button
              className="glow-cta"
              onClick={doGenerate}
              disabled={chartData.length === 0}
              style={{
                width: '100%', padding: '16px 0', borderRadius: '16px', border: 'none',
                background: 'linear-gradient(135deg,#b8ff00 0%,#85cc00 100%)',
                color: '#080809', fontSize: '14px', fontWeight: 900, cursor: chartData.length === 0 ? 'not-allowed' : 'pointer',
                letterSpacing: '-.2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                opacity: chartData.length === 0 ? 0.5 : 1,
              }}
            >
              🧠 Generate AI Trading Advice
            </button>
          )}

          {aiPhase === 'loading' && (
            <div
              className="shimmer-bar"
              style={{ width: '100%', padding: '16px 0', borderRadius: '16px', border: '1px solid rgba(184,255,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}
            >
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <div className="dot-1" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#b8ff00' }} />
                <div className="dot-2" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#b8ff00' }} />
                <div className="dot-3" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#b8ff00' }} />
              </div>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.52)', fontWeight: 500 }}>
                Analyzing {tf} market data with AI…
              </span>
            </div>
          )}

          {aiPhase === 'error' && (
            <div style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid rgba(239,68,68,.25)', background: 'rgba(239,68,68,.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: '#ef4444' }}>⚠ Failed to generate analysis: {errorMsg}</span>
              <button onClick={() => setAiPhase('idle')} style={{ padding: '6px 16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,.3)', background: 'transparent', color: 'rgba(255,255,255,.5)', fontSize: '12px', cursor: 'pointer' }}>
                Try Again
              </button>
            </div>
          )}

          {aiPhase === 'done' && advice && (
            <div className="fade-up">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  AI Analysis Results
                </div>
                <button
                  onClick={() => { setAiPhase('idle'); setAdvice(null); }}
                  style={{ padding: '4px 12px', borderRadius: '7px', border: '1px solid rgba(255,255,255,.09)', background: 'transparent', color: 'rgba(255,255,255,.4)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.7)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.4)')}
                >
                  ↺ Re-analyze
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '12px' }}>
                <SignalBadge signal={advice.signal} type={advice.type} conf={advice.conf} />

                <div className="glass-dark" style={{ borderRadius: '16px', padding: '16px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '10px' }}>
                    Market Sentiment
                  </div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)', lineHeight: 1.68, margin: 0 }}>
                    <TypewriterText text={advice.text} />
                  </p>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,.055)' }}>
                    {([['RSI', advice.rsi], ['MACD', advice.macd]] as [string, string][]).map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.28)' }}>{k}</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,.78)', marginTop: '2px' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-dark" style={{ borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                    Key Levels
                  </div>
                  {[
                    { icon: '🎯', label: 'Target Price',   val: advice.target,       bg: 'rgba(16,185,129,.08)',   border: 'rgba(16,185,129,.18)',   color: '#10b981' },
                    { icon: '🛡️', label: 'Support Level',  val: advice.support,      bg: 'rgba(96,165,250,.08)',   border: 'rgba(96,165,250,.18)',   color: '#60a5fa' },
                    { icon: '📊', label: 'Timeframe',      val: tf + ' Analysis',    bg: 'rgba(255,255,255,.035)', border: 'rgba(255,255,255,.07)',  color: 'rgba(255,255,255,.72)' },
                  ].map(({ icon, label, val, bg, border, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: bg, border: `1px solid ${border}` }}>
                      <span style={{ fontSize: '16px' }}>{icon}</span>
                      <div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.32)' }}>{label}</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color, marginTop: '1px' }}>{val}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '0 16px 44px', maxWidth: '980px', margin: '0 auto' }}>
        <div style={{ borderRadius: '16px', padding: '20px 24px', background: 'rgba(255,255,255,.018)', border: '1px solid rgba(255,255,255,.048)', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'rgba(251,191,36,.55)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
            ⚠ Disclaimer
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.22)', lineHeight: 1.72, maxWidth: '620px', margin: '0 auto 14px' }}>
            Analisis ini dihasilkan oleh AI berdasarkan data historis dan bukan merupakan saran keuangan resmi.&nbsp;
            <strong style={{ color: 'rgba(255,255,255,.38)' }}>Not Financial Advice (NFA).</strong>&nbsp;
            Lakukan riset Anda sendiri (DYOR) sebelum berinvestasi. Past performance is not indicative of future results.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', fontSize: '11px', color: 'rgba(255,255,255,.15)', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,.04)' }}>
            <span>© 2026 NeuroTrade AI. All rights reserved.</span>
            <span>Built with Next.js + Tailwind CSS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
