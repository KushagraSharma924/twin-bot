"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/sidebar"
import {
  getUser,
  logout,
  fetchEmails,
  listMailboxes,
  markEmailAsRead,
  moveEmail,
  type Email,
  type Mailbox,
  getSession,
  sendEmail,
  fetchSentEmails,
} from "@/lib/api"
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
  Inbox,
  ChevronLeft,
  File,
  Download,
  Sparkles,
  AlertCircle,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import DOMPurify from "dompurify"

// Add API_URL constant after imports
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002"

// Email category types
type EmailCategory = "primary" | "sent"

// Helper function to categorize emails
const categorizeEmail = (email: Email, currentMailboxParam: string): EmailCategory => {
  // More robust check for sent mailboxes using our helper function
  if (isSentMailbox(currentMailboxParam)) {
    return "sent";
  }
  
  // Default to primary
  return "primary";
}

// Helper function to check if a mailbox is a sent mailbox
const isSentMailbox = (mailboxPath: string): boolean => {
  return (
    mailboxPath === "[Gmail]/Sent Mail" || 
    mailboxPath === "SENT" || 
    mailboxPath === "Sent" ||
    mailboxPath.toLowerCase().includes("sent")
  );
}

// Add mailbox icons mapping
const mailboxIcons: { [key: string]: React.ReactNode } = {
  INBOX: <Inbox className="h-4 w-4 mr-3" />,
  "[Gmail]/Sent Mail": <Send className="h-4 w-4 mr-3" />,
  "[Gmail]/Drafts": <Clock className="h-4 w-4 mr-3" />,
  "[Gmail]/All Mail": <Archive className="h-4 w-4 mr-3" />,
  "[Gmail]/Trash": <Trash2 className="h-4 w-4 mr-3" />,
}

// Add mailbox display names mapping
const mailboxDisplayNames: { [key: string]: string } = {
  INBOX: "Inbox",
  "[Gmail]/Sent Mail": "Sent",
  "[Gmail]/Drafts": "Drafts",
  "[Gmail]/All Mail": "Archive",
  "[Gmail]/Trash": "Trash",
}

// Add a function to sort emails by date (newest first)
const sortEmailsByDate = (emails: Email[]) => {
  return [...emails].sort((a, b) => {
    // Use receivedDate or date, whichever is available
    const dateA = new Date(a.receivedDate || a.date);
    const dateB = new Date(b.receivedDate || b.date);
    // Sort descending (newest first)
    return dateB.getTime() - dateA.getTime();
  });
};

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
  const [currentCategory, setCurrentCategory] = useState<EmailCategory>("primary")
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [currentMailbox, setCurrentMailbox] = useState("INBOX")
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)

  // Add state for additional mailbox emails
  const [sentEmails, setSentEmails] = useState<Email[]>([])
  const [draftEmails, setDraftEmails] = useState<Email[]>([])
  const [archiveEmails, setArchiveEmails] = useState<Email[]>([])
  const [trashEmails, setTrashEmails] = useState<Email[]>([])

  // Add useState hooks for reply functionality
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)

  // After the existing state declarations, add these new state variables
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    message: ''
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push("/login")
    } else {
      setUser(currentUser)
    }

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [router])

  // Load emails and mailboxes
  useEffect(() => {
    loadEmails()
    loadMailboxes()
  }, [])

  // Update the useEffect hook that filters emails
  useEffect(() => {
    console.log(`Filtering emails for category: ${currentCategory} - ${emails.length} emails available`);
    console.log(`Current mailbox: ${currentMailbox}`);
    
    if (loading) return;

    if (currentCategory === "sent" as EmailCategory) {
      if (!isSentMailbox(currentMailbox)) {
        console.log("Not in a sent mailbox, need to switch mailbox (handled in handleCategoryChange)");
      } else {
        // Sort emails by date (newest first) for sent emails
        const sortedEmails = sortEmailsByDate(emails);
        console.log(`Setting ${sortedEmails.length} sorted sent emails (newest first)`);
        setFilteredEmails(sortedEmails);
      }
    } else if (currentCategory === "primary" as EmailCategory) {
      if (currentMailbox !== "INBOX") {
        console.log("Not in INBOX, need to switch mailbox (handled in handleCategoryChange)");
      } else {
        // Filter primary emails and then sort them by date
        const primaryEmails = emails.filter(email => categorizeEmail(email, currentMailbox) === "primary");
        const sortedEmails = sortEmailsByDate(primaryEmails);
        console.log(`Found ${sortedEmails.length} primary emails after sorting (newest first)`);
        setFilteredEmails(sortedEmails);
      }
    }
  }, [emails, currentCategory, currentMailbox, loading]);

  // Fetch emails for all mailboxes
  const loadEmails = async () => {
    setLoading(true)
    setError(null)

    try {
      // Check if we have a valid session
      const session = getSession();
      if (!session || !session.access_token) {
        console.error("No valid session found, redirecting to login");
        toast.error("Your session has expired. Please log in again.");
        router.push("/login");
        return;
      }

      // Special handling for sent category using our new dedicated API
      if (currentCategory === ("sent" as EmailCategory)) {
        console.log("Loading emails for SENT category using dedicated API");
        
        const result = await fetchSentEmails({
          limit: 20 // Limit to 20 most recent emails as requested
        });
        
        if (result.error) {
          setError("Failed to load sent emails. Please try again later.")
          console.error("Error loading sent emails");
          toast.error("Could not load sent emails. Please try again.");
        } else {
          console.log(`Loaded ${result.emails.length} recent sent emails`);
          // Sort the emails by date - newest first
          const sortedEmails = sortEmailsByDate(result.emails || []);
          setEmails(sortedEmails);
          // Set filtered emails directly for sent emails
          setFilteredEmails(sortedEmails);
        }
        
        setLoading(false);
        return;
      }

      // Regular fetch for primary category
      console.log(`Fetching emails from ${currentMailbox}...`);
      const result = await fetchEmails({
        mailbox: currentMailbox,
        limit: 20, // Limit to 20 most recent emails as requested
      })

      if (result.error) {
        const errorMessage = "Failed to load emails. Please try again later.";
        setError(errorMessage);
        console.error("Error loading emails:", result.error);
        toast.error(errorMessage);
      } else {
        console.log(`Loaded ${result.emails?.length || 0} emails from ${currentMailbox}`);
        // Sort the emails by date - newest first
        const sortedEmails = sortEmailsByDate(result.emails || []);
        setEmails(sortedEmails);
        
        // If we're in a sent mailbox, make sure we set the category to sent
        if (isSentMailbox(currentMailbox) && currentCategory !== ("sent" as EmailCategory)) {
          console.log("We're in a sent mailbox but category isn't set to sent, updating...");
          setCurrentCategory("sent");
          // Set filtered emails directly for sent emails
          setFilteredEmails(sortedEmails);
        } else if (currentCategory === ("primary" as EmailCategory)) {
          // For primary category, filter based on the categorization
          console.log("Filtering emails for primary category");
          const filtered = sortedEmails.filter(email => categorizeEmail(email, currentMailbox) === "primary");
          setFilteredEmails(filtered);
        } else {
          // Handle any other categories (fallback)
          console.log(`Using default filtering for category: ${currentCategory}`);
          setFilteredEmails(sortedEmails);
        }
      }
    } catch (err) {
      console.error("Error loading emails:", err);
      const errorMessage = "Failed to load emails. Please check your connection and try again.";
      setError(errorMessage);
      toast.error(errorMessage);
      
      // If there's a session problem, redirect to login
      if (typeof err === 'object' && err !== null && 'message' in err && 
          typeof (err as Error).message === 'string' && 
          ((err as Error).message.includes("Authentication") || (err as Error).message.includes("token"))) {
        console.log("Authentication error detected, redirecting to login");
        router.push("/login");
      }
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
        setMailboxes(result.mailboxes || [])
      }
    } catch (err) {
      console.error("Error loading mailboxes:", err)
    }
  }

  // Handle category change
  const handleCategoryChange = (category: EmailCategory) => {
    console.log(`Changing to category: ${category}`);
    
    setCurrentCategory(category);
    setSelectedEmail(null);
    
    // Switch mailbox or fetch appropriate emails based on category
    if (category === "sent") {
      console.log("Fetching recent sent emails using dedicated API");
      
      // Set loading state
      setLoading(true);
      
      // Use the specialized sent emails API
      fetchSentEmails({ limit: 20 }) // Limit to 20 most recent emails
        .then(result => {
          if (result.error) {
            console.error("Error fetching sent emails");
            toast.error("Could not load sent emails");
            setError("Failed to load sent emails");
          } else {
            console.log(`Successfully loaded ${result.emails.length} recent sent emails`);
            setEmails(result.emails);
            setFilteredEmails(result.emails);
            setError(null);
          }
        })
        .catch(err => {
          console.error("Error fetching sent emails:", err);
          toast.error("Could not load sent emails");
          setError("Failed to load sent emails");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // For primary category, switch to INBOX
      handleSwitchMailbox("INBOX").catch(err => {
        console.error("Failed to switch to inbox:", err);
        toast.error("Could not access inbox");
      });
    }
  };

  // Refresh emails
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadEmails()
    setRefreshing(false)
  }

  // Switch mailbox
  const handleSwitchMailbox = async (mailbox: string) => {
    console.log(`Switching to mailbox: ${mailbox}`);
    setCurrentMailbox(mailbox)
    setSelectedEmail(null)
    setLoading(true)

    try {
      const result = await fetchEmails({
        mailbox,
        limit: 50,
      })

      if (result.error) {
        const errorMessage = "Failed to load emails. Please try again later.";
        setError(errorMessage);
        console.error("Error fetching emails:", result.error);
        toast.error(errorMessage);
        return Promise.reject(result.error);
      } else {
        // Update emails list
        setEmails(result.emails || [])
        
        // If this is a sent-type mailbox, update the category
        if (isSentMailbox(mailbox)) {
          console.log("Detected sent mailbox, updating category to sent");
          setCurrentCategory("sent");
          // Update filtered emails directly to bypass the filtering logic
          setFilteredEmails(result.emails || []);
        } else if (mailbox === "INBOX") {
          console.log("Detected inbox, updating category to primary");
          setCurrentCategory("primary");
          // Filter for primary category
          const filtered = result.emails.filter(email => categorizeEmail(email, mailbox) === "primary");
          setFilteredEmails(filtered);
        } else {
          // For other mailboxes, keep current category but update filtered emails
          if (currentCategory === "sent") {
            // If we're in sent category but mailbox isn't a sent mailbox, show no emails
            setFilteredEmails([]);
          } else {
            // For primary category, filter appropriately
            const filtered = result.emails.filter(email => categorizeEmail(email, mailbox) === "primary");
            setFilteredEmails(filtered);
          }
        }
        
        console.log(`Successfully loaded ${result.emails?.length || 0} emails from ${mailbox}`);
        return Promise.resolve(true);
      }
    } catch (err) {
      console.error("Error loading emails:", err)
      const errorMessage = "Failed to load emails. Please try again later.";
      setError(errorMessage);
      toast.error(errorMessage);
      return Promise.reject(err);
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
        const updatedEmails = emails.map((e) =>
          e.id === email.id ? { ...e, flags: [...(e.flags || []).filter((f) => f !== "\\Unseen")] } : e,
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
        const updatedEmails = emails.filter((e) => e.id !== email.id)
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
    router.push("/login")
  }

  const getUserInitials = () => {
    if (!user?.name) return "U"
    return user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
  }

  // Format preview of email (text or html)
  const getEmailPreview = (email: Email) => {
    if (email.text) {
      return email.text.slice(0, 100) + (email.text.length > 100 ? "..." : "")
    } else if (email.html) {
      // Strip HTML tags for preview
      const textPreview = email.html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
      return textPreview.slice(0, 100) + (textPreview.length > 100 ? "..." : "")
    }
    return "No content"
  }

  // Format sender name from email address
  const getSenderName = (from: string) => {
    if (!from) return "Unknown"

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
    if (!dateString) return ""

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) return "Just now"
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
    if (email.flags && email.flags.includes("\\Unseen")) {
      handleMarkAsRead(email)
    }
  }

  // Update useEffect to reload emails when currentMailbox changes
  useEffect(() => {
    loadEmails()
  }, [currentMailbox])

  // Function to handle reply button click
  const handleReply = () => {
    if (!selectedEmail) return

    // Initialize with empty text instead of quoting the original message
    setReplyText("");
    setIsReplying(true);
  }

  // Function to generate response with Llama
  const generateResponse = async () => {
    if (!selectedEmail) return;

    setIsGenerating(true);

    try {
      const session = getSession();
      if (!session) {
        toast.error("Authentication required");
        setIsGenerating(false);
        return;
      }

      // Get content from the email
      const emailContent = selectedEmail.text || (selectedEmail.html ? selectedEmail.html.replace(/<[^>]*>/g, "") : "");
      const sender = getSenderName(selectedEmail.from);

      // Create a more detailed prompt for better responses
      const promptForAI = `Write me a professional email reply to the following message from ${sender}.
      
Subject: ${selectedEmail.subject || "(No subject)"}

Email Content:
${emailContent}

Requirements:
1. Keep the response concise but complete
2. Address all questions or concerns in the original email
3. Use a friendly, professional tone
4. End with an appropriate closing and my name
5. Don't include any unwanted disclaimers or error messages
6. Format it as a clean email reply that's ready to send

Just return the email text itself without any additional explanations or commentary.`;

      console.log("Generating email response...");
      
      // Prioritize using the twin/chat endpoint which is working with Llama AI
      try {
        console.log("Using Llama AI via twin/chat endpoint");
        const llamaResponse = await fetch(`${API_URL}/api/twin/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: promptForAI,
            userId: user?.id || "user",
            forceOllama: true,
            preventFallback: false, // Allow fallbacks if needed
            debug: true
          }),
        });
        
        if (llamaResponse.ok) {
          const data = await llamaResponse.json();
          console.log("AI response received successfully:", data);
          
          if (data.response) {
            toast.success("Response generated successfully");
            setReplyText(data.response.trim());
            setIsGenerating(false);
            return;
          }
        } else {
          console.error(`Twin chat endpoint failed: ${llamaResponse.status} ${llamaResponse.statusText}`);
          const errorText = await llamaResponse.text();
          console.error("Error details:", errorText);
        }
      } catch (llamaError) {
        console.error("Llama AI error:", llamaError);
      }
      
      // If we reached this point, provide a fallback response
      console.log("All AI attempts failed, using fallback template");
      const fallbackResponse = generateFallbackResponse(sender, selectedEmail.subject);
      setReplyText(fallbackResponse);
      toast.warning("Using template response as AI services are currently unavailable");
      
    } catch (error) {
      console.error("Error generating response:", error);
      toast.error("Failed to generate response. Using template instead.");

      // Generate fallback response
      const sender = getSenderName(selectedEmail.from);
      const subject = selectedEmail.subject || "(No subject)";
      const fallbackResponse = generateFallbackResponse(sender, subject);
      setReplyText(fallbackResponse);
    } finally {
      setIsGenerating(false);
    }
  }

  // Helper function to generate a fallback response
  const generateFallbackResponse = (sender: string, subject: string): string => {
    return `Dear ${sender},

Thank you for your email regarding "${subject}".

I appreciate you reaching out. I've reviewed your message and will address your points shortly. If you need any immediate assistance, please let me know.

Best regards,
${user?.name || "Me"}`;
  }

  // Function to handle sending a reply
  const sendReply = async () => {
    if (!selectedEmail || !replyText.trim()) return;
    
    setSendingReply(true);
    
    try {
      // Get the recipient (from the original email's sender)
      const recipient = selectedEmail.from;
      
      // Create subject with Re: prefix if not already present
      const subject = selectedEmail.subject?.startsWith('Re:') 
        ? selectedEmail.subject 
        : `Re: ${selectedEmail.subject || '(No subject)'}`;
      
      console.log("Sending email reply...");
      
      // Send the email using the API
      const result = await sendEmail({
        to: recipient,
        subject: subject,
        text: replyText,
        inReplyTo: selectedEmail.messageId,
        references: selectedEmail.messageId
      });
      
      if (result.success) {
        toast.success("Reply sent successfully");
        setIsReplying(false);
        setReplyText('');
        setIsEmailModalOpen(false); // Close the modal after successfully sending
        
        // Refresh the emails view
        if (currentCategory === ("sent" as EmailCategory)) {
          console.log("Refreshing sent emails after sending a reply");
          // Use our specialized fetchSentEmails function 
          const sentResult = await fetchSentEmails({ limit: 50 });
          if (!sentResult.error && sentResult.emails) {
            console.log(`Refreshed sent emails, loaded ${sentResult.emails.length} emails`);
            setEmails(sentResult.emails);
            setFilteredEmails(sentResult.emails);
          }
        } else {
          // For other categories, do a normal refresh
          loadEmails();
        }
      } else {
        toast.error(result.error || "Failed to send reply");
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply. Please try again.");
    } finally {
      setSendingReply(false);
    }
  };

  // Function to quote original message
  const quoteOriginalMessage = () => {
    if (!selectedEmail) return;
    
    // Get original text content
    const originalText = selectedEmail.text || (selectedEmail.html ? selectedEmail.html.replace(/<[^>]*>/g, "") : "");
    
    // Create quoted format
    const quotedText = originalText
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    
    // Append to current reply text
    setReplyText(prevText => 
      prevText + `\n\n-------- Original Message --------\n${quotedText}`
    );
  };

  // Add useEffect to manage body scroll when modal is open
  useEffect(() => {
    if (isEmailModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isEmailModalOpen]);

  // Add compose email handling functions
  const handleOpenComposeModal = () => {
    setComposeData({
      to: '',
      subject: '',
      message: ''
    });
    setIsComposeModalOpen(true);
  };

  const handleSendNewEmail = async () => {
    if (!composeData.to || !composeData.message) {
      toast.error("Recipient and message are required");
      return;
    }

    setSendingEmail(true);

    try {
      console.log("Sending new email...");
      
      // Send the email using the API
      const result = await sendEmail({
        to: composeData.to,
        subject: composeData.subject || "(No subject)",
        text: composeData.message
      });
      
      if (result.success) {
        toast.success("Email sent successfully");
        setIsComposeModalOpen(false);
        
        // Refresh the emails view if we're in the sent category
        if (currentCategory === ("sent" as EmailCategory)) {
          console.log("Refreshing sent emails after sending new email");
          
          // Use our specialized fetchSentEmails function 
          const sentResult = await fetchSentEmails({ limit: 50 });
          if (!sentResult.error && sentResult.emails) {
            console.log(`Refreshed sent emails, loaded ${sentResult.emails.length} emails`);
            setEmails(sentResult.emails);
            setFilteredEmails(sentResult.emails);
          }
        }
      } else {
        toast.error(result.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <>
      <div className={`flex h-screen bg-[var(--supabase-dark-bg)] ${isEmailModalOpen ? 'overflow-hidden' : ''}`}>
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
                <Input
                  placeholder="Search emails..."
                  className="pl-8 bg-[var(--supabase-dark-bg)] border-[var(--supabase-border)] text-white placeholder:text-gray-400 focus:border-slate-500 focus:ring-slate-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="relative text-gray-200 hover:text-white hover:bg-slate-700 p-2 rounded-md disabled:opacity-50"
              >
                {refreshing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
              </button>
              <button className="relative text-gray-200 hover:text-white hover:bg-slate-700 p-2 rounded-md">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-emerald-500 rounded-full"></span>
              </button>
              <Link
                href="/dashboard/twinbot"
                className="text-gray-200 hover:text-white hover:bg-slate-700 p-2 rounded-md block"
              >
                <MessageSquare className="h-5 w-5" />
              </Link>
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center hover:bg-slate-700 p-1 rounded-md transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                    <AvatarFallback className="bg-emerald-600 text-white">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <ChevronDown
                    className={`h-4 w-4 ml-1 text-gray-300 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-slate-800 ring-1 ring-black ring-opacity-5 z-50">
                    <div className="px-4 py-2 border-b border-slate-700">
                      <p className="text-sm font-medium text-white">{user?.name || "User"}</p>
                      <p className="text-xs text-gray-300">{user?.email || ""}</p>
                    </div>
                    <Link
                      href="/dashboard/profile"
                      className="block px-4 py-2 text-sm text-gray-200 hover:bg-slate-700 hover:text-white flex items-center"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      className="block px-4 py-2 text-sm text-gray-200 hover:bg-slate-700 hover:text-white flex items-center"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-slate-700 hover:text-white flex items-center"
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
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Emails</h2>
                    <p className="text-sm text-white">Manage your inbox</p>
                  </div>

                  <Button
                    onClick={handleOpenComposeModal}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Compose</span>
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {/* Navigation */}
                  <div className="p-4">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider px-2 mb-2">Navigation</h3>
                    <div className="space-y-1">
                      {/* Default mailboxes */}
                      {["INBOX", "[Gmail]/Sent Mail", "[Gmail]/Drafts", "[Gmail]/All Mail", "[Gmail]/Trash"].map(
                        (mailbox) => (
                          <button
                            key={mailbox}
                            onClick={() => handleSwitchMailbox(mailbox)}
                            className={`flex items-center w-full p-2 rounded-md ${
                              currentMailbox === mailbox
                                ? "bg-slate-700 text-white"
                                : "text-white hover:bg-slate-700 hover:text-white"
                            }`}
                          >
                            {mailboxIcons[mailbox]}
                            <span>{mailboxDisplayNames[mailbox]}</span>
                            {mailbox === "INBOX" && (
                              emails.filter((e) => e.flags && e.flags.includes("\\Unseen")).length > 0 && (
                                <Badge className="ml-auto bg-slate-600 text-white">
                                  {emails.filter((e) => e.flags && e.flags.includes("\\Unseen")).length}
                                </Badge>
                              )
                            )}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                {/* Dynamic mailboxes */}
                {mailboxes.length > 0 && (
                  <div className="p-4 border-t border-[var(--supabase-border)] mt-2">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider px-2 mb-2">Folders</h3>
                    <div className="space-y-1">
                      {mailboxes
                        .filter(
                          (mailbox) =>
                            !["INBOX", "Sent", "Drafts", "Archive", "Trash"].includes(mailbox.path) &&
                            !mailbox.path.startsWith("[Gmail]"),
                        )
                        .map((mailbox) => (
                          <button
                            key={mailbox.path}
                            onClick={() => handleSwitchMailbox(mailbox.path)}
                            className={`flex items-center w-full p-2 rounded-md ${
                              currentMailbox === mailbox.path
                                ? "bg-slate-700 text-white"
                                : "text-white hover:bg-slate-700 hover:text-white"
                            }`}
                          >
                            <Tag className="h-4 w-4 mr-3" />
                            <span>{mailbox.name}</span>
                            {mailbox.unseen && mailbox.unseen > 0 && (
                              <Badge className="ml-auto bg-slate-600 text-white">{mailbox.unseen}</Badge>
                            )}
                          </button>
                        ))}
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
                  <TabsList className="w-full flex bg-zinc-800 p-0.5 gap-1 border-b border-zinc-700">
                    <TabsTrigger
                      value="primary"
                      className="flex-1 px-4 py-2.5 data-[state=active]:bg-zinc-700 data-[state=active]:text-white data-[state=inactive]:text-zinc-300 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-zinc-700/50 rounded-md transition-all"
                    >
                      <Inbox className="h-4 w-4 mr-2" />
                      Primary
                      {currentCategory === "primary" && currentMailbox === "INBOX" && 
                        filteredEmails.filter(email => email.flags?.includes("\\Unseen")).length > 0 && (
                        <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center">
                          {filteredEmails.filter(email => email.flags?.includes("\\Unseen")).length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="sent"
                      className="flex-1 px-4 py-2.5 data-[state=active]:bg-zinc-700 data-[state=active]:text-white data-[state=inactive]:text-zinc-300 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-zinc-700/50 rounded-md transition-all"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Sent
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {/* Email List and Detail View Content */}
              <div className="flex-1 flex overflow-hidden">
                {/* Email List */}
                <div className={`${selectedEmail ? "hidden md:flex md:w-2/5 lg:w-1/3" : "flex"} flex-col flex-1`}>
                  {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                      <p className="ml-2 text-gray-400">Loading emails...</p>
                    </div>
                  ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <p className="text-red-400 mb-2">{error}</p>
                      <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 flex items-center"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </button>
                    </div>
                  ) : filteredEmails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48">
                      <div className="p-3 rounded-full bg-zinc-700 mb-3">
                        {currentCategory === "primary" ? (
                          <Inbox className="text-zinc-300 h-6 w-6" />
                        ) : (
                          <Send className="text-zinc-300 h-6 w-6" />
                        )}
                      </div>
                      <p className="text-zinc-200 text-sm font-medium mb-1">
                        {currentCategory === "primary" 
                          ? "Your inbox is empty" 
                          : "No sent emails found"}
                      </p>
                      <p className="text-zinc-400 text-xs text-center max-w-xs">
                        {currentCategory === "primary" 
                          ? "When you receive emails, they will appear here" 
                          : "When you send emails, they will appear here"}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto">
                      {filteredEmails.map((email) => (
                        <button
                          key={email.id}
                          className={`flex flex-col w-full px-4 py-3 border-b border-zinc-700 text-left hover:bg-zinc-700 focus:outline-none transition-colors ${
                            selectedEmail?.id === email.id ? "bg-zinc-700" : email.flags?.includes("\\Unseen") ? "bg-zinc-800/80" : ""
                          }`}
                          onClick={() => openEmailModal(email)}
                        >
                          <div className="flex items-center mb-1">
                            <Avatar className="h-8 w-8 mr-3 border border-zinc-600">
                              <AvatarFallback className="text-xs bg-zinc-600 text-zinc-100">
                                {getSenderName(currentCategory === "primary" ? email.from : email.to)
                                  .split(" ")
                                  .map((part) => part[0])
                                  .slice(0, 2)
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center w-full">
                                <p className={`text-sm truncate font-medium mr-2 ${
                                  email.flags?.includes("\\Unseen") ? "text-white" : "text-zinc-200"
                                }`}>
                                  {currentCategory === "primary" ? getSenderName(email.from) : getSenderName(email.to)}
                                </p>
                                <span className="text-xs text-zinc-400 whitespace-nowrap">
                                  {getRelativeTime(email.date)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className={`text-sm truncate ${
                            email.flags?.includes("\\Unseen") ? "text-white font-medium" : "text-zinc-300"
                          }`}>
                            {email.subject || "(No subject)"}
                          </p>
                          <p className="text-xs text-zinc-400 truncate mt-1">
                            {getEmailPreview(email)}
                          </p>
                          {email.attachments && email.attachments.length > 0 && (
                            <div className="flex items-center mt-1.5">
                              <Paperclip className="h-3 w-3 text-zinc-400 mr-1" />
                              <span className="text-xs text-zinc-400">
                                {email.attachments.length} attachment{email.attachments.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {selectedEmail && (
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent 
            className="sm:max-w-[900px] w-[95vw] max-h-max p-0 overflow-hidden bg-zinc-800 text-white border border-zinc-700 shadow-2xl relative rounded-lg z-50"
            style={{ marginTop: '-55vh' }}
          >
            {/* Close button in the top-right corner */}
            <button 
              onClick={() => setIsEmailModalOpen(false)}
              className="absolute right-4 top-4 p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white transition-colors z-20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex flex-col h-full max-h-[85vh]">
              <DialogHeader className="px-6 py-5 border-b border-zinc-700 bg-zinc-800 sticky top-0 z-10">
                <div className="flex text-white items-center justify-between pr-10">
                  <DialogTitle className="text-xl font-semibold text-white">
                    {selectedEmail?.subject || '(No subject)'}
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400 text-sm mt-1">
                    View email details and options for managing this message
                  </DialogDescription>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        handleMoveEmail(selectedEmail, '[Gmail]/All Mail');
                        setIsEmailModalOpen(false);
                      }}
                      className="text-zinc-100 hover:text-white hover:bg-zinc-700 transition-colors"
                    >
                      <Archive className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        handleMoveEmail(selectedEmail, '[Gmail]/Trash');
                        setIsEmailModalOpen(false);
                      }}
                      className="text-zinc-100 hover:text-white hover:bg-zinc-700 transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Sender info */}
                <div className="flex items-start mt-4">
                  <Avatar className="h-12 w-12 mr-4 border-2 border-zinc-600">
                    <AvatarImage src={`/placeholder.svg?height=48&width=48&text=${selectedEmail.from ? getSenderName(selectedEmail.from)[0] : ''}`} alt="Sender" />
                    <AvatarFallback className="bg-zinc-600 text-white">
                      {selectedEmail.from ? getSenderName(selectedEmail.from)[0] : ''}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white text-lg">
                        {selectedEmail.from ? getSenderName(selectedEmail.from) : ''}
                      </p>
                      <span className="text-zinc-300">•</span>
                      <p className="text-sm text-zinc-200">
                        {selectedEmail.date ? new Date(selectedEmail.date).toLocaleString() : ''}
                      </p>
                    </div>
                    <p className="text-sm text-zinc-200 mt-1">
                      To: {selectedEmail.to || ''}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              {/* Scrollable content area that contains both email and reply form */}
              <div className="overflow-y-auto flex-grow custom-scrollbar">
                {/* Email Content */}
                <div className="p-6 bg-zinc-800">
                  <div className="mx-auto max-w-2xl">
                    {selectedEmail.html ? (
                      <div 
                        className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-zinc-100 prose-a:text-teal-300 hover:prose-a:text-teal-200 prose-strong:text-white prose-li:text-zinc-100 prose-ul:text-zinc-100 prose-ol:text-zinc-100 prose-code:text-zinc-100 prose-pre:bg-zinc-700 rounded-lg shadow-inner"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedEmail.html) }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap text-zinc-100 leading-relaxed">
                        {selectedEmail.text || 'No content'}
                      </div>
                    )}

                    {/* Attachments */}
                    {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                      <div className="mt-8 border-t border-zinc-700 pt-5">
                        <h3 className="text-sm font-medium text-white mb-3 flex items-center">
                          <Paperclip className="h-4 w-4 mr-2 text-zinc-300" />
                          Attachments ({selectedEmail.attachments.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedEmail.attachments.map((attachment, index) => (
                            <div 
                              key={index}
                              className="flex items-center p-3 bg-zinc-700 rounded-md border border-zinc-600 hover:border-zinc-500 transition-colors"
                            >
                              <div className="mr-3 p-2 bg-zinc-600 rounded">
                                <File className="h-6 w-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white truncate">
                                  {attachment.filename || 'Unnamed attachment'}
                                </p>
                                <p className="text-xs text-zinc-200">
                                  {Math.round(attachment.size / 1024)} KB
                                </p>
                              </div>
                              <button className="p-2 text-zinc-200 hover:text-white hover:bg-zinc-600 rounded-full transition-colors">
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reply Form - Inside the scrollable area */}
                {isReplying && (
                  <div className="border-t border-zinc-700 bg-zinc-800 p-6 pb-24">
                    <div className="max-w-2xl mx-auto">
                      <div className="mb-3 flex justify-between items-center">
                        <h3 className="text-lg font-medium text-white flex items-center">
                          Reply
                          <span className="ml-2 text-xs bg-teal-700 text-white px-2 py-0.5 rounded-full">Llama AI powered</span>
                        </h3>
                        <button 
                          onClick={() => setIsReplying(false)}
                          className="text-zinc-200 hover:text-white hover:bg-zinc-700 p-1.5 rounded-full transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      
                      {/* Email details */}
                      <div className="mb-4 bg-zinc-700 p-3 rounded-md border border-zinc-600">
                        <div className="flex items-center mb-2">
                          <Mail className="h-4 w-4 text-zinc-200 mr-2" />
                          <span className="text-sm text-zinc-200">To: </span>
                          <span className="text-sm font-medium text-white ml-1">
                            {selectedEmail.from ? getSenderName(selectedEmail.from) : ''}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Tag className="h-4 w-4 text-zinc-200 mr-2" />
                          <span className="text-sm text-zinc-200">Subject: </span>
                          <span className="text-sm font-medium text-white ml-1">
                            {selectedEmail.subject?.startsWith('Re:') 
                              ? selectedEmail.subject 
                              : `Re: ${selectedEmail.subject || '(No subject)'}`}
                          </span>
                        </div>
                      </div>
                      
                      <Textarea 
                        placeholder="Type your reply here or use Llama AI to generate a response..."
                        className="min-h-32 bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400 resize-y w-full focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      
                      <div className="flex flex-wrap gap-2 mt-4 justify-end">
                        <Button 
                          variant="outline" 
                          className="bg-zinc-700 text-white border-zinc-600 hover:bg-zinc-600 hover:text-white transition-colors"
                          onClick={quoteOriginalMessage}
                        >
                          <File className="h-4 w-4 mr-2 text-zinc-300" />
                          <span className="text-white">Quote Original</span>
                        </Button>
                        <Button 
                          className="bg-teal-600 text-white hover:bg-teal-500 transition-colors flex items-center gap-1"
                          onClick={generateResponse}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              <span className="text-white">Llama AI is writing...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-1 text-white" />
                              <span className="text-white">Generate with Llama</span>
                            </>
                          )}
                        </Button>
                        <Button 
                          className="bg-teal-600 text-white hover:bg-teal-500 transition-colors"
                          onClick={sendReply}
                          disabled={sendingReply || !replyText.trim()}
                        >
                          {sendingReply ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Send Reply
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="text-zinc-200 hover:text-white hover:bg-zinc-700 transition-colors"
                          onClick={() => {
                            setIsReplying(false);
                            setReplyText('');
                          }}
                        >
                          <span className="text-zinc-100">Cancel</span>
                        </Button>
                      </div>
                      
                      {/* Help text for Llama AI */}
                      <div className="mt-4 p-3 bg-zinc-800 border border-zinc-700 rounded-md">
                        <p className="text-xs text-zinc-400 flex items-center">
                          <Sparkles className="h-3 w-3 mr-1 text-teal-400" />
                          <span>
                            <strong className="text-teal-400">Llama AI</strong> can help you write professional email responses. 
                            Click "<strong>Generate with Llama</strong>" to create a reply that addresses the main points in the original email.
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Actions */}
              <div className="border-t border-zinc-700 bg-zinc-800 sticky bottom-0 z-10">
                {!isReplying && (
                  <div className="p-4 flex justify-end gap-2">
                    <Button 
                      className="bg-teal-600 hover:bg-teal-500 text-white transition-colors"
                      onClick={handleReply}
                    >
                      <Reply className="h-4 w-4 mr-2" />
                      <span className="text-white">Reply</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-zinc-600 bg-zinc-700 text-white hover:bg-zinc-600 transition-colors"
                    >
                      <Forward className="h-4 w-4 mr-2" />
                      <span className="text-white">Forward</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="text-zinc-200 hover:text-white hover:bg-zinc-700 transition-colors"
                      onClick={() => setIsEmailModalOpen(false)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      <span className="text-white">Close</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
          
          {/* Add overlay backdrop for more emphasis */}
          <div 
            className={`fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity z-40 ${
              isEmailModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsEmailModalOpen(false)}
            aria-hidden="true"
          />
        </Dialog>
      )}

      {/* Compose Email Modal */}
      <Dialog open={isComposeModalOpen} onOpenChange={setIsComposeModalOpen}>
        <DialogContent 
          className="sm:max-w-[600px] w-[95vw] p-0 overflow-hidden bg-zinc-800 text-white border border-zinc-700 shadow-2xl relative rounded-lg z-50"
        >
          {/* Close button */}
          <button 
            onClick={() => setIsComposeModalOpen(false)}
            className="absolute right-4 top-4 p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white transition-colors z-20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex flex-col h-full">
            <DialogHeader className="px-6 py-4 border-b border-zinc-700 bg-zinc-800">
              <DialogTitle className="text-lg font-semibold text-white">
                New Email
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-sm mt-1">
                Compose a new email message to send
              </DialogDescription>
            </DialogHeader>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email-to" className="block text-sm font-medium text-zinc-200 mb-1">
                    To:
                  </label>
                  <Input
                    id="email-to"
                    className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="recipient@example.com"
                    value={composeData.to}
                    onChange={(e) => setComposeData({...composeData, to: e.target.value})}
                  />
                </div>
                
                <div>
                  <label htmlFor="email-subject" className="block text-sm font-medium text-zinc-200 mb-1">
                    Subject:
                  </label>
                  <Input
                    id="email-subject"
                    className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Subject"
                    value={composeData.subject}
                    onChange={(e) => setComposeData({...composeData, subject: e.target.value})}
                  />
                </div>
                
                <div>
                  <label htmlFor="email-message" className="block text-sm font-medium text-zinc-200 mb-1">
                    Message:
                  </label>
                  <Textarea
                    id="email-message"
                    className="min-h-32 bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400 focus:ring-teal-500 focus:border-teal-500 resize-y w-full"
                    placeholder="Type your message here..."
                    value={composeData.message}
                    onChange={(e) => setComposeData({...composeData, message: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  className="border-zinc-600 text-zinc-200 hover:bg-zinc-700 hover:text-white"
                  onClick={() => setIsComposeModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-teal-600 text-white hover:bg-teal-500 transition-colors"
                  onClick={handleSendNewEmail}
                  disabled={sendingEmail || !composeData.to || !composeData.message}
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
        
        {/* Backdrop */}
        <div 
          className={`fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity z-40 ${
            isComposeModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsComposeModalOpen(false)}
          aria-hidden="true"
        />
      </Dialog>
    </>
  )
}


