export function getRepositoryIdentity(review) {
  const owner = review.repository_owner || null;
  const name = review.repository_name || null;
  const fullName =
    review.repository_full_name ||
    (owner && name ? `${owner}/${name}` : null);

  return {
    owner,
    name,
    fullName,
    isPrivate: Boolean(review.repository_is_private),
  };
}

export function getRepositoryGroupKey(review) {
  const { fullName } = getRepositoryIdentity(review);
  return fullName || "Uncategorized";
}

export function getOwnerGroupKey(review) {
  const { owner } = getRepositoryIdentity(review);
  return owner || "Uncategorized";
}
