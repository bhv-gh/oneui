/**
 * Merge two task trees by node ID.
 *
 * Strategy (single-user, two-device scenario):
 *  - Nodes only in local  → keep (added offline)
 *  - Nodes only in remote → keep (added on other device)
 *  - Nodes in both        → local scalar properties win,
 *    but children, completedOccurrences, fields, and tags are unioned
 *    so edits from both sides survive.
 *
 * A `seen` set prevents duplication when a node was moved (re-parented)
 * on one side — it will appear under its local parent first.
 */
export function mergeTrees(localNodes, remoteNodes) {
  const seen = new Set();

  function mergeNodeLists(localList, remoteList) {
    const remoteById = {};
    for (const n of remoteList) remoteById[n.id] = n;

    const result = [];

    // Local nodes first (preserves local ordering)
    for (const localNode of localList) {
      if (seen.has(localNode.id)) continue;
      seen.add(localNode.id);

      const remoteNode = remoteById[localNode.id];
      result.push(remoteNode ? mergeNode(localNode, remoteNode) : localNode);
    }

    // Append remote-only nodes
    for (const remoteNode of remoteList) {
      if (seen.has(remoteNode.id)) continue;
      seen.add(remoteNode.id);
      result.push(remoteNode);
    }

    return result;
  }

  function mergeNode(local, remote) {
    // Remote as base, local overrides scalar properties
    const merged = { ...remote, ...local };

    // Union completedOccurrences (both completions survive)
    if (local.completedOccurrences || remote.completedOccurrences) {
      merged.completedOccurrences = [...new Set([
        ...(local.completedOccurrences || []),
        ...(remote.completedOccurrences || []),
      ])];
    }

    // Union fields by field ID (local wins for shared fields)
    const localFields = local.fields || [];
    const remoteFields = remote.fields || [];
    const localFieldIds = new Set(localFields.map(f => f.id));
    merged.fields = [
      ...localFields,
      ...remoteFields.filter(f => !localFieldIds.has(f.id)),
    ];

    // Union tags
    if (local.tags || remote.tags) {
      merged.tags = [...new Set([...(local.tags || []), ...(remote.tags || [])])];
    }

    // Merge children recursively
    merged.children = mergeNodeLists(
      local.children || [],
      remote.children || [],
    );

    return merged;
  }

  return mergeNodeLists(localNodes, remoteNodes);
}
