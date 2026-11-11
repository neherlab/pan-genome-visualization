import phyloTree from "../phyloTree/src/phyloTree";
import drawTree from "../phyloTree/src/drawTree";
import {zoomIntoClade, zoomIn} from "../phyloTree/src/zoom";
import {preOrderIteration} from "../phyloTree/src/treeHelpers";
import {changeLayout, changeDistance, updateGeometry,
        updateTipAttribute, updateTipStyle, updateTips,
        updateBranchAttribute, updateBranchStyle, updateBranches} from "../phyloTree/src/updateTree";
import {branchLabels, tipLabels} from "../phyloTree/src/labels";
import speciesTreeCallbacks from "./speciesTreeCallbacks";
import d3 from "d3";
import {panXDashboard,panXClusterTable,panXMetaTable} from "./global"
import {tipText, tipFontSize, applyChangeToTree} from "./tree-init";
import {filterMetaDataTable} from "./datatable-meta";
import {filterClusterDataTable} from "./datatable-gc";

import $ from 'jquery';
window.$ = $;
window.jQuery = $;
import DataTable from 'datatables.net';

const speciesTree = function(tree_svg,treeJsonPath, handleResult){
    var treeplot = d3.select("#"+tree_svg);
    treeplot.attr("width", panXDashboard.winInnerWidth/3.);
    treeplot.attr("height", panXDashboard.winInnerWidth/3.);
    var myTree;
    speciesTreeCallbacks.onBranchClick = function (d){
        const dt = 1000;
        if (myTree.panZoom){
            myTree.panZoom.reset();
        }
        applyChangeToTree(myTree,
            function(){zoomIntoClade(myTree, d.terminal?d.parent:d, dt, true);}
            ,dt);
        const metaTableID=panXMetaTable.meta_table_id;
        const tipList=filterMetaDataTable(metaTableID, myTree);
        const clusterTableId=panXClusterTable.cluster_table_id;
        //# temporarily not filter clustertable when zooming into clade
        //filterClusterDataTable(clusterTableId, myTree);
    };

    //console.log("loading speciesTree", treeJsonPath);
    d3.json(treeJsonPath, function(err, data){
        if (data){
            myTree = phyloTree(data, {svg:treeplot, margins:{top:10, bottom:10, left:10, right:10},
                                      scaleBar:true, autoTipSize:false, tipStrokeWidth:0.5,
                                      callbacks:speciesTreeCallbacks, orientation:{x:1, y:1}}
                               );
        }else{
            console.log("error loading speciesTree data",err);
        }
        drawTree(myTree);

        tipLabels(myTree, tipText, tipFontSize(myTree), 3, 8);
        myTree.showTipLabels=true;
        // add a look up for tips
        handleResult(myTree);
    });
}

export default speciesTree;