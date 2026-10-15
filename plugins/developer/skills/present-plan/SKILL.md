---
name: present-plan
description: Build and display the exact development / Git action plan before protected mutations.
---

# Present plan (Developer)

Before claim, complete, commit, publish, or merge-request tools:

1. Build a `praxis.action.plan` with `decisionKind` of `development_action` or `git_operation`.
2. Include repository path, branch, remote, operations, and work package ids.
3. Ordinary edit approval must not authorize push, MR, or release.
4. Submit to the broker; execute only with the signed token via the privileged executor.
5. A changed plan, provider, instance, or repository requires a new authorization.
