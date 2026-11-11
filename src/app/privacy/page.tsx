import { redirect } from "next/navigation";

// A stable privacy-policy address (Google's OAuth consent screen and app
// stores ask for one). The policy itself lives on the Terms page.
export default function PrivacyPage() {
  redirect("/terms#privacy");
}
