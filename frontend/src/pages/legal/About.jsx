import LegalPageLayout from './LegalPageLayout';
import { COMPANY_DETAILS, COMPANY_MANAGED_NOTE, COMPANY_NAME_WITH_NOTE } from '../../config/companyInfo';

const About = () => {
  return (
    <LegalPageLayout
      title="About Doorriing"
      subtitle={`Hyperlocal deliveries powered by ${COMPANY_NAME_WITH_NOTE}`}
      intro="Doorriing is a hyperlocal discovery and delivery experience that helps customers browse neighborhood grocery stores, restaurants, and specialty vendors and place instant orders for doorstep delivery."
    >
      <section className="legal-section">
        <h2>What We Do</h2>
        <p>
          We combine live catalogues from trusted neighborhood partners with predictive logistics so shoppers can discover nearby inventory, compare prices, and place an order in just a few taps. Our delivery partners pick up directly from the merchant and deliver to the customer under a single consistent Doorriing tracking flow.
        </p>
        <ul className="legal-list">
          <li>Curated listings from local grocery stores, restaurants, and daily-need vendors</li>
          <li>Unified cart and checkout experience with secure payment processing</li>
          <li>Real-time order tracking and proactive communication for every delivery</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>Why It Matters</h2>
        <p>
          Doorriing strengthens neighborhood economies by giving offline merchants a digital storefront while keeping fulfillment hyperlocal. Customers get faster deliveries, familiar brands, and the assurance that every purchase supports a nearby business.
        </p>
      </section>

      <section className="legal-section">
        <h2>Operated By A Registered Company</h2>
        <p>
          Doorriing {COMPANY_MANAGED_NOTE} oversees all platform policies, payments, and vendor relationships to maintain compliance with Indian e-commerce and payment regulations. The registered office is located at {COMPANY_DETAILS.addressLine1}, {COMPANY_DETAILS.addressLine2}, {COMPANY_DETAILS.country}.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default About;
