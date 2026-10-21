/** SquadUp Pulse — player-facing visual tokens only. No behavior or service dependencies. */
export const colors = {
  canvas: '#F5F7FB',
  surface: '#FFFFFF',
  ink: '#101828',
  text: '#24324B',
  secondary: '#64748B',
  muted: '#94A3B8',
  line: '#E5EAF2',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primarySoft: '#EEF4FF',
  primaryLight: '#DBEAFE',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  danger: '#DC2626',
  dangerSoft: '#FFF1F2',
  disabled: '#A4ADBC',
} as const;

export const radius = { sm: 12, md: 16, lg: 20, xl: 26, pill: 999 } as const;

export const surface = {
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    shadowColor: '#1C3567',
    shadowOpacity: 0.045,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#D9E1ED',
    borderRadius: radius.md,
    color: colors.ink,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
} as const;
