// app/layout/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useNavigation } from 'shared/hooks/useNavigation';

const Footer: React.FC = () => {
  const { navigateToPage } = useNavigation();
  
  return (
    /*
      The floating create button (shared/components/GlobalActionButton) is
      `fixed right-6 bottom-6` and 48px square, so it permanently covers the
      bottom-right 72x72px of the viewport -- and lands on this row once the
      page is scrolled to its end.

      That used to be answered with `pb-20`: 80px of bottom padding, reserving
      space on the *vertical* axis for something that only ever overlaps on the
      right. It cost roughly 64px of dead height at the foot of every page,
      including for signed-out users who get no button at all.

      The reserve is horizontal now. From `sm` up the row is split -- copyright
      left, links right -- with `sm:pr-20` keeping the links clear of the
      button's 72px footprint, which costs nothing because the row has spare
      width. Below `sm` the row stacks and stays left-aligned, so the last line
      ends well short of the button rather than under it.

      If the button's size or its `bottom-6` / `right-6` offsets change, it is
      `sm:pr-20` that has to keep pace.
    */
    <footer className="px-4 py-5 footer">
      <div
        className={
          'container mx-auto flex flex-col gap-2 text-sm ' +
          'sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pr-20'
        }
      >
        <p className="typography">
          &copy; {new Date().getFullYear()} D&D Campaign Companion
        </p>

        <div className="flex items-center gap-4">
          <Link
            to="/privacy"
            onClick={(e) => {
              e.preventDefault();
              navigateToPage('/privacy');
            }}
            className="hover:underline typography"
          >
            Privacy Policy
          </Link>

          <Link
            to="/contact"
            onClick={(e) => {
              e.preventDefault();
              navigateToPage('/contact');
            }}
            className="hover:underline typography"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;