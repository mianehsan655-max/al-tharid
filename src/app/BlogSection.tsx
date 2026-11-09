"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { BlogPost, SeoKeyword } from "@/lib/store";

export default function BlogSection({
  posts,
  keywords,
}: {
  posts: BlogPost[];
  keywords: SeoKeyword[];
}) {
  const publishedPosts = posts.filter((p) => p.published);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  return (
    <section
      id="blog"
      className="blog-section"
      aria-labelledby="blog-heading"
    >
      <div className="wrap">
        <div className="blog-section__header">
          <div>
            <span className="kicker">
              AL-THARID JOURNAL · JARANWALA FOOD &amp; FLAVOUR GUIDE
            </span>
            <h2 id="blog-heading">
              Stories, Recipes &amp;{" "}
              <em>Local Cravings.</em>
            </h2>
          </div>
          <div className="blog-section__intro">
            <p>
              Explore our local food guides for Jaranwala, Punjab — from how we
              pressure-fry our Crispy Chicken Broast to the best family fast-food
              combos and free delivery tips.
            </p>
            <Link href="/blog" className="outline-button">
              View All Articles &amp; SEO Guide ↗
            </Link>
          </div>
        </div>

        {/* Popular Local Search Tags in Jaranwala */}
        <div className="blog-keyword-strip" aria-label="Popular food searches in Jaranwala">
          <span className="blog-keyword-strip__label">
            POPULAR IN JARANWALA:
          </span>
          <div className="blog-keyword-strip__tags">
            {keywords.slice(0, 6).map((kw) => (
              <Link
                key={kw.keyword}
                href="/blog"
                className="blog-keyword-pill"
                title={kw.strategyNote}
              >
                <span>#</span> {kw.keyword}
              </Link>
            ))}
          </div>
        </div>

        <div className="blog-grid">
          {publishedPosts.slice(0, 4).map((post, idx) => (
            <article
              key={post.id}
              className={`blog-card${idx === 0 ? " is-featured" : ""}`}
            >
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

                <h3>
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h3>
                <p>{post.excerpt}</p>

                <div className="blog-card__actions">
                  <Link className="blog-card__link" href={`/blog/${post.slug}`}>
                    Read full article <span aria-hidden="true">↗</span>
                  </Link>
                  <button
                    type="button"
                    className="blog-card__quickview"
                    onClick={() => setSelectedPost(post)}
                  >
                    Quick Read
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {selectedPost && (
          <div
            className="blog-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="blog-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedPost(null);
            }}
          >
            <div className="blog-modal">
              <div className="blog-modal__header">
                <div>
                  <span className="kicker">
                    {selectedPost.category} · {selectedPost.readTimeMinutes} MIN READ
                  </span>
                  <h3 id="blog-modal-title">{selectedPost.title}</h3>
                </div>
                <button
                  type="button"
                  aria-label="Close article preview"
                  onClick={() => setSelectedPost(null)}
                >
                  ×
                </button>
              </div>

              <div className="blog-modal__body">
                {selectedPost.content.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}

                {selectedPost.faqs.length > 0 && (
                  <div className="blog-modal__faqs">
                    <h4>Frequently Asked Questions (Jaranwala)</h4>
                    {selectedPost.faqs.map((faq, i) => (
                      <div key={i} className="blog-faq-item">
                        <strong>Q: {faq.question}</strong>
                        <p>{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="blog-modal__footer">
                <Link
                  href={`/blog/${selectedPost.slug}`}
                  className="primary-button"
                  onClick={() => setSelectedPost(null)}
                >
                  Open Dedicated Article Page ↗
                </Link>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setSelectedPost(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

