
import React from 'react';
import ImageScroller from '../../components/common/ImageScroller';
import HomeButtons from './HomeButtons';


const Home = () => {
  return (
    <div className="home-page">
      <ImageScroller />
      <HomeButtons />
      <h1>Welcome to BazarSe</h1>
      <p>Your local marketplace</p>
    </div>
  );
};

export default Home;
