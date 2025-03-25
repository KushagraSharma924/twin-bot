"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import Sidebar from "@/components/sidebar"
import { getUser, logout } from "@/lib/api"
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
  MessageSquare
} from "lucide-react"

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

interface Event {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  day: number;
  participants: string[];
  location?: string;
  isOnline: boolean;
  color: string;
}

export default function CalendarPage() {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
    } else {
      setUser(currentUser)
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

  // Sample events for the calendar
  const events: Event[] = [
    {
      id: 1,
      title: "Team Meeting",
      startTime: "10:00",
      endTime: "11:00",
      day: todayDate,
      participants: ["Alex Johnson", "Sarah Wilson", "Michael Brown"],
      isOnline: true,
      color: "bg-[var(--supabase-accent)]"
    },
    {
      id: 2,
      title: "Project Review",
      startTime: "13:00",
      endTime: "14:30",
      day: todayDate,
      participants: ["David Miller", "Emma Davis"],
      location: "Conference Room A",
      isOnline: false,
      color: "bg-purple-500"
    },
    {
      id: 3,
      title: "Client Call",
      startTime: "15:00",
      endTime: "15:30",
      day: todayDate + 1,
      participants: ["John Smith"],
      isOnline: true,
      color: "bg-green-500"
    },
    {
      id: 4,
      title: "Product Demo",
      startTime: "11:00",
      endTime: "12:00",
      day: todayDate + 2,
      participants: ["Anna White", "Robert Lee", "Jessica Clark"],
      location: "Main Office",
      isOnline: false,
      color: "bg-[var(--supabase-accent)]"
    }
  ];

  // Generate calendar days
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDayOfMonth = getFirstDayOfMonth(currentMonth, currentYear);
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-[var(--supabase-border)] bg-[var(--supabase-dark-bg)]"></div>);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === todayDate && currentMonth === todayMonth && currentYear === todayYear;
      const dayEvents = events.filter(event => event.day === day);
      
      days.push(
        <div 
          key={day} 
          className={`h-24 border border-[var(--supabase-border)] ${isToday ? 'bg-[var(--supabase-inactive)]' : 'bg-[var(--supabase-dark-bg)]'} p-1 overflow-hidden`}
        >
          <div className="flex justify-between items-center">
            <span className={`text-sm font-medium ${isToday ? 'bg-[var(--supabase-accent)] text-white h-6 w-6 rounded-full flex items-center justify-center' : 'text-gray-300'}`}>
              {day}
            </span>
            {dayEvents.length > 0 && (
              <Badge className="bg-[var(--supabase-accent)]/20 text-[var(--supabase-accent)] text-xs">{dayEvents.length}</Badge>
            )}
          </div>
          <div className="mt-1 space-y-1">
            {dayEvents.slice(0, 2).map(event => (
              <div key={event.id} className={`text-xs truncate px-1 py-0.5 rounded ${event.color} text-white`}>
                {event.startTime} {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-400">+{dayEvents.length - 2} more</div>
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
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--supabase-darker-bg)]">
        {/* Header */}
        <header className="bg-[var(--supabase-darker-bg)] border-b border-[var(--supabase-border)] h-16 flex items-center px-6">
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
                className="text-gray-300 hover:text-white p-1 rounded-md hover:bg-[var(--supabase-inactive)]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-white font-medium">{MONTHS[currentMonth]} {currentYear}</span>
              <button 
                onClick={goToNextMonth}
                className="text-gray-300 hover:text-white p-1 rounded-md hover:bg-[var(--supabase-inactive)]"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="ml-4">
              <button className="bg-[var(--supabase-accent)] text-white px-3 py-1.5 rounded-md hover:bg-[var(--supabase-accent-hover)] flex items-center">
                <Plus className="h-4 w-4 mr-1" />
                <span>New Event</span>
              </button>
            </div>
          </div>
          <div className="ml-4 relative">
            <Input 
              placeholder="Search events..." 
              className="w-40 md:w-52 bg-[var(--supabase-dark-bg)] border-[var(--supabase-border)] text-white placeholder:text-gray-500 focus:border-[var(--supabase-accent)] focus:ring-[var(--supabase-accent)]"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          </div>
          <div className="flex items-center space-x-4 ml-4">
            <button className="relative text-gray-300 hover:text-white hover:bg-[var(--supabase-inactive)] p-2 rounded-md">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-[var(--supabase-accent)] rounded-full"></span>
            </button>
            <Link href="/dashboard/twinbot" className="text-gray-300 hover:text-white hover:bg-[var(--supabase-inactive)] p-2 rounded-md block">
              <MessageSquare className="h-5 w-5" />
            </Link>
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center hover:bg-[var(--supabase-inactive)] p-1 rounded-md transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                  <AvatarFallback className="bg-[var(--supabase-inactive)] text-white">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <ChevronDown className={`h-4 w-4 ml-1 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-[var(--supabase-dark-bg)] ring-1 ring-black ring-opacity-5 z-50">
                  <div className="px-4 py-2 border-b border-[var(--supabase-border)]">
                    <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-400">{user?.email || ''}</p>
                  </div>
                  <Link 
                    href="/dashboard/profile" 
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-[var(--supabase-inactive)] hover:text-white flex items-center"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                  <Link 
                    href="/dashboard/settings" 
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-[var(--supabase-inactive)] hover:text-white flex items-center"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[var(--supabase-inactive)] hover:text-white flex items-center"
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
          {/* Calendar with Events */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Day Labels */}
            <div className="grid grid-cols-7 bg-[var(--supabase-dark-bg)]">
              {DAYS.map(day => (
                <div key={day} className="py-2 text-center text-sm font-medium text-gray-400">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-7 auto-rows-min">
                {renderCalendarDays()}
              </div>
            </ScrollArea>
          </div>

          {/* Event Details Panel */}
          <div className="w-80 border-l border-[var(--supabase-border)] bg-[var(--supabase-dark-bg)] hidden md:block overflow-hidden">
            <div className="p-4 border-b border-[var(--supabase-border)]">
              <h3 className="text-lg font-medium text-white">Today's Events</h3>
              <p className="text-sm text-gray-400">{MONTHS[today.getMonth()]} {today.getDate()}, {today.getFullYear()}</p>
            </div>
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {events
                  .filter(event => event.day === todayDate)
                  .map(event => (
                    <div key={event.id} className="border border-[var(--supabase-border)] rounded-lg p-3 bg-[var(--supabase-lighter-bg)]">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-white">{event.title}</h4>
                        <Badge className={`${event.color} text-white`}>{event.startTime}</Badge>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center text-sm text-gray-400">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{event.startTime} - {event.endTime}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center text-sm text-gray-400">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-400">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{event.participants.length} participants</span>
                        </div>
                        {event.isOnline && (
                          <div className="flex items-center text-sm text-gray-400">
                            <Video className="h-4 w-4 mr-1" />
                            <span>Online meeting</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex justify-between">
                        <div className="flex -space-x-2">
                          {event.participants.slice(0, 3).map((participant, index) => (
                            <Avatar key={index} className="h-6 w-6 border-2 border-[var(--supabase-dark-bg)]">
                              <AvatarFallback className="bg-[var(--supabase-inactive)] text-white text-xs">
                                {participant.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {event.participants.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-[var(--supabase-dark-bg)] border-2 border-[var(--supabase-dark-bg)] flex items-center justify-center">
                              <span className="text-xs text-gray-400">+{event.participants.length - 3}</span>
                            </div>
                          )}
                        </div>
                        <button className="text-xs text-[var(--supabase-accent)] hover:text-[var(--supabase-accent-hover)]">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}

                {events.filter(event => event.day === todayDate).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No events scheduled for today</p>
                    <button className="mt-2 text-[var(--supabase-accent)] hover:text-[var(--supabase-accent-hover)] text-sm">
                      + Add Event
                    </button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
} 