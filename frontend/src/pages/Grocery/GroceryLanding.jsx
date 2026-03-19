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
        src="/bas.webp" 
        alt="Bas" 
        className="bas-drop-img"
        loading="lazy"
      />
      <img 
        src="/veg.webp" 
        alt="Veg" 
        className="veg-drop-img"
        loading="lazy"
      />
      <img 
        src="/gross.webp" 
        alt="Gross" 
        className="gross-drop-img"
        loading="lazy"
      />
      <img 
        src="/fru.webp" 
        alt="Fru" 
        className="fru-drop-img"
        loading="lazy"
      />
    </div>
  );
};

export default GroceryLanding;
