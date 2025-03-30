import { useState, useEffect } from 'react';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { getSession } from '@/lib/api';

interface UserProfileMenuProps {
  username?: string;
  avatarUrl?: string;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  name?: string;
}

export default function UserProfileMenu({
  username: initialUsername = 'User',
  avatarUrl: initialAvatarUrl,
}: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch user profile data from backend
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        // Use the correct API endpoint
        const session = getSession();
        if (!session || !session.access_token) {
          throw new Error('No active session found');
        }

        const response = await fetch('/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        
        const data = await response.json();
        console.log('Fetched user profile:', data);
        setUserData({
          id: data.id,
          username: data.username || data.name || initialUsername,
          name: data.name,
          email: data.email || 'No email found',
          avatarUrl: data.avatar_url || initialAvatarUrl
        });
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        
        // Try to get minimal user info from local storage as fallback
        try {
          const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
          if (userInfo && userInfo.email) {
            setUserData({
              id: userInfo.id || '1',
              username: userInfo.name || initialUsername,
              name: userInfo.name,
              email: userInfo.email,
              avatarUrl: initialAvatarUrl
            });
          } else {
            // Final fallback
            setUserData({
              id: '1',
              username: initialUsername,
              email: 'user@example.com',
              avatarUrl: initialAvatarUrl
            });
          }
        } catch (storageErr) {
          // Use initial values as final fallback
          setUserData({
            id: '1',
            username: initialUsername,
            email: 'user@example.com',
            avatarUrl: initialAvatarUrl
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [initialUsername, initialAvatarUrl]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleSignOut = async () => {
    try {
      // Call backend logout endpoint
      const session = getSession();
      if (session && session.access_token) {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        });
      }
      
      // Clear local storage
      localStorage.removeItem('session');
      localStorage.removeItem('user_info');
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (err) {
      console.error('Error during sign out:', err);
      // Show error notification/toast here if available
    }
  };

  const handleAccountSettings = () => {
    // Navigate to account settings page
    window.location.href = '/settings/account';
  };

  // Display loading state or fallback to initial values
  // Prioritize the name field if available, then username, then initialUsername
  const displayName = isLoading ? initialUsername : (userData?.name || userData?.username || initialUsername);
  const displayEmail = isLoading ? 'Loading...' : (userData?.email || 'user@example.com');
  const displayAvatar = userData?.avatarUrl || initialAvatarUrl;

  return (
    <div className="relative">
      <button
        onClick={toggleMenu}
        className="flex items-center space-x-2 hover:bg-accent p-2 rounded-md"
      >
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          {isLoading ? (
            <div className="h-full w-full animate-pulse bg-muted"></div>
          ) : displayAvatar ? (
            <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <User className="h-4 w-4 text-primary" />
          )}
        </div>
        <span className="text-sm font-medium hidden md:inline-block">
          {displayName}
          {isLoading && <span className="ml-1 animate-pulse">...</span>}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-background border border-border z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <div className="px-4 py-2 border-b border-border">
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground">{displayEmail}</p>
              {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            </div>
            <button
              onClick={handleAccountSettings}
              className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent"
              role="menuitem"
            >
              <Settings className="mr-2 h-4 w-4" />
              Account settings
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent"
              role="menuitem"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 