"use client";

import { useState, type FormEvent } from "react";
import { submitCustomerReview } from "./actions";
import type { Category, CustomerReview } from "@/lib/store";

const FILTER_OPTIONS: ("All" | Category)[] = [
  "All",
  "Chicken Broast",
  "Shawarma",
  "Burger",
  "Loaded Fries",
  "Cold Drinks",
];

function formatReviewDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-PK", {
      timeZone: "Asia/Karachi",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
}

export default function ReviewsSection({
  initialReviews,
}: {
  initialReviews: CustomerReview[];
}) {
  const [reviews, setReviews] = useState(
    initialReviews.filter((r) => r.approved),
  );
  const [filter, setFilter] = useState<"All" | Category>("All");
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState<Category | "Overall">("Chicken Broast");
  const [favoriteDish, setFavoriteDish] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const averageRating = reviews.length
    ? (
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      ).toFixed(1)
    : "5.0";

  const visibleReviews =
    filter === "All"
      ? reviews
      : reviews.filter((r) => r.category === filter);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const result = await submitCustomerReview({
        customerName,
        phone,
        rating,
        category,
        favoriteDish,
        comment,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReviews((prev) => [result.review, ...prev]);
      setCustomerName("");
      setPhone("");
      setFavoriteDish("");
      setComment("");
      setRating(5);
      setShowForm(false);
      setSuccess(
        result.review.verifiedOrder
          ? "Thank you! Your Verified Customer Review is now live on our Wall of Cravings!"
          : "Thank you for sharing your review with Al-Tharid Jaranwala!",
      );
    } catch {
      setError("Could not submit review right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="reviews"
      className="reviews-section"
      aria-labelledby="reviews-heading"
    >
      <div className="wrap">
        <div className="reviews-section__header">
          <div>
            <span className="kicker">WALL OF CRAVINGS · JARANWALA VOICES</span>
            <h2 id="reviews-heading">
              Loved by <em>Jaranwala.</em>
            </h2>
            <p>
              Real feedback from food lovers across Jaranwala — from our
              pressure-fried Crispy Chicken Broast to late-night Zinger Burgers
              and Arabic Shawarmas.
            </p>
          </div>

          <div className="reviews-summary-box">
            <div className="reviews-summary-box__score">
              <strong>{averageRating}</strong>
              <div>
                <span className="reviews-stars" aria-label={`${averageRating} out of 5 stars`}>
                  ★★★★★
                </span>
                <small>Based on {reviews.length} local reviews</small>
              </div>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowForm((v) => !v)}
            >
              <span>{showForm ? "Close Review Form" : "Write a Review ✍️"}</span>
            </button>
          </div>
        </div>

        {success && (
          <div className="reviews-alert is-success" role="status">
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess("")}>
              ×
            </button>
          </div>
        )}

        {showForm && (
          <form className="reviews-form" onSubmit={(e) => void handleSubmit(e)}>
            <div className="reviews-form__top">
              <div>
                <span className="kicker">SHARE YOUR EXPERIENCE</span>
                <h3>Rate Your Al-Tharid Craving</h3>
              </div>
              <div className="reviews-star-picker" role="radiogroup" aria-label="Choose star rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    aria-pressed={rating === star}
                    className={star <= rating ? "is-lit" : ""}
                    onClick={() => setRating(star)}
                  >
                    ★
                  </button>
                ))}
                <span>{rating} / 5 Stars</span>
              </div>
            </div>

            {error && (
              <p className="reviews-alert is-error" role="alert">
                {error}
              </p>
            )}

            <div className="reviews-form__grid">
              <label>
                Your Name *
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Bilal Ahmad"
                />
              </label>

              <label>
                Mobile Number (Optional — unlocks Verified Order badge)
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300 1234567 (Never shown publicly)"
                  maxLength={20}
                />
              </label>

              <label>
                Food Category
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as Category | "Overall")
                  }
                >
                  <option value="Chicken Broast">Chicken Broast</option>
                  <option value="Burger">Burgers</option>
                  <option value="Shawarma">Shawarma</option>
                  <option value="Loaded Fries">Loaded Fries</option>
                  <option value="Cold Drinks">Cold Drinks</option>
                  <option value="Deals">Combo Deals</option>
                  <option value="Overall">Overall Experience</option>
                </select>
              </label>

              <label>
                Favourite Dish Ordered (Optional)
                <input
                  type="text"
                  maxLength={70}
                  value={favoriteDish}
                  onChange={(e) => setFavoriteDish(e.target.value)}
                  placeholder="e.g. Spicy Masala Injected Broast"
                />
              </label>

              <label className="reviews-form__wide">
                Your Review *
                <textarea
                  required
                  minLength={8}
                  maxLength={500}
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell Jaranwala what you loved about the taste, crunch, portion size, or delivery!"
                />
              </label>
            </div>

            <div className="reviews-form__actions">
              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                <span>{submitting ? "Posting Review…" : "Post My Review ↗"}</span>
              </button>
              <button
                type="button"
                className="outline-button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="reviews-filters" role="tablist" aria-label="Filter reviews by category">
          {FILTER_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={filter === item}
              className={filter === item ? "is-active" : ""}
              onClick={() => setFilter(item)}
            >
              {item === "All" ? "All Reviews" : item}
            </button>
          ))}
        </div>

        <div className="reviews-grid">
          {visibleReviews.map((review) => (
            <article
              key={review.id}
              className={`review-card${review.featured ? " is-featured" : ""}`}
            >
              <div className="review-card__top">
                <div className="review-card__author">
                  <span className="review-card__avatar" aria-hidden="true">
                    {review.customerName.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <strong>{review.customerName}</strong>
                    <div className="review-card__meta">
                      {review.verifiedOrder && (
                        <span className="review-card__verified">
                          ✓ Verified Order
                        </span>
                      )}
                      <time dateTime={review.createdAt}>
                        {formatReviewDate(review.createdAt)}
                      </time>
                    </div>
                  </div>
                </div>
                <div className="review-card__rating" aria-label={`${review.rating} out of 5 stars`}>
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </div>
              </div>

              {(review.favoriteDish || review.category) && (
                <div className="review-card__tags">
                  <span>{review.category}</span>
                  {review.favoriteDish && <b>{review.favoriteDish}</b>}
                </div>
              )}

              <p className="review-card__comment">“{review.comment}”</p>

              {review.adminReply && (
                <div className="review-card__reply">
                  <strong>Al-Tharid Jaranwala Team</strong>
                  <p>{review.adminReply}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

