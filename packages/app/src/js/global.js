
export const panXTree = {
    /**if true, use separated pattern instead of entire pattern */
    currentClusterID: '',
    currentTreeLayout: '',
    currentGeneTree: undefined,
    speciesTree: undefined, //{}
    speciesTreeTipCount: 0,
    singleton_gene: false,
    //large_output: false,
    //gain_loss_enabled: true,
    collapsed_node_size: 4.5,
    collapsed_node_fill: '#26B629', //'steelblue',
    collapsed_node_stroke:'steelblue',
    branch_col: '#4A4A4A',
    branch_col_highlight: '#2D59B1',
    branch_wid_highlight: '3px',
    branch_stroke_width:2,
    //link_width: '1px',
    link_dasharray: '1px, 0px',
    tipUnselected: "#CCC",
    tipFillHover:"#55AAEE",
    tiparalogFillHover:"#314BC6",
    genePresentFill: '#3A89EA',//'#3A89EA' '#1F69C4' gene presence
    geneAbsentFill: '#CCC', // '#D82400' '#EA5833'; gene absence
    genePresentR: 5, // tip radius
    geneAbsentR:  2,
    strokeToFill: 0.4,  //brightness difference between stroke and fill
    tipStroke: '#555555',
    branchStroke_default: '#555555',
    metaUnknown:'#CCCCCC',//'#FFFFFF'
    metaUnknownShrink: 0.3, // factor by which radius is reduced if meta data is not available
    wid_link: '1.2px',
    wid_gloss: '3px',//gain loss highlight
    genePattern_tool1: {
        node_color_mem: {}, link_color_mem: {},
        link_width_mem: {}, link_dash_mem:  {}
    },
    genePattern_tool2: {
        node_color_mem: {}, link_color_mem: {},
        link_width_mem: {}, link_dash_mem:  {}
    },
    treeStyle_tool1: {
        node_color_mem: {}, link_color_mem: {},
        link_width_mem: {}, link_dash_mem:  {}
    },
    treeStyle_tool2: {
        node_color_mem: {}, link_color_mem: {},
        link_width_mem: {}, link_dash_mem:  {}
    }
};

export const panXDashboard = {
    winInnerWidth: window.innerWidth,
};

export const metaLegend = {
    current_metaType: undefined,
    legend_width:110,
    legend_height:580,
    common_color: true, //false for colorblind safe color
    //discrete_colorSet: discrete_color_set,
    //continuous_colorSet: continuous_color_set
}

export const panXClusterTable = {
    cluster_table_id: 'dc_data_table',
    cluster_table_unselect: "cluster_table_unselect"
};

var default_NCBI_link;
default_NCBI_link= (speciesAbbr=='P_marinus_meta')? false: true;

export const panXMetaTable = {
    meta_table_id: 'dc_data_table_meta',
    meta_table_unselect: "meta_table_unselect",
    show_NCBI_link: default_NCBI_link
};

export const msaViewerAsset = {
    selected_rows_set: new Set()
};

export const metaTitles ={
    'collection_date':'collection date',
    'country':'country/ sampling location',
}