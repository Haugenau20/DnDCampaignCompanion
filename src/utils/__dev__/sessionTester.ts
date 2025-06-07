/**
 * Session testing utility - DEVELOPMENT ONLY
 * This file should not be imported in production code
 */

/**
 * Temporarily override session duration for testing
 * @param durationMs Duration in milliseconds
 */
export function overrideSessionDuration(durationMs: number): void {
    const sessionInfoStr = localStorage.getItem('sessionInfo');
    if (!sessionInfoStr) {
      console.warn('No active session found');
      return;
    }
    
    try {
      const sessionInfo = JSON.parse(sessionInfoStr);
      const now = Date.now();
      
      // Update expiration time
      sessionInfo.expiresAt = now + durationMs;
      localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
      
      console.log(`Session duration set to ${durationMs/1000} seconds from now`);
      console.log(`Session will expire at: ${new Date(sessionInfo.expiresAt).toLocaleTimeString()}`);
    } catch (e) {
      console.error('Error overriding session duration:', e);
    }
  }
  
  /**
   * Simulate inactivity by setting the last activity timestamp back
   * @param inactiveTimeMs How long ago (in ms) to set the last activity
   */
  export function simulateInactivity(inactiveTimeMs: number): void {
    const sessionInfoStr = localStorage.getItem('sessionInfo');
    if (!sessionInfoStr) {
      console.warn('No active session found');
      return;
    }
    
    try {
      const sessionInfo = JSON.parse(sessionInfoStr);
      const now = Date.now();
      
      // Set last activity to be in the past
      sessionInfo.lastActivityAt = now - inactiveTimeMs;
      localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
      
      console.log(`Last activity set to ${inactiveTimeMs/1000} seconds ago`);
      console.log(`Session will expire due to inactivity at: ${new Date(sessionInfo.lastActivityAt + 24*60*60*1000).toLocaleTimeString()}`);
    } catch (e) {
      console.error('Error simulating inactivity:', e);
    }
  }
  
  /**
   * Show current session status
   */
  export function showSessionStatus(): void {
    const sessionInfoStr = localStorage.getItem('sessionInfo');
    if (!sessionInfoStr) {
      console.log('No active session found');
      return;
    }
    
    try {
      const sessionInfo = JSON.parse(sessionInfoStr);
      const now = Date.now();
      
      // Display session info
      console.log('📊 Session Status:', {
        createdAt: new Date(sessionInfo.createdAt).toLocaleTimeString(),
        expiresAt: new Date(sessionInfo.expiresAt).toLocaleTimeString(),
        lastActivity: new Date(sessionInfo.lastActivityAt).toLocaleTimeString(),
        inactivityExpiresAt: new Date(sessionInfo.lastActivityAt + 24*60*60*1000).toLocaleTimeString(),
        rememberMe: sessionInfo.rememberMe,
        timeUntilExpiry: Math.round((sessionInfo.expiresAt - now) / 1000 / 60) + ' minutes',
        timeUntilInactivityExpiry: Math.round((sessionInfo.lastActivityAt + 24*60*60*1000 - now) / 1000 / 60) + ' minutes'
      });
    } catch (e) {
      console.error('Error showing session status:', e);
    }
  }
  
  // Test session timeout warning by setting activity to nearly expired
  export function testSessionWarning(): void {
    const sessionInfoStr = localStorage.getItem('sessionInfo');
    if (!sessionInfoStr) {
      console.warn('No active session found');
      return;
    }
    
    try {
      const sessionInfo = JSON.parse(sessionInfoStr);
      const inactivityTimeout = 24*60*60*1000; // 24 hours
      const warningThreshold = 5*60*1000; // 5 minutes
      
      // Set last activity so that warning will show (just outside warning threshold)
      const timeToSetBack = inactivityTimeout - warningThreshold - 10000; // 10 seconds into warning period
      sessionInfo.lastActivityAt = Date.now() - timeToSetBack;
      localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
      
      console.log('Session warning should appear in about 10 seconds');
    } catch (e) {
      console.error('Error testing session warning:', e);
    }
  }

  /**
 * Test the absolute timeout warning
 * Sets the session to expire in just over 5 minutes
 */
export function testAbsoluteTimeoutWarning(): void {
    const sessionInfoStr = localStorage.getItem('sessionInfo');
    if (!sessionInfoStr) {
      console.warn('No active session found');
      return;
    }
    
    try {
      const sessionInfo = JSON.parse(sessionInfoStr);
      const now = Date.now();
      
      // Set the absolute expiration time to 5 minutes + 10 seconds from now
      // This should trigger the warning almost immediately
      const warningThreshold = 5 * 60 * 1000; // 5 minutes
      sessionInfo.expiresAt = now + warningThreshold + 10000; // 10 seconds into warning period
      
      // Ensure last activity is recent so we don't get inactivity warning
      sessionInfo.lastActivityAt = now;
      
      localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
      console.log('Session set to expire in about 5 minutes and 10 seconds');
      console.log('Absolute timeout warning should appear shortly');
      console.log('You may need to refresh the page to see the effect');
    } catch (e) {
      console.error('Error testing absolute timeout warning:', e);
    }
  }
  
  // Export as window property in development
  if (typeof window !== 'undefined') {
    (window as any).__sessionTest = {
      overrideSessionDuration,
      simulateInactivity,
      showSessionStatus,
      testSessionWarning,
      testAbsoluteTimeoutWarning
    };
    
    console.log('Session testing utilities available as window.__sessionTest');
    console.log('Example usage:');
    console.log('  __sessionTest.showSessionStatus()');
    console.log('  __sessionTest.simulateInactivity(23.5 * 60 * 60 * 1000)'); // Almost 24h of inactivity
    console.log('  __sessionTest.testSessionWarning()'); // Test the 5-min warning
    console.log('  __sessionTest.testAbsoluteTimeoutWarning()'); // Test hard session limit warning

  }