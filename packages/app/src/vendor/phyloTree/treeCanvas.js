//function in here go from node.layout -> node.SVGcoords
import d3 from "d3";
import {visibleRectangleFromNodes, resetView} from "./zoom";
import {addScaleBar} from "./scaleBar";

/**
 * convert all coordinates in layout into values in SVG space
 * @param {object} tree the tree data structure
 */
const setScales = function(tree){
    const width = tree.dimensions.width;
    const height = tree.dimensions.height;
    const margins = tree.margins || {left:0, right:0, top:0, bottom:0};
    if (tree.layout === "radial" || tree.layout === "unrooted") {
        //Force Square: TODO, harmonize with the map to screen
        const xExtend = width - margins.left - margins.right;
        const yExtend = height - margins.top - margins.top;
        const minExtend = d3.min([xExtend, yExtend]);
        const xSlack = xExtend - minExtend;
        const ySlack = yExtend - minExtend;
        tree.xScale.range([0.5 * xSlack + margins.left, width - 0.5 * xSlack - margins.right]);
        tree.yScale.range([0.5 * ySlack + margins.top, height - 0.5 * ySlack - margins.bottom]);

    } else {
        // for rectancular layout, allow flipping orientation of left right and top/botton
        if (tree.orientation.x>0){
          tree.xScale.range([margins.left, width - margins.right]);
        }else{
          tree.xScale.range([width - margins.right, margins.left]);
        }
        if (tree.orientation.y>0){
          tree.yScale.range([margins.top, height - margins.bottom]);
        } else {
          tree.yScale.range([height - margins.bottom, margins.top]);
        }
    }

    if (!tree.visibleRectangle){
        console.log(tree.visibleRectangle);
        resetView(tree);
    }
    if (tree.layout === "radial" || tree.layout === "unrooted"){
        // handle "radial and unrooted differently since they need to be square
        // since branch length move in x and y direction
        // TODO: should be tied to svg dimensions
        const minX = tree.visibleRectangle.left;
        const minY = tree.visibleRectangle.bottom;
        const spanX = tree.visibleRectangle.right-minX;
        const spanY = tree.visibleRectangle.top-minY;
        const maxSpan = d3.max([spanY, spanX]);
        const ySlack = (spanX>spanY) ? (spanX-spanY)*0.5 : 0.0;
        const xSlack = (spanX<spanY) ? (spanY-spanX)*0.5 : 0.0;
        tree.xScale.domain([minX-xSlack, minX+maxSpan-xSlack]);
        tree.yScale.domain([minY-ySlack, minY+maxSpan-ySlack]);
    }else if (tree.layout === "clock"){
        tree.xScale.domain([tree.visibleRectangle.left, tree.visibleRectangle.right]);
        tree.yScale.domain([tree.visibleRectangle.top, tree.visibleRectangle.bottom]);
    }else{
        tree.xScale.domain([tree.visibleRectangle.left, tree.visibleRectangle.right]);
        tree.yScale.domain([tree.visibleRectangle.bottom, tree.visibleRectangle.top]);
    }
}


/**
 * wrapper function that converts the previously calculated layout into svg coordinates
 * @param  {object} tree object containing nodes, dimensions, margins, visibleRectangle
 * @return {null}       everything is changed in place.
 */
const treeCanvas = function(tree){
    setScales(tree);
    const tmp_xScale=tree.xScale;
    const tmp_yScale=tree.yScale;
    tree.nodes.forEach(
        function(d){
            d.SVGcoords.xTip = tmp_xScale(d.layout.x);
            d.SVGcoords.yTip = tmp_yScale(d.layout.y);
            d.SVGcoords.xBase = tmp_xScale(d.layout.px);
            d.SVGcoords.yBase = tmp_yScale(d.layout.py);
        }
    );
    if (tree.layout==="radial"){
        const offset = tree.nodes[0].layout.depth;
        tree.nodes.forEach(
            function(d){
                d.SVGcoords.rx = tmp_xScale(d.layout.depth) - tmp_xScale(offset);
                d.SVGcoords.ry = tmp_yScale(d.layout.depth) - tmp_yScale(offset);
            }
        );
    }
    if (tree.layout==="rect" || tree.layout==="radial"){
        var x;
        tree.internals.filter(function(d){return !d.terminal;}).forEach(
            function(d)
            {
                d.SVGcoords.yTBarStart = tmp_yScale(d.layout.yTBarStart);
                d.SVGcoords.yTBarEnd =   tmp_yScale(d.layout.yTBarEnd);
                d.SVGcoords.xTBarStart = tmp_xScale(d.layout.xTBarStart);
                d.SVGcoords.xTBarEnd =   tmp_xScale(d.layout.xTBarEnd);
            }
        );
    }
    if (tree.scaleBar || tree.scalebar){
        addScaleBar(tree);
    }
}

export default treeCanvas;