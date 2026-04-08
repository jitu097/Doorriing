import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import grocerAnimation from '../../assets/grocer.json';
import './GroceryLanding.css';

const GroceryLanding = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-navigate after animation completes
    const timer = setTimeout(() => {
      navigate('/grocery/browse');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="grocery-landing-page">
      <Lottie 
        animationData={grocerAnimation}
        loop={false}
        autoplay={true}
        className="grocer-animation"
      />
    </div>
  );
};

export default GroceryLanding;
