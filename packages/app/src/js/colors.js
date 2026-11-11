//** 12-color palette(colorblind safe)
//** from http://mkweb.bcgsc.ca/colorblind/img/colorblindness.palettes.simple.png
export const colorblind_safe_set = ['#006E82','#8214A0','#005AC8','#00A0FA','#FA78FA','#14D2DC','#AA0A3C','#FA7850','#0AB45A','#F0F032','#A0FA82','#FAE6BE']
//** More:15-color palette for common color blindness types from http://mkweb.bcgsc.ca/biovis2012/
// d3.scale.category20();// d3.range(20).map(d3.scale.category20())

export const discrete_color_set = ['#F02132','#EA761F','#F5B223','#38A920','#2195C3','#1D52D3','#4514A1']

//** 11-color palette for diverging scheme (colorbind safe, RdYlBu) from http://colorbrewer2.org
export const continuous_color_set=[
['#4575b4'],
['#4575b4','#f46d43'],
['#4575b4','#FDD97B','#f46d43'],
['#4575b4','#74add1','#f46d43','#d73027'],
['#313695','#4575b4','#74add1','#f46d43','#d73027'],
['#313695','#4575b4','#74add1','#fdae61','#f46d43','#d73027'],
['#313695','#4575b4','#74add1','#FDD97B','#fdae61','#f46d43','#d73027'],
['#313695','#4575b4','#74add1','#98CCDD','#FDD97B','#fdae61','#f46d43','#d73027'],
['#313695','#4575b4','#74add1','#98CCDD','#FDD97B','#fdae61','#f46d43','#d73027','#a50026'],
['#313695','#4575b4','#74add1','#98CCDD','#BCE1EE','#FDD97B','#fdae61','#f46d43','#d73027','#a50026'],
['#313695','#4575b4','#74add1','#98CCDD','#BCE1EE','#FFF38B','#FDD97B','#fdae61','#f46d43','#d73027','#a50026']
]
//small set (when items<10) ['#d7191c','#fdae61','#abd9e9','#2c7bb6']
//original 11-color ['#313695','#4575b4','#74add1','#abd9e9','#e0f3f8','#ffffbf','#fee090','#fdae61','#f46d43','#d73027','#a50026']
//** other
//** 9-class YlGnBu
//** ['#ffffd9','#edf8b1','#c7e9b4','#7fcdbb','#41b6c4','#1d91c0','#225ea8','#253494','#081d58']
