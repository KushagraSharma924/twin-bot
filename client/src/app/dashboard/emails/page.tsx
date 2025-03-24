"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Star,
  Archive,
  Trash2,
  Send,
  Clock,
  Tag,
  ChevronRight,
  Plus,
  Zap,
} from "lucide-react"

export default function EmailsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

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
            <Link href="/dashboard" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
              <Home className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>Dashboard</span>}
            </Link>
            <Link href="/dashboard/twinbot" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
              <MessageSquare className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>TwinBot Chat</span>}
            </Link>
            <Link href="/dashboard/emails" className="flex items-center w-full p-2 text-white bg-[#343541] hover:bg-[#444654] rounded-md">
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
              <Input placeholder="Search emails..." className="pl-8 bg-[#40414f] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#10a37f] focus:ring-[#10a37f]" />
            </div>
          </div>
          <div className="flex items-center space-x-4">
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
          {/* Email Folders Sidebar */}
          <div className="w-64 border-r border-gray-700 bg-[#202123] flex flex-col">
            <div className="p-4">
              <Link href="#" className="w-full flex items-center justify-center p-3 bg-[#10a37f] text-white rounded-md hover:bg-[#0e8f6f]">
                <Plus className="h-5 w-5 mr-2" />
                <span>Compose</span>
              </Link>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                <Link href="#" className="flex items-center justify-between w-full p-2 rounded-md bg-[#343541] text-white">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-3" />
                    <span>Inbox</span>
                  </div>
                  <Badge className="bg-[#10a37f] text-white">24</Badge>
                </Link>
                <Link href="#" className="flex items-center justify-between w-full p-2 rounded-md text-gray-400 hover:bg-[#343541] hover:text-white">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 mr-3" />
                    <span>Starred</span>
                  </div>
                  <Badge className="bg-gray-700 text-gray-300">5</Badge>
                </Link>
                <Link href="#" className="flex items-center justify-between w-full p-2 rounded-md text-gray-400 hover:bg-[#343541] hover:text-white">
                  <div className="flex items-center">
                    <Send className="h-4 w-4 mr-3" />
                    <span>Sent</span>
                  </div>
                </Link>
                <Link href="#" className="flex items-center justify-between w-full p-2 rounded-md text-gray-400 hover:bg-[#343541] hover:text-white">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-3" />
                    <span>Scheduled</span>
                  </div>
                  <Badge className="bg-gray-700 text-gray-300">2</Badge>
                </Link>
                <Link href="#" className="flex items-center justify-between w-full p-2 rounded-md text-gray-400 hover:bg-[#343541] hover:text-white">
                  <div className="flex items-center">
                    <Archive className="h-4 w-4 mr-3" />
                    <span>Archive</span>
                  </div>
                </Link>
                <Link href="#" className="flex items-center justify-between w-full p-2 rounded-md text-gray-400 hover:bg-[#343541] hover:text-white">
                  <div className="flex items-center">
                    <Trash2 className="h-4 w-4 mr-3" />
                    <span>Trash</span>
                  </div>
                </Link>
              </div>
              <div className="p-4 border-t border-gray-700 mt-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Labels</h3>
                <div className="space-y-1">
                  <Link href="#" className="flex items-center w-full p-2 rounded-md text-gray-400 hover:bg-[#343541] hover:text-white">
                    <Tag className="h-4 w-4 mr-3 text-blue-400" />
                    <span>Work</span>
                  </Link>
                  <Link href="#" className="flex items-center w-full p-2 rounded-md text-gray-400 hover:bg-[#343541] hover:text-white">
                    <Tag className="h-4 w-4 mr-3 text-green-400" />
                    <span>Personal</span>
                  </Link>
                  <Link href="#" className="flex items-center w-full p-2 rounded-md text-gray-400 hover:bg-[#343541] hover:text-white">
                    <Tag className="h-4 w-4 mr-3 text-purple-400" />
                    <span>Important</span>
                  </Link>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Email List and Content */}
          <div className="flex-1 flex flex-col">
            {/* Email Categories */}
            <div className="bg-[#343541] border-b border-gray-700">
              <Tabs defaultValue="primary" className="w-full">
                <TabsList className="w-full flex bg-[#343541]">
                  <TabsTrigger value="primary" className="flex-1 data-[state=active]:bg-[#444654] data-[state=active]:text-white text-gray-400 rounded-none">
                    Primary
                  </TabsTrigger>
                  <TabsTrigger value="social" className="flex-1 data-[state=active]:bg-[#444654] data-[state=active]:text-white text-gray-400 rounded-none">
                    Social
                  </TabsTrigger>
                  <TabsTrigger value="promotions" className="flex-1 data-[state=active]:bg-[#444654] data-[state=active]:text-white text-gray-400 rounded-none">
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
                    className={`p-4 hover:bg-[#444654] cursor-pointer ${i === 1 ? 'bg-[#444654]' : 'bg-[#343541]'} border-b border-gray-700`}
                  >
                    <div className="flex items-start">
                      <Avatar className="h-10 w-10 mr-3 mt-1">
                        <AvatarImage src={`/placeholder.svg?height=40&width=40&text=${i}`} alt="Sender" />
                        <AvatarFallback className="bg-[#10a37f]/20 text-[#10a37f]">S{i}</AvatarFallback>
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
                            <Badge className="bg-[#10a37f]/20 text-[#10a37f] border-[#10a37f]/30">AI-Draft Available</Badge>
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">High Priority</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Selected Email Preview - Optional */}
            <div className="hidden md:block h-1/2 border-t border-gray-700 bg-[#444654] p-6 overflow-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src="/placeholder.svg?height=40&width=40&text=1" alt="Sender" />
                    <AvatarFallback className="bg-[#10a37f]/20 text-[#10a37f]">S1</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-white font-medium">Project Update</h3>
                    <p className="text-sm text-gray-400">from: sarah@example.com</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400">Just now</span>
                  <button className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#343541]">
                    <Archive className="h-4 w-4" />
                  </button>
                  <button className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#343541]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-white space-y-4">
                <p className="text-lg font-medium">Team Collaboration</p>
                <div className="text-gray-300 space-y-3">
                  <p>Hi John,</p>
                  <p>I wanted to share the latest updates on our project. We have completed the initial phase and I'm excited to show you the results.</p>
                  <p>Here are the key highlights:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Frontend development completed ahead of schedule</li>
                    <li>API integration with the backend services</li>
                    <li>Initial user testing feedback incorporated</li>
                  </ul>
                  <p>Let's schedule a meeting to discuss the next steps. I've suggested some times below, or you can let TwinBot suggest a time that works for both of us.</p>
                  <p>Best regards,<br />Sarah</p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <p className="text-sm text-[#10a37f] mb-2 font-medium">TwinBot suggests:</p>
                  <div className="bg-[#10a37f]/10 rounded-md p-3 border border-[#10a37f]/20">
                    <p className="text-gray-300 mb-2">Based on your calendar, you could meet with Sarah on:</p>
                    <div className="space-y-2">
                      <button className="w-full text-left p-2 bg-[#10a37f]/20 hover:bg-[#10a37f]/30 text-white rounded">Tomorrow at 10:00 AM</button>
                      <button className="w-full text-left p-2 bg-[#10a37f]/20 hover:bg-[#10a37f]/30 text-white rounded">Wednesday at 2:30 PM</button>
                    </div>
                    <div className="flex justify-end mt-2">
                      <button className="text-[#10a37f] hover:text-white hover:bg-[#10a37f] text-sm px-3 py-1 rounded">
                        Let TwinBot schedule
                      </button>
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <div className="flex">
                    <Input 
                      placeholder="Reply to this email..." 
                      className="bg-[#343541] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#10a37f] focus:ring-[#10a37f]"
                    />
                    <button className="ml-2 bg-[#10a37f] text-white px-4 rounded-md hover:bg-[#0e8f6f] flex items-center">
                      <Send className="h-4 w-4 mr-1" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 