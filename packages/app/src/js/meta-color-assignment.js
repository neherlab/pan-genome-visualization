import {panXTree,metaLegend} from "./global";
import chroma from 'chroma-js';
import {colorblind_safe_set, discrete_color_set, continuous_color_set} from "./colors";
export var metaColor_dicts = {},//** {'host':hostColor,'country':countryColor}
       metaColor_dicts_keys = {}, //** keep the original key order
       metaColor_reference_dicts= {};

const assign_discrete_color = function(metaColor_dicts,metaColor_dicts_keys, metaType_key, meta_detail, discret_color_set_common, discret_color_set_safe) {
    var tmp_meta_color_dict = {},
        tmp_meta_colorsafe_dict = {};
    var index = meta_detail.indexOf('unknown');
    if (index > -1) { //** assign color to unknown item
        meta_detail.splice(index, 1);
        tmp_meta_color_dict['unknown']=panXTree.metaUnknown;
        tmp_meta_colorsafe_dict['unknown']=panXTree.metaUnknown;
    }
    //** create a list of legend values and corresponding colors
    var tmp_meta_color_dict_keys = meta_detail.map(function(item,ind){
        tmp_meta_color_dict[item]=discret_color_set_common[ind];
        tmp_meta_colorsafe_dict[item]=discret_color_set_safe[ind];
        return item;
    });
    if (tmp_meta_color_dict['unknown']!=undefined){
            tmp_meta_color_dict_keys.push('unknown');
    }
    metaColor_dicts[metaType_key]= {'common':{},'safe':{}};
    metaColor_dicts[metaType_key].common= tmp_meta_color_dict;
    metaColor_dicts[metaType_key].safe= tmp_meta_colorsafe_dict;
    metaColor_dicts_keys[metaType_key]= tmp_meta_color_dict_keys;
}

const assign_continuous_color = function(metaColor_dicts,metaColor_dicts_keys,metaColor_reference_dicts,metaType_key,meta_detail) {
    var tmp_meta_color_dict= {},
        tmp_meta_color_dict_keys= [],
        tmp_meta_color_reference_dicts= {};
    const index = meta_detail.indexOf('unknown');
    if (index > -1) { //** assign color to unknown item
        meta_detail.splice(index, 1);
        tmp_meta_color_dict['unknown']=panXTree.metaUnknown;
    }

    /*var regEx = /<|>|=/g;
    var testString = "<test><=";
    console.log(testString.replace(regEx,''));*/

    const meta_detail_numerical= meta_detail.map((i)=> parseFloat(i));
    const min_val= parseFloat(d3.min(meta_detail_numerical)),
          max_val= parseFloat(d3.max(meta_detail_numerical)),
          distance = max_val - min_val,
          meta_item_count= meta_detail_numerical.length,
          num_interval = meta_item_count<=10 ? meta_item_count-1 :10,
          color_set_index= num_interval,
          interval= distance/num_interval;

    //** create a list of legend values and corresponding colors
    const tmp_num_list = d3.range(num_interval+1).map(function(i){
        const legend_value= parseFloat(min_val+interval*i).toFixed(2);
        tmp_meta_color_dict[legend_value]=continuous_color_set[color_set_index][i];
        return legend_value;
    });

    //** create upper-/lower-bound for each legend value
    var tmp_bound_list = [];
    tmp_num_list.forEach(function(item,ind) {
        const result=(tmp_num_list[ind-1]!==undefined) ? [tmp_num_list[ind-1],item] : ['0',item]
        tmp_bound_list.push(result);
    });

    //** link original value to each legend value
    var index_found_list=[];
    meta_detail.forEach(function(meta_item){
        const meta_item_numeric= parseFloat(meta_item);
        for (const bound_item of tmp_bound_list) {
            //meta_item_numeric==bound_item[0]: case of 0 (0.00=='0' is true)
            if ((meta_item_numeric==bound_item[0]) || (meta_item_numeric>bound_item[0] && meta_item_numeric<=bound_item[1])){
                const index_found= tmp_bound_list.indexOf(bound_item);
                index_found_list.push(index_found);
                tmp_meta_color_reference_dicts[meta_item]=bound_item[1];
                break;
            }
        }
    });

    const tmp_num_list_filterd= tmp_num_list.filter((i,index)=>(index_found_list.indexOf(index) != -1));
    metaColor_dicts[metaType_key] = tmp_meta_color_dict;
    metaColor_dicts_keys[metaType_key] = tmp_num_list_filterd;
    metaColor_reference_dicts[metaType_key] = tmp_meta_color_reference_dicts;
}

const assign_mixed_continuous_color = function(metaColor_dicts,metaColor_dicts_keys,metaColor_reference_dicts,metaType_key,raw_meta_detail) {
    var tmp_meta_color_dict= {},
        tmp_meta_color_dict_keys= [],
        tmp_meta_color_reference_dicts= {};
    var meta_detail= [];
    for (var i=0,len=raw_meta_detail.length; i < len; i++) {
        meta_detail.push(raw_meta_detail[i][1]);
    }
    const index = meta_detail.indexOf('unknown');
    if (index > -1) { //** assign color to unknown item
        meta_detail.splice(index, 1);
        raw_meta_detail.splice(index, 1);
        tmp_meta_color_dict['unknown']=panXTree.node_metaunknown_stroke;
    }
    const meta_detail_numerical= meta_detail.map((i)=> parseFloat(i));
    const min_val= parseFloat(d3.min(meta_detail_numerical)),
          max_val= parseFloat(d3.max(meta_detail_numerical)),
          distance = max_val - min_val,
          meta_item_count= meta_detail_numerical.length,
          num_interval = meta_item_count<=10 ? meta_item_count-1 :10,
          color_set_index= num_interval,
          interval= distance/num_interval;

    //** create a list of legend values and corresponding colors
    const tmp_num_list = d3.range(num_interval+1).map(function(i){
        const partition_value= min_val+interval*i;
        //** convert log-transformed number back for legend display
        const legend_value= parseFloat(Math.pow(2,partition_value).toFixed(3));
        tmp_meta_color_dict[legend_value]=continuous_color_set[color_set_index][i];
        return legend_value;
    });

    //** create upper-/lower-bound for each legend value
    var tmp_bound_list = [];
    tmp_num_list.forEach(function(item,ind) {
        const result=(tmp_num_list[ind-1]!==undefined) ? [tmp_num_list[ind-1],item] : ['0',item]
        tmp_bound_list.push(result);
    });

    var index_found_list=[];
    //** link original value to each legend value
    meta_detail.forEach(function(meta_item,ind){
        for (const bound_item of tmp_bound_list) {
            //** convert log-transformed number back
            const meta_item_raw= parseFloat(Math.pow(2,meta_item).toFixed(3));
            if ((meta_item_raw==bound_item[0]) || (meta_item_raw>bound_item[0] && meta_item_raw<=bound_item[1])){
                const index_found= tmp_bound_list.indexOf(bound_item);
                index_found_list.push(index_found);
                tmp_meta_color_reference_dicts[raw_meta_detail[ind][0]]=bound_item[1];
                break;
            }
        }
    });

    const tmp_num_list_filterd= tmp_num_list.filter((i,index)=>(index_found_list.indexOf(index) != -1));
    metaColor_dicts[metaType_key] = tmp_meta_color_dict;
    metaColor_dicts_keys[metaType_key] = tmp_num_list_filterd;
    metaColor_reference_dicts[metaType_key] = tmp_meta_color_reference_dicts;
}

export const assign_metadata_color = function(meta_details,meta_display){
    const metaTypes= meta_display["meta_display_order"];

    for (var j = 0; j < metaTypes.length; j++) {
        var metaType_key = metaTypes[j]; //**'host'
        var meta_detail = meta_details[metaType_key]; //** ["human", "rice"]
        //meta_detail.sort();
        //console.log(meta_display);
        if (meta_display['color_options'][metaType_key]===undefined){
            console.warn("no meta color option for", metaType_key);
        }else{
            const meta_coloring_type= meta_display['color_options'][metaType_key]['type'];
            if (meta_coloring_type=='continuous') {
                assign_continuous_color(metaColor_dicts,metaColor_dicts_keys,metaColor_reference_dicts,metaType_key,meta_detail)
            } else if (meta_coloring_type=='discrete') {
                const discret_color_set_common=chroma.scale(discrete_color_set).colors(meta_detail.length),
                      discret_color_set_safe=chroma.scale(colorblind_safe_set).colors(meta_detail.length);
                assign_discrete_color(metaColor_dicts,metaColor_dicts_keys,metaType_key,meta_detail, discret_color_set_common,discret_color_set_safe);
            } else if (meta_coloring_type=='mixed_continuous') {
                var raw_meta_detail=meta_detail;
                assign_mixed_continuous_color(metaColor_dicts,metaColor_dicts_keys,metaColor_reference_dicts,metaType_key,raw_meta_detail)
            }
        }
    }
}