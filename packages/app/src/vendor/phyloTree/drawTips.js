import d3 from "d3";


/**
 *
 * @param  {object} tree the phyloTree data structure
 * @param  {object} callbacks object with callback that specify the appearance of each tip
 */
export const drawTips = function(tree, callbacks){
    setupTips(tree);

	const tmp_callbacks = Object.assign({}, callbacks);
	if (!tmp_callbacks.r){tmp_callbacks.r = function(d){return tree.tipRadius;}};
	if (!tmp_callbacks.fill){tmp_callbacks.fill = function(d){return tree.tipFill;}};
	if (!tmp_callbacks.stroke){tmp_callbacks.stroke = function(d){return tree.tipStroke;}};
    if (!tmp_callbacks.strokeWidth){tmp_callbacks.strokeWidth = function(d){return tree.tipStrokeWidth;}};

    tree.tips.forEach(function(d){
        d.tipAttributes.r = tmp_callbacks.r(d);
        d.tipAttributes.fill = tmp_callbacks.fill(d);
        d.tipAttributes.stroke = tmp_callbacks.stroke(d);
        d.tipAttributes["stroke-width"] = tmp_callbacks.strokeWidth(d);
        d.tipAttributes.id = "tip_" + d.n.clade;
    });
    tree.tipElements
        .attr("r", function(d){return d.tipAttributes.r;})
        .attr("cx", function(d){return d.SVGcoords.xTip;})
        .attr("cy", function(d){return d.SVGcoords.yTip;})
        .attr("id", function(d) {return d.tipAttributes.id;})
        .style("fill", function(d){return d.tipAttributes.fill;})
        .style("stroke", function(d){return d.tipAttributes.stroke;})
        .style("stroke-width", function(d){return d.tipAttributes["stroke-width"];});
}

/**
 * create the d3 objects for tips and bind the callbacks
 * @param  {[type]} tree [description]
 * @return {[type]}      [description]
 */
export const setupTips = function(tree){
    tree.svg.selectAll('.tip').remove();
    tree.tipElements = tree.topLevelGroup.selectAll(".tip")
        .data(tree.tips)
        .enter()
        .append("circle")
        .attr("class", "tip")
        .on("mouseover", function(d) {tree.callbacks.onTipHover(d);})
        .on("mouseout", function(d) {tree.callbacks.onTipLeave(d);})
        .on("click", function(d) {tree.callbacks.onTipClick(d);})
        .style("pointer-events", "auto")
        .style("cursor", "pointer");
}

