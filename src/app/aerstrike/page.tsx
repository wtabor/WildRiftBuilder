import { redirect } from "next/navigation";

/**
 * The AerStrike design is now the default experience at `/`. This route is kept
 * only to redirect any existing links (preview deployments, shared URLs) home.
 */
export default function Page() {
  redirect("/");
}
