import { Link, useNavigate } from 'react-router-dom';
import { Brand, Card, PrimaryButton } from '../components/UI';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 600 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Brand />
        </div>

        <Card>
          <div style={{ padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: 'var(--bright)', marginBottom: 16 }}>
              Welcome to Estate Vault
            </div>
            
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 32 }}>
              Secure your digital legacy and ensure your assets are passed on to those who matter most.
            </div>

            <div style={{ textAlign: 'left', background: '#111118', padding: 24, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 32 }}>
              <div style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16, fontWeight: 700 }}>
                How It Works
              </div>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, color: 'var(--bright)', lineHeight: 1.8 }}>
                <li style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
                  <span style={{ color: 'var(--gold)' }}>1.</span>
                  <span><strong>Store securely:</strong> Save your critical digital assets, passwords, and crypto credentials in your encrypted vault.</span>
                </li>
                <li style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
                  <span style={{ color: 'var(--gold)' }}>2.</span>
                  <span><strong>Assign Nominees:</strong> Invite trusted individuals to be your digital heirs.</span>
                </li>
                <li style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
                  <span style={{ color: 'var(--gold)' }}>3.</span>
                  <span><strong>Dead Man's Switch:</strong> Check in periodically. If you stop checking in, the system alerts your nominees.</span>
                </li>
                <li style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: 'var(--gold)' }}>4.</span>
                  <span><strong>Legacy Passed On:</strong> Nominees submit verification. Once approved, your vault is securely unlocked for them.</span>
                </li>
              </ul>
            </div>

            <div style={{ maxWidth: 200, margin: '0 auto' }}>
              <PrimaryButton onClick={() => navigate('/login')}>
                Sign In
              </PrimaryButton>
            </div>

            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
              New here? <Link to="/register" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Create an account</Link>
            </div>
          </div>
        </Card>

        <div style={{ textAlign: 'center', marginTop: 40, fontSize: 12, color: 'var(--muted)', letterSpacing: '0.05em' }}>
          For queries contact: <a href="mailto:kavinaya.p@gmail.com" style={{ color: 'var(--gold)', textDecoration: 'none' }}>kavinaya.p@gmail.com</a>
        </div>
      </div>
    </div>
  );
}
