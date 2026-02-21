import React, { useState } from 'react';
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
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-content-primary mb-2">Flow</h1>
          <p className="text-sm text-content-tertiary">
            Enter your secret to access your workspace.
            <br />
            A new secret creates a new workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter your secret"
            autoFocus
            className="w-full px-4 py-3 bg-surface-primary border border-edge-primary rounded-xl text-content-primary placeholder-content-muted focus:outline-none focus:border-edge-focus focus:ring-1 focus:ring-edge-focus text-sm"
          />
          <button
            type="submit"
            disabled={!secret.trim() || isLoading}
            className="w-full py-3 bg-accent-bold hover:bg-accent-bolder disabled:bg-surface-secondary disabled:text-content-muted text-content-inverse text-sm font-medium rounded-xl transition-colors"
          >
            {isLoading ? 'Loading...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
