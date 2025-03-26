"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { storeGoogleToken } from '@/lib/api'
import { Loader2 } from 'lucide-react'

export default function AuthSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>("Initializing...")
  
  useEffect(() => {
    // Get access token from URL
    const accessToken = searchParams.get('access_token')
    const tokenType = searchParams.get('token_type') || 'Bearer'
    const expiresIn = searchParams.get('expires_in')
    
    setStatus("Checking access token...")
    console.log('Query parameters:', {
      hasAccessToken: !!accessToken,
      tokenType,
      expiresIn
    })
    
    if (accessToken) {
      try {
        setStatus("Access token found, validating...")
        console.log("Google authentication successful")
        
        // Format validation
        if (!accessToken.startsWith('ya29.') && !accessToken.startsWith('Bearer ')) {
          console.warn("Token doesn't match expected format:", accessToken.substring(0, 10) + '...')
          setStatus("Token format warning, attempting to store anyway...")
        }
        
        // Clear any old tokens first
        localStorage.removeItem('google_token')
        
        // Store the token - use both the new format (object) and direct string for compatibility
        const tokenInfo = {
          token: accessToken,
          type: tokenType,
          expires_at: expiresIn ? Date.now() + (parseInt(expiresIn) * 1000) : null
        }
        
        // Store as JSON for our enhanced token handling
        console.log('Storing token with expiration in', expiresIn, 'seconds')
        localStorage.setItem('google_token', JSON.stringify(tokenInfo))
        
        // Also store in session storage as a backup
        sessionStorage.setItem('google_token_backup', accessToken)
        
        // Double check the token was stored
        const storedToken = localStorage.getItem('google_token')
        if (!storedToken) {
          throw new Error("Failed to store token in localStorage")
        }
        
        setStatus("Token stored successfully")
        
        // Clear any auth needed flags
        localStorage.removeItem('google_auth_needed')
        
        // Check for a redirect URL (in case we were in the middle of something)
        const redirectTo = localStorage.getItem('calendar_redirect') || '/dashboard/calendar'
        localStorage.removeItem('calendar_redirect') // Clean up after ourselves
        
        setStatus(`Token stored! Redirecting to: ${redirectTo}...`)
        
        // Redirect back to the calendar page
        setTimeout(() => {
          router.push(redirectTo)
        }, 1500) // Slightly longer delay to ensure token is stored
      } catch (err) {
        console.error("Error storing token:", err)
        setError(`Failed to store authentication token: ${err instanceof Error ? err.message : String(err)}`)
        setStatus("Error occurred")
        
        // Redirect anyway after a delay
        setTimeout(() => {
          router.push('/dashboard/calendar')
        }, 3000)
      }
    } else {
      // If no token, show error and redirect to calendar anyway
      console.error("No access token found in URL")
      setError("No authentication token found in URL")
      setStatus("Error: Missing token")
      
      setTimeout(() => {
        router.push('/dashboard/calendar')
      }, 3000)
    }
  }, [router, searchParams])
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--supabase-dark-bg)]">
      <div className="bg-[var(--supabase-light-bg)] p-8 rounded-lg shadow-lg text-center max-w-md w-full">
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
            <Loader2 className="h-12 w-12 animate-spin text-teal-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Connecting to Google Calendar</h1>
            <p className="text-gray-400 mb-4">{status}</p>
            <div className="text-xs text-gray-500 mt-4 p-2 bg-[var(--supabase-darker-bg)] rounded">
              <p>Debug Info:</p>
              <p>Query params: {JSON.stringify(Object.fromEntries(searchParams))}</p>
              <p>Has token: {searchParams.has('access_token') ? 'Yes' : 'No'}</p>
              <p>Token length: {searchParams.get('access_token')?.length || 0}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 