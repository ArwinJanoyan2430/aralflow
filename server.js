import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import multer from 'multer'
import pdfParse from 'pdf-parse'

dotenv.config()

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '2mb' }))

const upload = multer({ storage: multer.memoryStorage() })

function buildFallbackQuestions(text, topic, count) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  const source = sentences.slice(0, Math.min(sentences.length, 10)).join(' ')
  const keywords = source
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .slice(0, 8)

  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const sentence = sentences[index % Math.max(1, sentences.length)] || source
    const distractorA = keywords[(index + 1) % keywords.length] || 'Key concept'
    const distractorB = keywords[(index + 2) % keywords.length] || 'Main idea'
    const distractorC = keywords[(index + 3) % keywords.length] || 'Supporting detail'

    return {
      id: index + 1,
      type: 'mcq',
      question: `What is the main idea of the section about ${topic || 'the study material'}?`,
      options: [
        sentence.slice(0, 80) || 'The topic is explained clearly.',
        `${distractorA} is the central focus.`,
        `${distractorB} is emphasized.`,
        `${distractorC} should be reviewed.`
      ],
      answer: sentence.slice(0, 80) || 'The topic is explained clearly.',
      explanation: 'This answer reflects the most relevant point from the uploaded material.'
    }
  })
}

function parseQuestionResponse(raw) {
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => ({
        id: index + 1,
        type: item.type || 'mcq',
        question: item.question,
        options: item.options || [],
        answer: item.answer,
        explanation: item.explanation || 'Review the source material for more detail.'
      }))
    }
  } catch {
    return []
  }

  return []
}

app.post('/api/extract-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file was uploaded.' })
    }

    const data = await pdfParse(req.file.buffer)
    const text = data.text.replace(/\s+/g, ' ').trim()

    if (!text) {
      return res.status(400).json({ error: 'No readable text was found in the PDF.' })
    }

    return res.json({ text })
  } catch (error) {
    console.error('PDF extraction failed:', error.message)
    return res.status(500).json({ error: 'PDF extraction failed.' })
  }
})

app.post('/api/generate-quiz', async (req, res) => {
  const { text, topic = 'exam prep', count = 5 } = req.body || {}

  if (!text || text.trim().length < 20) {
    return res.status(400).json({ error: 'Please provide study material with enough text to generate questions.' })
  }

  const fallbackQuestions = buildFallbackQuestions(text, topic, count)

  if (!process.env.OPENAI_API_KEY) {
    return res.json({ questions: fallbackQuestions, mode: 'local' })
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const prompt = `Create ${count} exam practice questions from the following study material. Return only a JSON array of objects with fields: question, options, answer, explanation, type. The topic is ${topic}. Study material:\n\n${text.slice(0, 8000)}`

    const completion = await client.responses.create({
      model: 'gpt-4.1-mini',
      input: prompt
    })

    const aiQuestions = parseQuestionResponse(completion.output_text || '')

    if (aiQuestions.length > 0) {
      return res.json({ questions: aiQuestions, mode: 'ai' })
    }
  } catch (error) {
    console.error('AI generation failed:', error.message)
  }

  return res.json({ questions: fallbackQuestions, mode: 'local-fallback' })
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'AralFlow AI quiz server is running.' })
})

app.listen(port, () => {
  console.log(`AralFlow server listening on http://localhost:${port}`)
})
