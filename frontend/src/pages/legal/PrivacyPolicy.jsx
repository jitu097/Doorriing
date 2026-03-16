import LegalPageLayout from './LegalPageLayout';
import { COMPANY_DETAILS, COMPANY_NAME_WITH_NOTE } from '../../config/companyInfo';

const PrivacyPolicy = () => {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="Your information is protected while you shop with Doorriing"
      intro={`This Privacy Policy explains how ${COMPANY_NAME_WITH_NOTE} collects, uses, and protects personal data on the Doorriing platform.`}
    >
      <div className="policy-callout">
        We collect limited personal information only for running the hyperlocal delivery service and do not sell or rent user data to any third party.
      </div>

      <section className="legal-section">
        <h2>Information We Collect</h2>
        <p>
          When you register or place an order we collect your name, phone number, email address, delivery address, precise order details, payment method identifiers, and device metadata required to secure your account.
        </p>
        <p>
          We also capture voluntary information such as feedback, saved addresses, and preferences to personalize your experience and improve store discovery.
        </p>
      </section>

      <section className="legal-section">
        <h2>How We Use Your Data</h2>
        <ul className="legal-list">
          <li>Process orders, payments, and deliveries placed through the Doorriing application</li>
          <li>Share relevant order details with partner grocery stores, restaurants, and delivery personnel</li>
          <li>Provide customer support, resolve disputes, and send service updates</li>
          <li>Comply with taxation, accounting, and KYC/AML obligations</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>Payments & Order Security</h2>
        <p>
          Payment information is routed through PCI-DSS compliant payment gateways. We only store limited tokens returned by the gateway to help you manage refunds and order disputes. Full card details are never stored on Doorriing servers.
        </p>
      </section>

      <section className="legal-section">
        <h2>Data Protection Practices</h2>
        <p>
          Personal data is stored on encrypted infrastructure with strict access controls, frequent security reviews, and monitoring. Employees and partners access data solely on a need-to-know basis under NDA and contractual safeguards.
        </p>
      </section>

      <section className="legal-section">
        <h2>Your Rights</h2>
        <p>You may request to review, update, or delete your account information by contacting us at {COMPANY_DETAILS.email}. We will respond within reasonable timelines subject to legal retention requirements.</p>
      </section>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;
