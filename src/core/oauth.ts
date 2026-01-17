import * as crypto from 'node:crypto';
import * as http from 'node:http';
import { URL } from 'node:url';

// Claude OAuth Configuration (same as claude-code-proxy, ClawdBot, Roo-Code)
export const CLAUDE_OAUTH_CONFIG = {
  clientId: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
  authorizationUrl: 'https://claude.ai/oauth/authorize',
  tokenUrl: 'https://console.anthropic.com/v1/oauth/token',
  redirectUri: 'http://localhost:8765/callback',
  scopes: 'org:create_api_key user:profile user:inference',
  callbackPort: 8765,
} as const;

// ChatGPT OAuth Configuration (official Codex CLI values)
export const CHATGPT_OAUTH_CONFIG = {
  clientId: 'app_EMoamEEZ73f0CkXaXp7hrann', // Official Codex CLI client ID
  authorizationUrl: 'https://auth.openai.com/oauth/authorize',
  tokenUrl: 'https://auth.openai.com/oauth/token',
  redirectUri: 'http://localhost:1455/auth/callback',
  scopes: 'openid profile email offline_access',
  callbackPort: 1455,
  audience: 'https://api.openai.com/v1',
  // Backend API endpoint (subscription OAuth uses this, NOT api.openai.com)
  apiEndpoint: 'https://chatgpt.com/backend-api/codex/responses',
} as const;

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email?: string;
  accountId?: string; // ChatGPT account ID extracted from JWT
}

export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

// PKCE Utilities (standard implementation used by all OAuth tools)
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generatePKCE(): PKCEParams {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();
  return { codeVerifier, codeChallenge, state };
}

// Claude OAuth Functions
export function buildClaudeAuthUrl(pkce: PKCEParams): string {
  const params = new URLSearchParams({
    client_id: CLAUDE_OAUTH_CONFIG.clientId,
    redirect_uri: CLAUDE_OAUTH_CONFIG.redirectUri,
    scope: CLAUDE_OAUTH_CONFIG.scopes,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: 'S256',
    response_type: 'code',
    state: pkce.state,
  });

  return `${CLAUDE_OAUTH_CONFIG.authorizationUrl}?${params.toString()}`;
}

export async function exchangeClaudeCode(
  code: string,
  codeVerifier: string,
  state: string,
): Promise<OAuthTokens> {
  const body = {
    code,
    state,
    grant_type: 'authorization_code',
    client_id: CLAUDE_OAUTH_CONFIG.clientId,
    redirect_uri: CLAUDE_OAUTH_CONFIG.redirectUri,
    code_verifier: codeVerifier,
  };

  const response = await fetch(CLAUDE_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Claude token exchange failed: ${response.status} - ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    email?: string;
  };

  if (!data.refresh_token) {
    throw new Error('Claude token exchange did not return a refresh_token');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    email: data.email,
  };
}

export async function refreshClaudeToken(
  refreshToken: string,
): Promise<OAuthTokens> {
  const body = {
    grant_type: 'refresh_token',
    client_id: CLAUDE_OAUTH_CONFIG.clientId,
    refresh_token: refreshToken,
  };

  const response = await fetch(CLAUDE_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Claude token refresh failed: ${response.status} - ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    email?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    email: data.email,
  };
}

export function isClaudeTokenExpired(expiresAt: number): boolean {
  const bufferMs = 5 * 60 * 1000; // 5 minutes buffer (standard practice)
  return Date.now() >= expiresAt - bufferMs;
}

// JWT Parsing for ChatGPT account ID extraction
interface JWTClaims {
  chatgpt_account_id?: string;
  'https://api.openai.com/auth'?: {
    chatgpt_account_id?: string;
  };
  organizations?: Array<{ id: string }>;
}

function parseJWTClaims(token: string): JWTClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(decoded) as JWTClaims;
  } catch {
    return null;
  }
}

export function extractAccountIdFromToken(
  accessToken: string,
  idToken?: string,
): string | undefined {
  // Try id_token first, then access_token
  const tokens = idToken ? [idToken, accessToken] : [accessToken];

  for (const token of tokens) {
    const claims = parseJWTClaims(token);
    if (!claims) continue;

    // Check various claim locations
    const accountId =
      claims.chatgpt_account_id ||
      claims['https://api.openai.com/auth']?.chatgpt_account_id ||
      claims.organizations?.[0]?.id;

    if (accountId) return accountId;
  }

  return undefined;
}

// ChatGPT OAuth Functions
export function buildChatGPTAuthUrl(pkce: PKCEParams): string {
  const params = new URLSearchParams({
    client_id: CHATGPT_OAUTH_CONFIG.clientId,
    redirect_uri: CHATGPT_OAUTH_CONFIG.redirectUri,
    scope: CHATGPT_OAUTH_CONFIG.scopes,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: 'S256',
    response_type: 'code',
    state: pkce.state,
    audience: CHATGPT_OAUTH_CONFIG.audience,
  });

  return `${CHATGPT_OAUTH_CONFIG.authorizationUrl}?${params.toString()}`;
}

export async function exchangeChatGPTCode(
  code: string,
  codeVerifier: string,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CHATGPT_OAUTH_CONFIG.clientId,
    code,
    redirect_uri: CHATGPT_OAUTH_CONFIG.redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(CHATGPT_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ChatGPT token exchange failed: ${response.status} - ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    id_token?: string;
  };

  // Extract account ID from JWT tokens
  const accountId = extractAccountIdFromToken(data.access_token, data.id_token);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : 0,
    accountId,
  };
}

export async function refreshChatGPTToken(
  refreshToken: string,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CHATGPT_OAUTH_CONFIG.clientId,
    refresh_token: refreshToken,
  });

  const response = await fetch(CHATGPT_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ChatGPT token refresh failed: ${response.status} - ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : 0,
  };
}

// Local OAuth Callback Server
export function startCallbackServer(
  port: number,
  expectedState: string,
  timeoutMs = 5 * 60 * 1000,
): Promise<{ code: string; state: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url || '', `http://localhost:${port}`);

      // Accept both /callback and /auth/callback paths
      if (
        parsedUrl.pathname !== '/callback' &&
        parsedUrl.pathname !== '/auth/callback'
      ) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      const code = parsedUrl.searchParams.get('code');
      const state = parsedUrl.searchParams.get('state');
      const error = parsedUrl.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(
          `<html><body><h1>Authentication Failed</h1><p>${error}</p></body></html>`,
        );
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (!code || !state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>Missing Parameters</h1></body></html>');
        server.close();
        reject(new Error('Missing code or state parameter'));
        return;
      }

      if (state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body><h1>Invalid State</h1><p>Possible CSRF attack.</p></body></html>',
        );
        server.close();
        reject(new Error('State mismatch - possible CSRF attack'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Authentication Successful</title></head>
        <body style="font-family: system-ui; text-align: center; padding: 50px;">
          <h1>Authentication Successful!</h1>
          <p>You can close this window and return to your terminal.</p>
          <script>setTimeout(() => window.close(), 2000);</script>
        </body>
        </html>
      `);

      server.close();
      resolve({ code, state });
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(
          new Error(
            `Port ${port} is already in use. Close other applications using this port.`,
          ),
        );
      } else {
        reject(err);
      }
    });

    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('Authentication timed out after 5 minutes'));
    }, timeoutMs);

    server.on('close', () => clearTimeout(timeout));

    server.listen(port, '127.0.0.1');
  });
}
