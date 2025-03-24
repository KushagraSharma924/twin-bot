"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Home,
  Mail,
  Calendar,
  FileText,
  MessageSquare,
  Menu,
  Bot
} from "lucide-react"

interface SidebarProps {
  activePage: "dashboard" | "chat" | "emails" | "calendar" | "research"
}

export default function Sidebar({ activePage }: SidebarProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className={`${isSidebarOpen ? "w-64" : "w-20"} bg-[#202123] border-r border-gray-700 transition-all duration-300 flex flex-col`}>
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className={`flex items-center space-x-2 ${!isSidebarOpen && "justify-center w-full"}`}>
          <Bot className="h-6 w-6 text-[#10a37f]" />
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
          <Link 
            href="/dashboard" 
            className={`flex items-center w-full p-2 ${activePage === "dashboard" ? "text-white bg-[#343541]" : "text-gray-300 hover:text-white hover:bg-[#343541]"} rounded-md`}
          >
            <Home className="h-5 w-5 mr-2" />
            {isSidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link 
            href="/dashboard/twinbot" 
            className={`flex items-center w-full p-2 ${activePage === "chat" ? "text-white bg-[#343541]" : "text-gray-300 hover:text-white hover:bg-[#343541]"} rounded-md`}
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            {isSidebarOpen && <span>Chat</span>}
          </Link>
          <Link 
            href="/dashboard/emails" 
            className={`flex items-center w-full p-2 ${activePage === "emails" ? "text-white bg-[#343541]" : "text-gray-300 hover:text-white hover:bg-[#343541]"} rounded-md`}
          >
            <Mail className="h-5 w-5 mr-2" />
            {isSidebarOpen && <span>Emails</span>}
          </Link>
          <Link 
            href="/dashboard/calendar" 
            className={`flex items-center w-full p-2 ${activePage === "calendar" ? "text-white bg-[#343541]" : "text-gray-300 hover:text-white hover:bg-[#343541]"} rounded-md`}
          >
            <Calendar className="h-5 w-5 mr-2" />
            {isSidebarOpen && <span>Calendar</span>}
          </Link>
          <Link 
            href="/dashboard/research" 
            className={`flex items-center w-full p-2 ${activePage === "research" ? "text-white bg-[#343541]" : "text-gray-300 hover:text-white hover:bg-[#343541]"} rounded-md`}
          >
            <FileText className="h-5 w-5 mr-2" />
            {isSidebarOpen && <span>Research</span>}
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
  )
} 