'use client';

interface Props {
  signal: string;
  type: 'buy' | 'hold' | 'sell';
  conf: number;
}

const COLORS = {
  buy:  { bg: 'rgba(16,185,129,.08)',  border: 'rgba(16,185,129,.22)',  dot: '#10b981', label: '#10b981' },
  hold: { bg: 'rgba(245,158,11,.08)',  border: 'rgba(245,158,11,.22)',  dot: '#f59e0b', label: '#f59e0b' },
  sell: { bg: 'rgba(239,68,68,.08)',   border: 'rgba(239,68,68,.22)',   dot: '#ef4444', label: '#ef4444' },
};

export default function SignalBadge({ signal, type, conf }: Props) {
  const C = COLORS[type] ?? COLORS.hold;
  return (
    <div
      style={{
        borderRadius: '16px',
        padding: '18px 14px',
        background: C.bg,
        border: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '22px',
          height: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="ping-dot"
          style={{
            position: 'absolute',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: C.dot,
            opacity: 0.28,
          }}
        />
        <div
          style={{
            width: '13px',
            height: '13px',
            borderRadius: '50%',
            background: C.dot,
            boxShadow: `0 0 14px ${C.dot}`,
          }}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '2px',
            color: C.label,
            textTransform: 'uppercase',
          }}
        >
          {signal}
        </div>
        <div
          style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,.24)',
            marginTop: '4px',
            fontWeight: 500,
          }}
        >
          AI Signal
        </div>
      </div>

      <div style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            marginBottom: '6px',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,.3)' }}>Confidence</span>
          <span style={{ fontWeight: 800, color: C.label }}>{conf}%</span>
        </div>
        <div
          style={{
            height: '5px',
            borderRadius: '99px',
            background: 'rgba(255,255,255,.07)',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: '99px',
              width: `${conf}%`,
              background: C.dot,
              boxShadow: `0 0 9px ${C.dot}`,
              transition: 'width 1.2s ease-out',
            }}
          />
        </div>
      </div>
    </div>
  );
}
