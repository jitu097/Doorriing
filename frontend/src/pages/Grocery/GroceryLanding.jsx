import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './GroceryLanding.css';

const GroceryLanding = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-navigate to Grocery.jsx after 3 seconds
    const timer = setTimeout(() => {
      navigate('/grocery/browse');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="grocery-landing-page">
      <img 
        src="/bags.png" 
        alt="Grocery Landing" 
        className="grocery-landing-image"
      />
    </div>
  );
};

export default GroceryLanding;
