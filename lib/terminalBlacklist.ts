/**
 * Terminal command blacklist — enforced on the frontend only.
 * These commands are blocked to prevent accidental damage via the UI,
 * but are NOT blocked inside the container (OpenClaw needs them internally).
 */
export const UNAUTHORIZED_COMMANDS = [
  'rm', 'chmod', 'chown', 'env', 'export', 'alias',
  'useradd', 'userdel', 'groupadd', 'groupdel', 'passwd',
  'su', 'sudo', 'apt', 'yum', 'apk',
];

/**
 * Checks if a command line starts with a blacklisted command.
 */
export function isCommandBlocked(input: string): boolean {
  const cmd = input.trim().split(/\s+/)[0]?.toLowerCase();
  if (!cmd) return false;
  return UNAUTHORIZED_COMMANDS.includes(cmd);
}
