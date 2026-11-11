import d3 from "d3";


/**
 *
 * @param  {object} tree the phyloTree data structure
 * @param  {object} callbacks object with callback that specify the appearance of each tip
 */
export const drawBranches = function(tree, callbacks){
    setupBranches(tree);
    makePathStem(tree);
    makePathTbar(tree);
	const tmp_callbacks = Object.assign({}, callbacks);
	if (!tmp_callbacks.stroke){tmp_callbacks.stroke = function(d){return tree.branchStroke;}};
    if (!tmp_callbacks.strokeWidth){tmp_callbacks["stroke-width"] = function(d){return tree.branchStrokeWidth;}};

    tree.nodes.forEach(function(d){
        d.branchAttributes.stroke = tmp_callbacks.stroke(d);
        d.branchAttributes["stroke-width"] = tmp_callbacks["stroke-width"](d);
        d.branchAttributes.idTbar = "branch_T_" + d.n.clade;
        d.branchAttributes.idStem = "branch_S_" + d.n.clade;
    });
    tree.branchStemElements
        .attr("d", function(d){return d.branchAttributes.pathStem;})
        .attr("id", function(d){return d.branchAttributes.idStem;})
        .style("stroke", function(d){return d.branchAttributes.stroke;})
        .style("stroke-width", function(d){return d.branchAttributes["stroke-width"];});
    tree.branchTbarElements
        .attr("d", function(d){return d.branchAttributes.pathTbar;})
        .attr("id", function(d){return d.branchAttributes.idTbar;})
        .style("stroke", function(d){return d.branchAttributes.stroke;})
        .style("stroke-width", function(d){return d.branchAttributes["stroke-width"];});
}

/**
 * create the d3 objects for tips and bind the callbacks
 * @param  {[type]} tree [description]
 * @return {[type]}      [description]
 */
export const setupBranches = function(tree){
    tree.svg.selectAll(".branch").remove();
    tree.branchTbarElements = tree.topLevelGroup.selectAll(".branch T")
        .data(tree.nodes)
        .enter()
        .append("path")
        .attr("class", "branch T")
        .on("mouseover", function(d) {tree.callbacks.onBranchHover(d);})
        .on("mouseout", function(d) {tree.callbacks.onBranchLeave(d);})
        .on("click", function(d) {tree.callbacks.onBranchClick(d);})
        .style("fill","none")
        .style("pointer-events", "auto")
        .style("cursor", "pointer");

    tree.branchStemElements = tree.topLevelGroup.selectAll(".branch S")
        .data(tree.nodes)
        .enter()
        .append("path")
        .attr("class", "branch S")
        .on("mouseover", function(d) {tree.callbacks.onBranchHover(d);})
        .on("mouseout", function(d) {tree.callbacks.onBranchLeave(d);})
        .on("click", function(d) {tree.callbacks.onBranchClick(d);})
        .style("stroke-linecap","round")
        .style("fill","none")
        .style("pointer-events", "auto")
        .style("cursor", "pointer");

}


export const makePathStem = function(tree){
    const stem_offset = tree.nodes.map(function(d){
                return (0.5*(d.parent.branchAttributes["stroke-width"]
                           - d.branchAttributes["stroke-width"]) || 0.0);
            });
    if (tree.layout === "rect"){
        tree.nodes.forEach(function(d,i){
            d.branchAttributes.pathStem = `M ${d.SVGcoords.xBase - stem_offset[i]}, ${d.SVGcoords.yBase} L ${d.SVGcoords.xTip}, ${d.SVGcoords.yTip}`;
        });
    }else if (tree.layout==="radial"){
        tree.nodes.forEach(function(d,i){
            d.branchAttributes.pathStem = `M ${d.SVGcoords.xBase - stem_offset[i]*Math.sin(d.layout.angle)}, ${d.SVGcoords.yBase - stem_offset[i]*Math.cos(d.layout.angle)} L ${d.SVGcoords.xTip}, ${d.SVGcoords.yTip}`;
        });
    }else{
        tree.nodes.forEach(function(d,i){
            d.branchAttributes.pathStem = `M ${d.SVGcoords.xBase}, ${d.SVGcoords.yBase} L ${d.SVGcoords.xTip}, ${d.SVGcoords.yTip}`;
        });
    }
}

export const makePathTbar = function(tree){
    if (tree.layout === "rect"){
        tree.internals.forEach(function(d){
            d.branchAttributes.pathTbar = `M ${d.SVGcoords.xTBarStart}, ${d.SVGcoords.yTBarStart} L ${d.SVGcoords.xTBarEnd}, ${d.SVGcoords.yTBarEnd}`;
        });
    }else if (tree.layout === "radial"){
        tree.internals.forEach(function(d){
            d.branchAttributes.pathTbar = `M ${d.SVGcoords.xTBarStart}, ${d.SVGcoords.yTBarStart} A ${d.SVGcoords.rx} ${d.SVGcoords.ry} 0  ${(d.smallBigArc?" 1 ":" 0 ")} 0  ${d.SVGcoords.xTBarEnd}, ${d.SVGcoords.yTBarEnd}`;
        });
    }else{
        tree.internals.forEach(function(d){
            d.branchAttributes.pathTbar = '';
        });
    }
}
