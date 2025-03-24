"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bell,
  Calendar,
  ChevronDown,
  FileText,
  Home,
  Mail,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Video,
  MapPin,
  Zap,
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
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
      color: "bg-blue-500"
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
      color: "bg-[#10a37f]"
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
      days.push(<div key={`empty-${i}`} className="h-24 border border-gray-700 bg-[#343541]"></div>);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === todayDate && currentMonth === todayMonth && currentYear === todayYear;
      const dayEvents = events.filter(event => event.day === day);
      
      days.push(
        <div 
          key={day} 
          className={`h-24 border border-gray-700 ${isToday ? 'bg-[#444654]' : 'bg-[#343541]'} p-1 overflow-hidden`}
        >
          <div className="flex justify-between items-center">
            <span className={`text-sm font-medium ${isToday ? 'bg-[#10a37f] text-white h-6 w-6 rounded-full flex items-center justify-center' : 'text-gray-300'}`}>
              {day}
            </span>
            {dayEvents.length > 0 && (
              <Badge className="bg-[#10a37f]/20 text-[#10a37f] text-xs">{dayEvents.length}</Badge>
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
    <div className="flex h-screen bg-[#202123]">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? "w-64" : "w-20"} bg-[#202123] border-r border-gray-700 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className={`flex items-center space-x-2 ${!isSidebarOpen && "justify-center w-full"}`}>
            <Zap className="h-6 w-6 text-[#10a37f]" />
            {isSidebarOpen && <span className="font-bold text-white">TwinBot</span>}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`text-gray-400 hover:text-white hover:bg-[#343541] p-2 rounded-md ${!isSidebarOpen ? "hidden" : ""}`}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            <Link href="/dashboard" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
              <Home className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>Dashboard</span>}
            </Link>
            <Link href="/dashboard/twinbot" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
              <MessageSquare className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>TwinBot Chat</span>}
            </Link>
            <Link href="/dashboard/emails" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
              <Mail className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>Emails</span>}
            </Link>
            <Link href="/dashboard/calendar" className="flex items-center w-full p-2 text-white bg-[#343541] hover:bg-[#444654] rounded-md">
              <Calendar className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>Calendar</span>}
            </Link>
            <Link href="/dashboard/research" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
              <FileText className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>Research</span>}
            </Link>
            <Link href="#" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
              <Settings className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>Settings</span>}
            </Link>
          </nav>
        </div>
        <div className="p-4 border-t border-gray-700">
          <div className={`flex ${isSidebarOpen ? "items-center" : "justify-center"}`}>
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
              <AvatarFallback className="bg-[#343541] text-white">JD</AvatarFallback>
            </Avatar>
            {isSidebarOpen && (
              <div className="ml-2 flex-1">
                <p className="text-sm font-medium text-white">John Doe</p>
                <p className="text-xs text-gray-400">john@example.com</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#343541]">
        {/* Header */}
        <header className="bg-[#343541] border-b border-gray-700 h-16 flex items-center px-6">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden mr-2 text-gray-300 hover:text-white hover:bg-[#444654] p-2 rounded-md"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 flex items-center">
            <h1 className="text-xl font-bold text-white">Calendar</h1>
            <div className="ml-6 flex items-center space-x-2">
              <button 
                onClick={goToPreviousMonth}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-[#444654]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-medium text-white">
                {MONTHS[currentMonth]} {currentYear}
              </h2>
              <button 
                onClick={goToNextMonth}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-[#444654]"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button className="ml-4 px-3 py-1 bg-[#10a37f] text-white rounded-md text-sm hover:bg-[#0e8f6f] flex items-center">
                <Plus className="h-4 w-4 mr-1" />
                New Event
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button className="relative text-gray-300 hover:text-white hover:bg-[#444654] p-2 rounded-md">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-[#10a37f] rounded-full"></span>
              </button>
            </div>
            <div className="flex items-center">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                <AvatarFallback className="bg-[#444654] text-white">JD</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 ml-1 text-gray-400" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Calendar View */}
          <div className="flex-1 overflow-auto p-4">
            {/* Month View */}
            <div className="grid grid-cols-7 text-center mb-2">
              {DAYS.map((day) => (
                <div key={day} className="text-gray-400 font-medium py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {renderCalendarDays()}
            </div>
          </div>

          {/* Upcoming Events Sidebar */}
          <div className="hidden md:flex w-80 border-l border-gray-700 bg-[#202123] flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-bold text-white mb-2">Upcoming Events</h3>
              <p className="text-sm text-gray-400">
                {MONTHS[todayMonth]} {todayDate}, {todayYear}
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {events.sort((a, b) => a.day - b.day).map((event) => (
                  <div 
                    key={event.id} 
                    className="p-3 bg-[#343541] border border-gray-700 rounded-lg hover:bg-[#444654] cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-white">{event.title}</h4>
                        <p className="text-sm text-gray-400 flex items-center mt-1">
                          <Clock className="h-3.5 w-3.5 mr-1.5" />
                          {event.startTime} - {event.endTime}
                        </p>
                      </div>
                      <Badge className={`${event.color} text-white`}>
                        {event.day === todayDate ? 'Today' : 
                         event.day === todayDate + 1 ? 'Tomorrow' : 
                         `In ${event.day - todayDate} days`}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-400 mt-2">
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      <p className="truncate">{event.participants.join(', ')}</p>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-400 mt-1.5">
                        <MapPin className="h-3.5 w-3.5 mr-1.5" />
                        <p>{event.location}</p>
                      </div>
                    )}
                    
                    {event.isOnline && (
                      <div className="flex items-center text-sm text-gray-400 mt-1.5">
                        <Video className="h-3.5 w-3.5 mr-1.5" />
                        <p>Virtual Meeting</p>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-xs text-[#10a37f]">TwinBot: Prepare briefing notes 30 minutes before</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-gray-700">
              <div className="bg-[#10a37f]/10 rounded-md p-3 border border-[#10a37f]/20">
                <p className="text-sm text-[#10a37f] font-medium mb-2">TwinBot Suggestions</p>
                <p className="text-xs text-gray-300 mb-2">Based on your workload, here are scheduling suggestions:</p>
                <div className="space-y-1">
                  <button className="w-full text-left p-2 bg-[#10a37f]/20 hover:bg-[#10a37f]/30 text-white text-sm rounded">
                    Reschedule Project Review to Thursday
                  </button>
                  <button className="w-full text-left p-2 bg-[#10a37f]/20 hover:bg-[#10a37f]/30 text-white text-sm rounded">
                    Block focus time tomorrow 2-4 PM
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 