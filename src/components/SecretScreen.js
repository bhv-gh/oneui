import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { hashSecret, setUserHash } from '../utils/userHash';

export default function SecretScreen({ onAuthenticated }) {
  const [secret, setSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!secret.trim()) return;

    setIsLoading(true);
    const hash = await hashSecret(secret.trim());
    setUserHash(hash);
    onAuthenticated(hash);
  };

  return (
    <div className="min-h-screen bg-page-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-subtle mb-6">
            <Lock size={28} className="text-accent" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-transparent mb-3">
            Flow
          </h1>
          <p className="text-sm text-content-tertiary leading-relaxed">
            Enter your secret to access your workspace.
            <br />
            <span className="text-content-muted">A new secret creates a new workspace.</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter your secret"
              autoFocus
              className="w-full px-4 py-3.5 bg-surface-secondary border border-edge-primary rounded-xl text-content-primary placeholder-content-muted focus:outline-none focus:border-accent-bold focus:ring-2 focus:ring-accent-bold/20 text-sm transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!secret.trim() || isLoading}
            className="w-full py-3.5 bg-accent-bold hover:bg-accent-bolder disabled:bg-surface-secondary disabled:text-content-muted text-content-inverse text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-bold/20 hover:shadow-accent-bold/30 disabled:shadow-none"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-content-inverse/30 border-t-content-inverse rounded-full animate-spin" />
            ) : (
              <>
                <span>Enter</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-content-disabled mt-8">
          Your secret is hashed locally and never stored in plain text.
        </p>
      </div>
    </div>
  );
}
