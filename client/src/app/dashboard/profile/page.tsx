"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/sidebar"
import { getUser } from "@/lib/api"
import { User, Mail, Key, Bell, MessageSquare, ChevronDown, Settings, LogOut } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
    } else {
      setUser(currentUser)
    }
  }, [router])

  const getUserInitials = () => {
    if (!user?.name) return 'U'
    return user.name.split(' ').map(part => part[0]).join('')
  }

  const handleLogout = () => {
    // Implement logout functionality
  }

  return (
    <div className="flex h-screen bg-[var(--supabase-dark-bg)]">
      {/* Sidebar */}
      <Sidebar activePage="dashboard" />

      <div className="flex-1 overflow-auto bg-[var(--supabase-darker-bg)]">
        {/* Header */}
        <header className="bg-[var(--supabase-darker-bg)] border-b border-[var(--supabase-border)] h-16 flex items-center px-6">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Profile</h1>
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

        {/* Main Content */}
        <main className="p-6 bg-[var(--supabase-light-bg)] min-h-screen">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8 space-y-4">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div>
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="bg-[var(--supabase-inactive)] text-white text-2xl">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold text-white">{user?.name || 'User'}</h2>
                  <p className="text-gray-400">{user?.email || ''}</p>
                  
                  <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                    <Badge className="bg-[var(--supabase-accent)]/20 text-[var(--supabase-accent)] border-[var(--supabase-accent)]/20 hover:bg-[var(--supabase-accent)]/30">
                      Twin Bot User
                    </Badge>
                    <Badge className="bg-[var(--supabase-accent)]/20 text-[var(--supabase-accent)] border-[var(--supabase-accent)]/20 hover:bg-[var(--supabase-accent)]/30">
                      Premium Plan
                    </Badge>
                  </div>
                  
                  <div className="mt-4">
                    <Button 
                      className="bg-[var(--supabase-inactive)] hover:bg-[var(--supabase-border-dark)] text-white border border-[var(--supabase-border)]"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit Profile
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="grid grid-cols-4 bg-[var(--supabase-inactive)]">
                <TabsTrigger value="about" className="data-[state=active]:bg-[var(--supabase-dark-bg)] data-[state=active]:text-white">About</TabsTrigger>
                <TabsTrigger value="preferences" className="data-[state=active]:bg-[var(--supabase-dark-bg)] data-[state=active]:text-white">Preferences</TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:bg-[var(--supabase-dark-bg)] data-[state=active]:text-white">Activity</TabsTrigger>
                <TabsTrigger value="integrations" className="data-[state=active]:bg-[var(--supabase-dark-bg)] data-[state=active]:text-white">Integrations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="about" className="mt-6">
                <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white">
                  <CardHeader>
                    <CardTitle>About Me</CardTitle>
                    <CardDescription className="text-gray-400">Information about your profile and preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white">
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                        <Input
                          id="name"
                          value={user?.name || ''}
                          className="pl-10 bg-[var(--supabase-dark-bg)] border-[var(--supabase-border)] text-white"
                          disabled
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                        <Input
                          id="email"
                          type="email"
                          value={user?.email || ''}
                          className="pl-10 bg-[var(--supabase-dark-bg)] border-[var(--supabase-border)] text-white"
                          disabled
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="preferences" className="mt-6">
                <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white">
                  <CardHeader>
                    <CardTitle>Preferences</CardTitle>
                    <CardDescription className="text-gray-400">Customize how your AI twin works for you</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="current-password" className="text-white">
                        Current Password
                      </Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                        <Input
                          id="current-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 bg-[var(--supabase-dark-bg)] border-[var(--supabase-border)] text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="text-white">
                        New Password
                      </Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 bg-[var(--supabase-dark-bg)] border-[var(--supabase-border)] text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-white">
                        Confirm New Password
                      </Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 bg-[var(--supabase-dark-bg)] border-[var(--supabase-border)] text-white"
                        />
                      </div>
                    </div>

                    <Button className="w-full mt-4 bg-[var(--supabase-accent)] hover:bg-[var(--supabase-accent-hover)] text-white">
                      Update Password
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="activity" className="mt-6">
                <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white">
                  <CardHeader>
                    <CardTitle>Activity</CardTitle>
                    <CardDescription className="text-gray-400">Your recent activity with TwinBot</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* ... existing content ... */}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="integrations" className="mt-6">
                <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white">
                  <CardHeader>
                    <CardTitle>Integrations</CardTitle>
                    <CardDescription className="text-gray-400">Connect your AI twin with other services</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* ... existing content ... */}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
} 