export function calculateCosineSimilarity(
  leftVector: number[],
  rightVector: number[],
): number {
  if (leftVector.length !== rightVector.length || leftVector.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < leftVector.length; index += 1) {
    dotProduct += leftVector[index] * rightVector[index];
    leftNorm += leftVector[index] * leftVector[index];
    rightNorm += rightVector[index] * rightVector[index];
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}
