import React from 'react';
import './legalPages.css';
import { COMPANY_DETAILS, COMPANY_MANAGED_NOTE } from '../../config/companyInfo';
import Footer from '../../components/layout/Footer';

const LegalPageLayout = ({ title, subtitle, intro, children }) => {
  return (
    <div className="legal-page">
      <header className="legal-hero">
        <p className="legal-eyebrow">Doorriing Platform</p>
        <h1>{title}</h1>
        {subtitle && <p className="legal-subtitle">{subtitle}</p>}
        {intro && <p className="legal-intro">{intro}</p>}
      </header>

      <div className="legal-content-grid">
        <section className="legal-main-content">
          {children}
        </section>
        <aside className="legal-company-card">
          <h3>Company Information</h3>
          <p className="legal-company-name">{COMPANY_DETAILS.name}</p>
          <p className="legal-company-note">{COMPANY_MANAGED_NOTE}</p>
          <p>{COMPANY_DETAILS.addressLine1}</p>
          <p>{COMPANY_DETAILS.addressLine2}</p>
          <p>{COMPANY_DETAILS.country}</p>
          <div className="legal-company-contact">
            <p>Email: {COMPANY_DETAILS.email}</p>
            <p>Phone: {COMPANY_DETAILS.phone}</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LegalPageLayout;
