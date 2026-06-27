import { BookCard } from "./book-card";
import type { MockBook } from "@/content/mock/narriva-home";

export interface FeaturedBooksCarouselProps {
  books: readonly MockBook[];
}

/** Plain horizontal scroll-snap row — no autoplay, no dot indicators, no
 * arrow buttons. The design handoff treats this as a native scrollable
 * shelf (thin custom scrollbar, scroll-snap), not a slideshow. */
export function FeaturedBooksCarousel({ books }: FeaturedBooksCarouselProps) {
  return (
    <div className="scrollx flex snap-x snap-mandatory gap-[30px] overflow-x-auto px-8 py-2 pb-6 [scroll-padding-left:32px]">
      {books.map((book) => (
        <div key={book.slug} className="w-[264px] flex-none snap-start">
          <BookCard book={book} />
        </div>
      ))}
      <div className="w-2 flex-none" />
    </div>
  );
}
