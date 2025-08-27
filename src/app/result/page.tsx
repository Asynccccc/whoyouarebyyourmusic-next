'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function ResultPage() {
  const router = useRouter();
  const [userMeta, setUserMeta] = useState<UserMetadata | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [displayed, setDisplayed] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session) return router.replace("/");

        setUserMeta(session.user?.user_metadata ?? null);
        const accessToken = session.provider_token;
        if (!accessToken) throw new Error("Missing Spotify access token. Please log in again.");

        const headers = { Authorization: `Bearer ${accessToken}` };

        const aRes = await fetch("https://api.spotify.com/v1/me/top/artists?limit=5&time_range=medium_term", { headers });
        if (!aRes.ok) throw new Error("Failed to fetch top artists");
        const aJson = await aRes.json();
        const topArtists = (aJson?.items ?? []).map((a: any) => ({
            id: a.id,
            name: a.name
        }));

        const tRes = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=short_term", { headers });
        if (!tRes.ok) throw new Error("Failed to fetch top tracks");
        const tJson = await tRes.json();
        const topTracks = (tJson?.items ?? []).map((t : any) => ({
          id: t.id,
          name: t.name,
          artist: t.artists?.[0]?.name ?? "",
          albumImage: t.album?.images?.[0]?.url ?? ""
        }));

        setArtists(topArtists);
        setTracks(topTracks);

        const resp = await fetch("/api/personality", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topArtists, topTracks }),
        });
        const { text } = await resp.json();

        // typing animation
        let i = 0;
        const tick = () => {
          if (i <= text.length) {
            setDisplayed(text.slice(0, i++));
            setTimeout(tick, 18);
          }
        };
        setDisplayed("");
        setTimeout(tick, 250);
      } catch (e: any) {
        setError(e?.message ?? "Unexpected error");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

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
              ? <img src={tracks[0].albumImage} alt="" className="w-40 h-40 object-cover rounded" />
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
