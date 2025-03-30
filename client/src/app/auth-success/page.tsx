"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { storeGoogleToken } from '@/lib/api'
import { Loader2 } from 'lucide-react'

// Split out the content into a smaller component to reduce the chunk size
function AuthStatus({ status, error, debugInfo }: { 
  status: string;
  error: string | null;
  debugInfo?: Record<string, any>;
}) {
  return (
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
          {debugInfo && (
            <div className="text-xs text-gray-500 mt-4 p-2 bg-[var(--supabase-darker-bg)] rounded">
              <p>Debug Info:</p>
              {Object.entries(debugInfo).map(([key, value]) => (
                <p key={key}>{key}: {String(value)}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>("Initializing...")
  const [debugInfo, setDebugInfo] = useState<Record<string, any> | undefined>(undefined)
  
  useEffect(() => {
    // Define a function to handle token processing
    const processToken = async () => {
      try {
        // Get access token from URL
        const accessToken = searchParams.get('access_token')
        const tokenType = searchParams.get('token_type') || 'Bearer'
        const expiresIn = searchParams.get('expires_in')
        
        setStatus("Checking access token...")
        
        // Prepare debug info
        setDebugInfo({
          hasAccessToken: !!accessToken,
          tokenType,
          expiresIn,
          tokenLength: accessToken?.length || 0
        })
        
        if (!accessToken) {
          setError("No authentication token found in URL")
          setTimeout(() => router.push('/dashboard/calendar'), 3000)
          return
        }
        
        setStatus("Access token found, validating...")
        
        // Format validation
        if (!accessToken.startsWith('ya29.') && !accessToken.startsWith('Bearer ')) {
          console.warn("Token doesn't match expected format")
          setStatus("Token format warning, attempting to store anyway...")
        }
        
        // Clear any old tokens first
        localStorage.removeItem('google_token')
        
        // Use the enhanced storeGoogleToken function
        setStatus("Storing token with improved handler...")
        try {
          storeGoogleToken(
            accessToken, 
            tokenType, 
            expiresIn || undefined
          )
          
          // Double check the token was stored
          const storedToken = localStorage.getItem('google_token')
          if (!storedToken) {
            console.warn("Token storage verification failed, attempting fallback")
            // Direct fallback storage approach
            localStorage.setItem('google_token', accessToken)
            sessionStorage.setItem('google_token_backup', accessToken)
          }
          
          setStatus("Token stored successfully")
        } catch (storageError) {
          console.error("Error during token storage:", storageError)
          // Attempt emergency fallback
          try {
            localStorage.setItem('google_token', accessToken)
            setStatus("Used emergency fallback storage")
          } catch (emergencyError) {
            throw new Error(`Critical storage failure: ${emergencyError}`)
          }
        }
        
        // No need to clear auth needed flags or store in session - our enhanced function does this
        
        // Check for a redirect URL (in case we were in the middle of something)
        const redirectTo = localStorage.getItem('calendar_redirect') || '/dashboard/calendar'
        localStorage.removeItem('calendar_redirect') // Clean up after ourselves
        
        setStatus(`Token stored! Redirecting to: ${redirectTo}...`)
        
        // Redirect back to the calendar page
        setTimeout(() => router.push(redirectTo), 1500)
      } catch (err) {
        console.error("Error storing token:", err)
        setError(`Failed to store authentication token: ${err instanceof Error ? err.message : String(err)}`)
        setStatus("Error occurred")
        
        // Redirect anyway after a delay
        setTimeout(() => router.push('/dashboard/calendar'), 3000)
      }
    }

    // Call the function
    processToken()
  }, [router, searchParams])
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--supabase-dark-bg)]">
      <AuthStatus 
        status={status} 
        error={error} 
        debugInfo={debugInfo}
      />
    </div>
  )
}

// Simple loading component
function SimpleLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--supabase-dark-bg)]">
      <div className="bg-[var(--supabase-light-bg)] p-8 rounded-lg shadow-lg text-center max-w-md w-full">
        <Loader2 className="h-12 w-12 animate-spin text-teal-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Loading...</h1>
        <p className="text-gray-400 mb-4">Setting up authentication...</p>
      </div>
    </div>
  )
}

// Main component with error boundary and simplified Suspense
export default function AuthSuccessPage() {
  return (
    <Suspense fallback={<SimpleLoading />}>
      <AuthContent />
    </Suspense>
  )
} 