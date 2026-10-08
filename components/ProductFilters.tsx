"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { rememberSearch } from "../lib/recent-searches";

type Current = {
  search: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  colour: string;
  material: string;
  rating: string;
  sort: string;
};

type FacetOption = { value: string; count: number };

type Props = {
  categories: string[];
  current: Current;
  /** Choices available for the current search/category; a filter with none is hidden. */
  facets?: { colours: FacetOption[]; materials: FacetOption[]; rated: boolean };
};

const SORT_LABELS: Record<string, string> = {
  relevance: "Best match",
  popularity: "Popular",
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  rating: "Best Rated",
};

export default function ProductFilters({ categories, current, facets }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(current.search);
  // Phones: search/price/sort fold behind a "Filters" button to keep products above the fold.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(current.minPrice);
  const [maxPrice, setMaxPrice] = useState(current.maxPrice);

  // Keep local input state in sync when navigation changes params externally
  // (e.g. the navbar search bar, a category link, or "Clear Filters").
  useEffect(() => setSearchInput(current.search), [current.search]);
  useEffect(() => setMinPrice(current.minPrice), [current.minPrice]);
  useEffect(() => setMaxPrice(current.maxPrice), [current.maxPrice]);

  function updateParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    // Changing a filter or sort should always start again from page 1.
    next.delete("page");

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }

    router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname);
  }

  useEffect(() => {
    if (searchInput === current.search) return;

    const timer = setTimeout(() => {
      updateParams({ search: searchInput || null });
      if (searchInput.trim()) rememberSearch(searchInput);
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    if (minPrice === current.minPrice && maxPrice === current.maxPrice) return;

    const timer = setTimeout(() => {
      updateParams({ minPrice: minPrice || null, maxPrice: maxPrice || null });
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice]);

  function selectCategory(name: string) {
    updateParams({ category: name === "All Products" ? null : name });
  }

  function toggleInStock() {
    updateParams({ inStock: current.inStock ? null : "1" });
  }

  function clearAll() {
    router.replace(pathname);
  }

  // Searching sorts by relevance unless the shopper picks another order.
  const defaultSort = current.search ? "relevance" : "newest";
  const sortOptions = Object.entries(SORT_LABELS).filter(([value]) => current.search || value !== "relevance");

  const hasActiveFilters = Boolean(
    current.search ||
      current.category ||
      current.minPrice ||
      current.maxPrice ||
      current.inStock ||
      current.colour ||
      current.material ||
      current.rating ||
      (current.sort && current.sort !== defaultSort)
  );

  return (
    <div className="filters-bar">
      <div className="category-filter">
        <button
          className={!current.category ? "active" : ""}
          onClick={() => selectCategory("All Products")}
        >
          All Products
        </button>

        {categories.map((cat) => (
          <button
            key={cat}
            className={current.category === cat ? "active" : ""}
            onClick={() => selectCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="filters-toggle"
        aria-expanded={filtersOpen}
        aria-controls="filters-row"
        onClick={() => setFiltersOpen((open) => !open)}
      >
        {filtersOpen ? "Hide filters" : "Search, filter & sort"}
        {hasActiveFilters && !filtersOpen && <span className="filters-toggle-dot" aria-label="filters active" />}
      </button>

      <div id="filters-row" className={`filters-row${filtersOpen ? " open" : ""}`}>
        <div className="filter-search">
          <input
            type="search"
            placeholder="Refine your search..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Refine search"
          />
        </div>

        <div className="filter-group">
          <label>Price</label>
          <div className="price-range-inputs">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              min={0}
              onChange={(e) => setMinPrice(e.target.value)}
              aria-label="Minimum price"
            />
            <span>–</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              min={0}
              onChange={(e) => setMaxPrice(e.target.value)}
              aria-label="Maximum price"
            />
          </div>
        </div>

        {/* Keep a chosen value in the list even if it no longer has matches, so the select shows it. */}
        {facets && (facets.colours.length > 0 || current.colour) && (
          <div className="filter-group">
            <label htmlFor="colour-select">Colour</label>
            <select
              id="colour-select"
              value={current.colour}
              onChange={(e) => updateParams({ colour: e.target.value || null })}
            >
              <option value="">All colours</option>
              {current.colour && !facets.colours.some((c) => c.value === current.colour) && (
                <option value={current.colour}>{current.colour} (0)</option>
              )}
              {facets.colours.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value} ({c.count})
                </option>
              ))}
            </select>
          </div>
        )}

        {facets && (facets.materials.length > 0 || current.material) && (
          <div className="filter-group">
            <label htmlFor="material-select">Material</label>
            <select
              id="material-select"
              value={current.material}
              onChange={(e) => updateParams({ material: e.target.value || null })}
            >
              <option value="">All materials</option>
              {current.material && !facets.materials.some((m) => m.value === current.material) && (
                <option value={current.material}>{current.material} (0)</option>
              )}
              {facets.materials.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.value} ({m.count})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Ratings come from real customer reviews only, so this appears once some exist. */}
        {facets && (facets.rated || current.rating) && (
          <div className="filter-group">
            <label htmlFor="rating-select">Rating</label>
            <select
              id="rating-select"
              value={current.rating}
              onChange={(e) => updateParams({ rating: e.target.value || null })}
            >
              <option value="">Any rating</option>
              <option value="4">★ 4 & above</option>
              <option value="3">★ 3 & above</option>
            </select>
          </div>
        )}

        <label className="filter-checkbox">
          <input type="checkbox" checked={current.inStock} onChange={toggleInStock} />
          In Stock Only
        </label>

        <div className="filter-group">
          <label htmlFor="sort-select">Sort</label>
          <select
            id="sort-select"
            value={current.sort}
            onChange={(e) => updateParams({ sort: e.target.value === defaultSort ? null : e.target.value })}
          >
            {sortOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button type="button" className="clear-filters" onClick={clearAll}>
            Clear Filters ✕
          </button>
        )}
      </div>
    </div>
  );
}
