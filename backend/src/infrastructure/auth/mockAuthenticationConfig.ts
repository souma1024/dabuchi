export interface MockAuthenticationConfig {
  currentUserId: string;
}

export function loadMockAuthenticationConfig(
  environment: NodeJS.ProcessEnv,
): MockAuthenticationConfig {
  const authMode = environment.AUTH_MODE;

  if (authMode !== 'mock') {
    throw new Error('AUTH_MODE must be mock until login is implemented.');
  }

  if (!['development', 'test'].includes(environment.NODE_ENV ?? '')) {
    throw new Error(
      'Mock authentication is allowed only in development or test.',
    );
  }

  const currentUserId = environment.MOCK_USER_ID?.trim();

  if (!currentUserId) {
    throw new Error('MOCK_USER_ID is required.');
  }

  return { currentUserId };
}
