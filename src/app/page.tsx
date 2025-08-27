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