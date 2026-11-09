import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSite } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { blogs } = await getSite();
  const post = blogs.find((b) => b.slug === slug && b.published);
  if (!post) return { title: "Article Not Found | Al-Tharid Jaranwala" };

  return {
    title: `${post.title} | Al-Tharid Jaranwala`,
    description: post.excerpt,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords, "Jaranwala fast food", "Al-Tharid"],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      images: [post.coverImage],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { blogs, settings } = await getSite();
  const post = blogs.find((b) => b.slug === slug && b.published);
  if (!post) notFound();

  const related = blogs
    .filter((b) => b.published && b.slug !== post.slug)
    .slice(0, 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt,
        image: post.coverImage,
        datePublished: post.publishedAt,
        author: {
          "@type": "Organization",
          name: post.author,
        },
        publisher: {
          "@type": "FastFoodRestaurant",
          name: "Al-Tharid Jaranwala",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Jaranwala",
            addressRegion: "Punjab",
            addressCountry: "PK",
            streetAddress: settings.address,
          },
        },
        keywords: [post.primaryKeyword, ...post.secondaryKeywords].join(", "),
      },
      ...(post.faqs.length > 0
        ? [
            {
              "@type": "FAQPage",
              mainEntity: post.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.answer,
                },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <main id="main" className="blog-article-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="wrap blog-article">
        <nav className="blog-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/blog">Jaranwala Food Blog</Link>
          <span>/</span>
          <span aria-current="page">{post.category}</span>
        </nav>

        <header className="blog-article__header">
          <div className="blog-article__badges">
            <span className="blog-article__cat">{post.category}</span>
            <span>{post.readTimeMinutes} min read</span>
            <time dateTime={post.publishedAt}>{post.publishedAt}</time>
          </div>
          <h1>{post.title}</h1>
          <p className="blog-article__lead">{post.excerpt}</p>
        </header>

        <div className="blog-article__cover">
          <Image
            unoptimized
            src={post.coverImage}
            alt={post.title}
            fill
            priority
            sizes="(max-width: 1000px) 100vw, 920px"
          />
        </div>

        <div className="blog-article__content">
          {post.content.map((para, index) => (
            <p key={index}>{para}</p>
          ))}

          <div className="blog-article__order-cta">
            <div>
              <span className="kicker">CRAVING IT RIGHT NOW IN JARANWALA?</span>
              <h3>Order Fresh from Al-Tharid’s Kitchen</h3>
              <p>
                Free home delivery in Jaranwala on orders of Rs 500 or above — plus
                every order earns a stamp on your Craving Club loyalty card!
              </p>
            </div>
            <div className="blog-article__order-buttons">
              <Link href="/#chicken-broast" className="primary-button">
                Explore Menu &amp; Order ↗
              </Link>
              <Link href="/cart" className="outline-button">
                Go to Cart
              </Link>
            </div>
          </div>

          {post.faqs.length > 0 && (
            <section className="blog-article__faqs" aria-labelledby="faq-heading">
              <h2 id="faq-heading">
                Frequently Asked Questions — Al-Tharid Jaranwala
              </h2>
              {post.faqs.map((faq, idx) => (
                <div key={idx} className="blog-faq-box">
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </div>
              ))}
            </section>
          )}

          <div className="blog-article__keywords">
            <strong>Local Search Topics:</strong>
            <span>#{post.primaryKeyword}</span>
            {post.secondaryKeywords.map((kw) => (
              <span key={kw}>#{kw}</span>
            ))}
          </div>
        </div>

        {related.length > 0 && (
          <section className="blog-related" aria-labelledby="related-heading">
            <h2 id="related-heading">More from Al-Tharid Journal</h2>
            <div className="blog-grid">
              {related.map((item) => (
                <article key={item.id} className="blog-card">
                  <div className="blog-card__image">
                    <Image
                      unoptimized
                      src={item.coverImage}
                      alt={item.title}
                      fill
                      sizes="(max-width: 900px) 100vw, 45vw"
                    />
                    <span className="blog-card__category">{item.category}</span>
                  </div>
                  <div className="blog-card__body">
                    <h3>
                      <Link href={`/blog/${item.slug}`}>{item.title}</Link>
                    </h3>
                    <p>{item.excerpt}</p>
                    <Link className="blog-card__link" href={`/blog/${item.slug}`}>
                      Read article ↗
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}

