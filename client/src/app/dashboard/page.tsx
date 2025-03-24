"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Sidebar from "@/components/sidebar"
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
  Bot
} from "lucide-react"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("emails")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-[#202123]">
      {/* Sidebar */}
      <Sidebar activePage="dashboard" />

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
              <Input placeholder="Ask your digital twin anything..." className="pl-8 bg-[#40414f] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#10a37f] focus:ring-[#10a37f]" />
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
            <p className="text-gray-400">Your digital twin has been learning from your habits</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-[#444654] border-0 shadow-md text-white">
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
                  <div className="bg-[#10a37f]/20 p-3 rounded-full">
                    <Mail className="h-6 w-6 text-[#10a37f]" />
                  </div>
                </Link>
              </CardContent>
            </Card>
            <Card className="bg-[#444654] border-0 shadow-md text-white">
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
                  <div className="bg-[#10a37f]/20 p-3 rounded-full">
                    <Calendar className="h-6 w-6 text-[#10a37f]" />
                  </div>
                </Link>
              </CardContent>
            </Card>
            <Card className="bg-[#444654] border-0 shadow-md text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">Research</CardTitle>
                <CardDescription className="text-gray-400">Your AI twin has filtered content for you</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/research" className="flex items-center justify-between hover:opacity-80 transition-opacity">
                  <div>
                    <p className="text-3xl font-bold text-white">12</p>
                    <p className="text-sm text-gray-400">Research items found</p>
                  </div>
                  <div className="bg-[#10a37f]/20 p-3 rounded-full">
                    <FileText className="h-6 w-6 text-[#10a37f]" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-white">Learning Progress</h2>
            <Card className="bg-[#444654] border-0 shadow-md text-white">
              <CardContent className="p-6">
                <div className="flex items-center space-x-6 mb-6">
                  <div className="bg-[#10a37f]/20 p-3 rounded-full">
                    <Brain className="h-8 w-8 text-[#10a37f]" />
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
                      <div className="bg-[#10a37f] h-full" style={{ width: "76%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Calendar Preferences</span>
                      <span className="text-sm text-gray-300">64%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="bg-[#10a37f] h-full" style={{ width: "64%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">Research Interests</span>
                      <span className="text-sm text-gray-300">82%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="bg-[#10a37f] h-full" style={{ width: "82%" }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="emails" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 bg-[#444654]">
              <Link href="/dashboard" className="w-full">
                <TabsTrigger value="emails" className="w-full data-[state=active]:bg-[#343541] data-[state=active]:text-white text-gray-400">Emails</TabsTrigger>
              </Link>
              <Link href="/dashboard" className="w-full">
                <TabsTrigger value="meetings" className="w-full data-[state=active]:bg-[#343541] data-[state=active]:text-white text-gray-400">Calendar</TabsTrigger>
              </Link>
              <Link href="/dashboard" className="w-full">
                <TabsTrigger value="research" className="w-full data-[state=active]:bg-[#343541] data-[state=active]:text-white text-gray-400">Research</TabsTrigger>
              </Link>
            </TabsList>
            <TabsContent value="emails" className="mt-6">
              <Card className="bg-[#444654] border-0 shadow-md text-white">
                <CardHeader>
                  <CardTitle className="text-white">Recent Emails</CardTitle>
                  <CardDescription className="text-gray-400">Your digital twin has analyzed and processed these emails</CardDescription>
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
                              <p className="font-medium text-white">Project Discussion</p>
                              <Badge variant="outline" className="border-gray-700 text-gray-400">Auto-processed</Badge>
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
              <Card className="bg-[#444654] border-0 shadow-md text-white">
                <CardHeader>
                  <CardTitle className="text-white">Calendar Events</CardTitle>
                  <CardDescription className="text-gray-400">Your digital twin has organized your calendar</CardDescription>
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
                              <p className="font-medium text-white">Team Sync</p>
                              <Badge variant="outline" className="border-gray-700 text-gray-400">AI-added</Badge>
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
              <Card className="bg-[#444654] border-0 shadow-md text-white">
                <CardHeader>
                  <CardTitle className="text-white">Personalized Research</CardTitle>
                  <CardDescription className="text-gray-400">Content curated by your digital twin based on your interests</CardDescription>
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
                              <p className="font-medium text-white">AI in Productivity</p>
                              <Badge variant="outline" className="border-gray-700 text-gray-400">High relevance</Badge>
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

