import d3 from "d3";
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

/**
 * Assign colours to the values of a `continuous` column on a colour scale over their numbers
 * @param {str} metaType_key    : the column key
 * @param {Array} pairs         : the pairs [value, number] of the column; values without a number colour as unknown
 * @param {str} scale           : `linear`, where the legend shows the numbers, or `log2`, where it shows 2^number
 */
const assign_continuous_color = function(metaColor_dicts,metaColor_dicts_keys,metaColor_reference_dicts,metaType_key,pairs,scale) {
    var tmp_meta_color_dict= {'unknown': panXTree.metaUnknown},
        tmp_meta_color_reference_dicts= {};
    const numbers= pairs.map((pair)=> pair[1]);
    const min_val= d3.min(numbers),
          max_val= d3.max(numbers),
          meta_item_count= numbers.length,
          num_interval = meta_item_count<=10 ? meta_item_count-1 :10,
          interval= num_interval>0 ? (max_val - min_val)/num_interval : 0;
    if (meta_item_count===0) {
        metaColor_dicts[metaType_key] = tmp_meta_color_dict;
        metaColor_dicts_keys[metaType_key] = [];
        metaColor_reference_dicts[metaType_key] = tmp_meta_color_reference_dicts;
        return;
    }
    const legend_text= (number)=> (scale==='log2') ? parseFloat(Math.pow(2,number).toFixed(3)) : number.toFixed(2);

    //** the legend value and colour of each interval: interval i holds the numbers in (min+interval*(i-1), min+interval*i]
    const tmp_num_list = d3.range(num_interval+1).map(function(i){
        const legend_value= legend_text(min_val+interval*i);
        tmp_meta_color_dict[legend_value]=continuous_color_set[num_interval][i];
        return legend_value;
    });

    //** link original value to its legend value
    var index_found_list=[];
    pairs.forEach(function(pair){
        const index_found= interval>0 ? Math.max(0, Math.ceil((pair[1]-min_val)/interval - 1e-9)) : 0;
        index_found_list.push(index_found);
        tmp_meta_color_reference_dicts[pair[0]]=tmp_num_list[index_found];
    });

    const tmp_num_list_filterd= tmp_num_list.filter((i,index)=>(index_found_list.indexOf(index) != -1));
    metaColor_dicts[metaType_key] = tmp_meta_color_dict;
    metaColor_dicts_keys[metaType_key] = tmp_num_list_filterd;
    metaColor_reference_dicts[metaType_key] = tmp_meta_color_reference_dicts;
}

export const assign_metadata_color = function(meta_details,meta_display){
    for (const metaType_key in meta_display['color_options']) {
        const meta_detail = meta_details[metaType_key]; //** ["human", "rice"]
        const color_option= meta_display['color_options'][metaType_key];
        if (color_option['type']=='discrete') {
            const discret_color_set_common=chroma.scale(discrete_color_set).colors(meta_detail.length),
                  discret_color_set_safe=chroma.scale(colorblind_safe_set).colors(meta_detail.length);
            assign_discrete_color(metaColor_dicts,metaColor_dicts_keys,metaType_key,meta_detail.slice(), discret_color_set_common,discret_color_set_safe);
        } else if (color_option['type']=='mixed_continuous') {
            assign_continuous_color(metaColor_dicts,metaColor_dicts_keys,metaColor_reference_dicts,metaType_key,meta_detail,color_option['scale']);
        }
    }
}
