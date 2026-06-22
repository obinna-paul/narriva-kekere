import { Heading } from "@/components/ui/typography";
import { CompetitionForm } from "@/components/admin/competition-form";

export default function NewCompetitionPage() {
  return (
    <div>
      <Heading as="h1" size="h2">
        New competition
      </Heading>
      <div className="mt-6">
        <CompetitionForm mode="create" />
      </div>
    </div>
  );
}
