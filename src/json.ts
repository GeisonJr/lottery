import * as fs from 'node:fs'
import * as path from 'node:path'

const filePath = path.join(__dirname, '..', 'data', 'results.txt')

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err)
    return
  }

  const lines = data
    .split('\n')
    .filter(line => line.trim() !== '')

  const results = lines
    .map(line => {
      // \t or space
      const [id, date, ball1, ball2, ball3, ball4, ball5, ball6] = line.split(/\s+/)

      return {
        id: id.trim(),
        date: date.trim().split('/').reverse().join('-') + 'T00:00:00.000Z',
        drawnNumbers: [
          parseInt(ball1.trim(), 10),
          parseInt(ball2.trim(), 10),
          parseInt(ball3.trim(), 10),
          parseInt(ball4.trim(), 10),
          parseInt(ball5.trim(), 10),
          parseInt(ball6.trim(), 10)
        ]
      }
    })

  const jsonFilePath = path.join(__dirname, '..', 'data', `results-${Date.now()}.json`)
  fs.writeFile(jsonFilePath, JSON.stringify(results, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error writing JSON file:', err)
      return
    }
    console.log('JSON file has been saved.')
  })
})
