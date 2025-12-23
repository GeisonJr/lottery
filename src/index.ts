import fs from 'node:fs'
import results from '../data/results.json'

// Types
interface LotteryResult {
  id: string
  date: string
  drawnNumbers: number[]
}

interface NumberData {
  number: number
  count: number
}

// Constants
const MAX_NUMBERS = 60
const QUANTITY = 6

// Helper functions
function extractLabelsAndCounts(data: NumberData[]) {
  const counts = []
  const labels = []

  for (const item of data) {
    counts.push(item.count)
    labels.push(item.number)
  }

  return {
    counts,
    labels,
  }
}

function processResults(lotteryResults: LotteryResult[]) {
  const frequencies = new Array(MAX_NUMBERS + 1).fill(0)
  let count = 0
  let oldest: Date | null = null
  let newest: Date | null = null

  for (const result of lotteryResults) {
    const date = new Date(result.date)

    if (!isNaN(date.getTime())) {
      oldest ??= date
      newest ??= date
      if (date < oldest) oldest = date
      if (date > newest) newest = date
    }

    count++

    for (const number of result.drawnNumbers) {
      if (number >= 1 && number <= MAX_NUMBERS) {
        frequencies[number]++
      }
    }
  }

  return { frequencies, count, oldest, newest }
}

const {
  frequencies,
  count: numberOfResults,
  oldest: oldestResult,
  newest: newestResult
} = processResults(results as LotteryResult[])

// Build number frequency data
const data: NumberData[] = frequencies
  .slice(1)
  .map((count, index) => ({
    number: index + 1,
    count,
  }))

// Sort helpers
const sortByNumber = (a: NumberData, b: NumberData) => a.number - b.number
const sortByCount = (a: NumberData, b: NumberData) => a.count - b.count
const sortByCountDesc = (a: NumberData, b: NumberData) => b.count - a.count

// Distribution data
const distributionByNumber = data.toSorted(sortByNumber)
const {
  labels: distributionLabelsByNumber,
  counts: distributionCountsByNumber
} = extractLabelsAndCounts(distributionByNumber)

const distributionByOccurrence = data.toSorted(sortByCount)
const {
  labels: distributionLabelsByOccurrence,
  counts: distributionCountsByOccurrence
} = extractLabelsAndCounts(distributionByOccurrence)

// Forecast data
const leastFrequent = data.toSorted(sortByCount).slice(0, QUANTITY)
const forecastByNumberMin = leastFrequent.toSorted(sortByNumber)
const {
  labels: forecastLabelsByNumberMin,
  counts: forecastCountsByNumberMin
} = extractLabelsAndCounts(forecastByNumberMin)
const {
  labels: forecastLabelsByOccurrenceMin,
  counts: forecastCountsByOccurrenceMin
} = extractLabelsAndCounts(leastFrequent)

const mostFrequent = data.toSorted(sortByCount).slice(-QUANTITY)
const forecastByNumberMax = mostFrequent.toSorted(sortByNumber)
const {
  labels: forecastLabelsByNumberMax,
  counts: forecastCountsByNumberMax
} = extractLabelsAndCounts(forecastByNumberMax)
const {
  labels: forecastLabelsByOccurrenceMax,
  counts: forecastCountsByOccurrenceMax
} = extractLabelsAndCounts(mostFrequent)

// Number Suggestion Strategies
function calculateNumberScore(item: NumberData, avgCount: number): number {
  // Score based on multiple factors:
  // 1. Frequency relative to average (40%)
  const frequencyScore = (item.count / avgCount) * 0.4

  // 2. Avoid extremes - prefer numbers near average (30%)
  const deviation = Math.abs(item.count - avgCount) / avgCount
  const balanceScore = (1 - deviation) * 0.3

  // 3. Position diversity - prefer spread across number range (30%)
  const positionScore = Math.sin((item.number / MAX_NUMBERS) * Math.PI) * 0.3

  return frequencyScore + balanceScore + positionScore
}

function generateBestNumbers(): number[] {
  const avgCount = data.reduce((sum, d) => sum + d.count, 0) / data.length

  // Calculate score for each number
  const scored = data.map(item => ({
    number: item.number,
    score: calculateNumberScore(item, avgCount)
  }))

  // Select top QUANTITY numbers by score, ensuring good distribution
  const selected: number[] = []
  const sortedByScore = scored.toSorted((a, b) => b.score - a.score)

  for (const item of sortedByScore) {
    // Avoid numbers too close to already selected ones
    const tooClose = selected.some(n => Math.abs(n - item.number) <= 3)
    if (!tooClose || selected.length >= QUANTITY - 1) {
      selected.push(item.number)
      if (selected.length === QUANTITY) break
    }
  }

  // Fill remaining slots if needed
  if (selected.length < QUANTITY) {
    for (const item of sortedByScore) {
      if (!selected.includes(item.number)) {
        selected.push(item.number)
        if (selected.length === QUANTITY) break
      }
    }
  }

  return selected.sort((a, b) => a - b)
}

function generateBalancedNumbers(): number[] {
  const sorted = data.toSorted(sortByCountDesc)
  const hot = sorted.slice(0, 3).map(d => d.number)
  const cold = sorted.slice(-3).map(d => d.number)
  return [...hot, ...cold].sort((a, b) => a - b)
}

function generateHotNumbers(): number[] {
  return data
    .toSorted(sortByCountDesc)
    .slice(0, QUANTITY)
    .map(d => d.number)
    .sort((a, b) => a - b)
}

function generateColdNumbers(): number[] {
  return data
    .toSorted(sortByCount)
    .slice(0, QUANTITY)
    .map(d => d.number)
    .sort((a, b) => a - b)
}

function generateWeightedRandom(): number[] {
  const totalCount = data.reduce((sum, d) => sum + d.count, 0)
  const selected = new Set<number>()

  while (selected.size < QUANTITY) {
    let random = Math.random() * totalCount
    for (const item of data) {
      random -= item.count
      if (random <= 0) {
        selected.add(item.number)
        break
      }
    }
  }

  return Array.from(selected).sort((a, b) => a - b)
}

function generateTrulyRandom(): number[] {
  const available = Array.from({ length: MAX_NUMBERS }, (_, i) => i + 1)
  const selected: number[] = []

  for (let i = 0; i < QUANTITY; i++) {
    const index = Math.floor(Math.random() * available.length)
    selected.push(available[index])
    available.splice(index, 1)
  }

  return selected.sort((a, b) => a - b)
}

// Generate suggestions
const suggestions = {
  best: generateBestNumbers(),
  balanced: generateBalancedNumbers(),
  hot: generateHotNumbers(),
  cold: generateColdNumbers(),
  weighted: generateWeightedRandom(),
  random: generateTrulyRandom()
}

fs.writeFileSync('distribution.html', `
<!DOCTYPE html>
<html>
  <head>
    <title>Drawn Numbers Distribution</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
      body {
        align-items: center;
        display: flex;
        flex-direction: column;
        font-family: Arial, sans-serif;
        justify-content: center;
        padding: 20px;
      }
      h2 {
        margin-top: 40px;
      }
      button {
        background-color: rgb(54, 162, 235);
        border-radius: 5px;       
        border: none;
        color: white; 
        cursor: pointer;
        font-size: 14px;
        padding: 10px 15px;
        width: 100%;

        &[disabled] {
          background-color: #ccc;
          cursor: not-allowed;
        }
      }
      .container {
        margin-bottom: 50px;
        max-width: 1400px;
        width: 100%;
      }
      .group {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(2, 1fr);
        margin-top: 10px;
      }
      .suggestions {
        display: grid;
        gap: 20px;
        grid-template-columns: 1fr;
        margin-bottom: 20px;
      }
      .suggestion-card {
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        color: white;
        padding: 20px;
      }
      .suggestion-card h3 {
        font-size: 20px;
        margin: 0 0 8px 0;
      }
      .suggestion-desc {
        font-size: 13px;
        margin: 0 0 15px 0;
        opacity: 0.9;
      }
      .numbers {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: center;
      }
      .number {
        align-items: center;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 50%;
        color: #333;
        display: flex;
        font-size: 18px;
        font-weight: bold;
        height: 50px;
        justify-content: center;
        width: 50px;
      }

      @media (min-width: 768px) {
        .group {
          grid-template-columns: repeat(4, 1fr);
        }
        .suggestions {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (min-width: 1200px) {
        .suggestions {
          grid-template-columns: repeat(3, 1fr);
        }
      }
    </style>
  </head>
  <body>
    <h2>Sugestões de Números para Jogar</h2>
    <div class="container">
      <div class="suggestions">
        <div class="suggestion-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <h3>⭐ Melhor Sugestão</h3>
          <p class="suggestion-desc">Análise estatística completa com distribuição otimizada</p>
          <div class="numbers">${suggestions.best.map(n => `<span class="number">${n}</span>`).join('')}</div>
        </div>
        <div class="suggestion-card">
          <h3>🎯 Balanceado</h3>
          <p class="suggestion-desc">3 mais sorteados + 3 menos sorteados</p>
          <div class="numbers">${suggestions.balanced.map(n => `<span class="number">${n}</span>`).join('')}</div>
        </div>
        <div class="suggestion-card">
          <h3>🔥 Números Quentes</h3>
          <p class="suggestion-desc">6 números mais sorteados</p>
          <div class="numbers">${suggestions.hot.map(n => `<span class="number">${n}</span>`).join('')}</div>
        </div>
        <div class="suggestion-card">
          <h3>❄️ Números Frios</h3>
          <p class="suggestion-desc">6 números menos sorteados</p>
          <div class="numbers">${suggestions.cold.map(n => `<span class="number">${n}</span>`).join('')}</div>
        </div>
        <div class="suggestion-card">
          <h3>⚖️ Aleatório Ponderado</h3>
          <p class="suggestion-desc">Baseado na frequência histórica</p>
          <div class="numbers">${suggestions.weighted.map(n => `<span class="number">${n}</span>`).join('')}</div>
        </div>
        <div class="suggestion-card">
          <h3>🎲 Totalmente Aleatório</h3>
          <p class="suggestion-desc">Seleção completamente aleatória</p>
          <div class="numbers">${suggestions.random.map(n => `<span class="number">${n}</span>`).join('')}</div>
        </div>
      </div>
    </div>

    <h2>Distribuição dos Números Sorteados</h2>
    <div class="container">
      <canvas id="chart"></canvas>
      <div class="group">
        <button onclick="createChart('number', 'asc')">Todos, Ordenado por Número ⬆</button>
        <button onclick="createChart('number', 'desc')">Todos, Ordenado por Número ⬇</button>
        <button onclick="createChart('occurrence', 'asc')">Todos, Ordenado por Ocorrência ⬆</button>
        <button onclick="createChart('occurrence', 'desc')">Todos, Ordenado por Ocorrência ⬇</button>
        <button onclick="createChart('number-min', 'asc')">Menores Frequências, Ordenado por Número ⬆</button>
        <button onclick="createChart('number-min', 'desc')">Menores Frequências, Ordenado por Número ⬇</button>
        <button onclick="createChart('occurrence-min', 'asc')">Menores Frequências, Ordenado por Ocorrência ⬆</button>
        <button onclick="createChart('occurrence-min', 'desc')">Menores Frequências, Ordenado por Ocorrência ⬇</button>
        <button onclick="createChart('number-max', 'asc')">Maiores Frequências, Ordenado por Número ⬆</button>
        <button onclick="createChart('number-max', 'desc')">Maiores Frequências, Ordenado por Número ⬇</button>
        <button onclick="createChart('occurrence-max', 'asc')">Maiores Frequências, Ordenado por Ocorrência ⬆</button>
        <button onclick="createChart('occurrence-max', 'desc')">Maiores Frequências, Ordenado por Ocorrência ⬇</button>
      </div>
      <p>Resultados: ${!!numberOfResults
    ? numberOfResults
    : 0
  }</p>
      <p>Resultado mais antigo: ${!!oldestResult
    ? Intl.DateTimeFormat('pt-br', {
      dateStyle: 'long'
    })
      .format(oldestResult)
    : 'Nenhum'
  }</p>
  <p>Resultado mais recente: ${!!newestResult
    ? Intl.DateTimeFormat('pt-br', {
      dateStyle: 'long'
    })
      .format(newestResult)
    : 'Nenhum'
  }</p>
    </div>

    <script>
      let chart = null;

      // Build the chart
      function createChart(type, order) {
        const ctx = document.getElementById('chart').getContext('2d');

        const dataset = {
          color: '',
          data: [],
          labels: [],
          title: ''
        }

        switch (type) {
          case 'number':
            dataset.labels = ${JSON.stringify(distributionLabelsByNumber)}
            dataset.data = ${JSON.stringify(distributionCountsByNumber)}
            dataset.color = 'rgba(54, 162, 235, 0.6)';
            dataset.title = 'Todos, Ordenado por Número'
            break;
          case 'occurrence':
            dataset.labels = ${JSON.stringify(distributionLabelsByOccurrence)}
            dataset.data = ${JSON.stringify(distributionCountsByOccurrence)}
            dataset.color = 'rgba(255, 99, 132, 0.6)'
            dataset.title = 'Todos, Ordenado por Ocorrência'
            break;
          case 'number-min':
            dataset.labels = ${JSON.stringify(forecastLabelsByNumberMin)}
            dataset.data = ${JSON.stringify(forecastCountsByNumberMin)}
            dataset.color = 'rgba(54, 162, 235, 0.6)'
            dataset.title = 'Menores Frequências, Ordenado por Número'
            break;
          case 'occurrence-min':
            dataset.labels = ${JSON.stringify(forecastLabelsByOccurrenceMin)}
            dataset.data = ${JSON.stringify(forecastCountsByOccurrenceMin)}
            dataset.color = 'rgba(255, 99, 132, 0.6)'
            dataset.title = 'Menores Frequências, Ordenado por Ocorrência'
            break;
          case 'number-max':
            dataset.labels = ${JSON.stringify(forecastLabelsByNumberMax)}
            dataset.data = ${JSON.stringify(forecastCountsByNumberMax)}
            dataset.color = 'rgba(54, 162, 235, 0.6)'
            dataset.title = 'Maiores Frequências, Ordenado por Número'
            break;
          case 'occurrence-max':
            dataset.labels = ${JSON.stringify(forecastLabelsByOccurrenceMax)}
            dataset.data = ${JSON.stringify(forecastCountsByOccurrenceMax)}
            dataset.color = 'rgba(255, 99, 132, 0.6)'
            dataset.title = 'Maiores Frequências, Ordenado por Ocorrência'
            break;
        }

        switch (order) {
          case 'asc':
            dataset.title += ' ⬆'
            break;
          case 'desc':
            dataset.title += ' ⬇'
            dataset.labels.reverse();
            dataset.data.reverse();
            break;
        }

        // Disable the current button by title
        const buttons = document.querySelectorAll('button')
        buttons.forEach(button => {
          button.disabled = button.innerText === dataset.title
        })

        if (chart)
          chart.destroy()

        chart = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: dataset.labels,
              datasets: [{
                label: 'Dataset',
                data: dataset.data,
                backgroundColor: dataset.color,
                borderColor: dataset.color.replace('0.6', '1'),
                borderWidth: 1
              }]
            },
            options: {
              scales: {
                x: {
                  title: {
                    display: true,
                    text: 'Números'
                  }
                },
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Ocorrências'
                  }
                }
              },
              plugins: {
                legend: {
                  display: false
                },
                title: {
                  display: true,                  
                  text: dataset.title
                  
                }
              }
            }
          })
      }

      // Set the default chart to be displayed
      window.onload = () => {
        createChart('number', 'asc');
      }
    </script>
  </body>
</html>
`)
