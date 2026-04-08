const AVATAR_COLORS = [
  '#4f46e5', '#0891b2', '#059669', '#d97706',
  '#dc2626', '#7c3aed', '#db2777', '#0284c7',
  '#0d9488', '#65a30d', '#ea580c', '#9333ea',
]

export function getAvatarColor(name: string): string {
  const hash = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0) + (name.charCodeAt(2) || 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}
