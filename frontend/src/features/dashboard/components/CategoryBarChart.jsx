import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

// D3 chart, isolated per Phase 3/8: takes plain data props, never reaches
// into global state -- reusable wherever a category breakdown is needed,
// not just this one dashboard.
export default function CategoryBarChart({ data }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const width = 480;
    const height = 220;
    const margin = { top: 10, right: 10, bottom: 30, left: 32 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const x = d3.scaleBand()
      .domain(data.map((d) => d.categoryName))
      .range([margin.left, width - margin.right])
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d.count) || 1])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .selectAll('text')
      .style('font-size', '10px')
      .attr('transform', 'rotate(-20)')
      .style('text-anchor', 'end');

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(4))
      .selectAll('text')
      .style('font-size', '10px');

    svg.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (d) => x(d.categoryName))
      .attr('y', (d) => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', (d) => y(0) - y(d.count))
      .attr('rx', 4)
      .attr('fill', 'var(--tenant-accent, #1D9E75)');
  }, [data]);

  return <svg ref={svgRef} className="w-full" />;
}
