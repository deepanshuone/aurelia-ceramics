"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Current = {
  search: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  sort: string;
};

type Props = {
  categories: string[];
  current: Current;
};

const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  popularity: "Popularity",
};

export default function ProductFilters({ categories, current }: Props) {
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

  const hasActiveFilters = Boolean(
    current.search ||
      current.category ||
      current.minPrice ||
      current.maxPrice ||
      current.inStock ||
      (current.sort && current.sort !== "newest")
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

        <label className="filter-checkbox">
          <input type="checkbox" checked={current.inStock} onChange={toggleInStock} />
          In Stock Only
        </label>

        <div className="filter-group">
          <label htmlFor="sort-select">Sort</label>
          <select
            id="sort-select"
            value={current.sort}
            onChange={(e) => updateParams({ sort: e.target.value === "newest" ? null : e.target.value })}
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
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
