import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

function TagNetworkChart({ data }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 350;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const nodes = data.nodes.map(d => ({ ...d }));
    const links = data.links.map(d => ({ ...d }));

    const colorScale = d3.scaleOrdinal()
      .domain([0, 1])
      .range(['#3b82f6', '#8b5cf6']);

    const maxValue = d3.max(nodes, d => d.value) || 1;
    const radiusScale = d3.scaleSqrt()
      .domain([0, maxValue])
      .range([8, 40]);

    const maxLinkValue = d3.max(links, d => d.value) || 1;
    const linkWidthScale = d3.scaleLinear()
      .domain([0, maxLinkValue])
      .range([0.5, 3]);

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => radiusScale(d.value) + 5));

    const defs = svg.append('defs');

    const linkGroup = svg.append('g').attr('class', 'links');
    const nodeGroup = svg.append('g').attr('class', 'nodes');
    const labelGroup = svg.append('g').attr('class', 'labels');

    const link = linkGroup.selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', 'rgba(139, 92, 246, 0.3)')
      .attr('stroke-width', d => linkWidthScale(d.value))
      .attr('stroke-linecap', 'round');

    const node = nodeGroup.selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', d => radiusScale(d.value))
      .attr('fill', d => colorScale(d.category))
      .attr('fill-opacity', 0.9)
      .attr('stroke', d => d.category === 0 ? '#fff' : colorScale(d.category))
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    const label = labelGroup.selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text(d => d.name.length > 10 ? d.name.substring(0, 10) + '...' : d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', '#e2e8f0')
      .attr('font-size', d => Math.max(10, Math.min(14, radiusScale(d.value) / 2.5)))
      .style('pointer-events', 'none')
      .style('font-weight', '500')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.5)');

    const tooltip = d3.select('body')
      .append('div')
      .style('position', 'absolute')
      .style('padding', '8px 12px')
      .style('background', 'rgba(30, 41, 59, 0.95)')
      .style('border', '1px solid rgba(148, 163, 184, 0.2)')
      .style('border-radius', '8px')
      .style('color', '#e2e8f0')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('transition', 'opacity 0.2s')
      .style('z-index', 1000);

    node.on('mouseover', function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', radiusScale(d.value) * 1.15)
        .attr('fill-opacity', 1);

      tooltip.transition()
        .duration(200)
        .style('opacity', 1);
      tooltip.html(`
        <div style="font-weight: 600; margin-bottom: 4px;">${d.name}</div>
        <div style="color: #60a5fa;">出现次数: <strong>${d.value}</strong></div>
      `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mousemove', function(event) {
      tooltip
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', radiusScale(d.value))
        .attr('fill-opacity', 0.9);

      tooltip.transition()
        .duration(200)
        .style('opacity', 0);
    });

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      label
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: 350 }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export default TagNetworkChart;
