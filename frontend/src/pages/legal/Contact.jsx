import { useState } from 'react';
import LegalPageLayout from './LegalPageLayout';
import { COMPANY_DETAILS, COMPANY_NAME_WITH_NOTE } from '../../config/companyInfo';

const Contact = () => {
  const [formValues, setFormValues] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setFormValues({ name: '', email: '', message: '' });
  };

  return (
    <LegalPageLayout
      title="Contact Us"
      subtitle="We are here to help with partner onboarding, customer queries, and compliance checks"
      intro={`Reach the Doorriing operations team at ${COMPANY_NAME_WITH_NOTE} using the contact points below.`}
    >
      <section className="legal-section">
        <h2>Registered Office</h2>
        <div className="contact-grid">
          <div className="contact-card">
            <h3>Visit Us</h3>
            <p>{COMPANY_DETAILS.addressLine1}</p>
            <p>{COMPANY_DETAILS.addressLine2}</p>
            <p>{COMPANY_DETAILS.country}</p>
          </div>
          <div className="contact-card">
            <h3>Talk To Us</h3>
            <p>Email: {COMPANY_DETAILS.email}</p>
            <p>Phone: {COMPANY_DETAILS.phone}</p>
            <p>Support Hours: 9:00 AM - 9:00 PM IST</p>
          </div>
        </div>
      </section>

      <section className="legal-section">
        <h2>Send A Message</h2>
        <p>Submit your business, compliance, or customer support query and our team will reach out within one business day.</p>
        {submitted && (
          <div className="contact-success">Thank you! Your message has been received.</div>
        )}
        <form className="contact-form" onSubmit={handleSubmit}>
          <label htmlFor="contact-name">Name</label>
          <input
            id="contact-name"
            name="name"
            type="text"
            value={formValues.name}
            onChange={handleChange}
            placeholder="Your full name"
            required
          />

          <label htmlFor="contact-email">Email</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            value={formValues.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
          />

          <label htmlFor="contact-message">Message</label>
          <textarea
            id="contact-message"
            name="message"
            value={formValues.message}
            onChange={handleChange}
            placeholder="Share any specific questions or requirements"
            required
          />

          <button type="submit">Send Message</button>
        </form>
      </section>
    </LegalPageLayout>
  );
};

export default Contact;
