"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
  Zap,
} from "lucide-react"

export default function DashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("emails")

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
            <Link href="/dashboard" className="flex items-center w-full p-2 text-white bg-[#343541] hover:bg-[#444654] rounded-md">
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
            <Link href="/dashboard/calendar" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
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
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input placeholder="Search..." className="pl-8 bg-[#40414f] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#10a37f] focus:ring-[#10a37f]" />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative text-gray-300 hover:text-white hover:bg-[#444654] p-2 rounded-md">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-[#10a37f] rounded-full"></span>
            </button>
            <Link href="/dashboard/twinbot" className="text-gray-300 hover:text-white hover:bg-[#444654] p-2 rounded-md block">
              <MessageSquare className="h-5 w-5" />
            </Link>
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
        <main className="flex-1 overflow-auto p-6 bg-[#343541] text-white">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-white">Welcome back, John</h1>
            <p className="text-gray-400">Here's what your TwinBot has been working on</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-[#444654] border-0 shadow-md text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">Email Activity</CardTitle>
                <CardDescription className="text-gray-400">Your TwinBot handled 12 emails today</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/emails" className="flex items-center justify-between hover:opacity-80 transition-opacity">
                  <div>
                    <p className="text-3xl font-bold text-white">12</p>
                    <p className="text-sm text-gray-400">Emails processed</p>
                  </div>
                  <div className="bg-[#10a37f]/20 p-3 rounded-full">
                    <Mail className="h-6 w-6 text-[#10a37f]" />
                  </div>
                </Link>
              </CardContent>
            </Card>
            <Card className="bg-[#444654] border-0 shadow-md text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">Meetings Scheduled</CardTitle>
                <CardDescription className="text-gray-400">Your TwinBot scheduled 3 meetings</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/calendar" className="flex items-center justify-between hover:opacity-80 transition-opacity">
                  <div>
                    <p className="text-3xl font-bold text-white">3</p>
                    <p className="text-sm text-gray-400">Meetings arranged</p>
                  </div>
                  <div className="bg-[#10a37f]/20 p-3 rounded-full">
                    <Calendar className="h-6 w-6 text-[#10a37f]" />
                  </div>
                </Link>
              </CardContent>
            </Card>
            <Card className="bg-[#444654] border-0 shadow-md text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">Research Insights</CardTitle>
                <CardDescription className="text-gray-400">Your TwinBot found 8 relevant articles</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/research" className="flex items-center justify-between hover:opacity-80 transition-opacity">
                  <div>
                    <p className="text-3xl font-bold text-white">8</p>
                    <p className="text-sm text-gray-400">Research items</p>
                  </div>
                  <div className="bg-[#10a37f]/20 p-3 rounded-full">
                    <FileText className="h-6 w-6 text-[#10a37f]" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="emails" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 bg-[#444654]">
              <Link href="/dashboard/emails" className="w-full">
                <TabsTrigger value="emails" className="w-full data-[state=active]:bg-[#343541] data-[state=active]:text-white text-gray-400">Emails</TabsTrigger>
              </Link>
              <Link href="/dashboard/calendar" className="w-full">
                <TabsTrigger value="meetings" className="w-full data-[state=active]:bg-[#343541] data-[state=active]:text-white text-gray-400">Meetings</TabsTrigger>
              </Link>
              <Link href="/dashboard/research" className="w-full">
                <TabsTrigger value="research" className="w-full data-[state=active]:bg-[#343541] data-[state=active]:text-white text-gray-400">Research</TabsTrigger>
              </Link>
            </TabsList>
            <TabsContent value="emails" className="mt-6">
              <Card className="bg-[#444654] border-0 shadow-md text-white">
                <CardHeader>
                  <CardTitle className="text-white">Recent Email Activity</CardTitle>
                  <CardDescription className="text-gray-400">Your TwinBot has handled these emails</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Link href="/dashboard/emails" key={i} className="block">
                        <div className="flex items-start p-3 border border-gray-700 rounded-lg bg-[#343541] hover:bg-[#444654] transition-colors">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarImage src={`/placeholder.svg?height=40&width=40&text=${i}`} alt="Sender" />
                            <AvatarFallback className="bg-[#10a37f]/20 text-[#10a37f]">U{i}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-white">Meeting Proposal</p>
                              <Badge variant="outline" className="border-gray-700 text-gray-400">Auto-replied</Badge>
                            </div>
                            <p className="text-sm text-gray-400 mb-1">From: user{i}@example.com</p>
                            <p className="text-sm text-gray-300">TwinBot drafted a response to schedule a meeting next week.</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="meetings" className="mt-6">
              <Card className="bg-[#444654] border-0 shadow-md text-white">
                <CardHeader>
                  <CardTitle className="text-white">Upcoming Meetings</CardTitle>
                  <CardDescription className="text-gray-400">Meetings scheduled by your TwinBot</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Link href="/dashboard/calendar" key={i} className="block">
                        <div className="flex items-start p-3 border border-gray-700 rounded-lg bg-[#343541] hover:bg-[#444654] transition-colors">
                          <div className="bg-[#10a37f]/20 p-2 rounded-full mr-3">
                            <Calendar className="h-6 w-6 text-[#10a37f]" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-white">Project Review</p>
                              <Badge variant="outline" className="border-gray-700 text-gray-400">Tomorrow</Badge>
                            </div>
                            <p className="text-sm text-gray-400 mb-1">10:00 AM - 11:00 AM</p>
                            <p className="text-sm text-gray-300">With: Alex Johnson, Sarah Williams</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="research" className="mt-6">
              <Card className="bg-[#444654] border-0 shadow-md text-white">
                <CardHeader>
                  <CardTitle className="text-white">Research Findings</CardTitle>
                  <CardDescription className="text-gray-400">Articles and insights curated by your TwinBot</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Link href="/dashboard/research" key={i} className="block">
                        <div className="flex items-start p-3 border border-gray-700 rounded-lg bg-[#343541] hover:bg-[#444654] transition-colors">
                          <div className="bg-[#10a37f]/20 p-2 rounded-full mr-3">
                            <FileText className="h-6 w-6 text-[#10a37f]" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-white">AI Productivity Trends</p>
                              <Badge variant="outline" className="border-gray-700 text-gray-400">New</Badge>
                            </div>
                            <p className="text-sm text-gray-400 mb-1">Source: Tech Journal</p>
                            <p className="text-sm text-gray-300">Latest research on how AI is transforming workplace productivity.</p>
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

