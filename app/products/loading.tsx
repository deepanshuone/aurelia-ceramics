// Skeleton shown while the shop grid loads (e.g. when changing filters).
export default function ProductsLoading() {
  return (
    <main className="products-page" aria-busy="true" aria-label="Loading products">
      <section className="catalogue">
        <div className="catalogue-container">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-pills" />
          <div className="catalogue-grid">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i}>
                <div className="skeleton skeleton-image" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line short" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
