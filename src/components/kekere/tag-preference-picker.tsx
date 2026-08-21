"use client";

import { TAG_CATEGORIES, TAG_BY_SLUG } from "@/content/story-tags";

export interface TagPreferencePickerProps {
  value: string[];
  onChange: (tagSlugs: string[]) => void;
}

/** Reader-facing tag multi-select for the Preferences page — grouped by
 *  TAG_CATEGORIES (the same groupings the feed itself rows tags into) so
 *  scanning the picker previews how a pick will show up on the feed.
 *  Unlike admin/TagPicker.tsx this is uncapped: a reader can like as many
 *  tags as they actually like. */
export function TagPreferencePicker({ value, onChange }: TagPreferencePickerProps) {
  const selected = new Set(value);

  function toggle(slug: string) {
    if (selected.has(slug)) {
      onChange(value.filter((s) => s !== slug));
    } else {
      onChange([...value, slug]);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {TAG_CATEGORIES.map((category) => (
        <div key={category.slug}>
          <h3 className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted-2)]">
            {category.title}
          </h3>
          <div className="flex flex-wrap gap-2">
            {category.tagSlugs.map((slug) => {
              const tag = TAG_BY_SLUG[slug];
              if (!tag) return null;
              const isSelected = selected.has(slug);
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => toggle(slug)}
                  aria-pressed={isSelected}
                  className={
                    isSelected
                      ? "rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] px-3.5 py-[7px] text-[13px] font-semibold text-white transition-colors"
                      : "rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-[7px] text-[13px] font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)]/30"
                  }
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
