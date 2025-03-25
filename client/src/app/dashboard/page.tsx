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
import { getUser, logout } from "@/lib/api"
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
  LogOut
} from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("emails")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
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

  const getFirstName = () => {
    if (!user?.name) return 'User'
    // Split by space and get the first part (first name)
    return user.name.split(' ')[0]
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
                    <p className="text-3xl font-bold text-white">15</p>
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
                    <p className="text-3xl font-bold text-white">5</p>
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
                      <span className="text-sm text-gray-300">76%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="bg-[var(--supabase-accent)] h-full" style={{ width: "76%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Calendar Preferences</span>
                      <span className="text-sm text-gray-300">64%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="bg-[var(--supabase-accent)] h-full" style={{ width: "64%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Research Interests</span>
                      <span className="text-sm text-gray-300">82%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="bg-[var(--supabase-accent)] h-full" style={{ width: "82%" }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="emails" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 bg-[var(--supabase-lighter-bg)]">
              <Link href="/dashboard" className="w-full">
                <TabsTrigger value="emails" className="w-full data-[state=active]:bg-[var(--supabase-dark-bg)] data-[state=active]:text-white text-gray-400">Emails</TabsTrigger>
              </Link>
              <Link href="/dashboard" className="w-full">
                <TabsTrigger value="meetings" className="w-full data-[state=active]:bg-[var(--supabase-dark-bg)] data-[state=active]:text-white text-gray-400">Calendar</TabsTrigger>
              </Link>
              <Link href="/dashboard" className="w-full">
                <TabsTrigger value="research" className="w-full data-[state=active]:bg-[var(--supabase-dark-bg)] data-[state=active]:text-white text-gray-400">Research</TabsTrigger>
              </Link>
            </TabsList>
            <TabsContent value="emails" className="mt-6">
              <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white">
                <CardHeader>
                  <CardTitle className="text-white">Recent Emails</CardTitle>
                  <CardDescription className="text-gray-400">Your digital twin has analyzed and processed these emails</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Link href="/dashboard/emails" key={i} className="block">
                        <div className="flex items-start p-3 border border-[var(--supabase-border)] rounded-lg bg-[var(--supabase-dark-bg)] hover:bg-[var(--supabase-inactive)] transition-colors">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarImage src={`/placeholder.svg?height=40&width=40&text=${i}`} alt="Sender" />
                            <AvatarFallback className="bg-[var(--supabase-accent)]/20 text-[var(--supabase-accent)]">U{i}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-white">Project Discussion</p>
                              <Badge variant="outline" className="border-[var(--supabase-border)] text-gray-400">Auto-processed</Badge>
                            </div>
                            <p className="text-sm text-gray-400 mb-1">From: colleague{i}@example.com</p>
                            <p className="text-sm text-gray-300">AI drafted a response matching your writing style.</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="meetings" className="mt-6">
              <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white">
                <CardHeader>
                  <CardTitle className="text-white">Calendar Events</CardTitle>
                  <CardDescription className="text-gray-400">Your digital twin has organized your calendar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Link href="/dashboard/calendar" key={i} className="block">
                        <div className="flex items-start p-3 border border-[var(--supabase-border)] rounded-lg bg-[var(--supabase-dark-bg)] hover:bg-[var(--supabase-inactive)] transition-colors">
                          <div className="bg-[var(--supabase-accent)]/20 p-2 rounded-full mr-3">
                            <Calendar className="h-6 w-6 text-[var(--supabase-accent)]" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-white">Team Sync</p>
                              <Badge variant="outline" className="border-[var(--supabase-border)] text-gray-400">AI-added</Badge>
                            </div>
                            <p className="text-sm text-gray-400 mb-1">11:00 AM - 12:00 PM</p>
                            <p className="text-sm text-gray-300">AI scheduled based on your availability patterns.</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="research" className="mt-6">
              <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white">
                <CardHeader>
                  <CardTitle className="text-white">Personalized Research</CardTitle>
                  <CardDescription className="text-gray-400">Content curated by your digital twin based on your interests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Link href="/dashboard/research" key={i} className="block">
                        <div className="flex items-start p-3 border border-[var(--supabase-border)] rounded-lg bg-[var(--supabase-dark-bg)] hover:bg-[var(--supabase-inactive)] transition-colors">
                          <div className="bg-[var(--supabase-accent)]/20 p-2 rounded-full mr-3">
                            <FileText className="h-6 w-6 text-[var(--supabase-accent)]" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-white">AI in Productivity</p>
                              <Badge variant="outline" className="border-[var(--supabase-border)] text-gray-400">High relevance</Badge>
                            </div>
                            <p className="text-sm text-gray-400 mb-1">Source: Tech Journal</p>
                            <p className="text-sm text-gray-300">AI identified this article based on your reading habits.</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}

