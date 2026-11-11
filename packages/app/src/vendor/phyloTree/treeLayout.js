//function in here go from node.n -> node.layout
import d3 from "d3";
import {postOrderIteration, preOrderIteration} from "./treeHelpers";
import {visibleRectangleFromNodes} from "./zoom";

/**
 * assign each node a rank depending on where in the tree layout its sits.
 * @param  {array} nodes the nested tree structure
 * @return {null}        chances happen in place
 */
const calculateNodeRank = function(nodes){
  let rank = 0;
  const assignNodeOrder = function(node){
    if (node.terminal){
      rank++;
      node.layout.rank = rank
      node.layout.maxRank = rank;
      node.layout.minRank = rank;
    }else{
      node.layout.rank = d3.mean(node.children.map(function(d){return d.layout.rank;}));
      node.layout.maxRank = node.children[node.children.length-1].layout.rank;
      node.layout.minRank = node.children[0].layout.rank;
    }
  }
  postOrderIteration(nodes[0], assignNodeOrder);
}

/*
 * adds the total number of descendant leaves to each node in the tree
 * the functions works recursively.
 * @>=:
 *   node -- root node of the tree.
 */
const addLeafCount = function(nodes) {
    const callback = function(node){
      if (node.terminal) {
          node.stats.leafCount = 1;
      }else{
          node.stats.leafCount = d3.sum(node.children.map(function(d){return d.stats.leafCount;}));
      }
    }
    postOrderIteration(nodes[0], callback);
};


/*
 * set the property that is used as distance along branches
 * this is set to "depth" of each node. depth is later used to
 * calculate coordinates. Parent depth is assigned as well.
 */
const setDistance = function(tree) {
  let dis = "div";
  if (tree.distance) {
    dis = tree.distance; // default is "div" for divergence
  }
  if (dis==="level"){
    tree.nodes[0].n.attr.level=0;
    preOrderIteration(tree.nodes[0], function(d){d.n.attr.level=d.parent.n.attr.level+1;});
  }
  if (typeof tree.nodes[0].n.attr[dis]==="undefined"){
      console.log("distance measure ", dis, "is undefined", tree.nodes[0].n);
      return;
  }

  // assign node and parent depth
  tree.nodes.forEach(function(d) {
    const layout = {};
    layout.depth = d.n.attr[dis];
    layout.pDepth = d.n.parent.attr[dis];
    if (d.n.attr[dis+"_confidence"]){
      layout.conf = d.n.attr[dis+"_confidence"];
    }else{
      layout.conf = [d.layout.depth, d.layout.depth];
    }
    d.layout = layout;
  });
};



/**
 * calculates corrdiantes for the rectangular treeLayou
 * @param  {object} tree object containing the nodes and distance measure
 * @return {[type]}        [description]
 */
const rectangularLayout = function(tree) {
  const dis = tree.distance;
  tree.nodes.forEach(function(d) {
    d.layout.y = d.layout.rank; // precomputed y-values
    d.layout.x = d.layout.depth
    d.layout.px = d.layout.pDepth;  // parent positions
    d.layout.py = d.layout.y;
    if (!d.terminal){
      d.layout.yTBarStart = d.layout.minRank;
      d.layout.xTBarStart = d.layout.depth;
      d.layout.yTBarEnd = d.layout.maxRank;
      d.layout.xTBarEnd = d.layout.depth;
    }
  });
};


/**
 * calculates and assigns x,y coordinates for the radial layout.
 * in addition to x,y, this calculates the end-points of the radial
 * arcs and whether that arc is more than pi or not
 * @return {null}
 */
const radialLayout = function(tree) {
  const nTips = tree.nodes[0].stats.leafCount;
  const offset = tree.nodes[0].layout.depth;
  let circleFraction = 0.95;
  if (tree.circleFraction){
    circleFraction = tree.circleFraction;
  }
  tree.nodes.forEach(function(d) {
    d.layout.angle = 2.0 * 0.95 * Math.PI * d.layout.rank / nTips;
    d.layout.y = (d.layout.depth - offset) * Math.cos(d.layout.angle);
    d.layout.x = (d.layout.depth - offset) * Math.sin(d.layout.angle);
    d.layout.py = d.layout.y * (d.layout.pDepth - offset) / (d.layout.depth - offset + 1e-15);
    d.layout.px = d.layout.x * (d.layout.pDepth - offset) / (d.layout.depth - offset + 1e-15);
    if (!d.terminal){
        const angleCBar1 = 2.0 * circleFraction * Math.PI * d.layout.minRank / nTips;
        const angleCBar2 = 2.0 * circleFraction * Math.PI * d.layout.maxRank / nTips;
        d.layout.yTBarStart = (d.layout.depth - offset) * Math.cos(angleCBar1);
        d.layout.xTBarStart = (d.layout.depth - offset) * Math.sin(angleCBar1);
        d.layout.yTBarEnd = (d.layout.depth - offset) * Math.cos(angleCBar2);
        d.layout.xTBarEnd = (d.layout.depth - offset) * Math.sin(angleCBar2);
        d.layout.smallBigArc = Math.abs(angleCBar2 - angleCBar1) > Math.PI * 1.0;
    }
  });
};

/**
 * calculates x,y coordinates for the unrooted layout. this is
 * done recursively via a the function placeSubtree
 * @return {null}
 */
const unrootedLayout = function(tree){
  const nTips=tree.nodes[0].stats.leafCount;
  //calculate branch length from depth
  tree.nodes.forEach(function(d){d.layout.branchLength = d.layout.depth - d.layout.pDepth;});

  // do preorder iteration for find locations for all subtrees
  const placeSubtree = function(node){
    node.layout.px = node.parent.layout.x;
    node.layout.py = node.parent.layout.y;
    node.layout.angle = node.layout.tau + node.layout.w*0.5;
    node.layout.x = node.layout.px+node.layout.branchLength*Math.sin(node.layout.angle);
    node.layout.y = node.layout.py+node.layout.branchLength*Math.cos(node.layout.angle);
    var eta = node.layout.tau; //eta is the cumulative angle for the wedges in the layout
    if (!node.terminal){
        for (var i=0; i<node.children.length; i++){
            var ch = node.children[i];
            ch.layout.w = 2*Math.PI*ch.stats.leafCount/nTips;
            ch.layout.tau = eta;
            eta += ch.layout.w;
            placeSubtree(ch);
        }
    }
  };

  // set values for the root
  tree.nodes[0].layout.x = 0;
  tree.nodes[0].layout.y = 0;
  tree.nodes[0].layout.tau = 0.0*Math.PI;
  tree.nodes[0].layout.w = 2*Math.PI;
  placeSubtree(tree.nodes[0]);
};

/**
 * calculates corrdiantes for the rectangular treeLayou
 * @param  {object} tree object containing the nodes and distance measure
 * @return {[type]}        [description]
 */
const clockLayout = function(tree) {
  if (typeof tree.nodes[0].n.attr["num_date"]==="undefined"){
      console.log("clock layout requires numerical dates in attr ", tree.nodes[0].n);
      return;
  }
  const dis = tree.distance;
  tree.nodes.forEach(function(d) {
    d.layout.x = d.n.attr["num_date"];
    d.layout.y = d.layout.depth;
    d.layout.px = d.n.parent.attr["num_date"];
    d.layout.py = d.layout.pDepth;
  });
};


/**
 * wrapper function that calls the different specific layouts
 * @param  {object} tree object containing nodes, layout, and distance, the latter two are optional
 * @return {null}       everything is changed in place.
 */
const treeLayout = function(tree){
    //determine x and y locations of nodes in abstract space
    setDistance(tree);
    calculateNodeRank(tree.nodes);
    addLeafCount(tree.nodes);

    // depending on the chosen layout, determine the location in tree scaled 2d
    if (tree.layout === "radial"){
        radialLayout(tree);
    }else if (tree.layout === "unrooted"){
        unrootedLayout(tree);
    }else if (tree.layout === "clock"){
        clockLayout(tree);
    }else{
        rectangularLayout(tree);
    }
    //reset the visible rectancle -- as this lives in tree space,
    visibleRectangleFromNodes(tree);
}


export  default treeLayout;