import d3 from "d3";

export const addScaleBar = function (tree, fontsize){
    tree.svg.selectAll('.scalebar').remove();
    if (!fontsize){
        fontsize = 10;
    }
    const extend = tree.xScale.domain()[1] - tree.xScale.domain()[0];
    var magnitude = Math.pow(10,Math.floor(Math.log10(extend)-1));
    magnitude *= Math.ceil(extend/magnitude*0.1);
    const xMin = tree.xScale.range()[0] + 0.05*(tree.xScale.range()[1]-tree.xScale.range()[0]);
    const xMax = xMin+tree.xScale(magnitude) - tree.xScale(0);
    const y = tree.yScale.range()[0] + 0.95*(tree.yScale.range()[1]-tree.yScale.range()[0]);
    const pathLine = `M ${xMin}, ${y} L ${xMax}, ${y}`;
    tree.svg.append("g").selectAll(".scalebar").data([{xMin, xMax, y}]).enter()
    .append("path")
    .attr("d", pathLine)
    .attr("class", "scalebar")
    .style('stroke-linecap', 'round')
    .style("stroke","#CCC")
    .style("stroke-width",2);

    tree.svg.append("g").selectAll(".scalebar text").data([{xMin, xMax, y}]).enter()
    .append("text")
    .text(magnitude.toFixed(-Math.log10(magnitude)+1))
    .attr('x', 0.5*(xMax+xMin))
    .attr('y', y + fontsize*1.3)
    .attr("class", "scalebar text")
    .style('text-anchor', 'middle')
    .style("stroke","#CCC")
    .style("fill","#CCC")
    .style('font-size',fontsize+'px');

}