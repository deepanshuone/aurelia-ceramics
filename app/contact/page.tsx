import type { Metadata } from 'next';
import ContactForm from './ContactForm';
import { BUSINESS } from '../../lib/business';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Aurelia Ceramics for product enquiries, wholesale requirements, hotel projects or custom/OEM requests.',
};

export default function Contact() {
  return (
    <main>
      <section className="contact">
        <div className="container contact-grid">
          <div>
            <p className="kicker">LET&apos;S WORK TOGETHER</p>
            <h1>
              Tell us what
              <br />
              <em>you&apos;re building.</em>
            </h1>
            <p>
              For product enquiries, wholesale requirements, hotel projects or
              custom/OEM requests, send us your details.
            </p>
            <div className="contact-info">
              <span>
                <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
              </span>
              <span>
                <a href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`}>{BUSINESS.phone}</a>
              </span>
              <span>{BUSINESS.address}</span>
              <span>{BUSINESS.supportHours}</span>
            </div>
          </div>

          <ContactForm />
        </div>
      </section>
    </main>
  );
}
