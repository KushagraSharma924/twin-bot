"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Sidebar from "@/components/sidebar"
import { getUser, logout } from "@/lib/api"
import { toast } from "sonner"
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  Star,
  Archive,
  Trash2,
  Send,
  Clock,
  Tag,
  ChevronRight,
  Plus,
  Mail,
  User,
  Settings,
  LogOut,
  MessageSquare
} from "lucide-react"

export default function EmailsPage() {
  const router = useRouter()
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

  return (
    <div className="flex h-screen bg-[var(--supabase-dark-bg)]">
      {/* Sidebar */}
      <Sidebar activePage="emails" />

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
              <Input placeholder="Search emails..." className="pl-8 bg-[var(--supabase-dark-bg)] border-[var(--supabase-border)] text-white placeholder:text-gray-500 focus:border-[var(--supabase-accent)] focus:ring-[var(--supabase-accent)]" />
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
        <div className="flex-1 flex overflow-hidden">
          {/* Email Folders Sidebar */}
          <div className="w-64 border-r border-[var(--supabase-border)] bg-[var(--supabase-dark-bg)] flex flex-col">
            <div className="p-4">
              <Link href="#" className="w-full flex items-center justify-center p-3 bg-[var(--supabase-accent)] text-white rounded-md hover:bg-[var(--supabase-accent-hover)]">
                <Plus className="h-5 w-5 mr-2" />
                <span>Compose</span>
              </Link>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                <Link href="#" className="flex items-center justify-between w-full p-2 rounded-md bg-[var(--supabase-inactive)] text-white">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-3" />
                    <span>Inbox</span>
                  </div>
                  <Badge className="bg-[var(--supabase-accent)] text-white">24</Badge>
                </Link>
                <Link href="#" className="flex items-center justify-between w-full p-2 rounded-md text-gray-400 hover:bg-[var(--supabase-inactive)] hover:text-white">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 mr-3" />
                    <span>Starred</span>
                  </div>
                  <Badge className="bg-[var(--supabase-border)] text-gray-300">5</Badge>
                </Link>
                <Link href="#" className="flex items-center justify-between w-full p-2 rounded-md text-gray-400 hover:bg-[var(--supabase-inactive)] hover:text-white">
                  <div className="flex items-center">
                    <Send className="h-4 w-4 mr-3" />
                    <span>Sent</span>
                  </div>
                </Link>
                <Link href="#" className="flex items-center justify-between w-full p-2 rounded-md text-gray-400 hover:bg-[var(--supabase-inactive)] hover:text-white">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-3" />
                    <span>Scheduled</span>
                  </div>
                  <Badge className="bg-[var(--supabase-border)] text-gray-300">2</Badge>
                </Link>
                <Link href="#" className="flex items-center justify-between w-full p-2 rounded-md text-gray-400 hover:bg-[var(--supabase-inactive)] hover:text-white">
                  <div className="flex items-center">
                    <Archive className="h-4 w-4 mr-3" />
                    <span>Archive</span>
                  </div>
                </Link>
                <Link href="#" className="flex items-center justify-between w-full p-2 rounded-md text-gray-400 hover:bg-[var(--supabase-inactive)] hover:text-white">
                  <div className="flex items-center">
                    <Trash2 className="h-4 w-4 mr-3" />
                    <span>Trash</span>
                  </div>
                </Link>
              </div>
              <div className="p-4 border-t border-[var(--supabase-border)] mt-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Labels</h3>
                <div className="space-y-1">
                  <Link href="#" className="flex items-center w-full p-2 rounded-md text-gray-400 hover:bg-[var(--supabase-inactive)] hover:text-white">
                    <Tag className="h-4 w-4 mr-3 text-blue-400" />
                    <span>Work</span>
                  </Link>
                  <Link href="#" className="flex items-center w-full p-2 rounded-md text-gray-400 hover:bg-[var(--supabase-inactive)] hover:text-white">
                    <Tag className="h-4 w-4 mr-3 text-green-400" />
                    <span>Personal</span>
                  </Link>
                  <Link href="#" className="flex items-center w-full p-2 rounded-md text-gray-400 hover:bg-[var(--supabase-inactive)] hover:text-white">
                    <Tag className="h-4 w-4 mr-3 text-purple-400" />
                    <span>Important</span>
                  </Link>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Email List and Content */}
          <div className="flex-1 flex flex-col bg-[var(--supabase-light-bg)]">
            {/* Email Categories */}
            <div className="bg-[var(--supabase-darker-bg)] border-b border-[var(--supabase-border)]">
              <Tabs defaultValue="primary" className="w-full">
                <TabsList className="w-full flex bg-[var(--supabase-darker-bg)]">
                  <TabsTrigger value="primary" className="flex-1 data-[state=active]:bg-[var(--supabase-inactive)] data-[state=active]:text-white text-gray-400 rounded-none">
                    Primary
                  </TabsTrigger>
                  <TabsTrigger value="social" className="flex-1 data-[state=active]:bg-[var(--supabase-inactive)] data-[state=active]:text-white text-gray-400 rounded-none">
                    Social
                  </TabsTrigger>
                  <TabsTrigger value="promotions" className="flex-1 data-[state=active]:bg-[var(--supabase-inactive)] data-[state=active]:text-white text-gray-400 rounded-none">
                    Promotions
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Email List */}
            <ScrollArea className="flex-1">
              <div className="space-y-0.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div 
                    key={i} 
                    className={`p-4 hover:bg-[var(--supabase-lighter-bg)] cursor-pointer ${i === 1 ? 'bg-[var(--supabase-lighter-bg)]' : 'bg-[var(--supabase-light-bg)]'} border-b border-[var(--supabase-border)]`}
                  >
                    <div className="flex items-start">
                      <Avatar className="h-10 w-10 mr-3 mt-1">
                        <AvatarImage src={`/placeholder.svg?height=40&width=40&text=${i}`} alt="Sender" />
                        <AvatarFallback className="bg-[var(--supabase-accent)]/20 text-[var(--supabase-accent)]">S{i}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-white truncate">
                            {i % 3 === 0 ? 'Project Update' : i % 3 === 1 ? 'Meeting Invitation' : 'Monthly Newsletter'}
                          </p>
                          <p className="text-xs text-gray-400 whitespace-nowrap">
                            {i === 1 ? 'Just now' : i === 2 ? '10m ago' : i === 3 ? '2h ago' : `${i - 3}d ago`}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-gray-300 truncate mb-1">
                          {i % 3 === 0 ? 'Team Collaboration' : i % 3 === 1 ? 'Product Planning' : 'Company Updates'}
                        </p>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {i % 3 === 0 
                            ? 'I wanted to share the latest updates on our project. We have completed the initial phase...' 
                            : i % 3 === 1 
                            ? 'You are invited to join our upcoming meeting to discuss the roadmap for Q4...' 
                            : 'Check out our monthly newsletter with updates on company events, achievements...'}
                        </p>
                        {i === 1 && (
                          <div className="mt-2 flex gap-2">
                            <Badge className="bg-[var(--supabase-accent)]/20 text-[var(--supabase-accent)]">AI-suggested reply</Badge>
                            <Badge className="bg-orange-500/20 text-orange-500">Urgent</Badge>
                          </div>
                        )}
                      </div>
                      <div className="ml-2 flex flex-col items-center gap-2">
                        <button className="text-gray-400 hover:text-yellow-400">
                          <Star className="h-4 w-4" />
                        </button>
                        <button className="text-gray-400 hover:text-[var(--supabase-accent)]">
                          <Archive className="h-4 w-4" />
                        </button>
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