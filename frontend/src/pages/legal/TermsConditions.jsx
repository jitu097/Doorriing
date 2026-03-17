import LegalPageLayout from './LegalPageLayout';
import { COMPANY_DETAILS, COMPANY_NAME_WITH_NOTE } from '../../config/companyInfo';

const TermsConditions = () => {
  return (
    <LegalPageLayout
      title="Terms & Conditions"
      subtitle="Guidelines for using the Doorriing user application"
      intro={`These terms describe the relationship between you and ${COMPANY_NAME_WITH_NOTE} when you access the Doorriing marketplace.`}
    >
      <section className="legal-section">
        <h2>Acceptance Of Terms</h2>
        <p>
          By creating an account, browsing stores, or placing an order on Doorriing you agree to follow these Terms & Conditions as well as any policy referenced here. Continued use of the platform constitutes ongoing acceptance.
        </p>
      </section>

      <section className="legal-section">
        <h2>Platform Role</h2>
        <p>
          Doorriing operates as a marketplace that connects customers with independent local vendors, restaurants, and delivery partners. Each merchant remains responsible for product quality, availability, and statutory compliance while Doorriing manages discovery, ordering, and support.
        </p>
      </section>

      <section className="legal-section">
        <h2>User Responsibilities</h2>
        <ul className="legal-list">
          <li>Provide accurate profile information, addresses, and contact details</li>
          <li>Maintain the confidentiality of your login credentials</li>
          <li>Ensure someone is available to receive the delivery at the chosen address</li>
          <li>Use the app for legitimate purchases only and refrain from misuse or fraud</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>Orders, Pricing & Availability</h2>
        <p>
          Menu items, stock levels, and prices are managed by each merchant and may change without prior notice. Orders are confirmed only after the merchant accepts them. Doorriing may cancel orders when items are unavailable or if payment authorization fails.
        </p>
      </section>

      <section className="legal-section">
        <h2>Delivery Policy</h2>
        <p>
          Delivery timelines are estimates and can vary due to location, traffic, or merchant preparation time. Once an order is prepared or out for delivery it may not be cancelled. You agree to pay delivery fees communicated during checkout.
        </p>
      </section>

      <section className="legal-section">
        <h2>Limitation Of Liability</h2>
        <p>
          To the fullest extent permitted by law, {COMPANY_NAME_WITH_NOTE} is not liable for indirect or consequential losses arising out of service usage. Our responsibility is limited to the amount paid for the specific order that gave rise to the claim.
        </p>
      </section>


      <section className="legal-section">
        <h2>Restricted Activities</h2>
        <p>Users must not attempt to reverse engineer the platform, create fraudulent orders, interfere with deliveries, or violate applicable laws. Such actions can result in immediate suspension.</p>
      </section>
    </LegalPageLayout>
  );
};

export default TermsConditions;
