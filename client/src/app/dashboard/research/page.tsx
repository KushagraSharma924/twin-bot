"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import Sidebar from "@/components/sidebar"
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  Bookmark,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  SlidersHorizontal,
  Star,
  ThumbsUp,
  PlusCircle,
  Folder,
  Share2,
  Trash2,
  BrainCircuit,
  LineChart,
  CalendarClock,
  Globe,
  MessageSquare,
  Network,
  FileText,
  Zap,
  Newspaper,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Sparkles,
  Loader2,
  User,
  Settings,
  LogOut
} from "lucide-react"
import { 
  ResearchDocument as ApiResearchDocument, 
  ResearchProcess, 
  ResearchProcessResult 
} from "@/lib/research-api"
import * as researchApi from "@/lib/research-api"

// Local extension of the API ResearchDocument interface 
interface LocalResearchDocument extends ApiResearchDocument {
  progress?: number;
}

// Add type definitions for the AIResearchIntegration component props
interface AIResearchIntegrationProps {
  onResearchStart: () => void;
  onResearchComplete: (newDocuments: LocalResearchDocument[], query: string) => void;
  isAuthenticated: boolean;
}

// Add a new component for AI research integration
const AIResearchIntegration = ({ onResearchStart, onResearchComplete, isAuthenticated }: AIResearchIntegrationProps) => {
  const [isResearching, setIsResearching] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [chatHistory, setChatHistory] = useState<string[]>([]);

  // Fetch recent chat history for context
  useEffect(() => {
    if (isAuthenticated) {
      fetchRecentChatHistory();
    }
  }, [isAuthenticated]);

  const fetchRecentChatHistory = async () => {
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const token = session.access_token;
      
      if (!token) return;
      
      // Fetch recent chat messages
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'}/api/conversations/recent`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.messages && Array.isArray(data.messages)) {
          // Extract just the content for context
          const messages = data.messages.map((msg: any) => msg.content);
          setChatHistory(messages);
        }
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  // Enhanced suggestion generation that uses chat history for context
  const fetchSuggestions = async () => {
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const token = session.access_token;
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Create a better prompt using chat history as context
      let prompt = `Based on the following recent chat history, suggest 3 specific research topics related to "${query}" that would be valuable to explore. Return only the topics as a JSON array of strings.`;
      
      // Add chat history if available
      if (chatHistory.length > 0) {
        prompt += `\n\nRecent chat context: ${chatHistory.slice(-5).join(" | ")}`;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'}/api/ai/gemini`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          prompt,
          model: 'gemini-pro',
          maxTokens: 300
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }
      
      const data = await response.json();
      let topics: string[] = [];
      
      try {
        // Try to parse as JSON if it comes back that way
        if (typeof data.response === 'string') {
          // Check if the response starts with [ to see if it's a JSON array
          if (data.response.trim().startsWith('[')) {
            const parsed = JSON.parse(data.response);
            if (Array.isArray(parsed)) {
              topics = parsed;
            }
          } else {
            // Split by newlines and clean up
            topics = data.response.split('\n')
              .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
              .filter((line: string) => line.length > 0);
          }
        }
      } catch (e) {
        // If parsing fails, split by newlines and clean up
        topics = data.response.split('\n')
          .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
          .filter((line: string) => line.length > 0);
      }
      
      setSuggestions(topics.slice(0, 3));
    } catch (error) {
      console.error('Error getting suggestions:', error);
      setError('Failed to get suggestions');
    }
  };

  // Enhanced research request that pulls from more online sources
  const handleResearchRequest = async () => {
    if (!query.trim()) return;
    
    setIsResearching(true);
    setError('');
    onResearchStart();
    
    try {
      // Start a real-time research process with more comprehensive sources
      const result = await researchApi.startRealtimeResearch(
        query,
        ['arxiv', 'news', 'techblogs', 'scholar', 'paperswithcode'], // More comprehensive source list
        15 // Increased max results for better coverage
      );
      
      const processId = result.researchId;
      
      // Poll for results
      let complete = false;
      let attempts = 0;
      const maxAttempts = 30; // Maximum number of polling attempts
      
      while (!complete && attempts < maxAttempts) {
        attempts++;
        
        try {
          const status = await researchApi.getProcessStatus(processId);
          
          if (status.status === 'completed') {
            complete = true;
            
            if (status.documents && status.documents.length > 0) {
              // Save this query to user history
              saveSearchHistory(query);
              onResearchComplete(status.documents, query);
            } else {
              setError('No research documents found');
            }
          } else if (status.status === 'failed') {
            complete = true;
            setError('Research process failed');
          }
          
          // Wait before polling again
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (pollError) {
          console.error('Error polling research status:', pollError);
          // Continue polling despite errors
        }
      }
      
      if (!complete) {
        setError('Research timed out');
      }
    } catch (error) {
      console.error('Error with research request:', error);
      setError('Failed to complete research request');
    } finally {
      setIsResearching(false);
    }
  };

  // Save search history for future recommendations
  const saveSearchHistory = async (searchQuery: string) => {
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const token = session.access_token;
      
      if (!token) return;
      
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'}/api/research/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: searchQuery })
      });
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    handleResearchRequest();
  };

  if (!isAuthenticated) {
    return (
      <div className="mb-6 p-4 border border-border rounded-lg bg-card">
        <h3 className="text-lg font-medium mb-2 text-foreground">AI Research Assistant</h3>
        <p className="text-muted-foreground mb-4">Please log in to use the AI Research Assistant.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 border border-border rounded-lg bg-card">
      <h3 className="text-lg font-medium mb-2 text-foreground">AI Research Assistant</h3>
      
      <div className="flex gap-2 mb-4">
        <Input
          type="text"
          placeholder="What would you like to research?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-input border-input text-foreground placeholder:text-muted-foreground"
          disabled={isResearching}
        />
        
        {!isResearching ? (
          <Button 
            onClick={handleResearchRequest}
            disabled={!query.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Research
          </Button>
        ) : (
          <Button disabled className="bg-accent/50 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Researching...
          </Button>
        )}
        
        {query.length > 2 && !isResearching && (
          <Button 
            variant="outline"
            onClick={fetchSuggestions}
            disabled={isResearching}
            className="border-border hover:bg-accent hover:text-foreground"
          >
            Get Suggestions
          </Button>
        )}
      </div>
      
      {error && (
        <div className="text-destructive text-sm mb-4 flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      {suggestions.length > 0 && (
        <div className="mt-2">
          <h4 className="text-sm font-medium mb-2 text-foreground">Suggested Topics:</h4>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => selectSuggestion(suggestion)}
                className="text-xs border-border bg-background hover:bg-primary/10 hover:text-primary"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function ResearchPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<'all' | 'realtime' | 'synthesis' | 'bookmarks' | 'alerts'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  
  // New state variables for connecting to AI and research backend
  const [documents, setDocuments] = useState<LocalResearchDocument[]>([])
  const [categories, setCategories] = useState<{id: number; name: string; count: number}[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [interests, setInterests] = useState<string[]>([])
  const [activeResearch, setActiveResearch] = useState<{id: string; type: string} | null>(null)
  const [researchProgress, setResearchProgress] = useState(0)
  const [interestRefreshTimestamp, setInterestRefreshTimestamp] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // New state for AI-driven research
  const [aiResearchActive, setAiResearchActive] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState("");

  // Add useState and useRef at the top if not already there
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null);

  // Add this effect to handle clicking outside the profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileRef]);

  // Add this effect to get user data
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      if (session.user) {
        setUser(session.user);
      }
    } catch (error) {
      console.error('Error getting user data:', error);
    }
  }, []);

  // Add this function to get user initials
  const getUserInitials = () => {
    if (!user || !user.name) return 'P';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
  };

  // Handle logout function
  const handleLogout = () => {
    localStorage.removeItem('session');
    window.location.href = '/login';
  };

  // Fetch user interests from chat history
  const fetchUserInterests = useCallback(async () => {
    try {
      setLoading(true);
      // Get interests from user chat history via API
      const interestsData = await researchApi.getUserResearchInterests();
      
      if (interestsData && interestsData.length > 0) {
        setInterests(interestsData);
        setInterestRefreshTimestamp(new Date());
      } else {
        // If no interests found, add a default initial interest
        setInterests(['AI & Machine Learning']);
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching user interests:', error);
      setInterests(['AI & Machine Learning']);
    } finally {
      setLoading(false);
    }
  }, []);

  // Track user interests from chat history
  useEffect(() => {
    fetchUserInterests();
  }, [fetchUserInterests]);

  // Load research documents 
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await researchApi.getResearchDocuments();
        if (response && response.documents) {
          // Add progress property to each document (default 100%)
          const docsWithProgress: LocalResearchDocument[] = response.documents.map(doc => ({
            ...doc,
            progress: 100
          }));
          setDocuments(docsWithProgress);
          
          // Extract categories from documents
          const cats = extractCategories(response.documents);
          setCategories(cats);
        }
      } catch (error: any) {
        console.error('Error fetching research documents:', error);
        setError(`Failed to load research documents: ${error.message || 'Unknown error'}`);
        // Show empty state instead of mock data
        setDocuments([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // Extract categories from documents
  const extractCategories = (docs: ApiResearchDocument[]) => {
    const categoryMap = new Map<string, number>();
    
    docs.forEach(doc => {
      if (doc.category) {
        const count = categoryMap.get(doc.category) || 0;
        categoryMap.set(doc.category, count + 1);
      }
    });
    
    return Array.from(categoryMap).map(([name, count], index) => ({
      id: index + 1,
      name,
      count
    }));
  };

  // Function to update research based on user interests
  const updateResearchFromInterests = async () => {
    if (interests.length === 0 || updating) return;
    
    try {
      setUpdating(true);
      setResearchProgress(10);
      
      // Start a real-time research process based on interests
      const mainInterest = interests[0];
      const sources = ['arxiv', 'news_api', 'tech_blogs'];
      
      const result = await researchApi.startRealtimeResearch(
        mainInterest,
        sources,
        5,
        mainInterest
      );
      
      if (result && result.researchId) {
        setActiveResearch({
          id: result.researchId,
          type: 'realtime'
        });
        
        // Start polling for status
        pollResearchStatus(result.researchId);
      }
    } catch (error) {
      console.error('Error starting research process:', error);
      toast("Research Update Failed", {
        description: "Could not update research. Please try again.",
      });
      setUpdating(false);
    }
  };

  // Function to poll research process status
  const pollResearchStatus = async (processId: string) => {
    try {
      let completed = false;
      let attempts = 0;
      
      while (!completed && attempts < 30) {
        attempts++;
        setResearchProgress(Math.min(attempts * 10, 90));
        
        const status = await researchApi.getProcessStatus(processId);
        
        if (status.status === 'completed') {
          completed = true;
          setResearchProgress(100);
          
          // Fetch the latest documents
          const response = await researchApi.getResearchDocuments();
          if (response && response.documents) {
            // Add progress property to each document (default 100%)
            const docsWithProgress: LocalResearchDocument[] = response.documents.map(doc => ({
              ...doc,
      progress: 100
            }));
            setDocuments(docsWithProgress);
            
            // Extract categories from documents
            const cats = extractCategories(response.documents);
            setCategories(cats);
          }
          
          toast("Research Updated", {
            description: "New research documents are now available based on your interests."
          });
        } else if (status.status === 'failed') {
          completed = true;
          toast("Research Process Failed", {
            description: "There was an error processing your research request."
          });
        }
        
        if (!completed) {
          // Wait before polling again
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      setActiveResearch(null);
      setUpdating(false);
    } catch (error) {
      console.error('Error polling research status:', error);
      setActiveResearch(null);
      setUpdating(false);
    }
  };
  
  // Filter documents based on search, tab, and category
  const filteredDocuments = documents.filter(doc => {
    // Filter by search
    const matchesSearch = searchQuery === "" || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by tab
    let matchesTab = true;
    if (activeTab === 'realtime') {
      matchesTab = ['news', 'alert', 'paper'].includes(doc.type);
    } else if (activeTab === 'synthesis') {
      matchesTab = ['synthesis', 'graph'].includes(doc.type);
    } else if (activeTab === 'bookmarks') {
      matchesTab = doc.saved;
    } else if (activeTab === 'alerts') {
      matchesTab = doc.type === 'alert';
    }
    
    // Filter by category
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    
    return matchesSearch && matchesTab && matchesCategory;
  });

  // Get document type icon
  const getDocumentIcon = (type: string) => {
    switch(type) {
      case 'paper': return <FileText className="h-4 w-4 mr-2 text-blue-400" />;
      case 'news': return <Newspaper className="h-4 w-4 mr-2 text-green-400" />;
      case 'alert': return <AlertCircle className="h-4 w-4 mr-2 text-red-400" />;
      case 'synthesis': return <BrainCircuit className="h-4 w-4 mr-2 text-purple-400" />;
      case 'graph': return <Network className="h-4 w-4 mr-2 text-amber-400" />;
      default: return <FileText className="h-4 w-4 mr-2 text-gray-400" />;
    }
  };

  // Add handlers for AI research integration
  const handleResearchStart = () => {
    setAiResearchActive(true);
    setUpdating(true);
    setResearchProgress(10);
  };
  
  const handleResearchComplete = (newDocuments: ApiResearchDocument[], query: string) => {
    setAiResearchActive(false);
    setUpdating(false);
    setResearchProgress(100);
    
    // Add the new documents to our state
    if (newDocuments && newDocuments.length > 0) {
      const docsWithProgress: LocalResearchDocument[] = newDocuments.map(doc => ({
        ...doc,
        progress: 100
      }));
      
      // Put the new documents at the top of the list
      setDocuments(prevDocs => [...docsWithProgress, ...prevDocs]);
      
      // Update the categories
      const cats = extractCategories([...docsWithProgress, ...documents]);
      setCategories(cats);
      
      // Set the last search query
      setLastSearchQuery(query);
      
      // Show a success message
      toast("Research Complete", {
        description: `Found ${newDocuments.length} resources about "${query}"`,
      });
    }
  };

  // Function to manually refresh user interests from chat history
  const refreshInterests = async () => {
    if (updating) return;
    
    try {
      toast("Refreshing Interests", {
        description: "Analyzing your recent conversations for research interests..."
      });
      
      await fetchUserInterests();
      
      toast("Interests Updated", {
        description: "Your research interests have been updated based on recent conversations."
      });
    } catch (error) {
      console.error('Error refreshing interests:', error);
      toast("Error Refreshing Interests", {
        description: "Could not update your research interests. Please try again."
      });
    }
  };

  // Update the bookmark functionality to ensure proper server-side persistence
  const handleBookmarkToggle = async (doc: LocalResearchDocument, setDocuments: React.Dispatch<React.SetStateAction<LocalResearchDocument[]>>) => {
    try {
      // Optimistic UI update
      setDocuments(prevDocs => prevDocs.map(d => 
        d.id === doc.id ? { ...d, saved: !d.saved } : d
      ));
      
      // Make API call to update bookmark status
      await researchApi.updateResearchDocument(doc.id, { saved: !doc.saved });
      
      // Show success notification
      toast(!doc.saved ? "Research Bookmarked" : "Bookmark Removed", {
        description: !doc.saved 
          ? "Research has been added to your bookmarks" 
          : "Research has been removed from your bookmarks",
      });
    } catch (error) {
      console.error('Error updating bookmark status:', error);
      
      // Revert UI on error
      setDocuments(prevDocs => prevDocs.map(d => 
        d.id === doc.id ? { ...d, saved: doc.saved } : d
      ));
      
      // Show error notification
      toast("Error Updating Bookmark", {
        description: "Failed to update bookmark status. Please try again.",
      });
    }
  };

  // Update the star functionality for better server persistence
  const handleStarToggle = async (doc: LocalResearchDocument, setDocuments: React.Dispatch<React.SetStateAction<LocalResearchDocument[]>>) => {
    try {
      // Optimistic UI update
      setDocuments(prevDocs => prevDocs.map(d => 
        d.id === doc.id ? { ...d, starred: !d.starred } : d
      ));
      
      // Make API call to update star status
      await researchApi.updateResearchDocument(doc.id, { starred: !doc.starred });
      
      // Show success notification
      toast(!doc.starred ? "Research Starred" : "Star Removed", {
        description: !doc.starred 
          ? "Research has been starred for importance" 
          : "Research has been unstarred",
      });
    } catch (error) {
      console.error('Error updating star status:', error);
      
      // Revert UI on error
      setDocuments(prevDocs => prevDocs.map(d => 
        d.id === doc.id ? { ...d, starred: doc.starred } : d
      ));
      
      // Show error notification
      toast("Error Updating Star", {
        description: "Failed to update star status. Please try again.",
      });
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar activePage="research" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Header */}
        <header className="bg-background border-b border-border h-16 flex items-center px-6">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden mr-2 text-muted-foreground hover:text-foreground hover:bg-accent p-2 rounded-md"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground mr-6">AI Research Assistant</h1>
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search research papers, news, insights..."
              className="pl-10 bg-input border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="ml-4 flex items-center space-x-4">
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
            <div className="relative">
              <button className="relative text-muted-foreground hover:text-foreground hover:bg-accent p-2 rounded-md">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full"></span>
              </button>
            </div>
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center hover:bg-zinc-800 p-1 rounded-md transition-colors"
              >
                <div className="flex items-center bg-zinc-800 border-zinc-700 text-white rounded-md px-3 py-1.5">
                  <div className="mr-2">
                    <p className="font-medium">
                      {user?.name ? user.name.split(' ')[0] : 'P'}
                    </p>
                  </div>
                  {isProfileOpen ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                      <path d="M18 15L12 9L6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                  )}
                </div>
              </button>
              
              {isProfileOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-zinc-900 border border-zinc-800 rounded-md shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <p className="text-sm text-white">
                      {user?.name || 'prashant singh'}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {user?.email || 'prahantsh123@gmail.com'}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link 
                      href="/dashboard/profile" 
                      className="block px-4 py-2 text-sm text-white hover:bg-zinc-800 flex items-center"
                    >
                      <User className="h-4 w-4 mr-3 text-zinc-400" />
                      Profile
                    </Link>
                    <Link 
                      href="/dashboard/settings" 
                      className="block px-4 py-2 text-sm text-white hover:bg-zinc-800 flex items-center"
                    >
                      <Settings className="h-4 w-4 mr-3 text-zinc-400" />
                      Settings
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-zinc-800 flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-3 text-zinc-400" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Categories Sidebar */}
          <div className="w-64 border-r border-border bg-card flex flex-col">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Research Tools</h2>
                <button className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent">
                  <PlusCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-3 space-y-1">
                <button 
                  onClick={() => {
                    setActiveTab('all');
                    setSelectedCategory(null);
                  }} 
                  className={`w-full flex items-center justify-between p-2 rounded-md text-left ${activeTab === 'all' && !selectedCategory ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
                >
                  <div className="flex items-center">
                    <Layers className="h-4 w-4 mr-3" />
                    <span>All Research</span>
                  </div>
                  <Badge className="bg-accent-foreground/10 text-accent-foreground">{documents.length}</Badge>
                </button>

                <button 
                  onClick={() => setActiveTab('realtime')} 
                  className={`w-full flex items-center justify-between p-2 rounded-md text-left ${activeTab === 'realtime' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
                >
                  <div className="flex items-center">
                    <Zap className="h-4 w-4 mr-3" />
                    <span>Real-Time Research</span>
                  </div>
                  <Badge className="bg-accent-foreground/10 text-accent-foreground">{documents.filter(d => ['news', 'alert', 'paper'].includes(d.type)).length}</Badge>
                </button>

                <button 
                  onClick={() => setActiveTab('synthesis')} 
                  className={`w-full flex items-center justify-between p-2 rounded-md text-left ${activeTab === 'synthesis' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
                >
                  <div className="flex items-center">
                    <BrainCircuit className="h-4 w-4 mr-3" />
                    <span>Knowledge Synthesis</span>
                  </div>
                  <Badge className="bg-accent-foreground/10 text-accent-foreground">{documents.filter(d => ['synthesis', 'graph'].includes(d.type)).length}</Badge>
                </button>

                <button 
                  onClick={() => setActiveTab('alerts')} 
                  className={`w-full flex items-center justify-between p-2 rounded-md text-left ${activeTab === 'alerts' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
                >
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-3" />
                    <span>Research Alerts</span>
                  </div>
                  <Badge className="bg-accent-foreground/10 text-accent-foreground">{documents.filter(d => d.type === 'alert').length}</Badge>
                </button>

                <button 
                  onClick={() => setActiveTab('bookmarks')} 
                  className={`w-full flex items-center justify-between p-2 rounded-md text-left ${activeTab === 'bookmarks' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
                >
                  <div className="flex items-center">
                    <Bookmark className="h-4 w-4 mr-3" />
                    <span>Saved Research</span>
                  </div>
                  <Badge className="bg-accent-foreground/10 text-accent-foreground">{documents.filter(d => d.saved).length}</Badge>
                </button>
                
                <div className="w-full h-px bg-border my-3"></div>
                
                <div>
                  <h3 className="text-xs uppercase text-muted-foreground font-semibold px-2 mb-2 flex items-center justify-between">
                    <span>Research Interests</span>
                    <button 
                      className="text-muted-foreground hover:text-muted-foreground"
                      onClick={refreshInterests}
                      disabled={updating}
                    >
                      {updating ? 
                        <Loader2 className="h-3 w-3 animate-spin" /> : 
                        <RefreshCw className="h-3 w-3" />
                      }
                    </button>
                  </h3>
                  
                  <div className="space-y-1 mb-3">
                    {interests.map((interest, i) => (
                      <div key={i} className="flex items-center px-2 py-1 text-sm text-muted-foreground">
                        <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                        <span>{interest}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="px-2 mb-3">
                    <div className="bg-background rounded-md p-2 text-xs text-muted-foreground">
                      <p className="flex items-start mb-2">
                        <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary shrink-0 mt-0.5" />
                        <span>AI is tracking your interests from chat history to personalize research</span>
                      </p>
                      {interestRefreshTimestamp && (
                        <div className="text-xs text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Last updated: {interestRefreshTimestamp.toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <h3 className="text-xs uppercase text-muted-foreground font-semibold px-2 mb-2">Research Topics</h3>
                
                {categories.map(category => (
                  <button 
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.name);
                      setActiveTab('all');
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-md text-left ${selectedCategory === category.name ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
                  >
                    <div className="flex items-center">
                      <Folder className="h-4 w-4 mr-3" />
                      <span>{category.name}</span>
                    </div>
                    <Badge className="bg-accent-foreground/10 text-accent-foreground">{category.count}</Badge>
                  </button>
                ))}
              </div>
              
              <div className="px-3 mt-6 pt-4 border-t border-border">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Integration</h3>
                <div className="space-y-1">
                  <Link href="/dashboard/twinbot" className="w-full flex items-center p-2 rounded-md text-left text-muted-foreground hover:bg-accent hover:text-foreground">
                    <MessageSquare className="h-4 w-4 mr-3" />
                    <span>TwinBot Chat</span>
                  </Link>
                  <button className="w-full flex items-center p-2 rounded-md text-left text-muted-foreground hover:bg-accent hover:text-foreground">
                    <CalendarClock className="h-4 w-4 mr-3" />
                    <span>Google Calendar</span>
                  </button>
                  <button className="w-full flex items-center p-2 rounded-md text-left text-muted-foreground hover:bg-accent hover:text-foreground">
                    <BookOpen className="h-4 w-4 mr-3" />
                    <span>Notion</span>
                  </button>
                </div>
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-border">
              <button 
                onClick={updateResearchFromInterests}
                disabled={updating || interests.length === 0}
                className="w-full flex items-center justify-center p-2 text-primary hover:bg-primary/10 rounded-md transition-colors disabled:opacity-50"
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span>Updating Research...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    <span>Research My Interests</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Filters */}
            <div className="bg-background border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center">
                <button className="flex items-center text-foreground bg-accent px-3 py-1.5 rounded-md">
                  <Filter className="h-4 w-4 mr-2" />
                  <span>Filter</span>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </button>
                <div className="ml-4 flex space-x-2">
                  <button className="px-3 py-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                    Newest
                  </button>
                  <button className="px-3 py-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                    Relevance
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                >
                  <Layers className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <span className="text-muted-foreground text-sm ml-2">
                  {filteredDocuments.length} items
                </span>
              </div>
            </div>
            
            {/* Research progress indicator */}
            {updating && (
              <div className="px-4 py-2 bg-primary/10 border-b border-primary/20">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 mr-2 text-primary" />
                    <span className="text-sm text-primary">
                      {interests.length > 0
                        ? `Updating research based on: ${interests[0]}`
                        : "Processing research request..."}
                    </span>
                  </div>
                  <span className="text-xs text-primary">{researchProgress}%</span>
                </div>
                <div className="w-full h-1 bg-background rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500" 
                    style={{ width: `${researchProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20">
                <div className="flex items-center text-destructive">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}
            
            {/* AI Research Integration */}
            <div className="px-4 pt-4">
              <AIResearchIntegration 
                onResearchStart={handleResearchStart}
                onResearchComplete={handleResearchComplete}
                isAuthenticated={!!user}
              />
            </div>
            
            {/* Documents */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                    <p className="text-muted-foreground">Loading research materials...</p>
                  </div>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-center max-w-md p-6">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg text-foreground font-medium mb-2">No research found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery ? 
                        `No documents match your search for "${searchQuery}"` : 
                        interests.length > 0 ? 
                          "Click 'Research My Interests' to discover content about your topics" : 
                          "Start by chatting with TwinBot to generate research interests"}
                    </p>
                    {interests.length > 0 ? (
                      <Button 
                        onClick={updateResearchFromInterests}
                        disabled={updating}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Research My Interests
                      </Button>
                    ) : (
                      <Link href="/dashboard/twinbot">
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Chat with TwinBot
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className={`p-4 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}`}>
                {filteredDocuments.map(doc => (
                  <div 
                    key={doc.id}
                      className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          {getDocumentIcon(doc.type)}
                          <h3 className="text-lg font-medium text-foreground hover:text-primary transition-colors">
                        {doc.title}
                      </h3>
                        </div>
                      <div className="flex space-x-1">
                          <button 
                            onClick={() => handleBookmarkToggle(doc, setDocuments)}
                            className={`p-1 rounded-md ${doc.saved ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                          >
                          <Bookmark className="h-4 w-4" />
                        </button>
                          <button 
                            onClick={() => handleStarToggle(doc, setDocuments)}
                            className={`p-1 rounded-md ${doc.starred ? 'text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'}`}
                          >
                          <Star className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                      <p className="text-muted-foreground text-sm mb-3">{doc.excerpt}</p>
                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <span className="bg-background px-2 py-0.5 rounded">{doc.category}</span>
                      <span className="mx-2">•</span>
                      <span>{doc.source}</span>
                      <span className="mx-2">•</span>
                      <Clock className="h-3.5 w-3.5 mr-1" />
                        <span>{new Date(doc.dateAdded).toLocaleDateString()}</span>
                        {doc.metadata?.lastUpdated && (
                          <>
                            <span className="mx-2">•</span>
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            <span className="text-primary">{doc.metadata.lastUpdated}</span>
                          </>
                        )}
                      </div>
                      
                      {doc.metadata?.insights && doc.metadata.insights.length > 0 && (
                        <div className="mb-3 bg-accent rounded p-2">
                          <div className="flex items-center mb-1">
                            <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
                            <span className="text-xs font-medium text-primary">AI Insights</span>
                          </div>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {doc.metadata.insights.map((insight: string, i: number) => (
                              <li key={i} className="flex items-start">
                                <span className="text-primary mr-1.5">•</span>
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {doc.metadata?.connections && doc.metadata.connections.length > 0 && (
                        <div className="mb-3 bg-accent rounded p-2">
                          <div className="flex items-center mb-1">
                            <Network className="h-3.5 w-3.5 mr-1 text-amber-400" />
                            <span className="text-xs font-medium text-amber-400">Knowledge Connections</span>
                          </div>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {doc.metadata.connections.map((conn: any) => (
                              <li key={conn.id} className="flex items-center justify-between">
                                <span>{conn.title}</span>
                                <Badge className="bg-amber-400/20 text-amber-400">
                                  {Math.round(conn.strength * 100)}% match
                                </Badge>
                              </li>
                            ))}
                          </ul>
                    </div>
                      )}
                      
                    <div className="flex flex-wrap gap-1 mb-3">
                      {doc.tags.map(tag => (
                          <Badge 
                            key={tag} 
                            className="bg-background hover:bg-accent/20 text-muted-foreground cursor-pointer"
                            onClick={() => setSearchQuery(tag)}
                          >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="w-2/3 h-1.5 bg-border rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary" 
                            style={{ width: `${doc.progress || 100}%` }}
                        ></div>
                      </div>
                      <div className="flex space-x-2">
                          <button className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent">
                          <Share2 className="h-4 w-4" />
                        </button>
                          <button className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent">
                            <MessageSquare className="h-4 w-4" />
                        </button>
                          {doc.url && (
                            <a 
                              href={doc.url} 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent"
                            >
                          <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
} 

// Missing Grid component
function Grid(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}