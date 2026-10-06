"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { Item } from "@/lib/store";
import { getProductPhotos } from "@/lib/productPhotos";
import { useCart } from "./CartProvider";

export default function ProductCard({ item }: { item: Item }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const galleryTitleId = useId();
  const { addItem } = useCart();

  const photos = getProductPhotos(item);
  const photo = photos[photoIndex] ?? photos[0];
  const canAdd = item.available && item.price !== null;

  useEffect(() => {
    if (!galleryOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;

    dialog.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [galleryOpen]);

  const movePhoto = (direction: number) => {
    setPhotoIndex(
      (current) => (current + direction + photos.length) % photos.length
    );
  };

  return (
    <article className={`menu-card${canAdd ? "" : " is-unavailable"}`}>
      <div className="menu-card__image">
        <button
          className="menu-card__image-open"
          type="button"
          aria-label={`Open image gallery for ${item.name}`}
          onClick={() => setGalleryOpen(true)}
        >
          <Image
            unoptimized
            src={photo.src}
            alt={`Preview photo ${photoIndex + 1} for ${item.name}`}
            fill
            sizes="(max-width: 1020px) 50vw, 33vw"
          />
        </button>

        <span className="menu-card__tag">PREVIEW PHOTO</span>

        <span className="menu-card__view">
          View photos · {photos.length}
        </span>

        <strong className="menu-card__price">
          {item.price === null ? (
            "TBC"
          ) : (
            <>
              <small>PKR</small> {item.price.toLocaleString("en-PK")}
            </>
          )}
        </strong>
      </div>

      <div className="menu-card__body">
        <span className="menu-card__category">
          {item.category === "Burger" ? "Burgers" : item.category}
        </span>

        <h3>{item.name}</h3>
        <p>{item.description}</p>

        {canAdd ? (
          <div className="menu-card__order">
            <div className="menu-card__quantity">
              <span>Quantity</span>

              <div
                className="quantity-control"
                aria-label={`Quantity for ${item.name}`}
              >
                <button
                  type="button"
                  aria-label={`Decrease ${item.name} quantity`}
                  disabled={quantity === 1}
                  onClick={() => setQuantity((value) => value - 1)}
                >
                  −
                </button>

                <output aria-live="polite">{quantity}</output>

                <button
                  type="button"
                  aria-label={`Increase ${item.name} quantity`}
                  disabled={quantity === 99}
                  onClick={() => setQuantity((value) => value + 1)}
                >
                  +
                </button>
              </div>
            </div>

            <button
              className="menu-card__add"
              type="button"
              onClick={() => {
                addItem(item.id, quantity);
                setAdded(true);
                window.setTimeout(() => setAdded(false), 1600);
              }}
            >
              <span>{added ? "Added ✓" : "Add to cart"}</span>

              {!added && (
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 7h12l1 13H5L6 7Z" />
                  <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          <span className="menu-card__unavailable">
            Currently unavailable
          </span>
        )}
      </div>

      <dialog
        ref={dialogRef}
        className="product-gallery"
        aria-labelledby={galleryTitleId}
        onClose={() => setGalleryOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setGalleryOpen(false);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            movePhoto(-1);
          }

          if (event.key === "ArrowRight") {
            event.preventDefault();
            movePhoto(1);
          }
        }}
      >
        <div className="product-gallery__content">
          <div className="product-gallery__header">
            <div>
              <span>PRODUCT PHOTOS</span>
              <h2 id={galleryTitleId}>{item.name}</h2>
            </div>

            <button
              className="product-gallery__close"
              type="button"
              aria-label="Close image gallery"
              onClick={() => setGalleryOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="product-gallery__image">
            <Image
              unoptimized
              src={photo.src}
              alt={`Preview photo ${photoIndex + 1} for ${item.name}`}
              fill
              sizes="(max-width: 900px) 95vw, 850px"
            />

            {photos.length > 1 && (
              <>
                <button
                  className="product-gallery__previous"
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => movePhoto(-1)}
                >
                  ‹
                </button>

                <button
                  className="product-gallery__next"
                  type="button"
                  aria-label="Next photo"
                  onClick={() => movePhoto(1)}
                >
                  ›
                </button>
              </>
            )}
          </div>

          <p className="product-gallery__counter" aria-live="polite">
            Photo {photoIndex + 1} of {photos.length} · Preview images
          </p>

          {photos.length > 1 && (
            <div
              className="menu-card__thumbnails"
              role="group"
              aria-label="Choose a gallery photo"
            >
              {photos.map((entry, index) => (
                <button
                  key={`${entry.src}-${index}`}
                  type="button"
                  className={`menu-card__thumbnail${photoIndex === index ? " is-selected" : ""
                    }`}
                  aria-label={`View photo ${index + 1}`}
                  aria-pressed={photoIndex === index}
                  onClick={() => setPhotoIndex(index)}
                >
                  <Image
                    unoptimized
                    src={entry.src}
                    alt=""
                    fill
                    sizes="56px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </dialog>
    </article>
  );
}