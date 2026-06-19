import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

function TrendChart({ data }) {
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

    const times = data.map(item => {
      const date = new Date(item.time);
      return `${date.getHours().toString().padStart(2, '0')}:00`;
    });
    const counts = data.map(item => item.count);

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        textStyle: {
          color: '#e2e8f0',
        },
        formatter: params => {
          const item = params[0];
          return `<div style="padding: 4px;">
            <div style="font-weight: 500; margin-bottom: 4px;">${item.axisValue}</div>
            <div style="color: #60a5fa;">发帖量: <strong>${item.value}</strong></div>
          </div>`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: times,
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
      series: [
        {
          name: '发帖量',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          showSymbol: false,
          data: counts,
          lineStyle: {
            width: 3,
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#8b5cf6' },
            ]),
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
            ]),
          },
          itemStyle: {
            color: '#3b82f6',
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
        },
      ],
    };

    chartInstance.current.setOption(option);
  }, [data]);

  return <div ref={chartRef} className="chart-container" />;
}

export default TrendChart;
