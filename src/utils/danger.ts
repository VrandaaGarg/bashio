export interface DangerMatch {
  reasons: string[];
}

interface DangerPattern {
  pattern: RegExp;
  reason: string;
}

const DANGEROUS_PATTERNS: DangerPattern[] = [
  {
    pattern: /\b(?:rm|rmdir)\b[^\n]*(?:-rf|-fr|--recursive|--force|-r\b)/i,
    reason: 'Recursively removes files or directories',
  },
  {
    pattern:
      /\b(?:mkfs|mkfs\.[a-z0-9]+|format|diskpart|diskutil|fdisk|parted)\b/i,
    reason: 'Formats or repartitions disks/filesystems',
  },
  {
    pattern: /\bdd\b/i,
    reason: 'Writes raw data to disks or devices',
  },
  {
    pattern: /\b(?:shutdown|reboot|poweroff|halt)\b/i,
    reason: 'Shuts down or reboots the system',
  },
  {
    pattern:
      /\b(?:userdel|deluser|groupdel|dscl\b[^\n]*-delete|net\s+user\b[^\n]*\/delete)\b/i,
    reason: 'Deletes system users or groups',
  },
  {
    pattern: /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
    reason: 'Fork bomb pattern',
  },
  {
    pattern: /\b(?:chmod|chown)\b[^\n]*\s-?R\b/i,
    reason: 'Recursively changes permissions or ownership',
  },
  {
    pattern: /\b(?:git\s+reset\s+--hard|git\s+clean\s+-fd)\b/i,
    reason: 'Discards uncommitted changes',
  },
  {
    pattern: /\b(?:rd|rmdir)\b[^\n]*\s\/s\b/i,
    reason: 'Recursively removes directories (Windows)',
  },
  {
    pattern: /\bdel\b[^\n]*\s\/f\b/i,
    reason: 'Force deletes files (Windows)',
  },
];

export const detectDangerousShellCommand = (
  command: string,
): DangerMatch | null => {
  const trimmed = command.trim();
  if (!trimmed) {
    return null;
  }

  const reasons: string[] = [];

  for (const entry of DANGEROUS_PATTERNS) {
    if (entry.pattern.test(trimmed)) {
      reasons.push(entry.reason);
    }
  }

  if (reasons.length === 0) {
    return null;
  }

  return { reasons };
};
