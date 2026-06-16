/**
 * Minimal GitHub REST helper for opening the auto-update review PR from the
 * Vercel cron route. Uses fetch (no SDK dependency). Requires a GITHUB_TOKEN with
 * `contents: write` + `pull_requests: write` on the repo.
 *
 * Opens a PR that updates the overrides files only — a maintainer reviews the
 * numbers and runs `npm run build-data` to regenerate the patch. LLM-proposed
 * numbers never reach the production data without that human step.
 */

interface RepoConfig {
  owner: string;
  repo: string;
  token: string;
  baseBranch: string;
}

function repoConfig(): RepoConfig {
  const slug = process.env.PATCH_BOT_REPO; // "owner/repo"
  const token = process.env.GITHUB_TOKEN;
  if (!slug || !token) throw new Error("PATCH_BOT_REPO and GITHUB_TOKEN are required");
  const [owner, repo] = slug.split("/");
  return { owner, repo, token, baseBranch: process.env.PATCH_BOT_BASE ?? "main" };
}

async function gh(path: string, init: RequestInit, cfg: RepoConfig): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${cfg.token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export interface UpdateFile {
  path: string;
  /** New file content (already JSON-stringified). */
  content: string;
}

export interface OpenPrResult {
  status: "created" | "exists";
  branch: string;
  url?: string;
}

/**
 * Create a branch off base, commit the updated files, and open a PR.
 * Idempotent: if the branch already exists, returns {status:"exists"}.
 */
export async function openUpdatePr(opts: {
  branch: string;
  title: string;
  body: string;
  files: UpdateFile[];
}): Promise<OpenPrResult> {
  const cfg = repoConfig();
  const { owner, repo } = cfg;

  // Base commit sha.
  const refRes = await gh(
    `/repos/${owner}/${repo}/git/ref/heads/${cfg.baseBranch}`,
    { method: "GET" },
    cfg,
  );
  if (!refRes.ok) throw new Error(`base ref: ${refRes.status}`);
  const baseSha = (await refRes.json()).object.sha as string;

  // Create the branch (idempotent on 422 = already exists).
  const createRef = await gh(
    `/repos/${owner}/${repo}/git/refs`,
    { method: "POST", body: JSON.stringify({ ref: `refs/heads/${opts.branch}`, sha: baseSha }) },
    cfg,
  );
  if (createRef.status === 422) return { status: "exists", branch: opts.branch };
  if (!createRef.ok) throw new Error(`create ref: ${createRef.status}`);

  // Commit each file via the Contents API on the new branch.
  for (const file of opts.files) {
    const existing = await gh(
      `/repos/${owner}/${repo}/contents/${file.path}?ref=${opts.branch}`,
      { method: "GET" },
      cfg,
    );
    const sha = existing.ok ? ((await existing.json()).sha as string) : undefined;
    const put = await gh(
      `/repos/${owner}/${repo}/contents/${file.path}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message: `chore(data): patch-bot update ${file.path}`,
          content: Buffer.from(file.content, "utf8").toString("base64"),
          branch: opts.branch,
          ...(sha ? { sha } : {}),
        }),
      },
      cfg,
    );
    if (!put.ok) throw new Error(`put ${file.path}: ${put.status}`);
  }

  // Open the PR.
  const pr = await gh(
    `/repos/${owner}/${repo}/pulls`,
    {
      method: "POST",
      body: JSON.stringify({
        title: opts.title,
        body: opts.body,
        head: opts.branch,
        base: cfg.baseBranch,
      }),
    },
    cfg,
  );
  if (!pr.ok) throw new Error(`open pr: ${pr.status}`);
  return { status: "created", branch: opts.branch, url: (await pr.json()).html_url };
}
