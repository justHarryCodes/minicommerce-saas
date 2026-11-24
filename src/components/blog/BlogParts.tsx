// Building blocks for the Duka blog, shared by the public pages and the
// admin editor's preview. No client hooks here.
import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { AlertTriangle, BookOpen, Clock, Info, Lightbulb, Megaphone, Sparkles, TrendingUp, Trophy, Wallet, type LucideIcon } from "lucide-react";
import type { Inline } from "@/lib/rich-text";
import { blogCategory, blogExcerpt, formatBlogDate, TONE_CLASSES, type ArticleBlock, type BlogCardPost } from "@/lib/blog-shared";

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  "selling-tips": TrendingUp,
  guides: BookOpen,
  marketing: Megaphone,
  payments: Wallet,
  "success-stories": Trophy,
  "product-news": Sparkles,
};

export function CategoryBadge({ id, link = false, size = "sm" }: { id: string; link?: boolean; size?: "sm" | "md" }) {
  const c = blogCategory(id);
  const Icon = CATEGORY_ICON[c.id] ?? BookOpen;
  const cls = `inline-flex items-center gap-1.5 rounded-full font-semibold ${TONE_CLASSES[c.tone].badge} ${size === "md" ? "px-3 py-1 text-[13px]" : "px-2.5 py-0.5 text-[11px]"}`;
  const inner = (
    <>
      <Icon className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} /> {c.label}
    </>
  );
  return link ? (
    <Link href={`/blog?category=${c.id}`} className={`${cls} transition-opacity hover:opacity-80`}>
      {inner}
    </Link>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

const AVATAR_GRADIENTS = ["from-amber-400 to-orange-500", "from-sky-400 to-blue-600", "from-emerald-400 to-teal-600", "from-pink-400 to-rose-600", "from-violet-400 to-purple-600"];

export function AuthorAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "D";
  const g = AVATAR_GRADIENTS[[...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % AVATAR_GRADIENTS.length];
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br ${g} font-bold text-white`} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {initials}
    </span>
  );
}

/** The post's cover, or a branded placeholder in the category's colours. */
export function BlogCover({ post, sizes, priority = false, className = "" }: { post: Pick<BlogCardPost, "cover_url" | "category" | "title">; sizes: string; priority?: boolean; className?: string }) {
  const c = blogCategory(post.category);
  const Icon = CATEGORY_ICON[c.id] ?? BookOpen;
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${TONE_CLASSES[c.tone].soft} ${className}`}>
      {post.cover_url ? (
        <Image src={post.cover_url} alt="" fill sizes={sizes} priority={priority} className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
      ) : (
        <>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/40 blur-2xl dark:bg-white/5" />
          <Image src="/logo-mark.png" alt="" width={120} height={188} className="absolute -bottom-6 right-6 h-[70%] w-auto opacity-[0.12] dark:opacity-20" />
          <div className="absolute inset-0 grid place-items-center">
            <span className={`grid h-14 w-14 place-items-center rounded-2xl bg-white/70 shadow-sm backdrop-blur dark:bg-white/10`}>
              <Icon className="h-7 w-7 text-zinc-800 dark:text-white" />
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function Meta({ post }: { post: BlogCardPost }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px]" style={{ color: "var(--text-muted)" }}>
      <AuthorAvatar name={post.author_name} size={32} />
      <div className="min-w-0 leading-tight">
        <p className="truncate font-medium" style={{ color: "var(--text-secondary)" }}>{post.author_name}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px]">
          <span>{formatBlogDate(post.published_at)}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {post.reading_minutes} min read</span>
        </p>
      </div>
    </div>
  );
}

export function BlogCard({ post }: { post: BlogCardPost }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.35)]" style={{ borderColor: "var(--border)", background: "var(--card, var(--bg))" }}>
      <BlogCover post={post} sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" className="aspect-[16/10]" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <CategoryBadge id={post.category} />
        <h3 className="text-lg font-bold leading-snug tracking-tight" style={{ color: "var(--text-primary)" }}>
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0">{post.title}</Link>
        </h3>
        <p className="line-clamp-3 text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{blogExcerpt({ excerpt: post.excerpt, body: "" }) || ""}</p>
        <div className="mt-auto pt-2"><Meta post={post} /></div>
      </div>
    </article>
  );
}

export function FeaturedPost({ post }: { post: BlogCardPost }) {
  return (
    <article className="group relative grid overflow-hidden rounded-[28px] border lg:grid-cols-[1.15fr_1fr]" style={{ borderColor: "var(--border)", background: "var(--card, var(--bg))" }}>
      <BlogCover post={post} sizes="(min-width: 1024px) 640px, 100vw" priority className="aspect-[16/10] lg:aspect-auto lg:min-h-[380px]" />
      <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white dark:bg-white dark:text-zinc-900">
            <Sparkles className="h-3 w-3" /> Featured
          </span>
          <CategoryBadge id={post.category} />
        </div>
        <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-4xl" style={{ color: "var(--text-primary)" }}>
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0">{post.title}</Link>
        </h2>
        {post.excerpt && <p className="text-base leading-relaxed sm:text-lg" style={{ color: "var(--text-secondary)" }}>{post.excerpt}</p>}
        <Meta post={post} />
      </div>
    </article>
  );
}

/* ───────────────────────── Article body ───────────────────────── */

function Inlines({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) =>
        n.t === "text" ? <Fragment key={i}>{n.v}</Fragment>
        : n.t === "bold" ? <strong key={i} className="font-semibold" style={{ color: "var(--text-primary)" }}><Inlines nodes={n.c} /></strong>
        : n.t === "italic" ? <em key={i}><Inlines nodes={n.c} /></em>
        : (
          <a key={i} href={n.href} className="font-medium underline decoration-amber-400 decoration-2 underline-offset-[3px] transition-colors hover:text-amber-600" style={{ color: "var(--text-primary)" }} {...(/^https?:/i.test(n.href) && !n.href.includes("dukanigeria.com") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            <Inlines nodes={n.c} />
          </a>
        ),
      )}
    </>
  );
}
/** Photographer / licence line under an image (small, muted, links open in a new tab). */
export function ImageCredit({ nodes, className = "" }: { nodes: Inline[]; className?: string }) {
  return (
    <p className={`text-xs leading-relaxed [&_a]:font-normal [&_a]:decoration-1 ${className}`} style={{ color: "var(--text-muted)" }}>
      <Inlines nodes={nodes} />
    </p>
  );
}

const Lines = ({ lines }: { lines: Inline[][] }) => <>{lines.map((l, i) => <Fragment key={i}>{i > 0 && <br />}<Inlines nodes={l} /></Fragment>)}</>;

const CALLOUT: Record<"tip" | "note" | "warning", { icon: LucideIcon; label: string; cls: string }> = {
  tip: { icon: Lightbulb, label: "Tip", cls: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100" },
  note: { icon: Info, label: "Note", cls: "border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-100" },
  warning: { icon: AlertTriangle, label: "Heads up", cls: "border-red-300 bg-red-50 text-red-950 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100" },
};

export function BlogBody({ blocks }: { blocks: ArticleBlock[] }) {
  const out: ReactNode[] = [];
  blocks.forEach((b, i) => {
    switch (b.t) {
      case "h": {
        const id = (b as { id?: string }).id;
        const cls = b.level === 2 ? "mt-12 text-2xl sm:text-[28px]" : b.level === 3 ? "mt-9 text-xl" : "mt-7 text-lg";
        const Tag = (b.level === 2 ? "h2" : b.level === 3 ? "h3" : "h4") as "h2";
        out.push(
          <Tag key={i} id={id} className={`group/h scroll-mt-28 font-bold leading-tight tracking-tight ${cls}`} style={{ color: "var(--text-primary)" }}>
            <Inlines nodes={b.c} />
            {id && <a href={`#${id}`} aria-label="Link to this section" className="ml-2 text-amber-500 opacity-0 transition-opacity group-hover/h:opacity-100">#</a>}
          </Tag>,
        );
        break;
      }
      case "p":
        out.push(<p key={i} className="mt-5 text-[17px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}><Lines lines={b.c} /></p>);
        break;
      case "ul":
      case "ol": {
        const L = b.t === "ul" ? "ul" : "ol";
        out.push(
          <L key={i} className={`mt-5 space-y-2.5 pl-6 text-[17px] leading-[1.75] marker:font-semibold marker:text-amber-500 ${b.t === "ul" ? "list-disc" : "list-decimal"}`} style={{ color: "var(--text-secondary)" }}>
            {b.items.map((it, j) => <li key={j} className="pl-1"><Inlines nodes={it} /></li>)}
          </L>,
        );
        break;
      }
      case "quote":
        out.push(
          <blockquote key={i} className="relative mt-8 rounded-2xl py-2 pl-7 pr-4 text-xl font-medium italic leading-relaxed" style={{ color: "var(--text-primary)" }}>
            <span className="absolute left-0 top-0 h-full w-1.5 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
            <Lines lines={b.c} />
          </blockquote>,
        );
        break;
      case "callout": {
        const k = CALLOUT[b.kind];
        out.push(
          <aside key={i} className={`mt-7 flex gap-3 rounded-2xl border-l-4 px-5 py-4 text-[16px] leading-relaxed ${k.cls}`}>
            <k.icon className="mt-1 h-5 w-5 shrink-0" />
            <div><p className="mb-0.5 text-xs font-bold uppercase tracking-wider opacity-80">{k.label}</p><Lines lines={b.c} /></div>
          </aside>,
        );
        break;
      }
      case "img":
        out.push(
          <figure key={i} className="mt-8">
            {/* eslint-disable-next-line @next/next/no-img-element -- images can come from any https host */}
            <img src={b.src} alt={b.alt} loading="lazy" className="w-full rounded-2xl border object-cover" style={{ borderColor: "var(--border)" }} />
            {(b.alt || b.credit) && (
              <figcaption className="mt-2 text-center">
                {b.alt && <span className="block text-sm" style={{ color: "var(--text-muted)" }}>{b.alt}</span>}
                {b.credit && <ImageCredit nodes={b.credit} className="mt-0.5" />}
              </figcaption>
            )}
          </figure>,
        );
        break;
      case "hr":
        out.push(<div key={i} className="my-10 flex justify-center gap-2" aria-hidden><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /></div>);
        break;
    }
  });
  return <div className="[&>*:first-child]:mt-0">{out}</div>;
}
