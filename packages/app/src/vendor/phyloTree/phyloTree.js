import treeLayout from "./treeLayout";
import treeCanvas from "./treeCanvas";
import {preOrderIteration} from "./treeHelpers";



/**
 * takes an augur json and converts it into the a tree structure
 * that included information needed for drawing and manipulation
 * of the tree.
 * @param  {object} treeJson hierarchical json where .children are the descending branches
 * @return {object}       object storing treeJson and other information about tree display
 */
const phyloTree = function(treeJson, params) {
    const defaultsParams = {
      layout:"rect",
      distance:"div",
      orientation:{x:1, y:1},
      callbacks:{},
      zoomLevel:{x:1.0, y:1.0},
      pan:{x:0.0, y:0.0},
      tipRadius:4.0,
      tipStroke:"#555",
      tipFill:"#555",
      tipStrokeWidth:2.0,
      branchStroke:"#555",
      branchStrokeWidth:2.0,
      autoTipSize:true
    }

    const phyloNodes = [];
    const nodeArray = [];
    const treeParams = Object.assign(defaultsParams, params);
    const makeNodeArray = function(node){
        if (node.children){
          var child;
          for (var ni=0; ni<node.children.length; ni++){
            child = node.children[ni];
            child.parent = node;
            // if no div attribute is given, construct from branch length
            if (!child.attr){
              child.attr={};
            }
            if (!child.attr.div){
              if (child.branch_length){
                child.attr.div = node.attr.div + child.branch_length;
              }else{
                child.attr.div = node.attr.div;
              }
            }
          }
        }
        //add clade (serves as a unique node identifier) if not set
        if (!node.clade){node.clade = nodeArray.length+1;}
        nodeArray.push(node);
    }
    if (!treeJson.attr){
          //console.log(treeJson);
        treeJson.attr = {}
        treeJson.attr.div=0.0;
    }
    preOrderIteration(treeJson, makeNodeArray);
    nodeArray[0].parent = nodeArray[0];
    nodeArray.forEach(function(d){
        const nodeShell = {n:d, stats:{}, layout:{}, SVGcoords:{}, state:{},
                           tipAttributes:{}, branchAttributes:{}};
        d.shell = nodeShell;
        nodeShell.parent = d.parent.shell;
        phyloNodes.push(nodeShell);
    });

    phyloNodes.forEach(function(d){
        d.terminal = (d.n.children)?false:true;
        if (d.terminal){
            d.children = null;
        }else{
            d.children = d.n.children.map(function(x){return x.shell;});
        }
    });
    const nc=100.0;
    if (treeParams.autoTipSize){
    treeParams.tipRadius = Math.max(1.0, nc*treeParams.tipRadius/(nc+nodeArray.length));
    treeParams.branchStrokeWidth = Math.max(1.0, nc*treeParams.branchStrokeWidth/(nc+nodeArray.length));
    }
    const newTree = Object.assign(
                        {nodes:phyloNodes,
                         tips: phyloNodes.filter(function(d){return d.terminal;}),
                         internals: phyloNodes.filter(function(d){return !d.terminal;}),
                         xScale: d3.scale.linear(),
                         yScale: d3.scale.linear(),
                        },
                        treeParams);
    if (!newTree.dimension && newTree.svg){
        newTree.dimensions = {width:parseInt(newTree.svg.attr("width"), 10),
                              height:parseInt(newTree.svg.attr("height"), 10)};
    }
    // calculate layout and coordinates using defaults if not otherwise specified
    treeLayout(newTree);
    if (newTree.svg){
      newTree.topLevelGroup = newTree.svg.append("g");
      treeCanvas(newTree);
    }
    return newTree;
}


export default phyloTree;