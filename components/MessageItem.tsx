'use client'

import { useEffect, useRef } from 'react'
import { Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { UserAvatar } from './UserAvatar'

interface MessageItemProps {
    message: Message
    socket: any
    currentUsername: string
    isLoading?: boolean
}

interface Message {
    id: string
    content: string
    username: string
    createdAt: string
    isAi?: boolean
    readBy: string[]
}

export function MessageItem({ message, socket, currentUsername, isLoading }: MessageItemProps) {
    const messageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messageRef.current && socket) {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        if (!message.readBy.includes(currentUsername)) {
                            socket.emit('message-read', { messageId: message.id, username: currentUsername })
                        }
                        observer.disconnect()
                    }
                },
                { threshold: 1.0 }
            )
            observer.observe(messageRef.current)
            return () => observer.disconnect()
        }
    }, [message, socket, currentUsername])

    const getReadByTooltip = () => {
        const readers = message.readBy.filter(u => u !== message.username && u !== currentUsername)
        if (readers.length === 0) return ''
        if (readers.length > 3) {
            return `Read by ${readers.slice(0, 3).join(', ')} and ${readers.length - 3} others`
        }
        return `Read by ${readers.join(', ')}`
    }

    if (isLoading) {
        return (
            <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">AI</span>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                        <p className="text-sm">AI is thinking...</p>
                    </div>
                </div>
            </div>
        )
    }

    const isCurrentUser = message.username === currentUsername

    return (
        <div ref={messageRef} className={`flex gap-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            {/* Avatar for other users and AI */}
            {!isCurrentUser && (
                <div className="flex-shrink-0">
                    {message.isAi ? (
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary-foreground" />
                        </div>
                    ) : (
                        <UserAvatar username={message.username} size="md" />
                    )}
                </div>
            )}
            
            <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
                <div className="flex items-center gap-2 mb-1">
                    {!isCurrentUser && (
                        <span className="font-semibold text-sm">{message.username}</span>
                    )}
                    {isCurrentUser && (
                        <span className="font-semibold text-sm">You</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                        {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                </div>
                
                <div className={`rounded-lg p-3 ${
                    isCurrentUser 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                }`}>
                    {message.isAi ? (
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                </div>
                
                {message.readBy && message.readBy.length > 1 && isCurrentUser && (
                    <div className="text-xs text-muted-foreground mt-1" title={getReadByTooltip()}>
                        Read by {message.readBy.filter(u => u !== message.username).length}
                    </div>
                )}
            </div>

            {/* Avatar for current user */}
            {isCurrentUser && (
                <div className="flex-shrink-0">
                    <UserAvatar username={message.username} size="md" />
                </div>
            )}
        </div>
    )
}