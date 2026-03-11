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
        src="/bas.png" 
        alt="Bas" 
        className="bas-drop-img"
      />
      <img 
        src="/veg.png" 
        alt="Veg" 
        className="veg-drop-img"
      />
      <img 
        src="/gross.png" 
        alt="Gross" 
        className="gross-drop-img"
      />
      <img 
        src="/fru.png" 
        alt="Fru" 
        className="fru-drop-img"
      />
    </div>
  );
};

export default GroceryLanding;
