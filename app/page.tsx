'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, User } from 'lucide-react'
import { MessageItem } from '@/components/MessageItem'
import { UserAvatar } from '@/components/UserAvatar'

interface Message {
  id: string
  content: string
  username: string
  createdAt: string
  isAi?: boolean
  readBy: string[]
}

export default function Home() {
  const [username, setUsername] = useState('')
  const [isJoined, setIsJoined] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [socket, setSocket] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load saved username and join status from localStorage
  useEffect(() => {
    const savedUsername = localStorage.getItem('chat-username')
    const wasJoined = localStorage.getItem('chat-joined')
    
    if (savedUsername) {
      setUsername(savedUsername)
    }
    
    if (wasJoined === 'true' && savedUsername) {
      setIsJoined(true)
    }
  }, [])

  useEffect(() => {
    if (isJoined) {
      import('socket.io-client').then(({ io }) => {
          const newSocket = io('http://localhost:3000')
          setSocket(newSocket)

          newSocket.on('connect', () => {
            setIsConnected(true)
            console.log('Connected to server')
            newSocket.emit('join-chat', username)
          })

          newSocket.on('disconnect', () => {
            setIsConnected(false)
            console.log('Disconnected from server')
          })

          newSocket.on('previous-messages', (msgs: Message[]) => {
            setMessages(msgs)
          })

          newSocket.on('new-message', (message: Message) => {
            setMessages(prev => [...prev, message])
          })

          newSocket.on('ai-model-info', (modelInfo: { model: string }) => {
            console.log(`AI is using model: ${modelInfo.model}`)
          })

          newSocket.on('ai-thinking', () => {
            console.log('AI is thinking...')
            setIsAiThinking(true)
          })

          newSocket.on('ai-stop-thinking', () => {
            console.log('AI has stopped thinking')
            setIsAiThinking(false)
          })

          newSocket.on('typing', (username: string) => {
          setTypingUsers(prev => [...prev, username])
        })

          newSocket.on('stop typing', (username: string) => {
            setTypingUsers(prev => prev.filter(user => user !== username))
          })

          newSocket.on('online-users', (users: string[]) => {
            setOnlineUsers(users)
          })

          newSocket.on('message-updated', (message: Message) => {
            setMessages(prev => prev.map(m => m.id === message.id ? message : m))
          })

          return () => {
            newSocket.close()
          }
      })
    }
  }, [isJoined, username])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)

    if (socket && !isTyping) {
      socket.emit('typing', username)
      setIsTyping(true)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (socket) {
        socket.emit('stop typing', username)
        setIsTyping(false)
      }
    }, 2000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSendMessage = () => {
    if (newMessage.trim() && socket) {
      socket.emit('send-message', {
        content: newMessage,
        username: username
      })

      setNewMessage('')

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      socket.emit('stop typing', username)
      setIsTyping(false)
    }
  }

  const handleJoin = () => {
    if (username.trim()) {
      setIsJoined(true)
      // Save to localStorage
      localStorage.setItem('chat-username', username)
      localStorage.setItem('chat-joined', 'true')
    }
  }

  const handleLeaveChat = () => {
    if (socket) {
      socket.close()
    }
    setIsJoined(false)
    setMessages([])
    setOnlineUsers([])
    setTypingUsers([])
    // Remove from localStorage
    localStorage.removeItem('chat-joined')
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isAiThinking])

  if (!isJoined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                Join Global Chat
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Choose your username
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                  className="w-full"
                />
              </div>
            <Button
              onClick={handleJoin}
              className="w-full"
              disabled={!username.trim()}
            >
              Join Chat
            </Button>
          </CardContent>
          </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Global Chat</h1>
            <Badge variant={isConnected ? "default" : "destructive"} className={isConnected ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Badge variant="secondary" className="bg-green-500 hover:bg-green-600">
              {onlineUsers.length} Online
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <UserAvatar username={username} size="sm" />
              <span className="font-medium">{username}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLeaveChat}
              className="text-red-500 hover:text-red-700"
            >
              Leave Chat
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Chat Room
              <Badge variant="outline" className="ml-auto">
                Mention @ai for AI assistance
              </Badge>
            </CardTitle>
          </CardHeader>

        <CardContent >
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    socket={socket}
                    currentUsername={username}
                  />
                ))}
                {isAiThinking && (
                  <MessageItem
                    message={{
                      id: 'ai-thinking',
                      content: '',
                      username: 'OSTAD AI',
                      createdAt: new Date().toISOString(),
                      isAi: true,
                      readBy: []
                    }}
                    socket={socket}
                    currentUsername={username}
                    isLoading={true}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="p-2 text-sm">
              {typingUsers.length > 0 && (
                <em className="text-green-600 font-medium">
                  {typingUsers.filter(u => u !== username).join(', ')}
                  {typingUsers.length > 1 ? ' are typing...' : ' is typing...'}
                </em>
              )}
            </div>

            <div className="p-4">
              <div className="flex gap-2">
                <Input placeholder="Type your message... (mention @ai for AI help)"
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || !isConnected}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Separator />
        </CardContent>
        </Card>
      </main>
    </div>
  )
}