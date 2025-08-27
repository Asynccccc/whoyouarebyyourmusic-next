'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { Session } from "@supabase/supabase-js";

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for authentication errors in URL parameters
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clean the URL
      router.replace('/');
    }

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session) router.replace("/result");
    });
  }, [router, searchParams]);

  const login = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "spotify",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "user-top-read",
        },
      });
      
      if (error) throw error;
      
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="header-bg min-h-screen grid place-items-center p-6">
      <div className="text-center max-w-xl">
        <h1 className="font-black text-3xl leading-tight">
          Discover <span className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">who you are</span> by your <span className="underline decoration-dashed">music</span> taste
        </h1>
        
        {error && (
          <div className="mt-4 p-4 bg-red-100/10 border border-red-400/40 text-red-300 rounded-lg">
            <p className="font-semibold">Authentication Error</p>
            <p className="text-sm mt-1">{error}</p>
            <p className="text-xs opacity-75 mt-2">
              {error.includes('seconds') ? 'Please wait a minute before trying again.' : ''}
            </p>
          </div>
        )}
        
        <button 
          className="btn mt-5" 
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
    </main>
  );
}