// This script helps set up a mock authentication session for testing
// Run this script in your browser console when you're getting 401 errors

function setupTestAuth() {
  // Create a mock session with tokens that will be accepted by the test server
  const mockSession = {
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlci1pZCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsIm5hbWUiOiJUZXN0IFVzZXIiLCJpYXQiOjE2MTIzNDU2NzgsImV4cCI6OTk5OTk5OTk5OX0.dummyvalue',
    refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlci1pZCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsIm5hbWUiOiJUZXN0IFVzZXIiLCJpYXQiOjE2MTIzNDU2NzgsImV4cCI6OTk5OTk5OTk5OX0.refreshdummy',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  // Store mock session in localStorage
  localStorage.setItem('session', JSON.stringify(mockSession));

  // Create mock user profile
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User'
  };

  // Store mock user in localStorage
  localStorage.setItem('user', JSON.stringify(mockUser));

  console.log('Test authentication set up successfully!');
  console.log('You can now refresh the page and the app should work with mock auth');
  console.log('Note: This is only for UI testing and development');
}

// Run the setup function
setupTestAuth(); 