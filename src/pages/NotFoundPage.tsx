// src/pages/NotFoundPage.tsx
import React from "react";
import { useLocation } from "react-router-dom";
import Typography from "core/components/Typography";
import Button from "core/components/Button";
import { useNavigation } from "shared/hooks/useNavigation";

/**
 * The page for an address no route matches.
 *
 * A mistyped URL, a stale bookmark or a link to a route that has since moved
 * is an ordinary event, so it gets a designed state and a way onward -- the
 * same treatment `LocationDetailPage` gives an id that names nothing -- rather
 * than the header and footer around an empty page.
 *
 * It renders inside the app, not as a static `404.html`: Firebase Hosting
 * rewrites every path to `index.html`, so only the router ever sees a path it
 * does not know.
 */
const NotFoundPage: React.FC = () => {
  const { pathname } = useLocation();
  const { navigateToPage } = useNavigation();

  return (
    <div className="max-w-2xl mx-auto py-16">
      <div className="card rounded-lg p-10 flex flex-col items-center text-center gap-3">
        <Typography variant="h3" as="h1">Page not found</Typography>
        <Typography color="secondary" className="max-w-md">
          Nothing in the Companion lives at{" "}
          <code className="font-mono break-all">{pathname}</code>. The link may be
          mistyped, or the page may have moved.
        </Typography>
        <Button variant="outline" onClick={() => navigateToPage("/")} className="mt-2">
          Back to the dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
