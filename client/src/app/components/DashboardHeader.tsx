import { ReactNode } from 'react';
import { Bell, Menu, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import UserProfileMenu from './UserProfileMenu';

interface DashboardHeaderProps {
  title: string;
  onMenuClick?: () => void;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
  rightContent?: ReactNode;
}

export default function DashboardHeader({
  title,
  onMenuClick,
  showSearch = true,
  searchPlaceholder = "Search...",
  onSearchChange,
  searchValue = "",
  rightContent
}: DashboardHeaderProps) {
  return (
    <header className="bg-background border-b border-border h-16 flex items-center px-6">
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="md:hidden mr-2 text-muted-foreground hover:text-foreground hover:bg-accent p-2 rounded-md"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
      
      <h1 className="text-xl font-bold text-foreground mr-6">{title}</h1>
      
      {showSearch && (
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={searchPlaceholder}
            className="pl-10 bg-input border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary w-full"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
      )}
      
      <div className="ml-4 flex items-center space-x-4">
        {rightContent}
        
        <div className="relative">
          <button className="relative text-muted-foreground hover:text-foreground hover:bg-accent p-2 rounded-md">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full"></span>
          </button>
        </div>
        
        <UserProfileMenu />
      </div>
    </header>
  );
} 