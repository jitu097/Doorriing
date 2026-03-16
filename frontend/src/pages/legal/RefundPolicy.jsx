import LegalPageLayout from './LegalPageLayout';
import { COMPANY_DETAILS, COMPANY_NAME_WITH_NOTE } from '../../config/companyInfo';

const RefundPolicy = () => {
  return (
    <LegalPageLayout
      title="Refund & Cancellation Policy"
      subtitle="Transparent timelines for reversing payments"
      intro={`This policy explains how ${COMPANY_NAME_WITH_NOTE} handles cancellations and refunds for orders placed on Doorriing.`}
    >
      <section className="legal-section">
        <h2>Order Cancellation</h2>
        <p>
          You may request a cancellation until the merchant begins preparing the order. Once the status changes to "Prepared" or "Out for Delivery" the order cannot be cancelled because products are already in transit or specially prepared for you.
        </p>
      </section>

      <section className="legal-section">
        <h2>Refund Eligibility</h2>
        <ul className="legal-list">
          <li>Orders cancelled before preparation begins</li>
          <li>Failed transactions where the amount is debited but order ID is not generated</li>
          <li>Merchant-initiated cancellations (item unavailable, store closed, etc.)</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>Refund Timelines</h2>
        <p>
          Approved refunds are initiated immediately on our side but the credit timeline depends on your payment provider. Most UPI and wallet refunds settle within 3 business days, while cards and netbanking can take up to 7 business days.
        </p>
      </section>

      <section className="legal-section">
        <h2>Refund Method</h2>
        <p>All refunds are credited back to the original payment method. We do not offer cash refunds to ensure compliance with audit requirements.</p>
      </section>

      <section className="legal-section">
        <h2>Support</h2>
        <p>If a refund is delayed beyond the stated timelines, contact us at {COMPANY_DETAILS.email} with your order ID and payment reference so the team can coordinate with the gateway.</p>
      </section>
    </LegalPageLayout>
  );
};

export default RefundPolicy;
