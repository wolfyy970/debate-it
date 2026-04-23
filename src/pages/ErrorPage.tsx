import { useSearchParams, useNavigate } from 'react-router-dom';
import { Masthead, Button } from '../components';

export function ErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reason = searchParams.get('reason');

  const missingLlm = searchParams.get('llm') === '1';
  const missingTavily = searchParams.get('tavily') === '1';

  const getErrorContent = () => {
    switch (reason) {
      case 'missing-keys':
      case 'no-api-keys': {
        const llm = missingLlm || reason === 'no-api-keys';
        const tavily = missingTavily;
        const bits: string[] = [];
        if (llm) bits.push('an LLM provider key (OpenRouter or Kimi)');
        if (tavily) bits.push('a Tavily search key');
        const list = bits.length ? bits.join(' and ') : 'required API keys';
        return {
          title: 'Unable to start debate',
          message: `Debater requires ${list} to run. Set the missing keys in .env and restart the server.`,
          action: {
            label: 'View Setup Instructions',
            onClick: () => window.open('https://github.com/anomalyco/debate-it#setup', '_blank'),
          },
        };
      }
      case 'invalid-debate':
        return {
          title: 'Debate not found',
          message: 'The debate you are looking for does not exist or has been removed.',
          action: {
            label: 'Start New Debate',
            onClick: () => navigate('/setup'),
          },
        };
      default:
        return {
          title: 'Something went wrong',
          message: 'We encountered an unexpected error. Please try again or check your configuration.',
          action: null,
        };
    }
  };

  const content = getErrorContent();

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--paper)',
      color: 'var(--ink-900)',
      fontFamily: 'var(--font-body)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Masthead
        title="DEBATER"
        edition="ERROR"
      />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        textAlign: 'center',
      }}>
        {/* Warning icon */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          border: '2px solid var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
        }}>
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="var(--accent)" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 38,
          fontWeight: 500,
          lineHeight: 1.1,
          margin: '0 0 16px',
          color: 'var(--ink-900)',
        }}>
          {content.title}
        </h1>

        <p style={{
          fontSize: 17,
          lineHeight: 1.6,
          color: 'var(--ink-700)',
          maxWidth: 480,
          margin: '0 0 32px',
        }}>
          {content.message}
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          {content.action && (
            <Button 
              size="md" 
              variant="primary"
              onClick={content.action.onClick}
            >
              {content.action.label}
            </Button>
          )}
          <Button 
            size="md" 
            variant="ghost"
            onClick={() => navigate('/')}
          >
            ← Back to Home
          </Button>
        </div>

        <div style={{
          marginTop: 48,
          padding: '24px 32px',
          background: 'var(--paper-2)',
          border: '1px solid var(--ink-200)',
          maxWidth: 520,
          textAlign: 'left',
        }}>
          <div className="t-meta" style={{ marginBottom: 12, color: 'var(--ink-500)' }}>
            How to configure API keys
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--ink-700)',
          }}>
            <div style={{ marginBottom: 8 }}>1. Copy example.env to .env</div>
            <div style={{ 
              background: 'var(--paper-0)', 
              padding: '12px 16px',
              marginBottom: 16,
              border: '1px solid var(--ink-100)',
            }}>
              cp example.env .env
            </div>
            <div style={{ marginBottom: 8 }}>2. Add your API keys to .env</div>
            <div style={{ 
              background: 'var(--paper-0)', 
              padding: '12px 16px',
              marginBottom: 16,
              border: '1px solid var(--ink-100)',
            }}>
              OPENROUTER_API_KEY=your_key_here
              <br />
              KIMI_API_KEY=your_key_here
              <br />
              TAVILY_API_KEY=your_key_here
            </div>
            <div style={{ marginBottom: 8 }}>3. Restart the server</div>
            <div style={{ 
              background: 'var(--paper-0)', 
              padding: '12px 16px',
              border: '1px solid var(--ink-100)',
            }}>
              ./start.sh dev
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
