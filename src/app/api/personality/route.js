import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { topArtists = [], topTracks = [] } = await req.json();

    const artistList = topArtists.map(a => a.name).join(", ");
    const trackList  = topTracks.map(t => `${t.name} - ${t.artist}`).join(", ");

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a playful Gen Z/Alpha personality explainer. Use at least 5 full sentences. No formatting. Don't recommend new artists—only interpret what's given. Top artists: ${artistList} Top tracks: ${trackList} `;

    const resp = await model.generateContent(prompt);
    const text = resp?.response?.text?.() ?? "Couldn't generate a description right now.";
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
