import d3 from "d3";
import phyloTree from "./phyloTree";
import drawTree from "./drawTree";
import {addScaleBar} from "./scaleBar";
import {zoomIntoClade, zoomIn} from "./zoom";
import {changeLayout, changeDistance, updateGeometry,
        updateTipAttribute, updateTipStyle, updateTips,
        updateBranchAttribute, updateBranchStyle, updateBranches} from "./updateTree";
import {branchLabels, tipLabels, removeLabels} from "./labels";
const colors = [
  "#60AA9E", "#D9AD3D", "#5097BA", "#E67030", "#8EBC66", "#E59637", "#AABD52", "#DF4327", "#C4B945", "#75B681"
];

var dummy=0;
var myTree;
var treeplot = d3.select("#treeplot");
var myTree2;
var treeplot2 = d3.select("#treeplot2");

const zoomClade = function(d){
    zoomIntoClade(myTree, d, 800);
}

const zoom = function(){
    zoomIn(myTree, 1.4,  700);
}

d3.json("/data/zika_tree.json", function(err, data){
    console.log(data, err);
    if (data){
        myTree = phyloTree(data, {layout:"unrooted", svg:treeplot, margins:{top:10, bottom:10, left:10, right:10},
                                  callbacks:{onBranchClick:zoomClade,
                                            onBranchHover:function(d){console.log(d.n.strain);},
                                            onBranchLeave:function(d){console.log(d.n.strain);},
                                            onTipHover:function(d){console.log(d.n.strain);},
                                            onTipLeave:function(d){console.log(d.n.strain);}
                                            }, scalebar:true

                                 }
                           );
        console.log(myTree);
    }else{
        console.log("error loading data",err);
    }
    drawTree(myTree);
    const branchText = function(d){
        if (d.n.muts){
            const tmp = d.n.muts.join(',').slice(0,20);
            return tmp;
        }else{
            return "";
        }
    }
    const branchFontSize = function(d){return d.stats.leafCount>2?3:0;}
    const tipText = function(d){
        if (d.n.strain && d.terminal){
            return d.n.strain;
        }else{
            return "";
        }
    }
    const tipFontSize = function(d){return 4.0;}
    //branchLabels(myTree, branchText, branchFontSize, -5, -5);
    tipLabels(myTree, tipText, tipFontSize, 5,5);
});

d3.json("/data/coreGenomeTree.json", function(err, data){
    console.log(data, err);
    if (data){
        myTree2 = phyloTree(data, {svg:treeplot2, margins:{top:10, bottom:10, left:10, right:10},
                                  callbacks:{onBranchClick:zoomClade,
                                            onBranchHover:function(d){console.log(d.n.strain);},
                                            onBranchLeave:function(d){console.log(d.n.strain);},
                                            onTipHover:function(d){console.log(d.n.strain);},
                                            onTipLeave:function(d){console.log(d.n.strain);}
                                            }
                                 }
                           );
        console.log(myTree2);
    }else{
        console.log("error loading data",err);
    }
    drawTree(myTree2);
});


d3.select("#layout").on("change", function(){
    var layout = document.getElementById("layout").value;
    myTree.dimensions.height=500;
    changeLayout(myTree, 1000, layout);
;});

d3.select("#distance").on("change", function(){
    var distance = document.getElementById("distance").value;
    changeDistance(myTree, 1000, distance);
    console.log(myTree);
;});

d3.select("#size").on("click", function(){
    myTree.tips.forEach(function(d,i){
        d.tipAttributes.r = (dummy+i)%8+2;
    });
    dummy++;
    updateTipAttribute(myTree, 'r', 1000);
});

d3.select("#color").on("click", function(){
    removeLabels(myTree);
    myTree.nodes.forEach(function(d,i){
        if (d.terminal){
            d.tipAttributes.fill = colors[(dummy+i)%10];
            d.tipAttributes.stroke = d3.rgb(colors[(dummy+i)%10]).darker();
            d.branchAttributes.stroke = d.tipAttributes.stroke;
        }else{
            d.branchAttributes.stroke = d3.rgb(colors[(dummy+i)%10]).darker();
            d.branchAttributes["stroke-width"] = 3+i%7;
        }
    });
    dummy++;
    updateTips(myTree, [], ['fill', 'stroke'], 1000);
    updateBranches(myTree, [], ['stroke', 'stroke-width'], 1000);
    console.log(myTree);
});

d3.select("#both").on("click", function(){
    myTree2.tips.forEach(function(d,i){
        d.tipAttributes.fill = colors[(dummy+i)%10];
        d.tipAttributes.stroke = d3.rgb(colors[(dummy+i)%10]).darker();
        d.tipAttributes.old_r = d.tipAttributes.r;
        d.tipAttributes.r = (dummy+i)%8+2;
        d.branchAttributes.stroke = d.tipAttributes.stroke;
    });
    dummy++;
    updateTips(myTree2, ['r'], ['fill', 'stroke'], 1000);
    updateBranchStyle(myTree2, 'stroke', 1000);
});

d3.select("#reset").on("click", function(){
    zoomClade(myTree.nodes[0]);
});

d3.select("#treeplot").on("dblclick", function(){
    console.log("zoom");
    zoom();
});
