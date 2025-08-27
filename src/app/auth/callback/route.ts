import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth Error:', error, errorDescription)
    
    // Redirect to home page with error message
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('error', errorDescription || error)
    return NextResponse.redirect(redirectUrl)
  }

  // Handle successful authentication
  if (code) {
    try {
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('Session exchange error:', sessionError)
        const redirectUrl = new URL('/', request.url)
        redirectUrl.searchParams.set('error', sessionError.message)
        return NextResponse.redirect(redirectUrl)
      }

      // Successful authentication - redirect to result page
      return NextResponse.redirect(new URL('/result', request.url))
      
    } catch (e) {
      console.error('Unexpected error:', e)
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('error', 'Unexpected authentication error')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // No code or error - redirect home
  return NextResponse.redirect(new URL('/', request.url))
}