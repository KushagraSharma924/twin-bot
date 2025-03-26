"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/sidebar"
import { getUser, logout, fetchEmails, listMailboxes, markEmailAsRead, moveEmail, Email, Mailbox } from "@/lib/api"
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
  MessageSquare,
  Loader2,
  RefreshCw,
  X,
  Reply,
  Forward,
  Paperclip,
  ArrowRight,
  Inbox,
  MailOpen
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Email category types
type EmailCategory = 'primary' | 'social' | 'promotions' | 'all';

// Helper function to categorize emails
const categorizeEmail = (email: Email): EmailCategory => {
  const { from, subject } = email;
  
  // Social media related domains
  const socialDomains = [
    'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
    'pinterest.com', 'tiktok.com', 'snapchat.com', 'youtube.com',
    'reddit.com', 'discord.com', 'slack.com'
  ];
  
  // Promotion related keywords
  const promotionKeywords = [
    'offer', 'discount', 'sale', 'deal', 'promo', 'promotion', 
    'subscribe', 'newsletter', 'marketing', 'off', '%', 'limited time',
    'special', 'exclusive'
  ];
  
  // Check if from a social domain
  if (socialDomains.some(domain => from.toLowerCase().includes(domain))) {
    return 'social';
  }
  
  // Check if promotion-related
  if (
    promotionKeywords.some(keyword => 
      subject?.toLowerCase().includes(keyword) || 
      from.toLowerCase().includes('newsletter') || 
      from.toLowerCase().includes('noreply')
    )
  ) {
    return 'promotions';
  }
  
  // Default to primary
  return 'primary';
};

// Add mailbox icons mapping
const mailboxIcons: { [key: string]: React.ReactNode } = {
  'INBOX': <Inbox className="h-4 w-4 mr-3" />,
  '[Gmail]/Sent Mail': <Send className="h-4 w-4 mr-3" />,
  '[Gmail]/Drafts': <Clock className="h-4 w-4 mr-3" />,
  '[Gmail]/All Mail': <Archive className="h-4 w-4 mr-3" />,
  '[Gmail]/Trash': <Trash2 className="h-4 w-4 mr-3" />
}

// Add mailbox display names mapping
const mailboxDisplayNames: { [key: string]: string } = {
  'INBOX': 'Inbox',
  '[Gmail]/Sent Mail': 'Sent',
  '[Gmail]/Drafts': 'Drafts',
  '[Gmail]/All Mail': 'Archive',
  '[Gmail]/Trash': 'Trash'
}

export default function EmailsPage() {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  
  // Email-related state
  const [emails, setEmails] = useState<Email[]>([])
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<EmailCategory>('all')
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [currentMailbox, setCurrentMailbox] = useState('INBOX')
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)

  // Add state for additional mailbox emails
  const [sentEmails, setSentEmails] = useState<Email[]>([])
  const [draftEmails, setDraftEmails] = useState<Email[]>([])
  const [archiveEmails, setArchiveEmails] = useState<Email[]>([])
  const [trashEmails, setTrashEmails] = useState<Email[]>([])
  
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

  // Load emails and mailboxes
  useEffect(() => {
    loadEmails()
    loadMailboxes()
  }, [])
  
  // Filter emails by category whenever emails or currentCategory changes
  useEffect(() => {
    filterEmailsByCategory(currentCategory)
  }, [emails, currentCategory])

  // Fetch emails for all mailboxes
  const loadEmails = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch emails from current mailbox
      const result = await fetchEmails({ 
        mailbox: currentMailbox,
        limit: 50
      })
      
      if (result.error) {
        setError("Failed to load emails. Please try again later.")
      } else {
        setEmails(result.emails)
      }
    } catch (err) {
      console.error("Error loading emails:", err)
      setError("Failed to load emails. Please try again later.")
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch mailboxes
  const loadMailboxes = async () => {
    try {
      const result = await listMailboxes()
      
      if (result.error) {
        console.error("Failed to load mailboxes")
      } else {
        setMailboxes(result.mailboxes)
      }
    } catch (err) {
      console.error("Error loading mailboxes:", err)
    }
  }
  
  // Filter emails by category
  const filterEmailsByCategory = (category: EmailCategory) => {
    if (emails.length === 0) {
      setFilteredEmails([])
      return
    }
    
    const filtered = emails.filter(email => categorizeEmail(email) === category)
    setFilteredEmails(filtered)
  }
  
  // Handle category change
  const handleCategoryChange = (category: EmailCategory) => {
    setCurrentCategory(category)
    setSelectedEmail(null)
  }
  
  // Refresh emails
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadEmails()
    setRefreshing(false)
  }
  
  // Switch mailbox
  const handleSwitchMailbox = async (mailbox: string) => {
    setCurrentMailbox(mailbox)
    setSelectedEmail(null)
    setLoading(true)
    
    try {
      const result = await fetchEmails({ 
        mailbox,
        limit: 50
      })
      
      if (result.error) {
        setError("Failed to load emails. Please try again later.")
      } else {
        setEmails(result.emails)
      }
    } catch (err) {
      console.error("Error loading emails:", err)
      setError("Failed to load emails. Please try again later.")
    } finally {
      setLoading(false)
    }
  }
  
  // Handle mark as read
  const handleMarkAsRead = async (email: Email) => {
    try {
      const success = await markEmailAsRead(currentMailbox, email.id)
      if (success) {
        // Update local state to reflect changes
        const updatedEmails = emails.map(e => 
          e.id === email.id 
            ? { ...e, flags: [...e.flags.filter(f => f !== '\\Unseen')] } 
            : e
        )
        setEmails(updatedEmails)
      }
    } catch (err) {
      console.error("Error marking email as read:", err)
      toast.error("Failed to mark email as read")
    }
  }
  
  // Handle moving email to another mailbox
  const handleMoveEmail = async (email: Email, targetMailbox: string) => {
    try {
      const success = await moveEmail(currentMailbox, targetMailbox, email.id)
      if (success) {
        // Remove email from current list
        const updatedEmails = emails.filter(e => e.id !== email.id)
        setEmails(updatedEmails)
        
        if (selectedEmail?.id === email.id) {
          setSelectedEmail(null)
        }
        
        toast.success(`Email moved to ${targetMailbox}`)
      }
    } catch (err) {
      console.error("Error moving email:", err)
      toast.error("Failed to move email")
    }
  }

  const handleLogout = () => {
    logout()
    toast.success("Logged out successfully")
    router.push('/login')
  }

  const getUserInitials = () => {
    if (!user?.name) return 'U'
    return user.name.split(' ').map(part => part[0]).join('')
  }
  
  // Format preview of email (text or html)
  const getEmailPreview = (email: Email) => {
    if (email.text) {
      return email.text.slice(0, 100) + (email.text.length > 100 ? '...' : '')
    } else if (email.html) {
      // Strip HTML tags for preview
      const textPreview = email.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      return textPreview.slice(0, 100) + (textPreview.length > 100 ? '...' : '')
    }
    return 'No content'
  }
  
  // Format sender name from email address
  const getSenderName = (from: string) => {
    // Extract name if available, otherwise use email address
    const nameMatch = from.match(/(.*?)\s*</)
    if (nameMatch && nameMatch[1]) {
      return nameMatch[1].trim()
    }
    
    // Extract just the email address
    const emailMatch = from.match(/<(.*?)>/)
    if (emailMatch && emailMatch[1]) {
      return emailMatch[1]
    }
    
    return from
  }
  
  // Format relative time (e.g., "2 hours ago")
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)
    
    if (diffSec < 60) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHour < 24) return `${diffHour}h ago`
    if (diffDay < 7) return `${diffDay}d ago`
    
    return date.toLocaleDateString()
  }

  // Function to open the email in a modal
  const openEmailModal = (email: Email) => {
    setSelectedEmail(email)
    setIsEmailModalOpen(true)
    
    // Mark as read if currently unread
    if (email.flags && email.flags.includes('\\Unseen')) {
      handleMarkAsRead(email)
    }
  }

  // Update useEffect to reload emails when currentMailbox changes
  useEffect(() => {
    loadEmails()
  }, [currentMailbox])

  return (
    <>
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
              <button 
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="relative text-gray-300 hover:text-white hover:bg-[var(--supabase-inactive)] p-2 rounded-md disabled:opacity-50"
              >
                {refreshing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCw className="h-5 w-5" />
                )}
              </button>
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
                  {/* Navigation */}
                  <div className="p-4">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Navigation</h3>
                    <div className="space-y-1">
                      {/* Default mailboxes */}
                      {['INBOX', '[Gmail]/Sent Mail', '[Gmail]/Drafts', '[Gmail]/All Mail', '[Gmail]/Trash'].map(mailbox => (
                        <button
                          key={mailbox}
                          onClick={() => handleSwitchMailbox(mailbox)}
                          className={`flex items-center w-full p-2 rounded-md ${
                            currentMailbox === mailbox ? 
                            'bg-[var(--supabase-inactive)] text-white' : 
                            'text-gray-400 hover:bg-[var(--supabase-inactive)] hover:text-white'
                          }`}
                        >
                          {mailboxIcons[mailbox]}
                          <span>{mailboxDisplayNames[mailbox]}</span>
                          {mailbox === 'INBOX' && (
                            <Badge className="ml-auto bg-[var(--supabase-border)] text-gray-300">
                              {emails.filter(e => e.flags.includes('\\Unseen')).length}
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Dynamic mailboxes */}
                {mailboxes.length > 0 && (
                  <div className="p-4 border-t border-[var(--supabase-border)] mt-2">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Folders</h3>
                    <div className="space-y-1">
                      {mailboxes
                        .filter(mailbox => 
                          !['INBOX', 'Sent', 'Drafts', 'Archive', 'Trash'].includes(mailbox.path) &&
                          !mailbox.path.startsWith('[Gmail]')
                        )
                        .map(mailbox => (
                          <button
                            key={mailbox.path} 
                            onClick={() => handleSwitchMailbox(mailbox.path)}
                            className={`flex items-center w-full p-2 rounded-md ${
                              currentMailbox === mailbox.path ? 
                              'bg-[var(--supabase-inactive)] text-white' : 
                              'text-gray-400 hover:bg-[var(--supabase-inactive)] hover:text-white'
                            }`}
                          >
                            <Tag className="h-4 w-4 mr-3" />
                            <span>{mailbox.name}</span>
                            {mailbox.unseen && mailbox.unseen > 0 && (
                              <Badge className="ml-auto bg-[var(--supabase-border)] text-gray-300">
                                {mailbox.unseen}
                              </Badge>
                            )}
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Email List and Content */}
            <div className="flex-1 flex flex-col bg-[var(--supabase-light-bg)]">
              {/* Email Categories */}
              <div className="bg-[var(--supabase-darker-bg)] border-b border-[var(--supabase-border)]">
                <Tabs 
                  value={currentCategory} 
                  onValueChange={(value) => handleCategoryChange(value as EmailCategory)}
                  className="w-full"
                >
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
                    <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-[var(--supabase-inactive)] data-[state=active]:text-white text-gray-400 rounded-none">
                      All
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Email List and Detail View Content */}
              <div className="flex-1 flex overflow-hidden">
                {/* Email List */}
                <div className={`${selectedEmail ? 'hidden md:flex md:w-2/5' : 'flex'} flex-col flex-1`}>
                  {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-[var(--supabase-accent)] animate-spin" />
                      <p className="ml-2 text-gray-400">Loading emails...</p>
                    </div>
                  ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <p className="text-red-400 mb-2">{error}</p>
                      <button 
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-[var(--supabase-accent)] text-white rounded-md hover:bg-[var(--supabase-accent-hover)] flex items-center"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </button>
                    </div>
                  ) : filteredEmails.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-gray-400">No emails in this category</p>
                    </div>
                  ) : (
                    <ScrollArea className="flex-1">
                      <div className="space-y-0.5">
                        {filteredEmails.map((email) => (
                          <div 
                            key={email.id} 
                            className={`p-4 hover:bg-[var(--supabase-lighter-bg)] cursor-pointer ${
                              selectedEmail?.id === email.id ? 
                              'bg-[var(--supabase-lighter-bg)]' : 
                              'bg-[var(--supabase-light-bg)]'
                            } border-b border-[var(--supabase-border)]`}
                            onClick={() => openEmailModal(email)}
                          >
                            <div className="flex items-start">
                              <Avatar className="h-10 w-10 mr-3 mt-1">
                                <AvatarImage src={`/placeholder.svg?height=40&width=40&text=${getSenderName(email.from)[0]}`} alt="Sender" />
                                <AvatarFallback className="bg-[var(--supabase-accent)]/20 text-[var(--supabase-accent)]">
                                  {getSenderName(email.from)[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className={`font-medium truncate ${email.flags && email.flags.includes('\\Unseen') ? 'text-white' : 'text-gray-300'}`}>
                                    {getSenderName(email.from)}
                                  </p>
                                  <p className="text-xs text-gray-400 whitespace-nowrap">
                                    {getRelativeTime(email.date)}
                                  </p>
                                </div>
                                <p className={`text-sm font-medium truncate mb-1 ${email.flags && email.flags.includes('\\Unseen') ? 'text-white' : 'text-gray-300'}`}>
                                  {email.subject || '(No subject)'}
                                </p>
                                <p className="text-sm text-gray-400 line-clamp-2">
                                  {getEmailPreview(email)}
                                </p>
                                {email.attachments && email.attachments.length > 0 && (
                                  <div className="mt-2 flex gap-2">
                                    <Badge className="bg-[var(--supabase-accent)]/20 text-[var(--supabase-accent)] flex items-center gap-1">
                                      <Paperclip className="h-3 w-3" />
                                      {email.attachments.length} attachment{email.attachments.length !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                              <div className="ml-2 flex flex-col items-center gap-2">
                                <button 
                                  className="text-gray-400 hover:text-yellow-400"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Add star functionality here
                                  }}
                                >
                                  <Star className="h-4 w-4" />
                                </button>
                                <button 
                                  className="text-gray-400 hover:text-[var(--supabase-accent)]"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMoveEmail(email, 'Archive')
                                  }}
                                >
                                  <Archive className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {/* Email Detail View */}
                {selectedEmail && (
                  <div className="flex-1 md:w-3/5 bg-[var(--supabase-lighter-bg)] flex flex-col">
                    {/* Email Header */}
                    <div className="p-6 border-b border-[var(--supabase-border)]">
                      <div className="flex items-center justify-between mb-4">
                        {/* Back/Close Button (mobile only) */}
                        <button 
                          className="md:hidden text-gray-400 hover:text-white p-2 -ml-2 rounded-md"
                          onClick={() => setSelectedEmail(null)}
                        >
                          <X className="h-5 w-5" />
                        </button>

                        {/* Actions */}
                        <div className="flex space-x-2 ml-auto">
                          <button 
                            className="text-gray-400 hover:text-white p-2 rounded-md"
                            onClick={() => handleMoveEmail(selectedEmail, 'Archive')}
                          >
                            <Archive className="h-5 w-5" />
                          </button>
                          <button 
                            className="text-gray-400 hover:text-white p-2 rounded-md"
                            onClick={() => handleMoveEmail(selectedEmail, 'Trash')}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Subject */}
                      <h2 className="text-xl font-semibold text-white mb-4">
                        {selectedEmail.subject || '(No subject)'}
                      </h2>

                      {/* Sender info */}
                      <div className="flex items-start">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={`/placeholder.svg?height=40&width=40&text=${getSenderName(selectedEmail.from)[0]}`} alt="Sender" />
                          <AvatarFallback className="bg-[var(--supabase-accent)]/20 text-[var(--supabase-accent)]">
                            {getSenderName(selectedEmail.from)[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center">
                            <p className="font-medium text-white">
                              {getSenderName(selectedEmail.from)}
                            </p>
                            <span className="mx-2 text-gray-500">•</span>
                            <p className="text-sm text-gray-400">
                              {new Date(selectedEmail.date).toLocaleString()}
                            </p>
                          </div>
                          <p className="text-sm text-gray-400">
                            To: {selectedEmail.to}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Email Content */}
                    <ScrollArea className="flex-1 p-6">
                      {selectedEmail.html ? (
                        <div 
                          className="prose prose-invert max-w-none" 
                          dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap text-gray-300">
                          {selectedEmail.text || 'No content'}
                        </div>
                      )}

                      {/* Attachments */}
                      {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                        <div className="mt-8 border-t border-[var(--supabase-border)] pt-4">
                          <h3 className="text-sm font-medium text-white mb-2">
                            Attachments ({selectedEmail.attachments.length})
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {selectedEmail.attachments.map((attachment, index) => (
                              <div 
                                key={index}
                                className="flex items-center p-3 bg-[var(--supabase-dark-bg)] rounded-md"
                              >
                                <div className="h-10 w-10 flex items-center justify-center bg-[var(--supabase-inactive)] rounded mr-3">
                                  <span className="text-xs text-white">{attachment.filename.split('.').pop()?.toUpperCase()}</span>
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-sm text-white truncate">{attachment.filename}</p>
                                  <p className="text-xs text-gray-400">
                                    {Math.round(attachment.size / 1024)} KB
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </ScrollArea>

                    {/* Email Actions */}
                    <div className="p-4 border-t border-[var(--supabase-border)] flex justify-end">
                      <button 
                        className="px-4 py-2 bg-[var(--supabase-accent)] text-white rounded-md hover:bg-[var(--supabase-accent-hover)] mr-2"
                      >
                        Reply
                      </button>
                      <button 
                        className="px-4 py-2 bg-[var(--supabase-dark-bg)] text-white rounded-md hover:bg-[var(--supabase-inactive)]"
                      >
                        Forward
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {selectedEmail && (
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 overflow-hidden bg-[var(--supabase-lighter-bg)] text-gray-100">
            <DialogHeader className="p-6 border-b border-[var(--supabase-border)]">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold text-white">
                  {selectedEmail?.subject || '(No subject)'}
                </DialogTitle>
                <div className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => selectedEmail && handleMoveEmail(selectedEmail, 'Archive')}
                    className="text-gray-400 hover:text-white hover:bg-[var(--supabase-inactive)]"
                  >
                    <Archive className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => selectedEmail && handleMoveEmail(selectedEmail, 'Trash')}
                    className="text-gray-400 hover:text-white hover:bg-[var(--supabase-inactive)]"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              
              {/* Sender info */}
              <div className="flex items-start mt-4">
                <Avatar className="h-12 w-12 mr-4">
                  <AvatarImage src={`/placeholder.svg?height=48&width=48&text=${selectedEmail.from ? getSenderName(selectedEmail.from)[0] : ''}`} alt="Sender" />
                  <AvatarFallback className="bg-[var(--supabase-accent)]/20 text-[var(--supabase-accent)]">
                    {selectedEmail.from ? getSenderName(selectedEmail.from)[0] : ''}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white text-lg">
                      {selectedEmail.from ? getSenderName(selectedEmail.from) : ''}
                    </p>
                    <span className="text-gray-500">•</span>
                    <p className="text-sm text-gray-400">
                      {selectedEmail.date ? new Date(selectedEmail.date).toLocaleString() : ''}
                    </p>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    To: {selectedEmail.to || ''}
                  </p>
                </div>
              </div>
            </DialogHeader>

            {/* Email Content */}
            <ScrollArea className="max-h-[50vh]">
              <div className="p-6">
                {selectedEmail.html ? (
                  <div 
                    className="prose prose-invert max-w-none" 
                    dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-gray-300">
                    {selectedEmail.text || 'No content'}
                  </div>
                )}

                {/* Attachments */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="mt-8 border-t border-[var(--supabase-border)] pt-4">
                    <h3 className="text-sm font-medium text-white mb-3 flex items-center">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Attachments ({selectedEmail.attachments.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedEmail.attachments.map((attachment, index) => (
                        <div 
                          key={index}
                          className="flex items-center p-3 bg-[var(--supabase-dark-bg)] rounded-md"
                        >
                          <div className="h-10 w-10 flex items-center justify-center bg-[var(--supabase-inactive)] rounded mr-3">
                            <span className="text-xs text-white">{attachment.filename.split('.').pop()?.toUpperCase()}</span>
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm text-white truncate">{attachment.filename}</p>
                            <p className="text-xs text-gray-400">
                              {Math.round(attachment.size / 1024)} KB
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-[var(--supabase-border)] bg-[var(--supabase-dark-bg)]">
              <div className="flex justify-end gap-2">
                <Button className="bg-[var(--supabase-accent)] hover:bg-[var(--supabase-accent-hover)]">
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </Button>
                <Button variant="outline" className="border-[var(--supabase-border)] text-white">
                  <Forward className="h-4 w-4 mr-2" />
                  Forward
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
