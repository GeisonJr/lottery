import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

interface LotteryResult {
  id: string
  date: string
  drawnNumbers: number[]
}

function parseLine(line: string): LotteryResult {
  const [id, date, ball1, ball2, ball3, ball4, ball5, ball6] = line.split(/\s+/)

  return {
    id: id.trim(),
    date: date.trim().split('/').reverse().join('-') + 'T00:00:00.000Z',
    drawnNumbers: [
      Number.parseInt(ball1.trim(), 10),
      Number.parseInt(ball2.trim(), 10),
      Number.parseInt(ball3.trim(), 10),
      Number.parseInt(ball4.trim(), 10),
      Number.parseInt(ball5.trim(), 10),
      Number.parseInt(ball6.trim(), 10),
    ],
  }
}

async function convertTextToJson(): Promise<void> {
  try {
    const filePath = join(__dirname, '..', 'data', 'results.txt')
    const data = await readFile(filePath, 'utf8')

    const lines = data.split('\n').filter(line => line.trim() !== '')
    const results = lines.map(parseLine)

    const jsonFilePath = join(__dirname, '..', 'data', `results-${Date.now()}.json`)
    await writeFile(jsonFilePath, JSON.stringify(results, null, 2), 'utf8')

    console.log(`✅ JSON file saved: ${jsonFilePath}`)
    console.log(`📊 Total results: ${results.length}`)
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  }
}

convertTextToJson()
