import { NextRequest, NextResponse } from "next/server";
import { getPublishedPost } from "@/lib/blog";
import { blogCategory } from "@/lib/blog-shared";
import { CARD_HEADERS, blogCard } from "@/lib/og-cards";

export const runtime = "nodejs";

// GET /api/og/blog/<slug>?v=<updated>
// The share card for a blog article (WhatsApp, Facebook, X, LinkedIn…):
// Duka logo, category, headline, byline and the cover photo, as a 1200x630 JPEG.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const post = await getPublishedPost((await params).slug).catch(() => null);
  if (!post) return new NextResponse("Not found", { status: 404 });
  try {
    const jpg = await blogCard({
      title: post.title,
      category: blogCategory(post.category).label,
      cover: post.cover_url,
      author: post.author_name || "Duka team",
      minutes: post.reading_minutes,
    });
    return new NextResponse(new Uint8Array(jpg), { headers: CARD_HEADERS });
  } catch (e) {
    console.error("[og] blog card failed:", e);
    return new NextResponse("Card unavailable", { status: 500 });
  }
}
