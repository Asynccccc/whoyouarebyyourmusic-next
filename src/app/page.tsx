'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import { Suspense } from 'react';

// Create a separate component that uses useSearchParams
function LoginContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forceNewLogin, setForceNewLogin] = useState(false);
  const router = useRouter();
  
  // Get error from URL parameters if any
  useEffect(() => {
    // Check for authentication errors in URL parameters
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      const forceLogin = urlParams.get('force_login');
      
      if (errorParam) {
        setError(decodeURIComponent(errorParam));
        // Clean the URL without causing navigation
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
      
      if (forceLogin) {
        setForceNewLogin(true);
        // Clean the URL without causing navigation
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session) router.replace("/result");
    });
  }, [router]);

  const login = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear any existing session to ensure fresh login
      if (forceNewLogin) {
        await supabase.auth.signOut();
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "spotify",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "user-top-read",
          // This parameter ensures Spotify shows account selector
          skipBrowserRedirect: false,
        },
      });
      
      if (error) throw error;
      
      // If we get a URL, redirect manually (fallback)
      if (data?.url) {
        window.location.href = data.url;
      }
      
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center max-w-xl mx-4">
      <h1 className="font-black text-2xl sm:text-3xl md:text-4xl leading-tight">
        Discover <span className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">who you are</span> by your <span className="underline decoration-dashed">music</span> taste
      </h1>
      <a
  target="_blank"
  rel="noopener noreferrer"
  href="https://github.com/Asynccccc"
  className="relative inline-flex items-center justify-center mt-6 p-2.5 sm:p-3 rounded-full overflow-hidden group"
>
  <span className="absolute inset-0 rounded-full bg-black scale-0 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
  
  <span className="relative z-10 [&>svg]:h-8 [&>svg]:w-8 sm:[&>svg]:h-10 sm:[&>svg]:w-10">
    <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 496 512">
      <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3 .3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5 .3-6.2 2.3zm44.2-1.7c-2.9 .7-4.9 2.6-4.6 4.9 .3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3 .7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3 .3 2.9 2.3 3.9 1.6 1 3.6 .7 4.3-.7 .7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3 .7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3 .7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"/>
    </svg>
  </span>

  <span className="sr-only">GitHub</span>
</a>
      <p>By Asynccccc</p>
      
      {forceNewLogin && (
        <div className="mt-4 p-4 bg-blue-100/10 border border-blue-400/40 text-blue-300 rounded-lg text-sm md:text-base">
          <p className="font-semibold">Select Account</p>
          <p className="text-sm mt-1">Please select your Spotify account or log in with a different account.</p>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-4 bg-red-100/10 border border-red-400/40 text-red-300 rounded-lg text-sm md:text-base">
          <p className="font-semibold">Authentication Error</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-xs opacity-75 mt-2">
            {error.includes('seconds') ? 'Please wait a minute before trying again.' : ''}
          </p>
        </div>
      )}
      
      <button 
        className="btn mt-5 w-full sm:w-auto px-6 py-3 text-base" 
        onClick={login}
        disabled={loading || error.includes('seconds')}
      >
        {loading ? "Connecting..." : "Login with Spotify"}
      </button>

      {error.includes('seconds') && (
        <p className="text-sm text-gray-400 mt-3">
          Rate limited. Please wait before trying again.
        </p>
      )}
    </div>
  );
}

// Main page component with Suspense
export default function Page() {
  return (
    <main className="header-bg min-h-screen grid place-items-center p-4 sm:p-6">
      <Suspense fallback={
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-sm opacity-80">Loading...</p>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </main>
  );
}