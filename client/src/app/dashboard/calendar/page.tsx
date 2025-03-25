"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import Sidebar from "@/components/sidebar"
import { getUser, logout, getGoogleToken, clearGoogleToken, getGoogleAuthUrl, fetchCalendarEvents, createCalendarEvent, CalendarEvent } from "@/lib/api"
import { toast } from "sonner"
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Video,
  MapPin,
  User,
  Settings,
  LogOut,
  MessageSquare,
  Calendar,
  Loader2,
  X,
  Check,
  AlertCircle,
  Edit,
  Trash,
  RefreshCw
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { format, addDays, subDays, isToday, isSameDay } from "date-fns"

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

interface Event {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: { email: string; displayName?: string }[];
  htmlLink?: string;
  colorId?: string;
  conferenceData?: any;
  hangoutLink?: string;
  isPublic?: boolean;
  isHoliday?: boolean;
  isIndian?: boolean;
}

export default function CalendarPage() {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  
  // Google Calendar related state
  const [isGoogleConnected, setIsGoogleConnected] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [newEvent, setNewEvent] = useState({
    summary: '',
    description: '',
    location: '',
    start: '',
    end: '',
    attendees: ''
  })
  
  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
    } else {
      setUser(currentUser)
    }
    
    // Check if connected to Google Calendar
    const hasGoogleToken = Boolean(getGoogleToken())
    setIsGoogleConnected(hasGoogleToken)
    
    // Check if we need to prompt for Google auth reconnection
    const needsGoogleAuth = localStorage.getItem('google_auth_needed')
    if (needsGoogleAuth) {
      // Clear the flag
      localStorage.removeItem('google_auth_needed')
      // Update the state
      setIsGoogleConnected(false)
      // Show a toast notification
      toast.error("Google Calendar connection has expired. Please reconnect.")
    }
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [router])
  
  useEffect(() => {
    if (isGoogleConnected) {
      fetchEvents()
    } else {
      setIsLoading(false)
    }
  }, [isGoogleConnected, currentMonth, currentYear])
  
  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // Calculate start and end dates for the current month view
      const startDate = new Date(currentYear, currentMonth, 1)
      const endDate = new Date(currentYear, currentMonth + 1, 0)
      
      // Initialize arrays for different types of events
      const userEvents: Event[] = []
      const holidayEvents: Event[] = []
      const publicEvents: Event[] = []
      const indianEvents: Event[] = []
      
      // Track if we had an auth error
      let authError = false
      
      // First try to fetch Indian holiday events
      if (isGoogleConnected) {
        try {
          const { events: fetchedEvents, authError: gotAuthError } = await fetchCalendarEvents(startDate, endDate)
          
          if (gotAuthError) {
            authError = true
          } else {
            // Categorize events
            fetchedEvents.forEach(event => {
              if (event.isIndian) {
                indianEvents.push(event)
              } else if (event.isHoliday) {
                holidayEvents.push(event)
              } else if (event.isPublic) {
                publicEvents.push(event)
              } else {
                userEvents.push(event)
              }
            })
          }
        } catch (error) {
          console.error("Error fetching calendar events:", error)
        }
      }
      
      // If we had an auth error, we'll use sample events
      if (authError) {
        setIsGoogleConnected(false)
        localStorage.setItem('google_auth_needed', 'true')
        toast.error("Google Calendar authentication has expired. Please reconnect.")
        generateMockEvents()
      } else {
        // Combine all events with Indian events first for priority
        const allEvents = [...indianEvents, ...userEvents, ...holidayEvents, ...publicEvents]
        console.log(`Fetched ${allEvents.length} events (${indianEvents.length} Indian, ${userEvents.length} user, ${holidayEvents.length} holidays, ${publicEvents.length} public)`)
        setEvents(allEvents)
      }
    } catch (error) {
      console.error("Error in fetchEvents:", error)
      generateMockEvents()
    } finally {
      setIsLoading(false)
    }
  }, [currentMonth, currentYear, isGoogleConnected])
  
  // Mock events generator for when real data can't be fetched
  const generateMockEvents = () => {
    // Only create a single error notification event
    const errorEvent: Event = {
      id: 'error-1',
      summary: 'Calendar Connection Error',
      description: 'Unable to fetch your calendar events. Please reconnect to Google Calendar.',
      start: {
        dateTime: new Date().toISOString(),
      },
      end: {
        dateTime: new Date(new Date().getTime() + 30 * 60000).toISOString(),
      },
      isPublic: false,
      colorId: '11', // Red
    }
    
    setEvents([errorEvent])
  }
  
  const connectToGoogle = async () => {
    try {
      // Clear any existing tokens first
      clearGoogleToken()
      
      // Set loading state
      setIsLoading(true)
      
      // Get the auth URL
      const authUrl = await getGoogleAuthUrl()
      
      // Store the current page URL so we can redirect back after auth
      localStorage.setItem('calendar_redirect', window.location.pathname)
      
      // Redirect to Google OAuth
      window.location.href = authUrl
    } catch (error) {
      console.error("Error connecting to Google:", error)
      toast.error("Failed to connect to Google Calendar")
      setIsLoading(false)
    }
  }
  
  const reconnectToGoogle = async () => {
    try {
      // Clear any existing tokens
      clearGoogleToken()
      
      // Clear any auth needed flags
      localStorage.removeItem('google_auth_needed')
      
      // Show notification
      toast.info("Reconnecting to Google Calendar...")
      
      // Store current page for redirect after auth
      localStorage.setItem('calendar_redirect', window.location.pathname)
      
      // Use the existing connect function
      await connectToGoogle()
    } catch (error) {
      console.error("Error reconnecting to Google:", error)
      toast.error("Failed to reconnect to Google Calendar")
    }
  }
  
  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    setSelectedEvent(null)
    setNewEvent({
      summary: '',
      description: '',
      location: '',
      start: `${format(date, 'yyyy-MM-dd')}T09:00`,
      end: `${format(date, 'yyyy-MM-dd')}T10:00`,
      attendees: ''
    })
    setIsEventDialogOpen(true)
  }
  
  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event)
    setSelectedDate(new Date(event.start.dateTime))
    setIsEventDialogOpen(true)
  }
  
  const handleCreateEvent = async () => {
    if (!newEvent.summary) {
      toast.error("Event title is required")
      return
    }
    
    try {
      setIsLoading(true)
      
      // Parse attendees
      const attendeesArray = newEvent.attendees
        ? newEvent.attendees.split(',').map(email => ({ email: email.trim() }))
        : []
      
      // Create event payload
      const eventPayload: Partial<CalendarEvent> = {
        summary: newEvent.summary,
        description: newEvent.description,
        location: newEvent.location,
        start: {
          dateTime: newEvent.start,
        },
        end: {
          dateTime: newEvent.end,
        },
        attendees: attendeesArray,
      }
      
      await createCalendarEvent(eventPayload)
      
      toast.success("Event created successfully")
      setIsEventDialogOpen(false)
      fetchEvents()
    } catch (error: any) {
      console.error("Error creating event:", error)
      toast.error(error.message || "Failed to create event")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    toast.success("Logged out successfully")
    router.push('/login')
  }

  const getUserInitials = () => {
    if (!user?.name) return 'U'
    return user.name.split(' ').map(part => part[0]).join('')
  }
  
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  // Generate calendar days
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  // Format event time for display
  const formatEventTime = (dateTimeStr: string) => {
    try {
      return format(new Date(dateTimeStr), 'h:mm a');
    } catch (error) {
      return '';
    }
  }
  
  // Get events for a specific day
  const getEventsForDay = (day: number) => {
    return events.filter(event => {
      try {
        const eventDate = new Date(event.start.dateTime);
        return eventDate.getDate() === day && 
               eventDate.getMonth() === currentMonth && 
               eventDate.getFullYear() === currentYear;
      } catch (error) {
        return false;
      }
    });
  }
  
  // Get color class based on event's colorId or type
  const getEventColorClass = (event: Event) => {
    if (event.isIndian) return "bg-yellow-600";
    if (event.isHoliday) return "bg-green-600";
    if (event.isPublic) return "bg-blue-600";
    
    // Map Google Calendar color IDs to our classes
    const colorMap: Record<string, string> = {
      "1": "bg-[var(--supabase-accent)]", // Default blue
      "2": "bg-green-600",  // Green
      "3": "bg-purple-600", // Purple
      "4": "bg-red-600",    // Red
      "5": "bg-yellow-600", // Yellow
      "6": "bg-orange-600", // Orange
      "7": "bg-blue-600",   // Blue
      "8": "bg-gray-600",   // Gray
      "9": "bg-pink-600",   // Pink
      "10": "bg-teal-600",  // Teal
      "11": "bg-red-600",   // Red
    };
    
    return event.colorId && colorMap[event.colorId] 
      ? colorMap[event.colorId] 
      : "bg-[var(--supabase-accent)]";
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDayOfMonth = getFirstDayOfMonth(currentMonth, currentYear);
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div 
          key={`empty-${i}`} 
          className="h-28 border border-[var(--supabase-border)] bg-[var(--supabase-dark-bg)] transition-all duration-300 ease-in-out"
        ></div>
      );
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isCurrentToday = day === todayDate && currentMonth === todayMonth && currentYear === todayYear;
      const dayEvents = getEventsForDay(day);
      const date = new Date(currentYear, currentMonth, day);
      
      days.push(
        <div 
          key={day} 
          onClick={() => handleSelectDate(date)}
          className={`h-28 border border-[var(--supabase-border)] 
            ${isCurrentToday ? 'bg-gradient-to-br from-[var(--supabase-dark-bg)] to-[var(--supabase-inactive)]' : 'bg-[var(--supabase-dark-bg)]'} 
            p-2 overflow-hidden cursor-pointer hover:bg-[var(--supabase-light-bg)] 
            transition-all duration-200 ease-in-out transform hover:shadow-lg hover:scale-[1.02] hover:z-10 relative`}
        >
          <div className="flex justify-between items-center">
            <span className={`text-sm font-medium transition-all duration-300 ease-in-out
              ${isCurrentToday 
                ? 'bg-gradient-to-r from-[var(--supabase-accent)] to-blue-500 text-white h-7 w-7 rounded-full flex items-center justify-center shadow-md' 
                : 'text-gray-300 hover:text-white'}`}
            >
              {day}
            </span>
            {dayEvents.length > 0 && (
              <Badge className="bg-gradient-to-r from-[var(--supabase-accent)]/30 to-[var(--supabase-accent)]/50 text-white text-xs transition-all duration-300 ease-in-out shadow-sm">
                {dayEvents.length}
              </Badge>
            )}
          </div>
          <div className="mt-2 space-y-1.5">
            {dayEvents.slice(0, 2).map(event => (
              <div 
                key={event.id} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectEvent(event);
                }}
                className={`text-xs truncate px-2 py-1 rounded-md ${getEventColorClass(event)} text-white 
                  hover:opacity-80 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md hover:translate-x-0.5 hover:-translate-y-0.5`}
              >
                {formatEventTime(event.start.dateTime)} {event.summary}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-400 hover:text-gray-300 transition-colors duration-200 ease-in-out font-medium pl-1">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <div className="flex h-screen bg-[var(--supabase-dark-bg)]">
      {/* Sidebar */}
      <Sidebar activePage="calendar" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[var(--supabase-darker-bg)] to-[var(--supabase-dark-bg)]">
        {/* Header */}
        <header className="bg-gradient-to-r from-[var(--supabase-darker-bg)] to-[var(--supabase-darker-bg)]/90 border-b border-[var(--supabase-border)] h-16 flex items-center px-6 shadow-sm">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden mr-2 text-gray-300 hover:text-white hover:bg-[var(--supabase-inactive)] p-2 rounded-md"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 flex items-center">
            <h1 className="text-xl font-bold text-white">Calendar</h1>
            <div className="ml-6 flex items-center space-x-2">
              <button 
                onClick={goToPreviousMonth}
                className="text-gray-300 hover:text-white p-1.5 rounded-md hover:bg-[var(--supabase-inactive)] transition-all duration-200 transform hover:scale-105"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-white font-medium px-2">{MONTHS[currentMonth]} {currentYear}</span>
              <button 
                onClick={goToNextMonth}
                className="text-gray-300 hover:text-white p-1.5 rounded-md hover:bg-[var(--supabase-inactive)] transition-all duration-200 transform hover:scale-105"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="ml-4">
              {isLoading ? (
                <div className="h-9 px-4 py-1.5 flex items-center text-gray-400 bg-[var(--supabase-inactive)]/30 rounded-md shadow-inner">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </div>
              ) : (
                <button 
                  onClick={() => handleSelectDate(new Date())}
                  className="bg-gradient-to-r from-[var(--supabase-accent)] to-blue-500 text-white px-4 py-1.5 rounded-md hover:from-[var(--supabase-accent-hover)] hover:to-blue-600 flex items-center transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  <span>New Event</span>
                </button>
              )}
            </div>
          </div>
          <div className="ml-4 relative">
            <Input 
              placeholder="Search events..." 
              className="w-40 md:w-52 bg-[var(--supabase-darker-bg)] border-[var(--supabase-border)] text-white placeholder:text-gray-500 focus:border-[var(--supabase-accent)] focus:ring-[var(--supabase-accent)] transition-all duration-200 shadow-inner"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          </div>
          <div className="flex items-center space-x-4 ml-4">
            <button className="relative text-gray-300 hover:text-white hover:bg-[var(--supabase-inactive)] p-2 rounded-md transition-all duration-200 transform hover:scale-105">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-[var(--supabase-accent)] rounded-full animate-pulse"></span>
            </button>
            <Link href="/dashboard/twinbot" className="text-gray-300 hover:text-white hover:bg-[var(--supabase-inactive)] p-2 rounded-md block transition-all duration-200 transform hover:scale-105">
              <MessageSquare className="h-5 w-5" />
            </Link>
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center hover:bg-[var(--supabase-inactive)] p-1 rounded-md transition-all duration-200"
              >
                <Avatar className="h-8 w-8 ring-2 ring-[var(--supabase-accent)]/30">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                  <AvatarFallback className="bg-gradient-to-br from-[var(--supabase-accent)] to-blue-500 text-white">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <ChevronDown className={`h-4 w-4 ml-1 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-[var(--supabase-dark-bg)] ring-1 ring-black ring-opacity-5 z-50 transition-all duration-200 ease-in-out animate-in fade-in-50 slide-in-from-top-5">
                  <div className="px-4 py-2 border-b border-[var(--supabase-border)]">
                    <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-400">{user?.email || ''}</p>
                  </div>
                  <Link 
                    href="/dashboard/profile" 
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-[var(--supabase-inactive)] hover:text-white flex items-center transition-colors duration-200"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                  <Link 
                    href="/dashboard/settings" 
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-[var(--supabase-inactive)] hover:text-white flex items-center transition-colors duration-200"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[var(--supabase-inactive)] hover:text-white flex items-center transition-colors duration-200"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden bg-[var(--supabase-light-bg)]">
          {!isGoogleConnected ? (
            // Google Calendar not connected view
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[var(--supabase-darker-bg)] to-[var(--supabase-dark-bg)]">
              <div className="max-w-md text-center bg-gradient-to-b from-[var(--supabase-light-bg)] to-[var(--supabase-light-bg)]/90 p-8 rounded-xl shadow-xl border border-[var(--supabase-border)] transform transition-all duration-500 hover:scale-105">
                <div className="h-20 w-20 bg-gradient-to-br from-blue-500/20 to-[var(--supabase-accent)]/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Calendar className="h-10 w-10 text-[var(--supabase-accent)]" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4 bg-gradient-to-r from-white to-gray-300 text-transparent bg-clip-text">Connect to Google Calendar</h2>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Connect your Google Calendar to view and manage your events right here in the app. This allows you to see your schedule, create new events, and manage your calendar without switching between applications.
                </p>
                <div className="space-y-4">
                  <Button
                    onClick={connectToGoogle}
                    className="w-full bg-gradient-to-r from-[var(--supabase-accent)] to-blue-500 hover:from-[var(--supabase-accent-hover)] hover:to-blue-600 text-white transition-all duration-300 shadow-md hover:shadow-lg transform hover:translate-y-[-2px]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>Connect to Google Calendar</>
                    )}
                  </Button>
                  
                  <Button
                    onClick={reconnectToGoogle}
                    className="w-full bg-[var(--supabase-inactive)] hover:bg-gray-600 text-white transition-all duration-200 shadow-sm hover:shadow-md"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Reconnecting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reconnect
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-5">
                  Having authentication issues? Try reconnecting if you previously connected your calendar.
                </p>
              </div>
            </div>
          ) : (
            // Calendar with Events
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Day Labels */}
              <div className="grid grid-cols-7 bg-gradient-to-r from-[var(--supabase-dark-bg)] to-[var(--supabase-dark-bg)]/95 shadow-sm">
                {DAYS.map(day => (
                  <div key={day} className="py-3 text-center text-sm font-medium text-gray-400">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full w-full">
                    <div className="bg-[var(--supabase-darker-bg)]/50 p-6 rounded-xl shadow-lg flex flex-col items-center">
                      <Loader2 className="h-10 w-10 animate-spin text-[var(--supabase-accent)] mb-4" />
                      <span className="text-gray-400">Loading your calendar events...</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-7 auto-rows-min p-1 bg-gradient-to-br from-[var(--supabase-light-bg)] to-[var(--supabase-light-bg)]/90">
                    {renderCalendarDays()}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* Event Details Panel */}
          <div className="w-80 border-l border-[var(--supabase-border)] bg-gradient-to-b from-[var(--supabase-dark-bg)] to-[var(--supabase-darker-bg)] hidden md:block overflow-hidden">
            <div className="p-4 border-b border-[var(--supabase-border)] flex items-center justify-between bg-[var(--supabase-darker-bg)]/50">
              <div>
                <h3 className="text-lg font-medium text-white">Today's Events</h3>
                <p className="text-sm text-gray-400">{MONTHS[today.getMonth()]} {today.getDate()}, {today.getFullYear()}</p>
              </div>
              {isGoogleConnected && (
                <Button 
                  onClick={() => handleSelectDate(new Date())} 
                  size="sm" 
                  className="bg-gradient-to-r from-[var(--supabase-accent)] to-blue-500 hover:from-[var(--supabase-accent-hover)] hover:to-blue-600 text-white transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-32 w-full">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--supabase-accent)]" />
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {events
                    .filter(event => {
                      try {
                        const eventDate = new Date(event.start.dateTime);
                        return eventDate.getDate() === todayDate && 
                              eventDate.getMonth() === todayMonth && 
                              eventDate.getFullYear() === todayYear;
                      } catch (error) {
                        return false;
                      }
                    })
                    .sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime())
                    .map((event, index) => (
                      <div 
                        key={event.id} 
                        className="border border-[var(--supabase-border)] rounded-lg p-3.5 bg-[var(--supabase-lighter-bg)] hover:bg-[var(--supabase-inactive)] transition-all duration-300 ease-in-out group shadow-md hover:shadow-lg transform hover:translate-y-[-2px]"
                        style={{
                          animationDelay: `${index * 50}ms`,
                        }}
                        onClick={() => handleSelectEvent(event)}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-white group-hover:text-white transition-colors duration-200">{event.summary}</h4>
                          <Badge className={`${getEventColorClass(event)} text-white shadow-sm`}>
                            {formatEventTime(event.start.dateTime)}
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          <div className="flex items-center text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-200">
                            <Clock className="h-4 w-4 mr-1.5" />
                            <span>{formatEventTime(event.start.dateTime)} - {formatEventTime(event.end.dateTime)}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-200">
                              <MapPin className="h-4 w-4 mr-1.5" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="flex items-center text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-200">
                              <Users className="h-4 w-4 mr-1.5" />
                              <span>{event.attendees.length} participants</span>
                            </div>
                          )}
                          {event.hangoutLink && (
                            <div className="flex items-center text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-200">
                              <Video className="h-4 w-4 mr-1.5" />
                              <span>Online meeting</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex justify-between">
                          <div className="flex -space-x-2">
                            {event.attendees && event.attendees.slice(0, 3).map((attendee, idx) => (
                              <Avatar key={idx} className="h-6 w-6 border-2 border-[var(--supabase-dark-bg)] transition-transform duration-200 hover:scale-110 hover:z-10">
                                <AvatarFallback className="bg-gradient-to-br from-[var(--supabase-inactive)] to-[var(--supabase-darker-bg)] text-white text-xs">
                                  {attendee.displayName ? attendee.displayName.split(' ').map(n => n[0]).join('') : attendee.email.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {event.attendees && event.attendees.length > 3 && (
                              <div className="h-6 w-6 rounded-full bg-[var(--supabase-dark-bg)] border-2 border-[var(--supabase-dark-bg)] flex items-center justify-center">
                                <span className="text-xs text-gray-400">+{event.attendees.length - 3}</span>
                              </div>
                            )}
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex space-x-2">
                            <button className="text-[var(--supabase-accent)] hover:text-[var(--supabase-accent-hover)] transition-colors duration-200 transform hover:scale-110">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="text-red-500 hover:text-red-400 transition-colors duration-200 transform hover:scale-110">
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                  {events.filter(event => {
                    try {
                      const eventDate = new Date(event.start.dateTime);
                      return eventDate.getDate() === todayDate && 
                            eventDate.getMonth() === todayMonth && 
                            eventDate.getFullYear() === todayYear;
                    } catch (error) {
                      return false;
                    }
                  }).length === 0 && (
                    <div className="text-center py-10">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--supabase-inactive)]/10 mb-4">
                        <Calendar className="h-8 w-8 text-gray-500" />
                      </div>
                      <p className="text-gray-400 mb-2">No events scheduled for today</p>
                      {isGoogleConnected && (
                        <button 
                          onClick={() => handleSelectDate(new Date())}
                          className="mt-2 text-[var(--supabase-accent)] hover:text-[var(--supabase-accent-hover)] text-sm transition-colors duration-200 flex items-center mx-auto"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Event
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Add/Edit Event Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="bg-gradient-to-b from-[var(--supabase-light-bg)] to-[var(--supabase-light-bg)]/90 border-[var(--supabase-border)] text-white max-w-md rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedEvent ? 'Event Details' : 'Add New Event'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent ? (
            // Event details view
            <div className="space-y-4 animate-in fade-in-50 duration-200 ease-in-out">
              <h2 className="text-xl font-semibold text-white">{selectedEvent.summary}</h2>
              
              <div className="flex items-center text-gray-300">
                <Clock className="h-5 w-5 mr-2 text-[var(--supabase-accent)]" />
                <div>
                  <div>{format(new Date(selectedEvent.start.dateTime), 'EEEE, MMMM d, yyyy')}</div>
                  <div>{formatEventTime(selectedEvent.start.dateTime)} - {formatEventTime(selectedEvent.end.dateTime)}</div>
                </div>
              </div>
              
              {selectedEvent.location && (
                <div className="flex items-center text-gray-300">
                  <MapPin className="h-5 w-5 mr-2 text-[var(--supabase-accent)]" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center text-gray-300">
                    <Users className="h-5 w-5 mr-2 text-[var(--supabase-accent)]" />
                    <span>{selectedEvent.attendees.length} Attendees</span>
                  </div>
                  <div className="ml-7 space-y-1.5">
                    {selectedEvent.attendees.map((attendee, idx) => (
                      <div key={idx} className="flex items-center text-sm text-gray-400">
                        <span>{attendee.displayName || attendee.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedEvent.description && (
                <div className="mt-4 bg-[var(--supabase-darker-bg)] rounded-md p-4 text-gray-300 text-sm border border-[var(--supabase-border)] shadow-inner">
                  {selectedEvent.description}
                </div>
              )}
              
              {selectedEvent.htmlLink && (
                <div className="mt-4">
                  <a 
                    href={selectedEvent.htmlLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[var(--supabase-accent)] hover:text-[var(--supabase-accent-hover)] hover:underline text-sm flex items-center"
                  >
                    <Calendar className="h-4 w-4 mr-1.5" />
                    Open in Google Calendar
                  </a>
                </div>
              )}
            </div>
          ) : (
            // Add new event form
            <div className="space-y-4 animate-in fade-in-50 duration-200 ease-in-out">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Event Title</label>
                <Input 
                  value={newEvent.summary}
                  onChange={(e) => setNewEvent({...newEvent, summary: e.target.value})}
                  placeholder="Meeting with Team"
                  className="bg-[var(--supabase-darker-bg)] border-[var(--supabase-border)] text-white focus:border-[var(--supabase-accent)] focus:ring-[var(--supabase-accent)] shadow-inner"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Start</label>
                  <Input 
                    type="datetime-local"
                    value={newEvent.start}
                    onChange={(e) => setNewEvent({...newEvent, start: e.target.value})}
                    className="bg-[var(--supabase-darker-bg)] border-[var(--supabase-border)] text-white focus:border-[var(--supabase-accent)] focus:ring-[var(--supabase-accent)] shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">End</label>
                  <Input 
                    type="datetime-local"
                    value={newEvent.end}
                    onChange={(e) => setNewEvent({...newEvent, end: e.target.value})}
                    className="bg-[var(--supabase-darker-bg)] border-[var(--supabase-border)] text-white focus:border-[var(--supabase-accent)] focus:ring-[var(--supabase-accent)] shadow-inner"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Attendees (comma separated emails)</label>
                <Input 
                  value={newEvent.attendees}
                  onChange={(e) => setNewEvent({...newEvent, attendees: e.target.value})}
                  placeholder="john@example.com, jane@example.com"
                  className="bg-[var(--supabase-darker-bg)] border-[var(--supabase-border)] text-white focus:border-[var(--supabase-accent)] focus:ring-[var(--supabase-accent)] shadow-inner"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Location</label>
                <Input 
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  placeholder="Conference Room or Meeting Link"
                  className="bg-[var(--supabase-darker-bg)] border-[var(--supabase-border)] text-white focus:border-[var(--supabase-accent)] focus:ring-[var(--supabase-accent)] shadow-inner"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Description</label>
                <Textarea 
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  placeholder="Add meeting agenda or notes"
                  className="bg-[var(--supabase-darker-bg)] border-[var(--supabase-border)] text-white resize-none h-24 focus:border-[var(--supabase-accent)] focus:ring-[var(--supabase-accent)] shadow-inner"
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            {selectedEvent ? (
              <div className="flex space-x-2 w-full justify-end">
                <Button
                  variant="secondary" 
                  onClick={() => setIsEventDialogOpen(false)}
                  className="bg-[var(--supabase-darker-bg)] hover:bg-[var(--supabase-inactive)] border-[var(--supabase-border)] text-white transition-colors duration-200"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    // Handle edit event
                    setIsEventDialogOpen(false);
                  }}
                  className="bg-gradient-to-r from-[var(--supabase-accent)] to-blue-500 hover:from-[var(--supabase-accent-hover)] hover:to-blue-600 text-white transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Edit className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
              </div>
            ) : (
              <div className="flex space-x-2 w-full justify-end">
                <Button
                  variant="secondary" 
                  onClick={() => setIsEventDialogOpen(false)}
                  className="bg-[var(--supabase-darker-bg)] hover:bg-[var(--supabase-inactive)] border-[var(--supabase-border)] text-white transition-colors duration-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateEvent}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-[var(--supabase-accent)] to-blue-500 hover:from-[var(--supabase-accent-hover)] hover:to-blue-600 text-white transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>Create Event</>
                  )}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 