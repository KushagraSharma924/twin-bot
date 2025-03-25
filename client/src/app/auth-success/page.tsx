"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { storeGoogleToken } from '@/lib/api'
import { Loader2 } from 'lucide-react'

export default function AuthSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    // Get access token from URL
    const accessToken = searchParams.get('access_token')
    
    if (accessToken) {
      try {
        console.log("Google authentication successful, storing token")
        
        // Clear any old tokens first
        localStorage.removeItem('google_token')
        
        // Store the token in localStorage
        storeGoogleToken(accessToken)
        
        // Double check the token was stored
        const storedToken = localStorage.getItem('google_token')
        if (!storedToken) {
          throw new Error("Failed to store token")
        }
        
        // Clear any auth needed flags
        localStorage.removeItem('google_auth_needed')
        
        // Check for a redirect URL (in case we were in the middle of something)
        const redirectTo = localStorage.getItem('calendar_redirect') || '/dashboard/calendar'
        localStorage.removeItem('calendar_redirect') // Clean up after ourselves
        
        // Redirect back to the calendar page
        setTimeout(() => {
          router.push(redirectTo)
        }, 1000) // Short delay to ensure token is stored
      } catch (err) {
        console.error("Error storing token:", err)
        setError("Failed to store authentication token")
        
        // Redirect anyway after a delay
        setTimeout(() => {
          router.push('/dashboard/calendar')
        }, 3000)
      }
    } else {
      // If no token, show error and redirect to calendar anyway
      console.error("No access token found in URL")
      setError("No authentication token found in URL")
      
      setTimeout(() => {
        router.push('/dashboard/calendar')
      }, 3000)
    }
  }, [router, searchParams])
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--supabase-dark-bg)]">
      <div className="bg-[var(--supabase-light-bg)] p-8 rounded-lg shadow-lg text-center">
        {error ? (
          <>
            <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl">!</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Authentication Error</h1>
            <p className="text-gray-400 mb-4">{error}</p>
            <p className="text-gray-500">Redirecting to calendar...</p>
          </>
        ) : (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-[var(--gradient-start)] mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Connecting to Google Calendar</h1>
            <p className="text-gray-400">Please wait while we set up your calendar...</p>
          </>
        )}
      </div>
    </div>
  )
} 