import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()
const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))
app.use(express.json())

app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

const PORT = Number(process.env.PORT) || 3000
app.listen(PORT, () => console.log(`🟢 Server running on http://localhost:${PORT}`))