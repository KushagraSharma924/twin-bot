import { useState, useEffect } from 'react';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';

interface UserProfileMenuProps {
  username?: string;
  avatarUrl?: string;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
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
        // Replace with your actual API endpoint
        const response = await fetch('/api/user/profile');
        
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        
        const data = await response.json();
        setUserData(data);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        // Use initial values as fallback
        setUserData({
          id: '1',
          username: initialUsername,
          email: 'user@example.com',
          avatarUrl: initialAvatarUrl
        });
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
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      
      // Redirect to login page or refresh
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
  const displayName = isLoading ? initialUsername : (userData?.username || initialUsername);
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