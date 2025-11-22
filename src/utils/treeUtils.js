export const findParentNode = (nodes, childId) => {
  for (const node of nodes) {
    if (node.children.some(child => child.id === childId)) {
      return node;
    }
    const foundParent = findParentNode(node.children, childId);
    if (foundParent) {
      return foundParent;
    }
  }
  return null;
};

export const findNodeRecursive = (nodes, id) => {
  if (!nodes) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeRecursive(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

export const findNodePath = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return [node];
    if (node.children) {
      const path = findNodePath(node.children, id);
      if (path.length > 0) {
        return [node, ...path];
      }
    }
  }
  return [];
};