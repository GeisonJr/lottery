import * as fs from 'node:fs'
import results from './results.json'

const MAX_NUMBERS = 60
const QUANTITY = 6

// Função para ordenar os dados
const raw = Array(MAX_NUMBERS + 1).fill(0)

let numberOfResults = 0
let oldestResult: Date | null = null
let newestResult: Date | null = null

// Count the number of times each number was drawn
for (const result of results) {
  const date = new Date(result.date)
  oldestResult ??= date
  newestResult ??= date

  if (date < oldestResult)
    oldestResult = date
  if (date > newestResult)
    newestResult = date

  numberOfResults++

  // Iterate over the drawn numbers
  for (const drawnNumber of result.drawnNumbers)
    // Check if the number is valid
    if (drawnNumber >= 1 && drawnNumber <= MAX_NUMBERS)
      raw[drawnNumber]++
}

// Build the data
const data = raw
  // Remove the first element (index 0) because it's not a valid number
  .slice(1)
  // Map the data to an object with the number and the count
  .map((count, index) => ({
    number: index + 1,
    count
  }))

// Distribution Number
const distributionByNumber = data.toSorted((a, b) => a.number - b.number)
const distributionCountsByNumber = distributionByNumber.map(({ count }) => count)
const distributionLabelsByNumber = distributionByNumber.map(({ number }) => number)

// Distribution Occurrence
const distributionByOccurrence = data.toSorted((a, b) => a.count - b.count)
const distributionCountsByOccurrence = distributionByOccurrence.map(({ count }) => count)
const distributionLabelsByOccurrence = distributionByOccurrence.map(({ number }) => number)

// Forecast Min Number
const forecastByNumberMin = data
  .toSorted((a, b) => a.count - b.count)
  .slice(0, QUANTITY)
  .toSorted((a, b) => a.number - b.number)
const forecastCountsByNumberMin = forecastByNumberMin.map(({ count }) => count)
const foracastLabelsByNumberMin = forecastByNumberMin.map(({ number }) => number)

// Forecast Min Occurrence
const forecastByOccurrenceMin = data
  .toSorted((a, b) => a.count - b.count)
  .slice(0, QUANTITY)
const forecastCountsByOccurrenceMin = forecastByOccurrenceMin.map(({ count }) => count)
const forecastLabelsByOccurrenceMin = forecastByOccurrenceMin.map(({ number }) => number)

// Forecast Max Number
const forecastByNumberMax = data
  .toSorted((a, b) => a.count - b.count)
  .slice(-QUANTITY)
  .toSorted((a, b) => a.number - b.number)
const forecastCountsByNumberMax = forecastByNumberMax.map(({ count }) => count)
const forecastLabelsByNumberMax = forecastByNumberMax.map(({ number }) => number)

// Forecast Max Occurrence
const forecastByOccurrenceMax = data
  .toSorted((a, b) => a.count - b.count)
  .slice(-QUANTITY)
const forecastCountsByOccurrenceMax = forecastByOccurrenceMax.map(({ count }) => count)
const forecastLabelsByOccurrenceMax = forecastByOccurrenceMax.map(({ number }) => number)

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

      @media (min-width: 768px) {
        .group {
          grid-template-columns: repeat(4, 1fr);
        }
      }
    </style>
  </head>
  <body>
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
            dataset.labels = ${JSON.stringify(foracastLabelsByNumberMin)}
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
