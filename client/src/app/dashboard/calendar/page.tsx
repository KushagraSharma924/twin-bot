"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import Sidebar from "@/components/sidebar"
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
      <Sidebar activePage="calendar" />

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
                className="text-gray-300 hover:text-white p-1 rounded-md hover:bg-[#444654]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-white font-medium">{MONTHS[currentMonth]} {currentYear}</span>
              <button 
                onClick={goToNextMonth}
                className="text-gray-300 hover:text-white p-1 rounded-md hover:bg-[#444654]"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="ml-4">
              <button className="bg-[#10a37f] text-white px-3 py-1.5 rounded-md hover:bg-[#0e8f6f] flex items-center">
                <Plus className="h-4 w-4 mr-1" />
                <span>New Event</span>
              </button>
            </div>
          </div>
          <div className="ml-4 relative">
            <Input 
              placeholder="Search events..." 
              className="w-40 md:w-52 bg-[#40414f] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#10a37f] focus:ring-[#10a37f]"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          </div>
          <div className="flex items-center space-x-4 ml-4">
            <button className="relative text-gray-300 hover:text-white hover:bg-[#444654] p-2 rounded-md">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-[#10a37f] rounded-full"></span>
            </button>
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
          {/* Calendar with Events */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Day Labels */}
            <div className="grid grid-cols-7 bg-[#343541]">
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
          
          {/* Event Details Sidebar */}
          <div className="hidden md:block w-80 border-l border-gray-700 bg-[#202123] p-4 overflow-hidden flex-col">
            <h2 className="text-lg font-bold text-white mb-4">Today's Events</h2>
            <ScrollArea className="flex-1">
              <div className="space-y-4">
                {events
                  .filter(event => event.day === todayDate)
                  .map(event => (
                    <div 
                      key={event.id} 
                      className="p-3 rounded-md bg-[#343541] border border-gray-700 hover:bg-[#444654] transition-colors"
                    >
                      <div className="flex items-start">
                        <div className={`${event.color} w-1 h-full self-stretch rounded-full mr-3`}></div>
                        <div className="flex-1">
                          <h3 className="text-white font-medium">{event.title}</h3>
                          <p className="text-gray-400 text-sm flex items-center mt-1">
                            <Clock className="h-3.5 w-3.5 mr-1" /> 
                            {event.startTime} - {event.endTime}
                          </p>
                          {event.location && (
                            <p className="text-gray-400 text-sm flex items-center mt-1">
                              <MapPin className="h-3.5 w-3.5 mr-1" /> 
                              {event.location}
                            </p>
                          )}
                          {event.isOnline && (
                            <p className="text-gray-400 text-sm flex items-center mt-1">
                              <Video className="h-3.5 w-3.5 mr-1" /> 
                              Online Meeting
                            </p>
                          )}
                          <div className="mt-2">
                            <p className="text-gray-400 text-sm flex items-center">
                              <Users className="h-3.5 w-3.5 mr-1" /> 
                              {event.participants.length} participants
                            </p>
                          </div>
                          <div className="mt-3 flex space-x-2">
                            <button className="text-xs bg-[#343541] text-white px-2 py-1 rounded hover:bg-[#444654]">
                              Edit
                            </button>
                            <button className="text-xs bg-[#343541] text-white px-2 py-1 rounded hover:bg-[#444654]">
                              Join
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              
              {/* Upcoming Events Section */}
              <h2 className="text-lg font-bold text-white mt-6 mb-4">Upcoming Events</h2>
              <div className="space-y-4">
                {events
                  .filter(event => event.day > todayDate)
                  .slice(0, 3)
                  .map(event => (
                    <div 
                      key={event.id} 
                      className="p-3 rounded-md bg-[#343541] border border-gray-700 hover:bg-[#444654] transition-colors"
                    >
                      <div className="flex items-start">
                        <div className={`${event.color} w-1 h-full self-stretch rounded-full mr-3`}></div>
                        <div>
                          <h3 className="text-white font-medium">{event.title}</h3>
                          <p className="text-gray-400 text-sm mt-1">
                            Day {event.day}, {event.startTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
} 