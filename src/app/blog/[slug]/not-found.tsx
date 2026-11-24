import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import HomeNav from "../../HomeNav";
import Footer from "@/components/Footer";

export default function ArticleNotFound() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <HomeNav />
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <FileQuestion className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="mt-5 text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>We couldn&apos;t find that article</h1>
        <p className="mt-2" style={{ color: "var(--text-secondary)" }}>It may have moved or been unpublished.</p>
        <Link href="/blog" className="mt-8 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900"><ArrowLeft className="h-4 w-4" /> Back to the blog</Link>
      </main>
      <Footer />
    </div>
  );
}
