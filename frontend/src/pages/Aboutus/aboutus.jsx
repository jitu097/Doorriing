import './aboutus.css';

const AboutUs = () => {
  const features = [
    {
      icon: '🛒',
      title: 'Wide Selection',
      description: 'Browse thousands of products from local shops and restaurants'
    },
    {
      icon: '⚡',
      title: 'Fast Delivery',
      description: 'Get your orders delivered quickly to your doorstep'
    },
    {
      icon: '💳',
      title: 'Secure Payments',
      description: 'Multiple payment options with secure transaction processing'
    },
    {
      icon: '🎁',
      title: 'Great Deals',
      description: 'Enjoy exclusive offers and discounts on your favorite items'
    },
    {
      icon: '📱',
      title: 'Easy to Use',
      description: 'Simple and intuitive interface for seamless shopping experience'
    },
    {
      icon: '🌟',
      title: 'Quality Service',
      description: '24/7 customer support to assist you with any queries'
    }
  ];

  const values = [
    {
      title: 'Customer First',
      description: 'We prioritize customer satisfaction above everything else',
      color: '#4CAF50'
    },
    {
      title: 'Quality Assured',
      description: 'We ensure the highest quality of products and services',
      color: '#2196F3'
    },
    {
      title: 'Innovation',
      description: 'Constantly evolving to provide better shopping experiences',
      color: '#FF9800'
    },
    {
      title: 'Trust & Transparency',
      description: 'Building lasting relationships through honest practices',
      color: '#9C27B0'
    }
  ];

  const teamMembers = [
    {
      name: 'Sarah Johnson',
      role: 'CEO & Founder',
      image: 'https://via.placeholder.com/150',
      description: 'Visionary leader with 15+ years in e-commerce'
    },
    {
      name: 'Michael Chen',
      role: 'CTO',
      image: 'https://via.placeholder.com/150',
      description: 'Tech expert passionate about seamless user experiences'
    },
    {
      name: 'Emily Rodriguez',
      role: 'Head of Operations',
      image: 'https://via.placeholder.com/150',
      description: 'Ensuring smooth delivery and customer satisfaction'
    },
    {
      name: 'David Kumar',
      role: 'Head of Marketing',
      image: 'https://via.placeholder.com/150',
      description: 'Creative strategist connecting brands with customers'
    }
  ];

  const stats = [
    { number: '10,000+', label: 'Happy Customers' },
    { number: '500+', label: 'Partner Shops' },
    { number: '50,000+', label: 'Orders Delivered' },
    { number: '4.8★', label: 'Average Rating' }
  ];

  return (
    <div className="aboutus-container">
      {/* Hero Section */}
      <section className="aboutus-hero">
        <div className="hero-content">
          <h1 className="hero-title">About BazarSe</h1>
          <p className="hero-subtitle">
            Your One-Stop Solution for Groceries, Food & More
          </p>
          <p className="hero-description">
            We're revolutionizing the way you shop by bringing local stores and restaurants 
            right to your fingertips. Fresh, fast, and convenient shopping made easy.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-item">
              <h2 className="stat-number">{stat.number}</h2>
              <p className="stat-label">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="mission-vision-section">
        <div className="mission-vision-grid">
          <div className="mission-card">
            <div className="card-icon">🎯</div>
            <h2>Our Mission</h2>
            <p>
              To empower local businesses and provide customers with a seamless, 
              efficient, and delightful shopping experience. We aim to bridge the 
              gap between traditional retail and modern convenience, making quality 
              products accessible to everyone.
            </p>
          </div>
          <div className="vision-card">
            <div className="card-icon">🚀</div>
            <h2>Our Vision</h2>
            <p>
              To become the leading marketplace platform that transforms how 
              communities shop and connect. We envision a future where technology 
              enhances local commerce, supports small businesses, and delivers 
              exceptional value to every customer.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Why Choose Us?</h2>
        <p className="section-subtitle">
          Discover what makes BazarSe the preferred choice for thousands of customers
        </p>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values Section */}
      <section className="values-section">
        <h2 className="section-title">Our Core Values</h2>
        <p className="section-subtitle">
          The principles that guide everything we do
        </p>
        <div className="values-grid">
          {values.map((value, index) => (
            <div 
              key={index} 
              className="value-card"
              style={{ borderColor: value.color }}
            >
              <div 
                className="value-indicator"
                style={{ background: value.color }}
              ></div>
              <h3>{value.title}</h3>
              <p>{value.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team Section */}
      <section className="team-section">
        <h2 className="section-title">Meet Our Team</h2>
        <p className="section-subtitle">
          The passionate people behind BazarSe
        </p>
        <div className="team-grid">
          {teamMembers.map((member, index) => (
            <div key={index} className="team-card">
              <div className="team-image">
                <img src={member.image} alt={member.name} />
              </div>
              <div className="team-info">
                <h3>{member.name}</h3>
                <p className="team-role">{member.role}</p>
                <p className="team-description">{member.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Story Section */}
      <section className="story-section">
        <div className="story-content">
          <h2 className="section-title">Our Story</h2>
          <div className="story-text">
            <p>
              BazarSe was born from a simple observation: people wanted the convenience 
              of online shopping without losing the personal touch of their favorite 
              local stores. Founded in 2023, we set out to create a platform that would 
              benefit both customers and local businesses.
            </p>
            <p>
              What started as a small initiative with just 10 partner stores has grown 
              into a thriving marketplace connecting thousands of customers with hundreds 
              of local businesses. Our journey has been driven by one constant belief: 
              technology should enhance, not replace, the human connections that make 
              commerce meaningful.
            </p>
            <p>
              Today, we're proud to serve our community by delivering not just products, 
              but convenience, reliability, and peace of mind. Every order placed on 
              BazarSe supports a local business and contributes to a stronger, more 
              connected community.
            </p>
          </div>
        </div>
      </section>

      {/* Contact CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Have Questions?</h2>
          <p>We'd love to hear from you! Get in touch with our team.</p>
          <div className="cta-buttons">
            <button className="cta-btn primary">Contact Us</button>
            <button className="cta-btn secondary">Help Center</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;