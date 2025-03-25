"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/sidebar"
import { getUser, logout } from "@/lib/api"
import { toast } from "sonner"
import { Settings as SettingsIcon, Bell, Moon, Globe, Shield, Lock, User, MessageSquare, ChevronDown, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
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
      <Sidebar activePage="dashboard" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--supabase-darker-bg)]">
        {/* Header */}
        <header className="bg-[var(--supabase-darker-bg)] border-b border-[var(--supabase-border)] h-16 flex items-center px-6">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Settings</h1>
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
                    <SettingsIcon className="h-4 w-4 mr-2" />
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
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Bell className="mr-2 h-5 w-5 text-[var(--supabase-accent)]" />
                  Notifications
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Email Notifications</p>
                    <p className="text-sm text-gray-400">Receive emails about your account activity</p>
                  </div>
                  <Switch defaultChecked id="email-notifications" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Browser Notifications</p>
                    <p className="text-sm text-gray-400">Receive notifications in your browser</p>
                  </div>
                  <Switch id="browser-notifications" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Twin Activity Summary</p>
                    <p className="text-sm text-gray-400">Weekly summary of your digital twin's activity</p>
                  </div>
                  <Switch defaultChecked id="weekly-summary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Moon className="mr-2 h-5 w-5 text-[var(--supabase-accent)]" />
                  Appearance
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Customize how TwinBot looks for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Dark Mode</p>
                    <p className="text-sm text-gray-400">Always use dark mode</p>
                  </div>
                  <Switch defaultChecked id="dark-mode" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Compact View</p>
                    <p className="text-sm text-gray-400">Use less space between elements</p>
                  </div>
                  <Switch id="compact-view" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Globe className="mr-2 h-5 w-5 text-[var(--supabase-accent)]" />
                  Language & Region
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure language and regional settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language" className="text-white">Language</Label>
                    <select 
                      id="language" 
                      className="w-full p-2 rounded-md bg-[var(--supabase-dark-bg)] border border-[var(--supabase-border)] text-white"
                      defaultValue="en"
                    >
                      <option value="en">English (US)</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="ja">日本語</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="text-white">Time Zone</Label>
                    <select 
                      id="timezone" 
                      className="w-full p-2 rounded-md bg-[var(--supabase-dark-bg)] border border-[var(--supabase-border)] text-white"
                      defaultValue="America/New_York"
                    >
                      <option value="America/New_York">Eastern Time (US & Canada)</option>
                      <option value="America/Chicago">Central Time (US & Canada)</option>
                      <option value="America/Denver">Mountain Time (US & Canada)</option>
                      <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--supabase-lighter-bg)] border-0 shadow-md text-white">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Shield className="mr-2 h-5 w-5 text-[var(--supabase-accent)]" />
                  Privacy
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Data Collection</p>
                    <p className="text-sm text-gray-400">Allow TwinBot to learn from your activity</p>
                  </div>
                  <Switch defaultChecked id="data-collection" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Third-party Integrations</p>
                    <p className="text-sm text-gray-400">Allow TwinBot to connect with other services</p>
                  </div>
                  <Switch defaultChecked id="third-party" />
                </div>
                <div className="pt-2">
                  <Button variant="outline" className="mt-2 border-[var(--supabase-border)]">
                    Export My Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button className="bg-[var(--supabase-accent)] hover:bg-[var(--supabase-accent-hover)] text-white">
                Save Settings
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 