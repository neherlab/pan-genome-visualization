import {updateTips,updateBranches} from "../phyloTree/src/updateTree";
import {panXTree,metaLegend,metaTitles} from "./global";
import {colorPresenceAbsence,styleGainLoss} from "./tree-init";
import {assign_metadata_color,metaColor_dicts,metaColor_dicts_keys,metaColor_reference_dicts} from './meta-color-assignment';
import {preOrderIteration} from "../phyloTree/src/treeHelpers";

//## legend configuration
var legendRectSize = 15,
    legendSpacing = 4;

//## clean legend
export const removeLegend = function(coreTree_legend_id) {
    var legend= d3.select('#'+coreTree_legend_id);
    legend.selectAll('.legend')
        .remove();
}

const metaUnknown=panXTree.metaUnknown,
      strokeToFill = panXTree.strokeToFill;

//## create legend
const makeLegend = function(metaType,speciesTree,geneTree,coreTree_legend_id){ // && legendOptionValue!= "Meta-info"
    //console.log(metaType);

    // assign gene presence absence. this relies on node.genePresent being set
    if (metaType==="genePattern"){
        d3.select('#metadata_legend').style('overflow','hidden');
        d3.select('#colorblind_div').style('visibility','hidden');
        colorPresenceAbsence(speciesTree);
        styleGainLoss(speciesTree);
    }
    else if (metaType!='') {
        const meta_coloring_type= meta_display['color_options'][metaType]['type'];
        //show colormap selector for discrete color scales
        const visibility=(meta_coloring_type=='discrete')?'visible':'hidden';
        d3.select('#colorblind_div').style('visibility',visibility);

        //** assign specific metadata color to speciesTree tips, if they are not yet addressed
        if (!speciesTree.meta){speciesTree.meta={};}
        if (!speciesTree.meta[metaType]){
            speciesTree.meta[metaType]='assigned';
            for (let node of speciesTree.tips){
                if (!node.metaColor){node.metaColor={}}
                if (meta_coloring_type=='discrete'){
                    node.metaColor[metaType]={common:{},safe:{}};
                    node.metaColor[metaType].common=metaColor_dicts[metaType]['common'][node.n.attr[metaType]];
                    node.metaColor[metaType].safe=metaColor_dicts[metaType]['safe'][node.n.attr[metaType]];
                }else{//** continuous or mixed_continuous
                    const legend_value= metaColor_reference_dicts[metaType][node.n.attr[metaType]];
                    node.metaColor[metaType]= metaColor_dicts[metaType][legend_value];
                }
            }
        }

        // update the internal data of tips of the species tree
        var fill, node, strain, legend_value;
        for (var i=0; i<speciesTree.tips.length; i++){
            node = speciesTree.tips[i];
            if (meta_coloring_type=='discrete'){
                fill=(metaLegend.common_color) ?node.metaColor[metaType].common :node.metaColor[metaType].safe;
                //node.tipAttributes.is_metaUnknown= fill ? false :true;
                //node.tipAttributes.r*= fill? 1: 0.5;
            }else{//** continuous or mixed_continuous
                fill= node.metaColor[metaType];
                //node.tipAttributes.is_metaUnknown= fill ? false :true;
                //node.tipAttributes.r*= fill ? 1 :0.8;
            }
            node.tipAttributes.opacity= fill ? 1 : 0.5;
            fill =  fill || metaUnknown;
            node.tipAttributes.fill = fill;
            node.branchAttributes.stroke = fill;
            node.tipAttributes.stroke = d3.rgb(fill).darker(strokeToFill).toString();
            node.tipAttributes.r = node.genePresent?panXTree.genePresentR:panXTree.geneAbsentR;
        }

        //update the gene tree
        for (var i=0; i<geneTree.tips.length; i++){
            node = geneTree.tips[i];
            strain = speciesTree.namesToTips[node.n.accession];
            if(meta_coloring_type=='discrete'){
                fill= (metaLegend.common_color) ? metaColor_dicts[metaType]['common'][strain.n.attr[metaType]] :metaColor_dicts[metaType]['safe'][strain.n.attr[metaType]];
            }else{//** continuous
                legend_value = metaColor_reference_dicts[metaType][strain.n.attr[metaType]];
                fill = metaColor_dicts[metaType][legend_value];
            }
            node.tipAttributes.fill = fill || metaUnknown;
            node.tipAttributes.stroke = d3.rgb(node.tipAttributes.fill).darker(strokeToFill).toString();
        }

        //** assign internal branch color
        var consistent_flag=0, color_compare='';
        for (var i=0; i<speciesTree.internals.length; i++){
            const inner_node = speciesTree.internals[i];
            color_compare='';
            consistent_flag=0;
            fill=0;
            preOrderIteration(inner_node, function(d){if (d.terminal){
                if (color_compare==''){ fill=d.tipAttributes.fill}
                if (color_compare!==d.tipAttributes.fill) {consistent_flag+=1}
                color_compare=d.tipAttributes.fill;}
            });
            if (consistent_flag==1) {
                inner_node.branchAttributes.stroke = fill|| metaUnknown;
            }else{
                //** use gene event color for internal branch color
                //inner_node.branchAttributes["stroke"] = inner_node.branchAttributes['event_pattern'];
                inner_node.branchAttributes.stroke = panXTree.branchStroke_default;
            }
        }

        //finally redraw the tree with the newly set attributes

        // updateTips(speciesTree, ['opacity'], ["fill", "stroke"], 0);
        if (panXTree.singleton_gene) {
            console.log('panXTree.singleton_gene',panXTree.singleton_gene)
            updateTips(speciesTree, ["fill", "stroke"], 0);
        }else{
            updateTips(geneTree, [], ["fill", "stroke"], 0);
            updateTips(speciesTree, ['r'], ["fill", "stroke"], 0);
        }
        updateBranches(speciesTree, [], ["stroke"], 0);


        //define legend behavior on mouse interaction
        const mouseover_legend = function(metaField, tree){
            tree.tipElements
            .filter(function(d){
                    if (meta_coloring_type=='discrete'&&d.n.attr[metaType] == metaField){
                        return true;
                    } else if (meta_coloring_type!='discrete'&&((metaColor_reference_dicts[metaType]!== undefined)&&(metaColor_reference_dicts[metaType][d.n.attr[metaType]] == metaField))){
                        return true;
                    }
                    //** avoid over-selecting problem in mixed_continuous log_scale
                    //** { 2.00: "1.00", 4.00: "2.00"}
                    //** when mousehovering 2.00: nodes with 2.00 and 4.00 are selected in previous code
            })
            .attr('r',function(d){return d.tipAttributes.r*2;})
            .style('fill', function(d){return d3.rgb(d.tipAttributes.fill).brighter(strokeToFill);});
        }

        const mouseout_legend = function(metaField, tree){
            tree.tipElements
                .attr('r', function(d){return d.tipAttributes.r;})
                .style('fill', function(d){return d.tipAttributes.fill;});
        }

        const assign_legend_color = function (d) {
            if (meta_coloring_type=='discrete'){
                return (metaLegend.common_color) ?metaColor_dicts[metaType]['common'][d] :metaColor_dicts[metaType]['safe'][d];
            }else{ return metaColor_dicts[metaType][d];}
        }

        const metaitem_scroll_limit=30;
        var metadata_legend= d3.select('#metadata_legend');
        metadata_legend.style('height', '600px')
        const metaitem_list= metaColor_dicts_keys[metaType];
        const metaitem_count= metaitem_list.length;
        if (metaitem_count>metaitem_scroll_limit){
            metadata_legend.style('overflow', 'scroll')
        } else {
            metadata_legend.style('overflow', 'hidden')
        }
        //draw the legend
        var legend= d3.select('#'+coreTree_legend_id)
            .attr('width', metaLegend.legend_width)
            .attr('height', metaitem_count*(legendRectSize+legendSpacing)+5);

        var tmp_leg = legend.selectAll(".legend")
            .data( metaitem_list )
            .enter().append('g')
            .attr('class', 'legend')
            .attr('transform', function(d, i) {
                var stack = metaitem_count;
                var height = legendRectSize + legendSpacing;
                var fromRight = Math.floor(i / stack);
                var fromTop = i % stack;
                var horz = fromRight * 145 + 5;
                var vert = fromTop * height + 5;
                return 'translate(' + horz + ',' + vert + ')';
            });

        tmp_leg.append('rect')
            .attr('width', legendRectSize)
            .attr('height', legendRectSize)
            .attr('text', function (d) {return d;} )
            .attr('fill', function (d) {
                return d3.rgb(assign_legend_color(d)).toString();
            })
            .attr('stroke', function (d) {
                return d3.rgb(assign_legend_color(d)).darker([0.4]).toString();
            })
            .on("mouseover", function(d) {mouseover_legend(d,speciesTree)})
            .on("mouseout",  function(d) {mouseout_legend(d,speciesTree)});

        tmp_leg.append('text')
            .attr('x', legendRectSize + legendSpacing + 5)
            .attr('y', legendRectSize - legendSpacing)
            .attr('text', function (d) {return d;} )
            //.attr('font-size','')
            .text(function(d) {
                return d.toString();
            })
            .on("mouseover", function(d) {mouseover_legend(d,speciesTree)})
            .on("mouseout",  function(d) {mouseout_legend(d,speciesTree)});

        return tmp_leg;
    }
}

//## update legend and coloring nodes by meta-info
export const updateMetadata = function(metaType,speciesTree,geneTree,meta_display,coreTree_legend_id,tool_side) {
    removeLegend(coreTree_legend_id);
    makeLegend(metaType,speciesTree,geneTree,coreTree_legend_id, tool_side);
};

//## create dropdown-list for meta-info
export const create_dropdown = function (div, speciesTree, geneTree, meta_display,coreTree_legend_id, tool_side) {
    const meta_display_order=meta_display['meta_display_order'];
    var menu_panel = d3.select(div)

    //create panel
    var dropdown_meta = menu_panel
        .append("select")
        .attr("id","dropdown_select")
        .attr("class","form-control sm-customized")

    //add title "Meta data coloring"
    dropdown_meta.append("option")
        .attr("value", "Meta-info")
        .attr("selected", 1)
        .attr("disabled", true)
        .text("Color by meta data");

    //add gene presence absence entry
    dropdown_meta.append("option")
        .attr("value", "genePattern")
        .text("Gene presence/absence");

    //add additional species dependent entries that are specified in meta_display
    for (var i = 0, len = meta_display_order.length; i < len; i++) {
        const metaType= meta_display_order[i];
        if (meta_display['color_options'][metaType]!=undefined){
        if (meta_display['color_options'][metaType]['display']==undefined || meta_display['color_options'][metaType]['display']!='no'){
            let metaText= (metaTitles[metaType]) ?metaTitles[metaType] :metaType.replace(/[_]/g,' ');
            metaText= metaText.charAt(0).toUpperCase() + metaText.slice(1);
            dropdown_meta.append("option")
                .attr("value", metaType)
                .text(metaText);
        }
        }
    }
}
