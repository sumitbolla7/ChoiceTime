import { useEffect, useState } from 'react';

// ─── Maintenance ends at: change this to your target date/time ───
const MAINTENANCE_UNTIL = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

function pad(n) {
  return String(n).padStart(2, '0');
}

const Maintenance = () => {
  const [timeLeft, setTimeLeft] = useState({ h: '00', m: '00', s: '00' });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, MAINTENANCE_UNTIL - Date.now());
      const totalSec = Math.floor(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setTimeLeft({ h: pad(h), m: pad(m), s: pad(s) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: '24px',
    }}>
      {/* Animated background circles */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(139,92,246,${0.06 + i * 0.02}) 0%, transparent 70%)`,
            width: `${300 + i * 150}px`,
            height: `${300 + i * 150}px`,
            top: `${10 + i * 15}%`,
            left: `${5 + i * 18}%`,
            animation: `pulse ${4 + i}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      <div style={{
        position: 'relative',
        textAlign: 'center',
        maxWidth: '560px',
        width: '100%',
      }}>

        {/* Logo / Brand */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '40px',
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '50px',
          padding: '10px 24px',
        }}>
          <div style={{
            width: '10px', height: '10px',
            borderRadius: '50%',
            background: '#a78bfa',
            boxShadow: '0 0 10px #a78bfa',
            animation: 'blink 1.2s ease-in-out infinite',
          }} />
          <span style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 600, letterSpacing: '0.05em' }}>
            CHOICETIME
          </span>
        </div>

        {/* Gear icon */}
        <div style={{ fontSize: '72px', marginBottom: '24px', lineHeight: 1,
          animation: 'spin 8s linear infinite', display: 'inline-block' }}>
          ⚙️
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: 'clamp(28px, 6vw, 42px)',
          fontWeight: 800,
          color: '#ffffff',
          margin: '0 0 16px',
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
        }}>
          We're Upgrading<br />
          <span style={{
            background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            for You
          </span>
        </h1>

        {/* Subtext */}
        <p style={{
          color: '#94a3b8',
          fontSize: '16px',
          lineHeight: 1.7,
          marginBottom: '40px',
        }}>
          Our team is working hard to make ChoiceTime even better.
          We'll be back soon with improvements you'll love. 🚀
        </p>

        {/* Countdown */}
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          marginBottom: '40px',
        }}>
          {[
            { label: 'Hours', value: timeLeft.h },
            { label: 'Minutes', value: timeLeft.m },
            { label: 'Seconds', value: timeLeft.s },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(167,139,250,0.25)',
              borderRadius: '16px',
              padding: '20px 24px',
              minWidth: '90px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}>
              <div style={{
                fontSize: '40px',
                fontWeight: 800,
                color: '#a78bfa',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                marginBottom: '6px',
              }}>{value}</div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '50px',
          height: '6px',
          overflow: 'hidden',
          marginBottom: '32px',
        }}>
          <div style={{
            height: '100%',
            width: '65%',
            background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
            borderRadius: '50px',
            animation: 'progress 3s ease-in-out infinite alternate',
          }} />
        </div>

        {/* Status chips */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '36px' }}>
          {[
            { icon: '✅', text: 'Database Update' },
            { icon: '🔧', text: 'Server Upgrade', active: true },
            { icon: '⏳', text: 'Final Testing' },
          ].map(({ icon, text, active }) => (
            <span key={text} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: active ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${active ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '50px',
              padding: '6px 14px',
              fontSize: '12px',
              color: active ? '#a78bfa' : '#64748b',
            }}>
              {icon} {text}
            </span>
          ))}
        </div>

        {/* Contact */}
        <p style={{ color: '#475569', fontSize: '13px' }}>
          Need help?{' '}
          <a href="mailto:support@choicetime.in" style={{ color: '#a78bfa', textDecoration: 'none' }}>
            support@choicetime.in
          </a>
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes pulse { from { transform: scale(1); } to { transform: scale(1.15); } }
        @keyframes progress { from { width: 55%; } to { width: 75%; } }
      `}</style>
    </div>
  );
};

export default Maintenance;
