export const removeLabels = function(tree){
    tree.svg.selectAll(".tipLabel").remove();
    tree.svg.selectAll(".branchLabel").remove();
}

export const branchLabels = function(tree, labelText, fontSize, yPad, xPad, align){
    const tmpYPad = yPad || 0.0;
    const tmpXPad = xPad || 0.0;
    const tmpAlign = align || "end";
    tree.branchLabels = tree.topLevelGroup.selectAll(".branchLabel")
        .data(tree.nodes.filter(function(d){return (fontSize(d) && labelText(d).length);}))
        .enter().append("text")
        .text(labelText)
        .attr("class", "branchLabel")
        .attr("x", function(d){return d.SVGcoords.xTip + xPad;})
        .attr("y", function(d){return d.SVGcoords.yTip + yPad;})
        .style("text-anchor", tmpAlign)
        .style("font-size", function(d){return fontSize(d).toString()+"px";});
}

export const tipLabels = function(tree, labelText, fontSize, yPad, xPad, align){
    const tmpYPad = yPad || 0.0;
    const tmpXPad = xPad || 0.0;
    const tmpAlign = align || "start";
    if (tree.layout==="rect"){
        tree.branchLabels = tree.topLevelGroup.selectAll(".tipLabel")
            .data(tree.nodes.filter(function(d){return (fontSize(d) && labelText(d).length);}))
            .enter().append("text")
            .text(labelText)
            .attr("class", "tipLabel")
            .attr("x", function(d){return d.SVGcoords.xTip + xPad;})
            .attr("y", function(d){return d.SVGcoords.yTip + yPad;})
            .style("text-anchor", tmpAlign)
            .style("font-size", function(d){return fontSize(d).toString()+"px";});
    }else if (tree.layout==="radial" ||tree.layout==="unrooted"){
        const dr = Math.sqrt(xPad*xPad + yPad*yPad)
        tree.branchLabels = tree.topLevelGroup.selectAll(".tipLabel")
            .data(tree.nodes.filter(function(d){return (fontSize(d) && labelText(d).length);}))
            .enter().append("text")
            .text(labelText)
            .attr("class", "tipLabel")
            .attr("x", function(d){return d.SVGcoords.xTip + dr*Math.sin(d.layout.angle);})
            .attr("y", function(d){return d.SVGcoords.yTip + dr*Math.cos(d.layout.angle);})
            .style("text-anchor", function(d){return (d.layout.angle>Math.PI)?"end":"start";})
            .attr("transform",function(d){
                return `rotate(${(-180/Math.PI*d.layout.angle)%180+90},${d.SVGcoords.xTip + dr*Math.sin(d.layout.angle)}, ${d.SVGcoords.yTip + dr*Math.cos(d.layout.angle)})`;})
//            .attr("rotate",function(d){return 180/Math.Pi*d.layout.angle;})
            .style("font-size", function(d){return fontSize(d).toString()+"px";});

    }
}