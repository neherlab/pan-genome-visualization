import {preOrderIteration} from "../phyloTree/src/treeHelpers";
import {tooltip_node, tooltip_branch} from './tooltips';
import {panXTree} from './global';

const subtree_node_colors = d3.scale.category20c();
const strokeToFill = panXTree.strokeToFill,
      tipStroke= panXTree.tipStroke,
      tipFillHover= panXTree.tipFillHover,
      tipUnselected = panXTree.tipUnselected;

const onTipsHover = function(d){
  // TODO
  // d.state.highlight = true;
  // updateTip(d);
  d.elem.attr("r",function(x){return x.tipAttributes.r*2;})
    .style("stroke",function(x){return tipStroke;})
    .style("fill", function(x){return subtree_node_colors(x.n.name);});
  for (var gi=0,len=d.genes.length; gi<len; gi++){
    d.genes[gi].elem.attr("r",function(x){return x.tipAttributes.r*2;})
      .style("stroke-width",0.5)
      .style("stroke",function(x){return tipStroke;})
      .style("fill", function(x){return subtree_node_colors(x.n.accession);});
  }
};

const onTipHover = function(d){
  // TODO
  // d.state.highlight = true;
  // updateTip(d);
  d.elem.attr("r",function(x){return x.tipAttributes.r*2;})
    .style("fill", function(x){return x.tipAttributes.fill;});
  for (var gi=0,len=d.genes.length; gi<len; gi++){
    d.genes[gi].elem.attr("r",function(x){return x.tipAttributes.r*2;})
    .style("fill", function(x){return x.tipAttributes.fill;});
  }
};

const onTipLeave = function(d){
  d.elem
    .attr("r",function(x){
      if (x.state.selected==undefined){
        return x.tipAttributes.r;
      }else{
        return x.state.selected ? x.tipAttributes.r*1.5 : x.tipAttributes.r*0.5;
      }
    })
    .style("stroke",function(x){return x.tipAttributes.fill;})
    .style("fill",function(x){
      if (x.state.selected==undefined){
        return x.tipAttributes.fill;
      }else{
        return x.state.selected ? x.tipAttributes.fill : tipUnselected;
      }
    });
    //.style("fill",function(x){return x.tipAttributes.fill;});
  for (var gi=0; gi<d.genes.length; gi++){
    d.genes[gi].elem
      .attr("r",function(x){
        if (x.state.selected==undefined){
          return x.tipAttributes.r;
        }else{
          return x.state.selected ? x.tipAttributes.r*1.5 : x.tipAttributes.r*0.5;
        }
      })
      .style("stroke",function(x){return x.tipAttributes.fill;})
      .style("fill",function(x){
        if (x.state.selected==undefined){
          return x.tipAttributes.fill;
        }else{
          return x.state.selected ? x.tipAttributes.fill : tipUnselected;
        }
      });
  }
  tooltip_node.hide();
};


const onBranchHover = function(d){
  d3.select('#coreTree_legend')
    .style('visibility','hidden');
  if (d.n.children==undefined){
    onTipHover(d);
  }else{
    preOrderIteration(d, function(x){if (x.terminal){onTipsHover(x);}});
  }
};

const onBranchLeave = function(d){
  d3.select('#coreTree_legend')
    .style('visibility','visible');
  preOrderIteration(d, function(x){if (x.terminal){onTipLeave(x);}});
  tooltip_branch.hide();
};


const speciesTreeCallbacks =  {
    onBranchClick:function(d){console.log(d.n.name);},
    onBranchHover:onBranchHover,
    onBranchLeave:onBranchLeave,
    onTipHover:onTipHover,
    onTipLeave:onTipLeave
};

export default speciesTreeCallbacks;