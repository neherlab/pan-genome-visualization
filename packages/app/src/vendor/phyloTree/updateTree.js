import d3 from "d3";
import {makePathStem, makePathTbar} from "./drawBranches";
import treeLayout from "./treeLayout";
import treeCanvas from "./treeCanvas";


const branchOpacity = function(tree, opacity, dt){
    tree.branchStemElements
        .transition().duration(dt)
        .style("opacity", opacity);
    tree.branchTbarElements
        .transition().duration(dt)
        .style("opacity", opacity);
}

/**
 * To be called after SVGcoordinates have been recalculated
 * @param  {object} tree the phyloTree data structure
 */
export const updateGeometry = function(tree, dt){
    treeCanvas(tree);
    if (!dt){
        dt=0;
    }
    tree.tipElements
        .transition().duration(dt)
        .attr("cx", function(d){return d.SVGcoords.xTip;})
        .attr("cy", function(d){return d.SVGcoords.yTip;});

    makePathStem(tree);
    tree.branchStemElements
        .transition().duration(dt)
        .attr("d", function(d){return d.branchAttributes.pathStem;});
    makePathTbar(tree);
    tree.branchTbarElements
        .transition().duration(dt)
        .attr("d", function(d){return d.branchAttributes.pathTbar;});
    if (tree.confidenceElements){
        //TODO
    }
}

/**
 * To be called after SVGcoordinates have been recalculated
 * @param  {object} tree the phyloTree data structure
 */
export const updateGeometryFade = function(tree, dt){
    if (!dt){
        updateGeometry(tree, 0);
        return;
    }
    treeCanvas(tree);
    branchOpacity(tree, 0.0, dt*0.25);

    tree.tipElements
        .transition().duration(dt*0.5)
        .attr("cx", function(d){return d.SVGcoords.xTip;})
        .attr("cy", function(d){return d.SVGcoords.yTip;});

    setTimeout(function(){
        makePathStem(tree);
        tree.branchStemElements
            .attr("d", function(d){return d.branchAttributes.pathStem;});
        makePathTbar(tree);
        tree.branchTbarElements
            .attr("d", function(d){return d.branchAttributes.pathTbar;});
        }, 0.25*dt);

    setTimeout(function(){return branchOpacity(tree, 1.0, dt*0.25);}, dt*0.75);
    if (tree.confidenceElements){
        //TODO
    }
}


/**
 * change the layout of the tree. if newLayout is set, it will be used.
 * otherwise the layout will be recalculated as specified in tree.layout
 * @param  {object} tree      phyloTree object
 * @param  {int} dt        duration of the transition animation in milliseconds
 * @param  {string} newLayout layout to use, one of "rect", "radial", "unrooted", or "clock"
 */
export const changeLayout = function(tree, dt, newLayout){
    if (newLayout){
        tree.layout = newLayout;
    }
    if (tree.layout==="clock" && tree.distance==="num_date"){
        tree.distance = "div";
    }
    treeLayout(tree);
    updateGeometryFade(tree, dt)
}

/**
 * change distance scale of the tree. if newDistance is set, it will be used.
 * otherwise the distance will be recalculated as specified in tree.distance
 * @param  {object} tree      phyloTree object
 * @param  {int} dt        duration of the transition animation in milliseconds
 * @param  {string} newDistance distance to use, default is "div", needs to be set in node.attr
 */
export const changeDistance = function(tree, dt, newDistance){
    if (newDistance){
        tree.distance = newDistance;
    }
    treeLayout(tree);
    updateGeometry(tree, dt)
}


/**
 * update style of tips
 */
export const updateTipStyle = function(tree, style, dt) {
    if (dt){
        tree.tipElements.transition().duration(dt)
            .style(style, function(d){return d.tipAttributes[style];});
    }else{
        tree.tipElements
            .style(style, function(d){return d.tipAttributes[style];});
    }
};

/**
 * update attr of tips
 */
export const updateTipAttribute = function(tree, attr, dt) {
    if (dt){
        tree.tipElements.transition().duration(dt)
            .attr(attr, function(d){return d.tipAttributes[attr];});
    }else{
        tree.tipElements
            .attr(attr, function(d){return d.tipAttributes[attr];});
    }
};

/**
 * update style of branches
 */
export const updateBranchStyle = function(tree, style, dt) {
    if (dt){
        tree.branchStemElements.transition().duration(dt)
            .style(style, function(d){return d.branchAttributes[style];});
        tree.branchTbarElements.transition().duration(dt)
            .style(style, function(d){return d.branchAttributes[style];});
    }else{
        tree.branchStemElements
            .style(style, function(d){return d.branchAttributes[style];});
        tree.branchTbarElements
            .style(style, function(d){return d.branchAttributes[style];});
    }
};

/**
 * update attr of branches
 */
export const updateBranchAttribute = function(tree, attr, dt) {
    if (dt){
        tree.branchStemElements.transition().duration(dt)
            .attr(attr, function(d){return d.branchAttributes[attr];});
        tree.branchTbarElements.transition().duration(dt)
            .attr(attr, function(d){return d.branchAttributes[attr];});
    }else{
        tree.branchStemElements
            .attr(attr, function(d){return d.branchAttributes[attr];});
        tree.branchTbarElements
            .attr(attr, function(d){return d.branchAttributes[attr];});
    }
};

/**
 * Update multiple style or attributes of  tree elements at once
 * @param {object} tree phyloTree object
 * @param {list} attr list of things to change
 * @param {list} styles list of things to change
 * @param {int} dt time in milliseconds
 */
export const updateTips = function(tree, attrs, styles, dt) {
  // function that return the closure object for updating the svg
  function update() {
    return function(selection) {
      for (var i=0; i<styles.length; i++) {
        var prop = styles[i];
        selection.style(prop, function(d) {
          return d.tipAttributes[prop];
        });
      }
      for (var i = 0; i < attrs.length; i++) {
        var prop = attrs[i];
        selection.attr(prop, function(d) {
          return d.tipAttributes[prop];
        });
      }
    };
  };
  // update the svg
  if (dt) {
    tree.tipElements.transition().duration(dt).call(update());
  } else {
    tree.tipElements.call(update());
  }
};


/**
 * Update multiple style or attributes of  tree elements at once
 * @param {object} tree phyloTree object
 * @param {list} attr list of things to change
 * @param {list} styles list of things to change
 * @param {int} dt time in milliseconds
 */
export const updateBranches = function(tree, attrs, styles, dt) {
  // function that return the closure object for updating the svg
  function update() {
    return function(selection) {
      for (var i=0; i<styles.length; i++) {
        var prop = styles[i];
        selection.style(prop, function(d) {
          return d.branchAttributes[prop];
        });
      }
      for (var i = 0; i < attrs.length; i++) {
        var prop = attrs[i];
        selection.attr(prop, function(d) {
          return d.branchAttributes[prop];
        });
      }
    };
  };
  // update the svg
  if (dt) {
    tree.branchStemElements.transition().duration(dt).call(update());
    tree.branchTbarElements.transition().duration(dt).call(update());
  } else {
    tree.branchStemElements.call(update());
    tree.branchTbarElements.call(update());
  }
};