"use client"

import { useState, useEffect, Dispatch, SetStateAction } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getUser, logout } from "@/lib/api"
import {
  Home,
  Mail,
  Calendar,
  FileText,
  MessageSquare,
  Menu,
  Bot,
  LogOut
} from "lucide-react"

interface SidebarProps {
  activePage?: "dashboard" | "chat" | "emails" | "calendar" | "research"
  isOpen?: boolean
  setIsOpen?: Dispatch<SetStateAction<boolean>>
}

export default function Sidebar({ activePage = "chat", isOpen, setIsOpen }: SidebarProps) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null)

  // Use the passed isOpen state if provided, otherwise use local state
  const sidebarOpen = isOpen !== undefined ? isOpen : isSidebarOpen
  const setSidebarOpen = setIsOpen || setIsSidebarOpen

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
    } else {
      setUser(currentUser)
    }
  }, [router])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const getUserInitials = () => {
    if (!user?.name) return 'U'
    return user.name.split(' ').map(part => part[0]).join('')
  }

  return (
    <div className={`${sidebarOpen ? "w-64" : "w-20"} bg-[#1c1c1c] border-r border-gray-800 transition-all duration-300 flex flex-col`}>
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className={`flex items-center space-x-2 ${!sidebarOpen && "justify-center w-full"}`}>
          <Bot className="h-6 w-6 text-[#3ecf8e]" />
          {sidebarOpen && <span className="font-bold text-white">TwinBot</span>}
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`text-gray-400 hover:text-white hover:bg-[#272727] p-2 rounded-md ${!sidebarOpen ? "hidden" : ""}`}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          <Link 
            href="/dashboard" 
            className={`flex items-center w-full p-2 ${activePage === "dashboard" ? "text-white bg-[#272727]" : "text-gray-300 hover:text-white hover:bg-[#272727]"} rounded-md`}
          >
            <Home className="h-5 w-5 mr-2" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link 
            href="/dashboard/twinbot" 
            className={`flex items-center w-full p-2 ${activePage === "chat" ? "text-white bg-[#272727]" : "text-gray-300 hover:text-white hover:bg-[#272727]"} rounded-md`}
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            {sidebarOpen && <span>Chat</span>}
          </Link>
          <Link 
            href="/dashboard/emails" 
            className={`flex items-center w-full p-2 ${activePage === "emails" ? "text-white bg-[#272727]" : "text-gray-300 hover:text-white hover:bg-[#272727]"} rounded-md`}
          >
            <Mail className="h-5 w-5 mr-2" />
            {sidebarOpen && <span>Emails</span>}
          </Link>
          <Link 
            href="/dashboard/calendar" 
            className={`flex items-center w-full p-2 ${activePage === "calendar" ? "text-white bg-[#272727]" : "text-gray-300 hover:text-white hover:bg-[#272727]"} rounded-md`}
          >
            <Calendar className="h-5 w-5 mr-2" />
            {sidebarOpen && <span>Calendar</span>}
          </Link>
          <Link 
            href="/dashboard/research" 
            className={`flex items-center w-full p-2 ${activePage === "research" ? "text-white bg-[#272727]" : "text-gray-300 hover:text-white hover:bg-[#272727]"} rounded-md`}
          >
            <FileText className="h-5 w-5 mr-2" />
            {sidebarOpen && <span>Research</span>}
          </Link>
        </nav>
      </div>
      <div className="p-4 border-t border-gray-800">
        <div className={`flex ${sidebarOpen ? "items-center" : "justify-center"}`}>
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
            <AvatarFallback className="bg-[#272727] text-white">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          {sidebarOpen && (
            <div className="ml-2 flex-1">
              <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-400">{user?.email || ''}</p>
            </div>
          )}
        </div>
        {sidebarOpen && (
          <button 
            onClick={handleLogout}
            className="mt-4 flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#272727] rounded-md"
          >
            <LogOut className="h-5 w-5 mr-2" />
            <span>Logout</span>
          </button>
        )}
      </div>
    </div>
  )
} 