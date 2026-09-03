// app/layout/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useNavigation } from 'shared/hooks/useNavigation';

const Footer: React.FC = () => {
  const { navigateToPage } = useNavigation();
  
  return (
    /* pb-20 (5rem / 80px) reserves the band the floating create button
       (shared/components/GlobalActionButton) sits over. That button is
       `fixed bottom-6` and 48px tall, so it permanently covers the bottom
       72px of the viewport -- exactly where this footer's centred link row
       lands once the page is scrolled to its end, and it paints on top of
       Privacy Policy / Contact Us there. If the trigger's size or its
       `bottom-6` offset ever changes, this reserve must stay >= 72px or the
       overlap comes back. Chosen over lifting the button with an
       `IntersectionObserver` because jsdom in this repo has no
       `IntersectionObserver` polyfill, and over a right-hand gutter because
       this row is centred and wraps at narrow widths, so a gutter would
       still get covered once it wraps under the button. The honest cost:
       roughly 64px of dead space at the end of every page, including for
       signed-out users, who get no button at all. `p-4` still supplies the
       top and horizontal padding -- `pb-20` only overrides the bottom, and
       it must come after `p-4` in the class string for that to win. */
    <footer className="p-4 pb-20 footer">
      <div className="container mx-auto flex justify-center items-center gap-4">
        <p className="typography">
          &copy; {new Date().getFullYear()} D&D Campaign Companion
        </p>
        
        <Link 
          to="/privacy" 
          onClick={(e) => {
            e.preventDefault();
            navigateToPage('/privacy');
          }}
          className="text-sm hover:underline typography"
        >
          Privacy Policy
        </Link>
        
        <Link 
          to="/contact" 
          onClick={(e) => {
            e.preventDefault();
            navigateToPage('/contact');
          }}
          className="text-sm hover:underline typography"
        >
          Contact Us
        </Link>
      </div>
    </footer>
  );
};

export default Footer;