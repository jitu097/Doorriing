const GOOGLE_LOGIN_ERROR_MESSAGES = {
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
  'auth/popup-blocked': 'Popup was blocked by the browser.',
  'auth/operation-not-supported-in-this-environment': 'Google sign-in is not supported in this environment.',
  'auth/network-request-failed': 'Network error while signing in with Google.',
};

const GOOGLE_NATIVE_ERROR_MESSAGES = {
  'Google sign-in cancelled': 'Google sign-in was cancelled.',
  'Google sign-in failed': 'Google sign-in failed.',
  'Google ID token missing': 'Google authentication token was not returned.',
  'Google Play Services are unavailable': 'Google Play Services are unavailable on this device.',
  'Google Play Services need to be updated': 'Google Play Services must be updated to continue.',
};

export const getGoogleSignInErrorMessage = (error) => {
  if (!error) {
    return 'Google sign-in failed.';
  }

  if (typeof error === 'string') {
    return GOOGLE_NATIVE_ERROR_MESSAGES[error] || error;
  }

  const code = error.code || error.statusCode;
  if (code && GOOGLE_LOGIN_ERROR_MESSAGES[code]) {
    return GOOGLE_LOGIN_ERROR_MESSAGES[code];
  }

  const message = error.message || String(error);
  if (!message) {
    return 'Google sign-in failed.';
  }

  return GOOGLE_NATIVE_ERROR_MESSAGES[message] || message;
};