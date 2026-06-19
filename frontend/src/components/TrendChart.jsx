import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const colorPalette = [
  { main: '#3b82f6', gradient: ['#3b82f6', '#8b5cf6'], area: 'rgba(59, 130, 246, 0.3)', areaEnd: 'rgba(59, 130, 246, 0.02)' },
  { main: '#ff6b6b', gradient: ['#ff6b6b', '#ee5a24'], area: 'rgba(255, 107, 107, 0.3)', areaEnd: 'rgba(255, 107, 107, 0.02)' },
  { main: '#2ed573', gradient: ['#2ed573', '#1abc9c'], area: 'rgba(46, 213, 115, 0.3)', areaEnd: 'rgba(46, 213, 115, 0.02)' },
  { main: '#ffa502', gradient: ['#ffa502', '#ff6348'], area: 'rgba(255, 165, 2, 0.3)', areaEnd: 'rgba(255, 165, 2, 0.02)' },
];

function TrendChart({ data, predictedData, compareData, comparePredicted, topicNames = ['话题1', '话题2'] }) {
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
    if (!chartInstance.current) return;

    const hasCompare = compareData && compareData.length > 0;
    const hasPrediction = predictedData && predictedData.length > 0;
    const hasComparePrediction = comparePredicted && comparePredicted.length > 0;

    const formatTime = (timeStr) => {
      const date = new Date(timeStr);
      return `${date.getHours().toString().padStart(2, '0')}:00`;
    };

    let allTimes = [];
    if (data && data.length > 0) {
      allTimes = [...data.map(d => formatTime(d.time))];
    }
    if (hasPrediction) {
      allTimes = [...allTimes, ...predictedData.map(d => formatTime(d.time))];
    }

    const series = [];
    const legendData = [];

    const colors = colorPalette;

    if (data && data.length > 0) {
      legendData.push(topicNames[0] || '话题1');
      series.push({
        name: topicNames[0] || '话题1',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        data: data.map(d => d.count),
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: colors[0].gradient[0] },
            { offset: 1, color: colors[0].gradient[1] },
          ]),
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: colors[0].area },
            { offset: 1, color: colors[0].areaEnd },
          ]),
        },
        itemStyle: {
          color: colors[0].main,
          borderColor: '#1e293b',
          borderWidth: 2,
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(59, 130, 246, 0.5)',
          },
        },
      });

      if (hasPrediction) {
        const predictedCounts = new Array(data.length - 1).fill(null);
        predictedCounts.push(data[data.length - 1]?.count || 0);
        predictedCounts.push(...predictedData.map(d => d.count));

        legendData.push(`${topicNames[0] || '话题1'} (预测)`);
        series.push({
          name: `${topicNames[0] || '话题1'} (预测)`,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          showSymbol: false,
          data: predictedCounts,
          lineStyle: {
            width: 2,
            type: 'dashed',
            color: colors[0].main,
            opacity: 0.7,
          },
          itemStyle: {
            color: colors[0].main,
          },
          tooltip: {
            valueFormatter: (val) => val !== null ? `${val} (预测)` : val,
          },
        });
      }
    }

    if (hasCompare) {
      legendData.push(topicNames[1] || '话题2');
      series.push({
        name: topicNames[1] || '话题2',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        data: compareData.map(d => d.count),
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: colors[1].gradient[0] },
            { offset: 1, color: colors[1].gradient[1] },
          ]),
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: colors[1].area },
            { offset: 1, color: colors[1].areaEnd },
          ]),
        },
        itemStyle: {
          color: colors[1].main,
          borderColor: '#1e293b',
          borderWidth: 2,
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(255, 107, 107, 0.5)',
          },
        },
      });

      if (hasComparePrediction) {
        const predictedCounts = new Array(compareData.length - 1).fill(null);
        predictedCounts.push(compareData[compareData.length - 1]?.count || 0);
        predictedCounts.push(...comparePredicted.map(d => d.count));

        legendData.push(`${topicNames[1] || '话题2'} (预测)`);
        series.push({
          name: `${topicNames[1] || '话题2'} (预测)`,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          showSymbol: false,
          data: predictedCounts,
          lineStyle: {
            width: 2,
            type: 'dashed',
            color: colors[1].main,
            opacity: 0.7,
          },
          itemStyle: {
            color: colors[1].main,
          },
        });
      }
    }

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        textStyle: {
          color: '#e2e8f0',
        },
      },
      legend: {
        show: hasCompare || hasPrediction,
        top: 0,
        textStyle: {
          color: '#94a3b8',
          fontSize: 11,
        },
        icon: 'roundRect',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: hasCompare || hasPrediction ? '15%' : '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allTimes,
        axisLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.3)',
          },
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
        },
        axisTick: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: false,
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.1)',
          },
        },
      },
      series,
    };

    chartInstance.current.setOption(option, true);
  }, [data, predictedData, compareData, comparePredicted, topicNames]);

  return <div ref={chartRef} className="chart-container" />;
}

export default TrendChart;
