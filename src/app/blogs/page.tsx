import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSite } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    "Jaranwala Food & Flavour Blogs | Crispy Chicken Broast, Burgers & Shawarma — Al-Tharid",
  description:
    "Discover the best fast food in Jaranwala, Punjab. Read Al-Tharid's guides on Crispy Chicken Broast, Zinger Burgers, Arabic Shawarmas, Loaded Fries, and free home delivery in Jaranwala.",
};

export default async function BlogsIndexPage() {
  const { blogs, seoKeywords } = await getSite();
  const published = blogs.filter((b) => b.published);

  return (
    <main id="main" className="blog-page">
      <div className="wrap">
        <div className="blog-page__hero">
          <span className="kicker">AL-THARID JARANWALA · LOCAL FOOD JOURNAL</span>
          <h1>
            Cravings, Recipes &amp;{" "}
            <em>Jaranwala Food Guides.</em>
          </h1>
          <p>
            Your insider guide to the crispiest Chicken Broast, towering Zinger
            Burgers, authentic Arabic Garlic Shawarmas, and best-value family
            fast food deals in Jaranwala, Punjab.
          </p>
          <div className="blog-page__cta-row">
            <Link href="/#chicken-broast" className="primary-button">
              Order Chicken Broast ↗
            </Link>
            <Link href="/#loyalty" className="outline-button">
              Join Craving Club (+1 Free Stamp) 🎁
            </Link>
          </div>
        </div>

        <div className="blog-grid blog-grid--full">
          {published.map((post) => (
            <article key={post.id} className="blog-card">
              <div className="blog-card__image">
                <Image
                  unoptimized
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  sizes="(max-width: 900px) 100vw, 50vw"
                />
                <span className="blog-card__category">{post.category}</span>
                <span className="blog-card__readtime">
                  {post.readTimeMinutes} min read
                </span>
              </div>

              <div className="blog-card__body">
                <div className="blog-card__meta">
                  <time dateTime={post.publishedAt}>{post.publishedAt}</time>
                  <span>·</span>
                  <strong>{post.primaryKeyword}</strong>
                </div>

                <h2>
                  <Link href={`/blogs/${post.slug}`}>{post.title}</Link>
                </h2>
                <p>{post.excerpt}</p>

                <div className="blog-card__tags">
                  {post.secondaryKeywords.slice(0, 3).map((kw) => (
                    <span key={kw}>#{kw}</span>
                  ))}
                </div>

                <div className="blog-card__actions">
                  <Link className="blog-card__link" href={`/blogs/${post.slug}`}>
                    Read full article <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <section className="seo-research-panel" aria-labelledby="seo-matrix-heading">
          <span className="kicker">LOCAL SEO &amp; KEYWORD RESEARCH · JARANWALA PUNJAB</span>
          <h2 id="seo-matrix-heading">
            What Food Lovers in Jaranwala Search For
          </h2>
          <p>
            Our local search research helps hungry customers across Jaranwala
            find fresh, halal, hygienically prepared fast food with fast home
            delivery.
          </p>

          <div className="seo-matrix-grid">
            {seoKeywords.map((item) => (
              <div key={item.keyword} className="seo-matrix-card">
                <div className="seo-matrix-card__top">
                  <strong>“{item.keyword}”</strong>
                  <span>{item.intent}</span>
                </div>
                {item.urduTransliteration && (
                  <small className="seo-matrix-card__urdu">
                    Local query: {item.urduTransliteration}
                  </small>
                )}
                <p>{item.strategyNote}</p>
                <div className="seo-matrix-card__meta">
                  <span>Volume: {item.monthlySearchPotential}</span>
                  <span>Competition: {item.competition}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

