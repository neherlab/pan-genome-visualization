import d3 from "d3";
import dc from "dc";
window.dc = dc;
import noUiSlider from "nouislider";
import crossfilter from "crossfilter";
import {panXTree, panXDashboard} from "./global";
import {pie} from "./chart_style";
import * as dtab  from "./datatable-gc";
import {loadNewGeneCluster} from "./linkTableAlignmentTrees";
import {tooltip_tableHeader} from "./tooltips";
import {clusters, dataset} from "./context";

var init_core_threshold=0.99;

/** dc_data_table_registered: flag to record the first loaded dashboard.
 *  important for distinguishing between comparative datatables
 *  otherwise dc cross filtering works only for one dashboard.
 */
var dc_data_table_registered=0;
var first_registered_list=[];
var Initial_MsaGV='';
var geneId_GV='', geneclusterID_GV='';
var ann_majority= '';
var chart_width=panXDashboard.winInnerWidth/4.5;//(winInnerWidth/4.5>255) ? winInnerWidth/4.5 : 255,
var lineChart_width=chart_width, lineChart_height=150;
var barChart_width=chart_width,  barChart_height=150;

//## core_genome threshold slider
function slider_coreThreshold_init(coreThreshold_slider_id){
    var tooltipSlider = document.getElementById(coreThreshold_slider_id);
    noUiSlider.create(tooltipSlider, {
        start:  0.99,
        behaviour: 'tap',
        connect: 'upper',//'lower',/**/
        range: {
            'min': 0,
            'max': 1
        }
        //, tooltips: [  wNumb({ decimals: 2 }) ]
    });
    return tooltipSlider;
};

//## create charts and load geneCluster dataTable
export const render_chart_table = {
    initChart: function (data, table_id, col_select_id,
        count_id, chart1_id, chart2_id, chart3_id,
        coreThreshold_slider_id, coreThreshold_text_id,
        first_cluster, strain_tree_id, gene_tree_id, tool_side) {
        /*"use strict";*/
        var lineChart = dc.lineChart('#'+chart1_id)
                        .xAxisLabel('gene')
                        .yAxisLabel('strain count');
        var geneLengthBarChart = dc.barChart('#'+chart2_id)
                        .yAxisLabel('gene count')
                        .xAxisLabel('gene length');
        var coreYesNoPieChart = dc.pieChart('#'+chart3_id);
        //# Create Crossfilter Dimensions and Groups
        var ndx = crossfilter(data);
        var all = ndx.groupAll();

        // count all the genes
        dc.dataCount('#'+count_id)
            .dimension(ndx)
            .group(all);

        // Dimension by geneId
        var geneCountDimension = ndx.dimension(function (d) {
            return d.rank;});
        // Group by geneCount
        var geneCountGroup = geneCountDimension.group()
            .reduceSum(function (d) {return d.strains;});

        // Dimension by geneLength
        var geneLengthValue = ndx.dimension(function (d) {
            return d.length;});
        //Group by total movement within month
        var geneLengthGroup = geneLengthValue.group()

        //##  pie chart
        // reusable function to create threshold dimension
        function coreCount_from_threshold() {
            var totalStrainNumber=dataset.strains.length;
            var coreThreshold=document.getElementById(coreThreshold_text_id).value;
            coreThreshold=parseFloat(coreThreshold);
            if (isNaN(coreThreshold)) {
                coreThreshold=init_core_threshold
            }
            return ndx.dimension(function (d) {
                // add option later
                if (true){
                    if (d.strains >= totalStrainNumber*coreThreshold){
                        return 'core';
                    }
                    else {
                        return 'acc';
                    }
                } else{
                    if (d.strains >= totalStrainNumber*coreThreshold){
                        if (d.duplications.length==0){
                            return 'core(s)';
                        }else {
                            return 'core';
                        }
                    }else if (d.strains!=1){
                        return 'acc';
                    }else {
                        return 'unique';
                    }
                }
            });
        };
        // categorical dimension (pie chart) by coreGene count
        var coreCount = coreCount_from_threshold();
        // core/non-core gene counts records in the dimension
        var coreCountGroup = coreCount.group();

        var totalGeneNumber= Object.keys(data).length;

        lineChart
            .width(lineChart_width).height(lineChart_height) //4.5
            .x(d3.scale.linear().domain([1,totalGeneNumber] ))
            //.x(d3.scale.log().base(10).domain([1,totalGeneNumber] ))
            .transitionDuration(500)
            .dimension(geneCountDimension)
            .group(geneCountGroup)
            .renderArea(true)
            .renderHorizontalGridLines(true)
            .elasticY(true)
            .xAxis().ticks(5);
            //.ticks(10, ",.0f") //???
            //.tickSize(5, 0);
            //.tickFormat(function(v) {return v;});
            //.mouseZoomable(true)
            //.interpolate('step-before')
            //.brushOn(false)
            //.renderDataPoints(true)
            //.clipPadding(10)

        var geneLengthMax=d3.max(data, function(o){return o.length;})
        geneLengthBarChart
            .width(barChart_width).height(barChart_height) //winInnerWidth/3.5
            //.margins({top: 10, right: 10, bottom: 20, left: 40})
            .dimension(geneLengthValue)
            .group(geneLengthGroup)
            .transitionDuration(500)
            .centerBar(true)
            .gap(1) // bar width Keep increasing to get right then back off.
            .x(d3.scale.linear().domain([0, geneLengthMax]))
            //.x(d3.scale.linear().clamp(true).domain([0, 5000]))
            .elasticY(true)
            //.mouseZoomable(true)
            .renderHorizontalGridLines(true)
            //.brushOn(false)
            .xAxis().tickFormat(function(v) {return v;}).ticks(5);

        coreYesNoPieChart
            .width(pie.width)
            .height(pie.height)
            .radius(pie.outer_radius)
            .innerRadius(pie.inner_radius)
            .dimension(coreCount)
            .title(function(d){return d.value;})
            .group(coreCountGroup)
            .label(function (d) {
                if (coreYesNoPieChart.hasFilter() && !coreYesNoPieChart.hasFilter(d.key)) {
                    return d.key + '(0%)';
                }
                var label = d.key;
                if (all.value()) {
                    label += '(' + Math.floor(d.value / all.value() * 100) + '%)';
                }
                return label;
            })
            //.legend(dc.legend());

        //## using core threshold in slider to re-distribute pie chart data
        // update the field
        var tooltipSlider=slider_coreThreshold_init(coreThreshold_slider_id);
        var coreThresholdField = document.getElementById(coreThreshold_text_id);
        tooltipSlider.noUiSlider.on('update', function( values, handle ){
            if ( parseFloat(values[handle]) !== init_core_threshold) {
                coreThresholdField.value = parseFloat(values[handle]);
                coreThresholdField.innerHTML = 'cutoff:' + values[handle];
                coreCount.dispose();
                coreCount = coreCount_from_threshold();
                coreCountGroup = coreCount.group();

                coreYesNoPieChart
                  .dimension(coreCount)
                  .group(coreCountGroup);
                dc.redrawAll();}
        });

        //## data count records (selected records and all records)
        var nasdaqCount = dc.dataCount('.'+count_id);
        nasdaqCount
            .dimension(ndx)
            .group(all)
            // (_optional_) `.html` sets different html when some records or all records are selected.
            // `.html` replaces everything in the anchor with the html given using the following function.
            // `%filter-count` and `%total-count` are replaced with the values obtained.
            .html({
                some: '<strong>%filter-count</strong> genes selected from <strong>%total-count</strong> total genes' +
                    ' <br/> <a href="javascript:dc.filterAll(); dc.renderAll();"" style="font-size:20px"> Clear filters </a>',
                all: 'All records selected. Please click on the graph to apply filters.'
            });

        dtab.create_dataTable('#'+table_id,dtab.geneCluster_table_columns);

        tooltip_tableHeader('#'+table_id+' tr th',dtab.clusterTable_tooltip_dict );

        var datatable=dtab.datatable_configuration(geneCountDimension.top(Infinity), table_id, col_select_id);

        /*var trigger_action_table_each= new trigger_action_table();
        trigger_action_table_each.init_action(datatable,table_id,strain_tree_id, gene_tree_id,tool_side);*/
        trigger_action_table.init_action(datatable, table_id, first_cluster, strain_tree_id, gene_tree_id, tool_side);

        function RefreshTable() {
            dc.events.trigger(function () {
                var alldata = geneCountDimension.top(Infinity);
                $('#'+table_id).dataTable().fnClearTable();
                $('#'+table_id).dataTable().fnAddData(alldata);
                $('#'+table_id).dataTable().fnDraw();
                //click_table_show_AlnTree(datatable);
            });
        }

        /** when no table registered */
        if (!dc_data_table_registered) {
            dc_data_table_registered=1;
            var mylist= dc.chartRegistry.list();
            first_registered_list=dc.chartRegistry.list();
            var first_registered_list_len=first_registered_list.length;
        } else {
            var mylist=dc.chartRegistry.list().slice(first_registered_list_len);
        }

        for (var i = 0; i < mylist.length; i++) {
            var chartI = mylist[i];
            chartI.on('filtered', RefreshTable);
        }

        //## Rendering: render all charts on the page
        dc.renderAll();

        //## responsive charts: adjust chart width when resizing
        window.onresize = function() {
            lineChart
                .width(window.innerWidth/4.5)
                //.height(lineChart_height)
                .rescale()
                .redraw();

            geneLengthBarChart
                .width(window.innerWidth/4.5)
                //.height(lineChart_height)
                .rescale()
                .redraw();
        };

        return datatable;
    },
    initData: function (table_id, col_select_id,
        count_id, chart1_id, chart2_id, chart3_id,
        coreThreshold_slider_id, coreThreshold_text_id,
        strain_tree_id,gene_tree_id, tool_side, species_tree, handleDataTable, handleGeneTree) {
        //## the rows of the charts and the table: the clusters of clusters.json with their rank and locus tags
        var data = clusters.map(function(cluster, index){
            return Object.assign({}, cluster, {rank: index+1, locus: ''});
        });
        var first_cluster = data[0];
        var datatable = render_chart_table.initChart(data, table_id, col_select_id,
            count_id, chart1_id, chart2_id, chart3_id,
            coreThreshold_slider_id, coreThreshold_text_id,
            first_cluster, strain_tree_id,gene_tree_id,tool_side);
        loadNewGeneCluster(first_cluster, species_tree, handleGeneTree, 'aa');
        handleDataTable(datatable);
    }
};

/**
 * Module for initializing trigger actions in cluster datatable. It includes:
 * click the Plus/Minus button to unfold/fold annotation/geneName/etc details,
 * click aa/na alignment button to show MSA and linked trees.
 */
var trigger_action_table= function(){
    /**
     * HTML table of `[name, count]` pairs for an expanded row
     * @param  {str} title    : title of the first column
     * @param  {Array} pairs  : pairs of a name (or null) and its count
     * @return {str}          : the details in HTML format
     */
    function format_pairs(title, pairs) {
        var table_Str='<table cellpadding="5" cellspacing="0" border="0" style="padding-right:50px;">'+
            '<tr><td>'+title+'</td> <td>Counts:</td></tr>';
        for (var i=0;i<pairs.length;i++) {
            table_Str+='<tr><td>'+dtab.nameText(pairs[i][0])+'</td> <td>'+pairs[i][1]+'</td>'+'</tr>';
        }
        table_Str+='</table>';
        return table_Str;
    }

    /** all annotations of a cluster with their counts */
    function format_annotation(d) {
        return format_pairs('Annotation detail:', d.annotations);
    }

    /** the strains with more than one copy of the gene, with their copy counts */
    function format_dup_detail(d) {
        //** a cluster without duplications shows `None`, as the pipeline output did
        return format_pairs('strain name:', d.duplications.length ? d.duplications : [['None', '']]);
    }

    /** all gene names of a cluster with their counts */
    function format_geneNames(d) {
        return format_pairs('geneName detail:', d.genes);
    }

    /**
     * add event listener for Plus/Minus(Unfold/Fold) button in cluster table
     * @param: see function init_action
     */
    var init_folding_listener= function(datatable, table_id) {
        /** unfold and fold annotation column in cluster datatable */
        $('#'+table_id+' tbody').on('click', 'td.ann-details-control', function (e) {
            var tr = $(this).closest('tr');
            var row = datatable.row( tr );
            if ( row.child.isShown() ) {
                /** close the row, if it's already open */
                row.child.hide();
                tr.removeClass('shown');
            } else {
                /** Open the row */
                row.child( format_annotation(row.data()) ).show();
                tr.addClass('shown');
            };
            if ($(this).closest('tr').hasClass("row_selected")){
                e.stopPropagation();
            }
        });

        /** unfold and fold duplication column in cluster datatable */
        $('#'+table_id+' tbody').on('click', 'td.dup-details-control', function (e) {
            var tr = $(this).closest('tr');
            var row = datatable.row( tr );
            if ( row.child.isShown() ) {
                /** close the row, if it's already open*/
                row.child.hide();
                tr.removeClass('shown');
            } else {
                /** Open the row */
                row.child( format_dup_detail(row.data()) ).show();
                tr.addClass('shown');
            };
            if ($(this).closest('tr').hasClass("row_selected")){
                e.stopPropagation();
            }
        });

        /** unfold and fold gene_name column in cluster datatable */
        $('#'+table_id+' tbody').on('click', 'td.geneName-details-control', function (e) {
            var tr = $(this).closest('tr');
            var row = datatable.row( tr );
            if ( row.child.isShown() ) {
                /** close the row, if it's already open*/
                row.child.hide();
                tr.removeClass('shown');
            } else {
                /** Open the row */
                row.child( format_geneNames(row.data()) ).show();
                tr.addClass('shown');
            };
            if ($(this).closest('tr').hasClass("row_selected")){
                e.stopPropagation();
            }
        });
    };

    /**
     * wrapper function for all initial actions
     * @param  {object} datatable      : object loaded from datatable json file
     * @param  {str} table_id          : div ID for datatable
     * @param  {str} strain_tree_id    : div ID for strain tree
     * @param  {str} gene_tree_id      : div ID for gene tree
     * @param  {int} tool_side         : flag for comparative tool side (0:left; 1:right)
     */
    var init_action= function (datatable, table_id) {
        init_folding_listener(datatable, table_id);
    }
    return { init_action:init_action};
}();

