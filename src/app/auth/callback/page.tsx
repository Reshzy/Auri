import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function AuthCallbackPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4">
      <PagePlaceholder
        title="Auth callback"
        description="Supabase will redirect here after email confirmation or OAuth."
        phaseNote="Callback exchange arrives in Phase 2."
      />
    </div>
  );
}
