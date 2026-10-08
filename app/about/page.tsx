import type { Metadata } from 'next';
import Link from 'next/link';
import { getCatalogueStats } from '../../lib/home';
import '../home.css';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Aurelia Ceramics combines Indian ceramic craftsmanship with contemporary design to create tableware for homes and hospitality.',
};

export const revalidate = 600;

export default async function About() {
  const stats = await getCatalogueStats();
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">OUR STORY</p>
          <h1>
            Craft, refined
            <br />
            <em>over generations.</em>
          </h1>
          <p>
            We combine Indian ceramic craftsmanship with contemporary design to create tableware that feels considered,
            durable and unmistakably human.
          </p>
        </div>
      </section>

      <section className="story">
        <div className="container story-grid">
          <div>
            <p className="kicker">01 — THE PHILOSOPHY</p>
            <h2>
              Less noise.
              <br />
              More character.
            </h2>
          </div>
          <div>
            <p>
              Our approach starts with useful forms and honest materials. We obsess over proportion, glaze, edge profiles
              and the small details that make a piece feel right in the hand.
            </p>
            <p>
              Crockery is the first thing guests notice and the final detail that completes a table. We think it deserves
              the same care as the food served on it.
            </p>
          </div>
        </div>
      </section>

      <section className="story about-band">
        <div className="container story-grid">
          <div>
            <p className="kicker">02 — THE CRAFT</p>
            <h2>
              Craft you can feel,
              <br />
              <em>finished with care.</em>
            </h2>
          </div>
          <div>
            <p>
              Our range brings together clean contemporary glazes and traditional hand-painted Khurja pottery, where every
              brushstroke is applied by an artisan. Small variations in colour and pattern are part of that craft, so no two
              hand-painted pieces are exactly alike.
            </p>
            <p>
              Every piece is individually wrapped and packed in protective cartons, because a beautiful piece only matters
              if it arrives in one piece.
            </p>
          </div>
        </div>
      </section>

      <section className="story">
        <div className="container story-grid">
          <div>
            <p className="kicker">03 — HOMES &amp; HOSPITALITY</p>
            <h2>
              From family tables
              <br />
              <em>to busy kitchens.</em>
            </h2>
          </div>
          <div>
            <p>
              The same pieces that make an everyday meal feel special at home are chosen to stand up to service in hotels,
              restaurants and cafés.
            </p>
            <p>
              For hospitality partners, that attention becomes reliable supply, consistent finishing and flexible
              customisation for your brand.
            </p>
            <div className="story-stats about-stats" aria-label="Our catalogue">
              <div>
                <strong>{stats.products}</strong>
                <span>designs</span>
              </div>
              <div>
                <strong>{stats.collections}</strong>
                <span>collections</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-cta">
        <div className="container">
          <h2>
            Find the pieces
            <br />
            <em>for your table.</em>
          </h2>
          <div className="hero-buttons">
            <Link href="/products" className="primary-btn dark-btn">
              Shop the collection <span>→</span>
            </Link>
            <Link href="/contact" className="text-link">
              Talk to us about bulk orders <span>→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
