import { Server } from 'socket.io'
import next from 'next'
import http from 'http'
import OpenAI from 'openai'

const API_KEY_REF = process.env.OPENROUTER_API_KEY || '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';
const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: API_KEY_REF,
    defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Global Chat',
    },
})

// Free models to rotate through
const FREE_MODELS = [
    'qwen/qwen3-coder:free',
    'kwaipilot/kat-coder-pro:free',
    'z-ai/glm-4.5-air:free',
]

let currentModelIndex = 0

function getNextModel() {
    // random index
    const currentIndex = Math.floor(Math.random() * FREE_MODELS.length)
    currentModelIndex = currentIndex
    const model = FREE_MODELS[currentModelIndex]
    return model
}


const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOST || 'localhost'
const port = parseInt(process.env.PORT, 10) || 3000
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = http.createServer(async (req, res) => {
        try {
            await handle(req, res)
        } catch (error) {
            console.log("Error occurred while handling the request", error)
            res.statusCode = 500
            res.end('Internal Server Error')
        }
    })

    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        pingTimeout: 60000,
        pingInterval: 25000
    })

    let messages = [
        {
            id: '1',
            content: 'Hello, how can I help you today?',
            username: 'OSTAD AI',
            createdAt: '2021-01-01',
            isAi: true,
            readBy: []
        }
    ]
    const onlineUsers = new Map()

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id)

        socket.emit('previous-messages', messages)

        socket.on('join-chat', (username) => {
            socket.username = username
            onlineUsers.set(socket.id, username)
            io.emit('online-users', Array.from(onlineUsers.values()))
        })

        socket.on('typing', (username) => {
            socket.broadcast.emit('typing', username)
        })

        socket.on('stop typing', (username) => {
            socket.broadcast.emit('stop typing', username)
        })

        socket.on('message-read', ({ messageId, username }) => {
            const message = messages.find(m => m.id === messageId)
            if (message && !message.readBy.includes(username)) {
                message.readBy.push(username)
                io.emit('message-updated', message)
            }
        })

        socket.on('send-message', async (data) => {
            try {
                const message = {
                    id: Date.now().toString(),
                    content: data.content,
                    username: socket.username,
                    createdAt: new Date().toISOString(),
                    isAi: false,
                    readBy: []
                }
                messages.push(message)

                // Keep only last 50 messages
                if (messages.length > 50) {
                    messages = messages.slice(-50)
                }


                io.emit('new-message', message)

                if (data.content.toLowerCase().includes("@ai")) {
                    const contextMessages = messages.slice(-20).map(msg =>
                        `${msg.username}: ${msg.content}`
                    ).join('\n')

                    try {
                        io.emit("ai-thinking")
                        const selectedModel = getNextModel()
                        console.log(`Using model: ${selectedModel}`)

                        // Emit model info to all clients
                        io.emit('ai-model-info', { model: selectedModel })

                        const completion = await openai.chat.completions.create({
                            model: selectedModel,
                            messages: [
                                {
                                    role: 'system',
                                    content: `You are a helpful AI assistant in a global chat room. You have access to the recent chat context. Respond naturally and helpfully. Keep responses concise but informative. You cannot generate actual images, but you can describe them vividly when asked. Be friendly and engaging!`
                                },
                                {
                                    role: 'user',
                                    content: `Recent chat context:\n${contextMessages}\n\nCurrent message from ${data.username}: ${data.content}`
                                }
                            ],
                            max_tokens: 500,
                            temperature: 0.7
                        })

                        const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

                        const aiMessage = {
                            id: (Date.now() + 1).toString(),
                            content: aiResponse,
                            username: 'ai',
                            createdAt: new Date().toISOString(),
                            isAi: true,
                            readBy: []
                        }
                        messages.push(aiMessage)
                        io.emit('new-message', aiMessage)

                    } catch (error) {
                        console.error('Error emitting ai-thinking:', error)
                        const fallbackResponses = [
                            "I'm currently experiencing some technical difficulties, but I'm here to chat! How can I help you?",
                            "Sorry, I'm having trouble connecting to my AI services right now. Feel free to continue chatting with others!",
                            "My AI circuits are a bit fuzzy at the moment. Is there anything else I can assist you with?",
                            "I seem to be having some connectivity issues. The chat is still working though!"
                        ]
                        const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]

                        const errorMessage = {
                            id: (Date.now() + 1).toString(),
                            content: randomResponse,
                            username: 'ai',
                            createdAt: new Date().toISOString(),
                            isAi: true,
                            readBy: []
                        }

                        messages.push(errorMessage)
                        io.emit('new-message', errorMessage)


                    } finally {
                        io.emit("ai-stop-thinking")
                    }
                }

            } catch (error) {
                console.error('Error handling send-message:', error)
            }
        })

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id)
            onlineUsers.delete(socket.id)
            io.emit('online-users', Array.from(onlineUsers.values()))
        })

    })

    server.listen(port, (err) => {
        if (err) throw err
        console.log(`> Ready on http://${hostname}:${port}`)
    })
})