// src/pages/locations/LocationCreatePage.tsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "core/components/Button";
import { LocationCreateForm } from "features/campaign-entities";
import Breadcrumb from "shared/components/Breadcrumb";
import { usePageGate, GatedContent } from "shared/components/gated";
import PageShell from "shared/components/page-shell/PageShell";
import { ArrowLeft } from "lucide-react";

/**
 * Page for creating a new location.
 *
 * Write route ("locations", `mode: "write"`) so a signed-out visitor sees
 * "Sign in to add a location" in place, with the page's own title still
 * shown -- rather than the form-level "No Active Group or Campaign" card
 * this page used to rely on, which could not tell a signed-out visitor from
 * one still resolving or simply between campaigns. See
 * `LocationCreateForm.tsx`'s file header for the other half of this change.
 */
const LocationCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const gate = usePageGate("locations", { mode: "write" });

  // Check for initial data from navigation state
  const initialData = location.state?.initialData;
  const noteId = location.state?.noteId;
  const entityId = location.state?.entityId;

  const handleSuccess = () => {
    navigate("/locations");
  };

  const handleCancel = () => {
    // Go back to the previous page (note if coming from note conversion)
    if (noteId) {
      navigate(`/notes/${noteId}`);
    } else {
      navigate("/locations");
    }
  };

  // Prepare initial data for LocationCreateForm
  const formInitialData = initialData
    ? {
        ...initialData,
        noteId,
        entityId,
      }
    : undefined;

  return (
    <PageShell
      title="Create New Location"
      breadcrumb={
        <Breadcrumb
          items={[
            { label: "Locations", href: "/locations" },
            { label: "Create" },
          ]}
          className="mb-4"
        />
      }
    >
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={handleCancel}
          startIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to {noteId ? "Note" : "Locations"}
        </Button>
      </div>

      <GatedContent gate={gate}>
        <LocationCreateForm
          initialData={formInitialData}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </GatedContent>
    </PageShell>
  );
};

export default LocationCreatePage;
