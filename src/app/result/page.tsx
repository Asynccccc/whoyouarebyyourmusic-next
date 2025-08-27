'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { UserMetadata } from '@supabase/supabase-js';

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
  const [userMeta, setUserMeta] = useState<UserMetadata | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [displayed, setDisplayed] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const init = async () => {
        try{
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;

            if (!session) {
                console.log("No session yet, waiting for onAuthStateChange...")
                return;
            }

            if (mounted) {
                setUserMeta(session.user?.user_metadata ?? null);

                const accessToken = session.provider_token;
                if (!accessToken) throw new Error("Missing Spotify aaccess token. Please log in again");

                await fetchSpotifyData(accessToken);

                await generatePersonalityAnalysis();
            }
        } catch (e) {
            if (e instanceof Error) {
                if (e.message.includes('rate limit') || e.message.includes('seconds')) {
                    setError('Please wait a minute before trying again');
                } else {
                    setError(e.message);
                }
            } else {
                setError('Unexpected errror');
            }
        } finally {
            if (mounted) setLoading(false);
        }
    };

    init ()

    const {data: listener} = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
            setUserMeta(session.user?.user_metadata ?? null);
            if (session.provider_token) {
                fetchSpotifyData(session.provider_token);
            }
        } else {
            router.replace("/");
        }
    });

    return () => {
        mounted = false;
        listener.subscription.unsubscribe();
    };
  }, [router]);

  const fetchSpotifyData = async (accessToken: string) => {
    try {
        const artistsResponse = await fetch('https://api.spotify.com/v1/me/top/artists?limit=10', {
            headers: { 'Authorization': `Bearer ${accessToken}`}
        });
        const artistsData = await artistsResponse.json();

        if (artistsData.items) {
            setArtists(artistsData.items.map((artists: SpotifyArtist) => ({
                id: artists.id,
                name: artists.name
            })));
        }

        const tracksReponse = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=10', {
            headers: { 'Authorization': `Bearer ${accessToken}`}
        });
        const tracksData = await tracksReponse.json();

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
        setError('Failed to fetch your Spotify Data');
    }
  };

  const generatePersonalityAnalysis = async () => {
    try {
        if (artists.length === 0 || tracks.length === 0) return;

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
            setDisplayed(data.text);
        } else {
            setDisplayed("Couldn't generate personality analysis at this time.");
        }
    } catch (error) {
        console.error('Error generating personality analysis:', error);
        setDisplayed("Error generating your music personality.");
    }
  }

  const logOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (loading) return (
    <main className="result-bg min-h-screen grid place-items-center p-6">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <h2 className="text-xl font-bold mb-2">Analyzing your music taste...</h2>
        <p className="text-sm opacity-80">Fetching your Spotify data...</p>
      </div>
    </main>
  );

  if (error) return (
    <main className="result-bg min-h-screen grid place-items-center p-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Oops! Something went wrong</h2>
        <p className="text-sm mb-4">{error}</p>
        <button onClick={logOut} className="btn">Go Back</button>
      </div>
    </main>
  );

  return (
    <main className="result-bg min-h-screen p-6">
      <div className="max-w-3xl mx-auto pt-14 md:pt-24">
        <h1 className="text-2xl font-bold mb-6">Who you are (by music)</h1>

        <section className="grid md:grid-cols-[160px,1fr] gap-6 md:gap-10 items-start">
          <div>
            {tracks?.[0]?.albumImage
              ? <Image
                  src={tracks[0].albumImage} 
                  alt="Album cover" 
                  width={160}
                  height={160}
                  className="w-40 h-40 object-cover rounded"
                />
              : <div className="w-40 h-40 bg-white/10 rounded grid place-items-center">🎧</div>}
          </div>
          <div>
            <p className="text-sm opacity-80 mb-2">Signed in as <span className="font-semibold">{userMeta?.name ?? "Spotify user"}</span></p>
            <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-7">{displayed}</div>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-10 mt-10">
          <div>
            <h2 className="font-bold text-xl mb-2">Current Top Artists</h2>
            <ol className="text-left text-sm space-y-1 list-decimal list-inside">
              {artists.map(a => <li key={a.id}>{a.name}</li>)}
            </ol>
          </div>
          <div>
            <h2 className="font-bold text-xl mb-2">Current Top Tracks</h2>
            <ol className="text-left text-sm space-y-1 list-decimal list-inside">
              {tracks.map(t => <li key={t.id}>{t.name} — {t.artist}</li>)}
            </ol>
          </div>
        </section>

        <button onClick={logOut} className="btn mt-8">Log out</button>
      </div>
    </main>
  );
}