'use client'

import { User } from 'lucide-react'

interface UserAvatarProps {
  username: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function UserAvatar({ username, size = 'md', className = '' }: UserAvatarProps) {
  // Generate consistent color based on username
  const getColorFromUsername = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-amber-500'
    ]
    
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2)
  }

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  }

  const colorClass = getColorFromUsername(username)
  const initials = getInitials(username)

  return (
    <div
      className={`
        ${sizeClasses[size]} 
        ${colorClass}
        rounded-full flex items-center justify-center text-white font-semibold
        border-2 border-white shadow-sm
        ${className}
      `}
      title={username}
    >
      {initials}
    </div>
  )
}