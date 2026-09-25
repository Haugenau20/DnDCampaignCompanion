import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import Typography from 'core/components/Typography';
import clsx from 'clsx';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /**
   * Which surface the trail is drawn on.
   *
   * `page` is the ordinary case and keeps the typography roles. `band` is for
   * an entity page's header, where the surface is dark and those roles are
   * solved against the page: `typography-secondary` on the band measures far
   * below any usable threshold. On the band the trail takes the band's own
   * muted ink and its current item simply inherits the band's ink, so no
   * colour is named here and none is invented (T040).
   */
  tone?: 'page' | 'band';
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, tone = 'page', className = '' }) => {
  const onBand = tone === 'band';
  const quiet = onBand ? 'hero-muted' : 'typography-secondary';

  return (
    <nav
      aria-label="Breadcrumb"
      className={clsx(`flex items-center space-x-2 py-2`, className)}
    >
      {/*
        Wraps rather than truncates: the last item is the record's own name,
        which is the one thing on the trail a reader came to see. `gap-x-2`
        keeps the spacing `space-x-2` gave, and unlike it survives a wrap
        without indenting the second line (T069).
      */}
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
        <li>
          <Link
            to="/"
            className={clsx('hover:opacity-80 transition-colors', quiet)}
            aria-label="Home"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            // `min-w-0` and `overflow-wrap: anywhere` let a single label
            // longer than the screen break inside itself instead of pushing
            // the page sideways.
            <li key={item.label} className="flex items-center min-w-0 [overflow-wrap:anywhere]">
              <ChevronRight className={clsx('w-4 h-4 mx-2 shrink-0', quiet)} />
              {isLast ? (
                onBand ? (
                  // Inherits the band's ink from `.hero-band` rather than
                  // naming one. `Typography color="primary"` would apply the
                  // page's ink to a dark surface.
                  <span className="text-sm font-medium" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <Typography
                    variant="body-sm"
                    color="primary"
                    className="font-medium"
                    aria-current="page"
                  >
                    {item.label}
                  </Typography>
                )
              ) : (
                <Link
                  to={item.href || '#'}
                  className={clsx('transition-colors hover:opacity-80', onBand && 'text-sm', quiet)}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
