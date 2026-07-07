export function spawn(): never {
  throw new Error('child_process.spawn is unavailable in the tactical map browser bundle.');
}

export default {
  spawn,
};
