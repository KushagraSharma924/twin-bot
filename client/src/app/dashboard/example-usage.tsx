'use client';

import { useState } from 'react';
import DashboardHeader from '@/app/components/DashboardHeader';
import { Badge } from '@/components/ui/badge';
import { SlidersHorizontal } from 'lucide-react';

export default function DashboardExample() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Example tracked interests for the right side content
  const interests = [""];
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header component with the user profile menu */}
      <DashboardHeader 
        title="Dashboard Example"
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        showSearch={true}
        searchPlaceholder="Search in dashboard..."
        onSearchChange={setSearchQuery}
        searchValue={searchQuery}
        rightContent={
          <>
            {/* Custom right-side content */}
            {interests.length > 0 && (
              <div className="hidden md:flex items-center">
                <span className="text-xs text-muted-foreground mr-2">Tracking:</span>
                {interests.slice(0, 2).map((interest, index) => (
                  <Badge key={index} className="bg-primary/20 text-primary mr-1">{interest}</Badge>
                ))}
                {interests.length > 2 && (
                  <Badge className="bg-background text-muted-foreground">+{interests.length - 2} more</Badge>
                )}
              </div>
            )}
            <button className="text-muted-foreground hover:text-foreground hover:bg-accent p-2 rounded-md">
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          </>
        }
      />
      
      {/* Page content */}
      <main className="flex-1 p-6">
        <div className="bg-card shadow-sm rounded-lg p-6 border border-border">
          <h2 className="text-lg font-medium mb-4">Example Dashboard Content</h2>
          <p className="text-muted-foreground mb-4">
            This is an example page showing how to use the DashboardHeader component with the UserProfileMenu.
          </p>
          
          <div className="bg-accent/30 p-4 rounded-md">
            <h3 className="font-medium mb-2">Current Search Query:</h3>
            <p className="text-sm">{searchQuery || '(No search query)'}</p>
          </div>
        </div>
      </main>
    </div>
  );
} 