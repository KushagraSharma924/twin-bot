"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/sidebar"
import { getUser } from "@/lib/api"
import { User, Mail, Key } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null)
  
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

  return (
    <div className="flex h-screen bg-[#202123]">
      {/* Sidebar */}
      <Sidebar activePage="dashboard" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#343541]">
        {/* Header */}
        <header className="bg-[#343541] border-b border-gray-700 h-16 flex items-center px-6">
          <h1 className="text-xl font-bold text-white">Your Profile</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 bg-[#343541] text-white">
          <div className="max-w-3xl mx-auto">
            <Card className="bg-[#444654] border-0 shadow-md text-white mb-6">
              <CardHeader>
                <CardTitle className="text-white">Profile Information</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src="/placeholder.svg?height=96&width=96" alt="User" />
                    <AvatarFallback className="text-2xl bg-[#343541]">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1 text-center sm:text-left">
                    <h3 className="text-xl font-medium text-white">{user?.name || 'User'}</h3>
                    <p className="text-sm text-gray-400">{user?.email || ''}</p>
                    <Button variant="outline" className="mt-2">
                      Change avatar
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        id="name"
                        value={user?.name || ''}
                        className="pl-10 bg-[#343541] border-gray-700 text-white"
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
                        className="pl-10 bg-[#343541] border-gray-700 text-white"
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#444654] border-0 shadow-md text-white">
              <CardHeader>
                <CardTitle className="text-white">Security</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your password and security settings
                </CardDescription>
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
                      className="pl-10 bg-[#343541] border-gray-700 text-white"
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
                      className="pl-10 bg-[#343541] border-gray-700 text-white"
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
                      className="pl-10 bg-[#343541] border-gray-700 text-white"
                    />
                  </div>
                </div>

                <Button className="w-full mt-4 bg-[#10a37f] hover:bg-[#0e8f6f] text-white">
                  Update Password
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
} 