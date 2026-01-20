/**
 * Centralized error handling for API providers
 * Provides user-friendly error messages for common API errors
 */

export interface ApiErrorContext {
  provider: string;
  model?: string;
  status?: number;
  errorText?: string;
}

/**
 * HTTP status codes with specific handling
 */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
  OVERLOADED: 529, // Claude-specific
} as const;

/**
 * API key format patterns for validation
 */
export const API_KEY_PATTERNS: Record<
  string,
  { prefix: string; name: string }
> = {
  openai: { prefix: 'sk-', name: 'OpenAI' },
  claude: { prefix: 'sk-ant-', name: 'Claude/Anthropic' },
  openrouter: { prefix: 'sk-or-', name: 'OpenRouter' },
};

/**
 * Validates API key format and returns a warning message if invalid
 * Returns null if the key format is valid
 */
export function validateApiKeyFormat(
  key: string,
  provider: 'openai' | 'claude' | 'openrouter',
): string | null {
  const pattern = API_KEY_PATTERNS[provider];
  if (!pattern) return null;

  if (!key.startsWith(pattern.prefix)) {
    return `Warning: ${pattern.name} API keys typically start with "${pattern.prefix}". Your key may be invalid.`;
  }

  return null;
}

/**
 * Creates a user-friendly error message based on HTTP status code
 */
export function createHttpError(ctx: ApiErrorContext): Error {
  const { provider, model, status, errorText } = ctx;

  switch (status) {
    case HTTP_STATUS.UNAUTHORIZED:
      return new Error(
        `Invalid API key for ${provider}. Please check your credentials with: b --auth`,
      );

    case HTTP_STATUS.FORBIDDEN:
      return new Error(
        `Access forbidden for ${provider}. Check your API key permissions or subscription status.`,
      );

    case HTTP_STATUS.NOT_FOUND:
      if (model) {
        return new Error(
          `Model "${model}" not found on ${provider}. Check available models or update your selection with: b --model`,
        );
      }
      return new Error(`Resource not found on ${provider}. ${errorText || ''}`);

    case HTTP_STATUS.RATE_LIMITED:
      return new Error(
        `Rate limited by ${provider}. Please wait a moment and try again.`,
      );

    case HTTP_STATUS.OVERLOADED:
      return new Error(
        `${provider} is currently overloaded. Please try again in a few moments.`,
      );

    case HTTP_STATUS.BAD_REQUEST:
      // Check for specific error patterns
      if (errorText?.includes('model_not_supported')) {
        return new Error(
          `Model not supported by your ${provider} subscription. Check your plan or try a different model.`,
        );
      }
      return new Error(`${provider} API error: Bad request - ${errorText}`);

    default:
      if (status && status >= 500) {
        return new Error(
          `${provider} server error (${status}). Please try again later.`,
        );
      }
      return new Error(
        `${provider} API error: ${status || 'Unknown'} - ${errorText || 'Unknown error'}`,
      );
  }
}

/**
 * Handles network/connection errors with user-friendly messages
 */
export function createNetworkError(
  error: unknown,
  provider: string,
  host?: string,
): Error {
  if (!(error instanceof Error)) {
    return new Error(`${provider} connection failed: Unknown error`);
  }

  const message = error.message.toLowerCase();

  // Connection refused - service not running
  if (
    message.includes('econnrefused') ||
    message.includes('connection refused')
  ) {
    if (provider === 'Ollama') {
      return new Error(
        `Ollama is not running. Start it with: ollama serve\n\nHost: ${host || 'http://localhost:11434'}`,
      );
    }
    return new Error(
      `Cannot connect to ${provider}. Please check if the service is running.`,
    );
  }

  // Timeout
  if (message.includes('etimedout') || message.includes('timeout')) {
    return new Error(
      `Connection to ${provider} timed out. Check your network connection.`,
    );
  }

  // DNS resolution failed
  if (message.includes('enotfound') || message.includes('getaddrinfo')) {
    return new Error(
      `Cannot resolve ${provider} hostname. Check your network connection.`,
    );
  }

  // SSL/TLS errors
  if (
    message.includes('ssl') ||
    message.includes('certificate') ||
    message.includes('tls')
  ) {
    return new Error(
      `SSL/TLS error connecting to ${provider}. Check your system certificates.`,
    );
  }

  return new Error(`${provider} connection error: ${error.message}`);
}

/**
 * Handles Ollama-specific errors (model not found, etc.)
 */
export function createOllamaError(
  errorText: string,
  model: string,
  status?: number,
): Error {
  const lowerError = errorText.toLowerCase();

  // Model not found
  if (
    lowerError.includes('model') &&
    (lowerError.includes('not found') || lowerError.includes('does not exist'))
  ) {
    return new Error(
      `Model "${model}" not found. Pull it with: ollama pull ${model}`,
    );
  }

  // Fallback to HTTP error handling
  return createHttpError({
    provider: 'Ollama',
    model,
    status,
    errorText,
  });
}

/**
 * Type guard for fetch errors
 */
export function isFetchError(error: unknown): error is TypeError {
  return error instanceof TypeError && error.message.includes('fetch');
}

/**
 * Wraps a fetch call with proper error handling
 * Use this to standardize error handling across providers
 */
export async function handleProviderResponse(
  response: Response,
  ctx: Omit<ApiErrorContext, 'status' | 'errorText'>,
): Promise<void> {
  if (!response.ok) {
    const errorText = await response.text();
    throw createHttpError({
      ...ctx,
      status: response.status,
      errorText,
    });
  }
}
