// src/pages/locations/LocationEditPage.tsx
import React from "react";
import { useParams } from "react-router-dom";
import Typography from "core/components/Typography";
import Button from "core/components/Button";
import Card from "core/components/Card";
import { useLocations, LocationEditForm } from "features/campaign-entities";
import { useNavigation } from "shared/context/NavigationContext";
import { usePageGate, GatedContent } from "shared/components/gated";
import PageShell from "shared/components/page-shell/PageShell";
import { ArrowLeft } from "lucide-react";

/**
 * Page for editing an existing location.
 *
 * Write route ("locations", `mode: "write"`) so a signed-out visitor sees
 * "Sign in to add a location" in place, with the page's own title still
 * shown. This replaces two things the page used to do itself:
 *
 * - A `useEffect` that redirected to `/locations` on `!loading && !user`.
 *   `LocationContext.updateLocation` already throws if it's ever reached
 *   without a signed-in user and an active group/campaign, `gate.canAct` is
 *   false in every state that would have redirected, and `GatedContent`
 *   renders the gated panel instead of the form in those states -- so the
 *   form is never reachable while signed out, and the redirect only ever
 *   served to bounce a visitor away before the page could say why (same fix
 *   already applied to the three story write routes).
 * - Its own "No Active Group or Campaign" card, which could not tell a
 *   signed-out visitor from one still resolving or simply between
 *   campaigns. `usePageGate` distinguishes all three.
 */
const LocationEditPage: React.FC = () => {
  const { locationId } = useParams<{ locationId: string }>();
  const { locations, isLoading, error } = useLocations();
  const { navigateToPage } = useNavigation();

  const gate = usePageGate("locations", {
    loading: isLoading,
    error,
    mode: "write",
  });

  const editingLocation = locations.find(
    (location) => location.id === locationId
  );

  return (
    <PageShell
      title={
        editingLocation ? `Edit ${editingLocation.name}` : "Edit Location"
      }
    >
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigateToPage("/locations")}
          startIcon={<ArrowLeft />}
        >
          Back to Locations
        </Button>
      </div>

      <GatedContent gate={gate}>
        {editingLocation ? (
          <LocationEditForm
            location={editingLocation}
            onSuccess={() => navigateToPage("/locations")}
            onCancel={() => navigateToPage("/locations")}
          />
        ) : (
          <Card>
            <Card.Content>
              <Typography color="error">Location not found</Typography>
            </Card.Content>
          </Card>
        )}
      </GatedContent>
    </PageShell>
  );
};

export default LocationEditPage;
