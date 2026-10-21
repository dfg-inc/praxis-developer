---
name: present-plan
description: Show the user the exact development or Git action (preview) before a protected mutation, then let them approve or reject it in the MCP client.
---

# Present plan (Developer)

Action, preview, the user approves or rejects, execute, result.

Before claim, complete, commit, publish, merge-request or connect tools:

1. Preview with the matching `*_preview` tool (for example `praxis_developer_git_preview`, `praxis_developer_git_publish_preview`).
2. Include the repository path, branch, remote, files, operations and work package ids in what you show.
3. Each of commit, push and merge request is its own approval: approving a commit does not approve a push or a merge request.
4. Show the user the plan, then apply (see below).

Approval works the same way everywhere:

- **Preview, then ask.** Call the matching preview tool and show the user what it returned: the exact plan, nothing summarized away. Then call the apply tool with `confirmation=YES` and the `previewFingerprint` from that preview. `confirmation=YES` only says you want to apply what was previewed; it is **not** the user's approval. Praxis asks the user in the MCP client's own approval dialog, which shows the exact action. **Approve** runs exactly that action. **Reject** or dismissing the dialog runs nothing and the tool returns `APPROVAL_REJECTED`. To show the user exactly what the dialog will say, call `praxis_approval_plan` (read-only) with the apply tool's name and arguments.
- **A client without that dialog.** `praxis_doctor` reports `approval.mode`. When it is `no-dialog`, protected actions are **not executed**: the tool returns `APPROVAL_CLIENT_UI_REQUIRED` with the preview. Show the user that preview, say plainly that nothing was applied and that it can only be applied from a client that supports approval dialogs (`approval.client.reason` says why). Do not ask the user to type "yes" as a substitute, do not retry with other wording, and do not report the action as done. Read-only tools and previews keep working.
- **Only if the user switched on host-permission mode** (`approval.mode` is `host-permission`): call `praxis_approval_plan`, show the user its `planText`, then call the apply tool with that exact text as `planText`, so the client's own tool-permission prompt shows what will run. Tell the user this is weaker (Praxis cannot see whether the prompt was shown, and "always allow" removes it). Never pass a `planText` you wrote yourself.
- **If the user told you no**, call apply with `confirmation=NO`: it records the rejection and runs nothing.
- **Your "yes" is not theirs.** Never write approval files, tokens or approval-looking arguments, and never answer a dialog yourself: they authorize nothing.
- **A changed plan needs a new preview and a new approval.** An approval covers one action and exactly the content that was shown.
