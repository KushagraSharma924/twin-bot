"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/sidebar"
import { getUser } from "@/lib/api"
import { Settings as SettingsIcon, Bell, Moon, Globe, Shield, Lock } from "lucide-react"

export default function SettingsPage() {
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

  return (
    <div className="flex h-screen bg-[#202123]">
      {/* Sidebar */}
      <Sidebar activePage="dashboard" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#343541]">
        {/* Header */}
        <header className="bg-[#343541] border-b border-gray-700 h-16 flex items-center px-6">
          <h1 className="text-xl font-bold text-white">Settings</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 bg-[#343541] text-white">
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="bg-[#444654] border-0 shadow-md text-white">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Bell className="mr-2 h-5 w-5 text-[#10a37f]" />
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

            <Card className="bg-[#444654] border-0 shadow-md text-white">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Moon className="mr-2 h-5 w-5 text-[#10a37f]" />
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

            <Card className="bg-[#444654] border-0 shadow-md text-white">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Globe className="mr-2 h-5 w-5 text-[#10a37f]" />
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
                      className="w-full p-2 rounded-md bg-[#343541] border border-gray-700 text-white"
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
                      className="w-full p-2 rounded-md bg-[#343541] border border-gray-700 text-white"
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

            <Card className="bg-[#444654] border-0 shadow-md text-white">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Shield className="mr-2 h-5 w-5 text-[#10a37f]" />
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
                  <Button variant="outline" className="mt-2">
                    Export My Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button className="bg-[#10a37f] hover:bg-[#0e8f6f] text-white">
                Save Settings
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 