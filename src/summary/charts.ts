export async function generateCategoryPieChart(
  categories: Record<string, number>,
  title: string
): Promise<Buffer | null> {
  const entries = Object.entries(categories).filter(([_, val]) => val > 0);
  if (entries.length === 0) return null;

  // Sort descending
  entries.sort((a, b) => b[1] - a[1]);

  const labels = entries.map(([cat]) => cat);
  const data = entries.map(([_, amt]) => amt);

  const colors = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
    '#4BC0C0',
    '#9966FF',
    '#FF9F40',
    '#00D2D3',
    '#54A0FF',
    '#5f27cd',
    '#10ac84',
    '#ff6b6b',
    '#48dbfb',
  ];

  const chartConfig = {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 18, weight: 'bold' },
          padding: { top: 10, bottom: 20 },
        },
        legend: {
          position: 'right',
          labels: {
            boxWidth: 15,
            font: { size: 13 },
          },
        },
        datalabels: {
          color: '#ffffff',
          font: { weight: 'bold', size: 12 },
          formatter: (value: number, ctx: any) => {
            const sum = ctx.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / sum) * 100);
            return percentage >= 5 ? `${percentage}%` : '';
          },
        },
      },
    },
  };

  try {
    const response = await fetch('https://quickchart.io/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chart: chartConfig,
        width: 600,
        height: 380,
        backgroundColor: '#f8fafc',
        format: 'png',
      }),
    });

    if (!response.ok) {
      console.warn(`[Chart Error] QuickChart returned status: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[Chart Error] Failed to generate pie chart', error);
    return null;
  }
}

export async function generateDailyBarChart(
  dailyExpenses: Record<string, number>,
  title: string
): Promise<Buffer | null> {
  const dates = Object.keys(dailyExpenses).sort();
  if (dates.length === 0) return null;

  // Show last 14 days maximum
  const slicedDates = dates.slice(-14);
  const labels = slicedDates.map((d) => d.slice(5)); // MM-DD
  const data = slicedDates.map((d) => dailyExpenses[d] || 0);

  const chartConfig = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'รายจ่าย (บาท)',
          data,
          backgroundColor: '#3b82f6',
          borderRadius: 6,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 18, weight: 'bold' },
        },
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    },
  };

  try {
    const response = await fetch('https://quickchart.io/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chart: chartConfig,
        width: 600,
        height: 350,
        backgroundColor: '#f8fafc',
        format: 'png',
      }),
    });

    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[Chart Error] Failed to generate bar chart', error);
    return null;
  }
}

