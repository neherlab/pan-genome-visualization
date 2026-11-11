import phyloTree from "../phyloTree/src/phyloTree";
import drawTree from "../phyloTree/src/drawTree";
import {zoomIntoClade, zoomIn} from "../phyloTree/src/zoom";
import {changeLayout, changeDistance, updateGeometry,
        updateTipAttribute, updateTipStyle, updateTips,
        updateBranchAttribute, updateBranchStyle, updateBranches} from "../phyloTree/src/updateTree";
import {branchLabels, tipLabels} from "../phyloTree/src/labels";
import d3 from "d3";
import geneTreeCallbacks from "./geneTreeCallbacks";
import {panXTree,panXDashboard} from "./global";
import {attachButtons,attachPanzoom,applyChangeToTree,colorPresenceAbsence,styleGainLoss} from "./tree-init";

/**
 * Instantiate the gene tree and link it to the species tree
 * @param  {str} tree_svg     name of svg
 * @param  {str} treeJsonPath [description]
 * @param  {oject} speciesTree  [description]
 * @return {object}              the new constructed geneTree
 */
const geneTree = function(tree_svg, treeJsonPath, handleGeneTree, speciesTree, layout_choice){

    var treeplot = d3.select("#"+tree_svg);
    treeplot.selectAll("*").remove();
    treeplot.attr("width", panXDashboard.winInnerWidth/3.);
    treeplot.attr("height", panXDashboard.winInnerWidth/3.);
    var myTree;
    geneTreeCallbacks.onBranchClick = function (d){
        const dt = 1000;
        if (myTree.panZoom){
            myTree.panZoom.reset();
        }
        applyChangeToTree(myTree,
            function(){zoomIntoClade(myTree, d.terminal?d.parent:d, dt, true);}
            ,dt);
        //filterMetaDataTable('dc_data_table_meta', myTree);
    };

    d3.json(treeJsonPath, function(err, data){
        //console.log(data, err);
        if (data){
            panXTree.singleton_gene=false;
            myTree = phyloTree(data, {svg:treeplot, margins:{top:10, bottom:10, left:10, right:10},
                                      scaleBar:true, layout:(layout_choice)?layout_choice:'rect',
                                      autoTipSize:false, tipStrokeWidth:0.5,
                                      callbacks:geneTreeCallbacks, orientation:{x:-1, y:1}}
                               );
            //console.log(myTree);
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
        tipLabels(myTree, tipText, tipFontSize, 5, 3);
        myTree.showTipLabels=false;
        handleGeneTree(myTree);
        panXTree.currentGeneTree= myTree;
        attachButtons(myTree, {
                              layout_radial:"geneTreeRadial",
                              layout_vertical:"geneTreeVertical",
                              layout_unroot:"geneTreeUnroot",
                              zoomInY:"geneTree_height_plus",
                              zoomOutY:"geneTree_height_minus",
                              scale:"geneTreeScale",
                              tipLabels:"geneTreeLabels",
                              orientation:"geneTreeOrientation",
                              zoomReset:"geneTreeZoomReset",
                              colorReset:"geneTreeColorReset",
                              nodeLarge:"geneTree_nodePlus",
                              nodeSmaller:"geneTree_nodeMinus",
                              });

        attachButtons(myTree, {
                              layout_radial:"speciesTreeRadial",
                              layout_vertical:"speciesTreeVertical",
                              layout_unroot:"speciesTreeUnroot",
                              scale:"speciesTreeScale"
                              });
        attachPanzoom("geneTree", myTree);
        }else{
            console.log("error loading geneTree data: either tree missing or a singleton",err);
            var svg_geneTree=d3.select('#geneTree');
            svg_geneTree.selectAll("*").remove();
            panXTree.singleton_gene=true;
            styleGainLoss(speciesTree);
        }
    });
    /*if (typeof speciesTree !== "undefined"){
        linkTrees(speciesTree, myTree);
    }*/
    return myTree;
}


const linkTrees = function(speciesTree, geneTree){
    //here, we assign to each node the corresponding nodes in the other or the same tree
}

export default geneTree;