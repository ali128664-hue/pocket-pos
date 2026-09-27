/**
 * Maps Supabase auth error codes and messages to clear, friendly user messages.
 */
export function getFriendlyErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const message = typeof error === 'string' ? error : error.message || '';
  const status = error.status;

  if (message.includes('Invalid login credentials')) {
    return 'Incorrect email or password. Please check your credentials and try again.';
  }

  if (message.includes('User already registered')) {
    return 'An account with this email already exists. Please log in instead.';
  }

  if (message.includes('Email not confirmed')) {
    return 'Your email address has not been confirmed yet. Please check your inbox.';
  }

  if (message.includes('rate limit') || status === 429) {
    return 'Too many attempts. Please wait a few moments before trying again.';
  }

  if (message.includes('Network request failed') || message.includes('Failed to fetch')) {
    return 'Cannot connect to the server. Please check your internet connection.';
  }

  if (message.includes('Password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }

  if (message.includes('placeholder') || message.includes('your-project')) {
    return 'Supabase credentials are not configured yet. Please check your .env file.';
  }

  return message || 'Something went wrong. Please try again.';
}
