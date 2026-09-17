// src/pages/locations/LocationCreatePage.tsx
import React from "react";
import QuickAddPage from "shared/components/quick-add/QuickAddPage";

/**
 * Page for creating a new location.
 *
 * Since `15-1` this is quick add's route mount. A location launched from
 * *Add a place inside* arrives with its parent pre-set -- the phase's only
 * pre-filled case -- which note conversion also supplies when the extraction
 * found a parent. `LocationCreateForm` is untouched and retires in `15-8`.
 *
 * Write route ("locations", `mode: "write"`) so a signed-out visitor sees
 * "Sign in to add a location" in place, with the page's own title still
 * shown.
 */
const LocationCreatePage: React.FC = () => (
  <QuickAddPage
    entity="location"
    gateKey="locations"
    sectionPath="/locations"
    sectionLabel="Locations"
  />
);

export default LocationCreatePage;
