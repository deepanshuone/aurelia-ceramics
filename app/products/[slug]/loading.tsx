// Skeleton shown while a product page loads.
export default function ProductLoading() {
  return (
    <main className="product-detail-page" aria-busy="true" aria-label="Loading product">
      <section className="product-detail">
        <div className="product-container product-detail-grid">
          <div className="skeleton skeleton-image" />
          <div>
            <div className="skeleton skeleton-line short" />
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-button" />
          </div>
        </div>
      </section>
    </main>
  );
}
