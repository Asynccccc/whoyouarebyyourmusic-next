'use client';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { User, UserMetadata } from '@supabase/supabase-js';

interface Artist {
    id: string;
    name: string;
}

interface Track {
    id: string;
    name: string;
    artist: string;
    albumImage: string;
}

interface SpotifyArtist {
    id: string;
    name: string;
}

interface SpotifyTrack {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: { images: Array<{ url: string }> };
}

export default function ResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [userMeta, setUserMeta] = useState<UserMetadata | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loading, setLoading] = useState(true);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [authError, setAuthError] = useState("");

  // Check for authentication errors in URL parameters
  useEffect(() => {
    const error = searchParams?.get('error');
    const errorDescription = searchParams?.get('error_description');
    
    if (error) {
      setAuthError(errorDescription || `Authentication error: ${error}`);
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // First check for any authentication errors
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Authentication failed. Please try logging in again.');
          setLoading(false);
          return;
        }

        if (!session) {
          console.log("No session found, redirecting to login...");
          router.replace("/");
          return;
        }

        if (mounted) {
          setUser(session.user);
          setUserMeta(session.user?.user_metadata ?? null);

          const accessToken = session.provider_token;
          if (!accessToken) {
            console.error('Missing Spotify access token');
            setError('Missing authentication data. Please log in again.');
            setLoading(false);
            return;
          }

          await fetchSpotifyData(accessToken);
        }
      } catch (e) {
        console.error('Initialization error:', e);
        if (e instanceof Error) {
          if (e.message.includes('rate limit') || e.message.includes('seconds')) {
            setError('Please wait a minute before trying again');
          } else {
            setError(e.message);
          }
        } else {
          setError('Unexpected error during authentication');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          setUserMeta(session.user?.user_metadata ?? null);
          
          if (session.provider_token) {
            await fetchSpotifyData(session.provider_token);
          }
        } else if (event === 'SIGNED_OUT') {
          // Only redirect if we're not in the process of logging out
          if (!loggingOut) {
            router.replace("/");
          }
        } else if (event === 'USER_UPDATED') {
          // Handle user profile updates
          if (session) {
            setUser(session.user);
            setUserMeta(session.user?.user_metadata ?? null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, loggingOut]);

  useEffect(() => {
    // Generate AI analysis when we have both artists and tracks
    if (artists.length > 0 && tracks.length > 0 && !aiAnalysis) {
      generatePersonalityAnalysis();
    }
  }, [artists, tracks, aiAnalysis]);

  const fetchSpotifyData = async (accessToken: string) => {
    try {
      // First verify the token works by getting user profile
      const profileResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch Spotify profile - token may be invalid');
      }
      
      const profileData = await profileResponse.json();
      console.log('Spotify profile:', profileData);

      // Now fetch top artists
      const artistsResponse = await fetch('https://api.spotify.com/v1/me/top/artists?limit=10&time_range=short_term', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!artistsResponse.ok) {
        const errorText = await artistsResponse.text();
        console.error('Artists API error:', artistsResponse.status, errorText);
        throw new Error(`Spotify API error: ${artistsResponse.status} ${artistsResponse.statusText}`);
      }
      
      const artistsData = await artistsResponse.json();

      if (artistsData.items) {
        setArtists(artistsData.items.map((artist: SpotifyArtist) => ({
          id: artist.id,
          name: artist.name
        })));
      }

      // Fetch top tracks
      const tracksResponse = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=short_term', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!tracksResponse.ok) {
        const errorText = await tracksResponse.text();
        console.error('Tracks API error:', tracksResponse.status, errorText);
        throw new Error(`Spotify API error: ${tracksResponse.status} ${tracksResponse.statusText}`);
      }
      
      const tracksData = await tracksResponse.json();

      if (tracksData.items) {
        setTracks(tracksData.items.map((track: SpotifyTrack) => ({
          id: track.id,
          name: track.name,
          artist: track.artists[0].name,
          albumImage: track.album.images[0]?.url || ''
        })));
      }
    } catch (error) {
      console.error('Error fetching Spotify Data:', error);
      if (error instanceof Error) {
        setError(`Failed to fetch your Spotify data: ${error.message}`);
      } else {
        setError('Failed to fetch your Spotify data. Please try logging in again.');
      }
    }
  };

  const generatePersonalityAnalysis = async () => {
    try {
        setGeneratingAnalysis(true);
        const response = await fetch('/api/personality', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topArtists: artists,
                topTracks: tracks
            }),
        });

        if (response.ok) {
            const data = await response.json();
            setAiAnalysis(data.text);
        } else {
            setAiAnalysis("Couldn't generate personality analysis at this time. Try refreshing!");
        }
    } catch (error) {
        console.error('Error generating personality analysis:', error);
        setAiAnalysis("Error generating your music personality. Please try again.");
    } finally {
        setGeneratingAnalysis(false);
    }
  };

  const clearAllStorage = () => {
    // Clear all possible storage mechanisms
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear Supabase storage specifically
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear cookies
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    }
  };

  const logOut = async () => {
    try {
      setLoggingOut(true);
      
      // Clear all storage first
      clearAllStorage();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Force a complete reload to reset all state
      window.location.href = "/?logout=true&t=" + new Date().getTime();
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback: force reload anyway
      window.location.href = "/?logout=true&t=" + new Date().getTime();
    }
  };

  const switchAccount = async () => {
    try {
      setLoggingOut(true);
      
      // Clear all storage first
      clearAllStorage();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Force a complete reload to reset all state
      window.location.href = "/?force_login=true&t=" + new Date().getTime();
    } catch (error) {
      console.error('Error during account switch:', error);
      // Fallback: force reload anyway
      window.location.href = "/?force_login=true&t=" + new Date().getTime();
    }
  };

  const retryAuthentication = () => {
    // Clear errors and restart authentication
    setError("");
    setAuthError("");
    clearAllStorage();
    window.location.href = "/?force_login=true&retry=true&t=" + new Date().getTime();
  };

  // Show authentication error if present
  if (authError) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black grid place-items-center p-4 sm:p-6">
        <div className="text-center text-white max-w-md mx-4">
          <div className="text-4xl mb-4">🔐</div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Authentication Error</h2>
          <p className="text-sm sm:text-base mb-6 bg-white/10 p-4 rounded-lg">{authError}</p>
          <div className="space-y-3 sm:space-y-0 sm:space-x-4">
            <button onClick={retryAuthentication} className="bg-white text-black px-6 py-2 rounded-full font-semibold hover:bg-gray-200 transition text-sm sm:text-base">
              Try Again
            </button>
            <button onClick={() => window.location.href = "/"} className="bg-white/10 text-white px-6 py-2 rounded-full font-semibold hover:bg-white/20 transition text-sm sm:text-base">
              Go Home
            </button>
          </div>
          <div className="mt-6 text-xs text-gray-400">
            <p>If this continues, please check that:</p>
            <ul className="list-disc list-inside text-left mt-2">
              <li>Your Spotify app settings include the correct redirect URIs</li>
              <li>You've granted all required permissions</li>
            </ul>
          </div>
        </div>
      </main>
    );
  }

  if (loggingOut) return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black grid place-items-center p-4 sm:p-6">
      <div className="text-center text-white max-w-xs sm:max-w-sm">
        <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-white mx-auto mb-4"></div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Logging out...</h2>
        <p className="text-sm opacity-80">Please wait while we sign you out</p>
      </div>
    </main>
  );

  if (loading) return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black grid place-items-center p-4 sm:p-6">
      <div className="text-center text-white max-w-xs sm:max-w-sm">
        <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-white mx-auto mb-4"></div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Analyzing your music taste...</h2>
        <p className="text-sm opacity-80">Fetching your Spotify data...</p>
      </div>
    </main>
  );

  if (error) return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black grid place-items-center p-4 sm:p-6">
      <div className="text-center text-white max-w-xs sm:max-w-md mx-4">
        <div className="text-4xl mb-4">😢</div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Oops! Something went wrong</h2>
        <p className="text-xs sm:text-sm mb-6 bg-white/10 p-4 rounded-lg">{error}</p>
        <button onClick={switchAccount} className="bg-white text-black px-6 py-2 rounded-full font-semibold hover:bg-gray-200 transition text-sm sm:text-base mr-2">
          Try Different Account
        </button>
        <button onClick={logOut} className="bg-white/10 text-white px-6 py-2 rounded-full font-semibold hover:bg-white/20 transition text-sm sm:text-base">
          Go Back
        </button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-4 sm:p-6">
      <div className="max-w-4xl mx-auto pt-6 sm:pt-10 md:pt-20">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">
            Who you are <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">(by music)</span>
          </h1>
          <p className="text-gray-300 text-sm sm:text-base">Your musical personality revealed through your top tracks and artists</p>
        </div>

        {/* User Profile & AI Analysis */}
        <section className="bg-white/5 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-10 border border-white/10">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8 items-start">
            <div className="flex flex-col items-center mx-auto sm:mx-0">
              {tracks?.[0]?.albumImage ? (
                <Image
                  src={tracks[0].albumImage} 
                  alt="Top track album cover" 
                  width={120}
                  height={120}
                  className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 object-cover rounded-lg sm:rounded-xl shadow-lg sm:shadow-2xl"
                  priority
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-white/10 rounded-lg sm:rounded-xl grid place-items-center text-2xl sm:text-4xl">🎧</div>
              )}
              <p className="text-xs sm:text-sm text-gray-400 mt-2 sm:mt-3 text-center">
                Signed in as <span className="font-semibold text-white">{userMeta?.name ?? "Spotify user"}</span>
              </p>
              <button 
                onClick={switchAccount}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Not you? Switch account
              </button>
            </div>
            
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4">Your Music Personality</h2>
              {generatingAnalysis ? (
                <div className="space-y-2 sm:space-y-3">
                  <div className="animate-pulse bg-white/10 rounded h-3 sm:h-4 w-3/4"></div>
                  <div className="animate-pulse bg-white/10 rounded h-3 sm:h-4 w-full"></div>
                  <div className="animate-pulse bg-white/10 rounded h-3 sm:h-4 w-5/6"></div>
                </div>
              ) : aiAnalysis ? (
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-200 leading-relaxed text-sm sm:text-base md:text-lg">{aiAnalysis}</p>
                </div>
              ) : (
                <p className="text-gray-400 text-sm sm:text-base">Generating your unique music personality analysis...</p>
              )}
            </div>
          </div>
        </section>

        {/* Top Artists & Tracks */}
        <section className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-10">
          <div className="bg-white/5 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
            <h2 className="font-bold text-xl sm:text-2xl text-white mb-3 sm:mb-4 flex items-center">
              <span className="mr-2">🎵</span> Current Top Artists
            </h2>
            <ol className="space-y-2 sm:space-y-3">
              {artists.map((a, index) => (
                <li key={a.id} className="flex items-center text-white">
                  <span className="text-lg sm:text-xl font-bold text-gray-400 w-6 sm:w-8">#{index + 1}</span>
                  <span className="text-sm sm:text-base md:text-lg truncate">{a.name}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
            <h2 className="font-bold text-xl sm:text-2xl text-white mb-3 sm:mb-4 flex items-center">
              <span className="mr-2">🎶</span> Current Top Tracks
            </h2>
            <ol className="space-y-2 sm:space-y-3">
              {tracks.map((t, index) => (
                <li key={t.id} className="flex items-center text-white">
                  <span className="text-lg sm:text-xl font-bold text-gray-400 w-6 sm:w-8">#{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base md:text-lg truncate">{t.name}</p>
                    <p className="text-xs sm:text-sm text-gray-400 truncate">{t.artist}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="text-center space-y-3 sm:space-y-0 sm:space-x-4">
          <button 
            onClick={switchAccount} 
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 sm:px-8 sm:py-3 rounded-full font-semibold transition backdrop-blur-lg border border-white/10 text-sm sm:text-base"
          >
            Switch Spotify Account
          </button>
          <button 
            onClick={logOut} 
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 sm:px-8 sm:py-3 rounded-full font-semibold transition backdrop-blur-lg border border-white/10 text-sm sm:text-base"
          >
            Log out & Analyze Again
          </button>
        </div>
      </div>
    </main>
  );
}