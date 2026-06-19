import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import 'echarts-wordcloud';

function WordCloudChart({ data }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark');

      const handleResize = () => {
        chartInstance.current?.resize();
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chartInstance.current?.dispose();
      };
    }
  }, []);

  useEffect(() => {
    if (!chartInstance.current || !data || data.length === 0) return;

    const wordData = data.map(item => ({
      name: item.word,
      value: item.count || item.score || 10,
    }));

    const colors = [
      '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9',
      '#f472b6', '#fb7185', '#f97316', '#fbbf24', '#34d399',
      '#22d3ee', '#38bdf8', '#6366f1', '#ec4899', '#f59e0b',
    ];

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        show: true,
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        textStyle: {
          color: '#e2e8f0',
        },
        formatter: params => {
          return `<div style="padding: 4px;">
            <div style="font-weight: 500;">${params.name}</div>
            <div style="color: #60a5fa;">出现次数: <strong>${params.value}</strong></div>
          </div>`;
        },
      },
      series: [
        {
          type: 'wordCloud',
          shape: 'circle',
          left: 'center',
          top: 'center',
          width: '90%',
          height: '90%',
          sizeRange: [14, 50],
          rotationRange: [-45, 45],
          rotationStep: 15,
          gridSize: 8,
          drawOutOfBound: false,
          layoutAnimation: true,
          textStyle: {
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            color: function () {
              return colors[Math.floor(Math.random() * colors.length)];
            },
          },
          emphasis: {
            focus: 'self',
            textStyle: {
              textShadowBlur: 10,
              textShadowColor: 'rgba(96, 165, 250, 0.8)',
            },
          },
          data: wordData,
        },
      ],
    };

    chartInstance.current.setOption(option);
  }, [data]);

  return <div ref={chartRef} className="chart-container" />;
}

export default WordCloudChart;
