"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Sidebar from "@/components/sidebar"
import { getUser, logout, fetchEmails, fetchSentEmails, fetchCalendarEvents } from "@/lib/api"
import { toast } from "sonner"
import {
  Bell,
  Calendar,
  ChevronDown,
  FileText,
  Mail,
  Menu,
  MessageSquare,
  Search,
  Brain,
  Bot,
  User,
  Settings,
  LogOut,
  Inbox,
  Send,
  Calendar as CalendarIcon
} from "lucide-react"
import { format } from "date-fns"

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("emails")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const [recentEmails, setRecentEmails] = useState<any[]>([])
  const [recentCalendarEvents, setRecentCalendarEvents] = useState<any[]>([])
  const [isLoadingEmails, setIsLoadingEmails] = useState(true)
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  
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

  useEffect(() => {
    const fetchRecentData = async () => {
      if (!user?.id) return
      
      // Fetch recent emails
      try {
        setIsLoadingEmails(true)
        const sentResult = await fetchSentEmails({ limit: 3 })
        
        if (!sentResult.error && sentResult.emails) {
          // Sort emails by date (newest first)
          const sortedEmails = sentResult.emails.sort((a, b) => {
            const dateA = new Date(a.date || a.receivedDate)
            const dateB = new Date(b.date || b.receivedDate)
            return dateB.getTime() - dateA.getTime()
          })
          
          setRecentEmails(sortedEmails)
        }
      } catch (err) {
        console.error("Error fetching recent emails:", err)
      } finally {
        setIsLoadingEmails(false)
      }
      
      // Fetch calendar events
      try {
        setIsLoadingEvents(true)
        const now = new Date()
        const endDate = new Date()
        endDate.setDate(now.getDate() + 7) // Get events for next 7 days
        
        const result = await fetchCalendarEvents(now, endDate)
        
        if (result.events) {
          // Sort events by start date
          const sortedEvents = result.events.sort((a, b) => {
            const dateA = new Date(a.start.dateTime)
            const dateB = new Date(b.start.dateTime)
            return dateA.getTime() - dateB.getTime()
          })
          
          setRecentCalendarEvents(sortedEvents.slice(0, 3))
        }
      } catch (err) {
        console.error("Error fetching calendar events:", err)
      } finally {
        setIsLoadingEvents(false)
      }
    }
    
    fetchRecentData()
  }, [user?.id])

  const handleLogout = () => {
    logout()
    toast.success("Logged out successfully")
    router.push('/login')
  }

  const getUserInitials = () => {
    if (!user?.name) return 'U'
    return user.name.split(' ').map(part => part[0]).join('')
  }

  const getFirstName = () => {
    if (!user?.name) return 'User'
    // Split by space and get the first part (first name)
    return user.name.split(' ')[0]
  }

  const getSenderName = (from: string) => {
    if (!from) return "Unknown"

    // Extract name if available, otherwise use email address
    const nameMatch = from.match(/(.*?)\s*</)
    if (nameMatch && nameMatch[1]) {
      return nameMatch[1].trim()
    }

    // Extract just the email address
    const emailMatch = from.match(/<(.*?)>/)
    if (emailMatch && emailMatch[1]) {
      return emailMatch[1]
    }

    return from
  }

  return (
    <div className="flex h-screen bg-[var(--supabase-dark-bg)]">
      {/* Sidebar */}
      <Sidebar activePage="dashboard" />

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
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input placeholder="Ask your digital twin anything..." className="pl-8 bg-[var(--supabase-dark-bg)] border-[var(--supabase-border)] text-white placeholder:text-gray-500 focus:border-[var(--supabase-accent)] focus:ring-[var(--supabase-accent)]" />
            </div>
          </div>
          <div className="flex items-center space-x-4">
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
        <main className="flex-1 overflow-auto p-6 bg-[var(--supabase-light-bg)] text-white">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-white">Welcome back, {getFirstName()}</h1>
            <p className="text-gray-400">Your digital twin has been learning from your habits</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">Emails</CardTitle>
                <CardDescription className="text-gray-400">Your AI twin has handled emails</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/emails" className="flex items-center justify-between hover:opacity-80 transition-opacity">
                  <div>
                    <p className="text-3xl font-bold text-white">{recentEmails.length || '0'}</p>
                    <p className="text-sm text-gray-400">Emails processed</p>
                  </div>
                  <div className="bg-[var(--supabase-accent)]/20 p-3 rounded-full">
                    <Mail className="h-6 w-6 text-[var(--supabase-accent)]" />
                  </div>
                </Link>
              </CardContent>
            </Card>
            <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">Calendar</CardTitle>
                <CardDescription className="text-gray-400">Your AI twin has organized your calendar</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/calendar" className="flex items-center justify-between hover:opacity-80 transition-opacity">
                  <div>
                    <p className="text-3xl font-bold text-white">{recentCalendarEvents.length || '0'}</p>
                    <p className="text-sm text-gray-400">Events added</p>
                  </div>
                  <div className="bg-[var(--supabase-accent)]/20 p-3 rounded-full">
                    <Calendar className="h-6 w-6 text-[var(--supabase-accent)]" />
                  </div>
                </Link>
              </CardContent>
            </Card>
            <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">Research</CardTitle>
                <CardDescription className="text-gray-400">Your AI twin has filtered content for you</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/research" className="flex items-center justify-between hover:opacity-80 transition-opacity">
                  <div>
                    <p className="text-3xl font-bold text-white">12</p>
                    <p className="text-sm text-gray-400">Articles filtered</p>
                  </div>
                  <div className="bg-[var(--supabase-accent)]/20 p-3 rounded-full">
                    <FileText className="h-6 w-6 text-[var(--supabase-accent)]" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Recent Emails Section - New */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-white">Recent Emails</h2>
            <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white p-4">
              <div className="mb-2">
                <p className="text-gray-400">Your digital twin has analyzed and processed these emails</p>
              </div>
              
              {isLoadingEmails ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--supabase-accent)]"></div>
                </div>
              ) : recentEmails.length === 0 ? (
                <div className="text-center p-8 text-gray-400">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent emails found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentEmails.map((email, index) => (
                    <Link 
                      key={email.id || index} 
                      href="/dashboard/emails"
                      className="block bg-zinc-800 hover:bg-zinc-700 rounded-lg p-4 transition-colors"
                    >
                      <div className="flex items-start">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarFallback className="bg-zinc-600 text-zinc-100">
                            {getSenderName(email.from).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-medium text-white">{email.subject || "(No subject)"}</h3>
                          <p className="text-sm text-gray-400 mb-1">From: {getSenderName(email.from)}</p>
                          <p className="text-sm text-gray-400">AI drafted a response matching your writing style.</p>
                          <Badge className="mt-2 bg-zinc-700 text-zinc-300 hover:bg-zinc-600">Auto-processed</Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Calendar Events Section - New */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-white">Upcoming Events</h2>
            <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white p-4">
              <div className="mb-2">
                <p className="text-gray-400">Your digital twin has organized these events for you</p>
              </div>
              
              {isLoadingEvents ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--supabase-accent)]"></div>
                </div>
              ) : recentCalendarEvents.length === 0 ? (
                <div className="text-center p-8 text-gray-400">
                  <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No upcoming events found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentCalendarEvents.map((event, index) => (
                    <Link 
                      key={event.id || index} 
                      href="/dashboard/calendar"
                      className="block bg-zinc-800 hover:bg-zinc-700 rounded-lg p-4 transition-colors"
                    >
                      <div className="flex items-start">
                        <div className="h-10 w-10 mr-3 bg-zinc-700 rounded-md flex items-center justify-center">
                          <CalendarIcon className="h-5 w-5 text-zinc-300" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-white">{event.summary}</h3>
                          <p className="text-sm text-gray-400 mb-1">
                            {event.start?.dateTime ? format(new Date(event.start.dateTime), 'MMM d, yyyy - h:mm a') : 'No date'}
                          </p>
                          <p className="text-sm text-gray-400">
                            {event.location || 'No location specified'}
                          </p>
                          <Badge className="mt-2 bg-zinc-700 text-zinc-300 hover:bg-zinc-600">AI-scheduled</Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-white">Learning Progress</h2>
            <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white">
              <CardContent className="p-6">
                <div className="flex items-center space-x-6 mb-6">
                  <div className="bg-[var(--supabase-accent)]/20 p-3 rounded-full">
                    <Brain className="h-8 w-8 text-[var(--supabase-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">AI Model Training</h3>
                    <p className="text-gray-400">Your digital twin is learning from your behavior patterns</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Writing Style</span>
                      <span className="text-sm text-gray-300">7%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="bg-[var(--supabase-accent)] h-full" style={{ width: "7%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Calendar Preferences</span>
                      <span className="text-sm text-gray-300">20%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="bg-[var(--supabase-accent)] h-full" style={{ width: "20%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Research Interests</span>
                      <span className="text-sm text-gray-300">22%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="bg-[var(--supabase-accent)] h-full" style={{ width: "22%" }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Access Links for Navigation */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Link href="/dashboard/emails" className="bg-[var(--supabase-lighter-bg)] hover:bg-[var(--supabase-dark-bg)] transition-colors rounded-lg p-4 text-center">
              <div className="flex flex-col items-center">
                <div className="bg-[var(--supabase-accent)]/20 p-3 rounded-full mb-2">
                  <Mail className="h-6 w-6 text-[var(--supabase-accent)]" />
                </div>
                <span className="text-white font-medium">Emails</span>
                <span className="text-xs text-gray-400 mt-1">View all</span>
              </div>
            </Link>
            <Link href="/dashboard/calendar" className="bg-[var(--supabase-lighter-bg)] hover:bg-[var(--supabase-dark-bg)] transition-colors rounded-lg p-4 text-center">
              <div className="flex flex-col items-center">
                <div className="bg-[var(--supabase-accent)]/20 p-3 rounded-full mb-2">
                  <Calendar className="h-6 w-6 text-[var(--supabase-accent)]" />
                </div>
                <span className="text-white font-medium">Calendar</span>
                <span className="text-xs text-gray-400 mt-1">View all</span>
              </div>
            </Link>
            <Link href="/dashboard/research" className="bg-[var(--supabase-lighter-bg)] hover:bg-[var(--supabase-dark-bg)] transition-colors rounded-lg p-4 text-center">
              <div className="flex flex-col items-center">
                <div className="bg-[var(--supabase-accent)]/20 p-3 rounded-full mb-2">
                  <FileText className="h-6 w-6 text-[var(--supabase-accent)]" />
                </div>
                <span className="text-white font-medium">Research</span>
                <span className="text-xs text-gray-400 mt-1">View all</span>
              </div>
            </Link>
          </div>

          {/* Talk to Twin Bot */}
          <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-[var(--supabase-accent)]/20 p-3 rounded-full">
                    <Bot className="h-6 w-6 text-[var(--supabase-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Chat with your twin</h3>
                    <p className="text-gray-400">Get assistance or send commands to your digital twin</p>
                  </div>
                </div>
                <Link href="/dashboard/twinbot" className="py-2 px-4 bg-[var(--supabase-accent)] text-white rounded-md hover:bg-[var(--supabase-accent)]/90 transition-colors">
                  Start Chat
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

