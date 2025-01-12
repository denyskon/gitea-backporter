import {
  addComment,
  fetchPendingMerge,
  needsUpdate,
  removeLabel,
  updatePr,
} from "./github.ts";
import { debounce } from "https://deno.land/std@0.189.0/async/mod.ts";

const updateBranch = async () => {
  // fetch all PRs that are pending merge
  const pendingMerge = await fetchPendingMerge();

  // update all PRs pending merge (only if they need an update)
  for (const pr of pendingMerge.items) {
    if (!await needsUpdate(pr.number)) continue;
    const response = await updatePr(pr.number);
    if (response.ok) {
      console.info(`Synced PR #${pr.number} in merge queue`);
      continue;
    }

    const body = await response.json();
    if (body.message !== "merge conflict between base and head") {
      console.error(`Failed to sync PR #${pr.number} in merge queue`);
      console.error(JSON.stringify(body));
      continue;
    }

    console.info(
      `Merge conflict detected in PR #${pr.number} in merge queue`,
    );
    // if there is a merge conflict, we'll add a comment to fix the conflicts and remove the reviewed/wait-merge label
    await Promise.all([
      addComment(
        pr.number,
        `@${pr.user.login} please fix the merge conflicts. :tea:`,
      ),
      removeLabel(pr.number, "reviewed/wait-merge"),
    ]);
  }
};

// make sure we don't trigger too often
export const run = debounce(updateBranch, 8000);
