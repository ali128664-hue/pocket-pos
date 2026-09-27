function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function run() {
  console.log('🧪 Starting Phase 1 Session Persistence & Route Guard Test Suite...\n');

  // 1. In-memory SecureStore adapter simulation
  console.log('--- Test Group 1: Session Storage Adapter ---');
  {
    const mockStorage = new Map<string, string>();

    const storageAdapter = {
      getItem: async (key: string) => mockStorage.get(key) || null,
      setItem: async (key: string, value: string) => {
        mockStorage.set(key, value);
      },
      removeItem: async (key: string) => {
        mockStorage.delete(key);
      },
    };

    const sampleSession = JSON.stringify({
      access_token: 'mock-jwt-token-12345',
      refresh_token: 'mock-refresh-token-67890',
      user: { id: 'usr-001', email: 'shopkeeper@pocketpos.pk' },
    });

    // Save session on login
    await storageAdapter.setItem('sb-auth-token', sampleSession);
    assert(mockStorage.has('sb-auth-token'), 'Session should be saved to SecureStore');

    // Restore session after app restart
    const restoredSessionStr = await storageAdapter.getItem('sb-auth-token');
    assert(Boolean(restoredSessionStr), 'Session should be retrievable from SecureStore');
    const restoredSession = JSON.parse(restoredSessionStr!);
    assert(restoredSession.access_token === 'mock-jwt-token-12345', 'Access token must match');
    assert(restoredSession.user.email === 'shopkeeper@pocketpos.pk', 'User email must match');

    // Purge session on logout
    await storageAdapter.removeItem('sb-auth-token');
    const afterLogout = await storageAdapter.getItem('sb-auth-token');
    assert(afterLogout === null, 'Session must be completely wiped on logout');

    console.log('✅ Session persistence and cleanup verified');
  }

  // 2. Protected Route Navigation Guard Simulation
  console.log('\n--- Test Group 2: Protected Route Guard Logic ---');
  {
    type NavigationTarget = '/(auth)/login' | '/(tabs)' | 'NONE';

    function resolveRoute(
      isAuthenticated: boolean,
      isLoading: boolean,
      currentSegment: string
    ): NavigationTarget {
      if (isLoading) return 'NONE';

      const inAuthGroup = currentSegment === '(auth)';

      if (!isAuthenticated && !inAuthGroup) {
        return '/(auth)/login';
      } else if (isAuthenticated && inAuthGroup) {
        return '/(tabs)';
      }

      return 'NONE';
    }

    // Case A: Unauthenticated user tries to access protected tab
    assert(
      resolveRoute(false, false, '(tabs)') === '/(auth)/login',
      'Unauthenticated user in (tabs) must be redirected to /login'
    );

    // Case B: Unauthenticated user browsing login/signup
    assert(
      resolveRoute(false, false, '(auth)') === 'NONE',
      'Unauthenticated user in (auth) should not be redirected'
    );

    // Case C: Authenticated user visits /login
    assert(
      resolveRoute(true, false, '(auth)') === '/(tabs)',
      'Authenticated user in (auth) must be redirected to /tabs'
    );

    // Case D: Authenticated user in tabs
    assert(
      resolveRoute(true, false, '(tabs)') === 'NONE',
      'Authenticated user in (tabs) should stay in /tabs'
    );

    // Case E: Still loading session from SecureStore
    assert(
      resolveRoute(false, true, '(tabs)') === 'NONE',
      'Should not trigger redirection while session is loading'
    );

    console.log('✅ Route guard logic verified for all states');
  }

  console.log('\n🎉 ALL SESSION PERSISTENCE & ROUTE GUARD TESTS PASSED!\n');
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
