#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Convert pangenome data from the old to the new format
"""

from datetime import datetime
from glob import glob
from itertools import zip_longest
from logging import info, warning, INFO
from os import makedirs
from os.path import join, basename, isfile, isdir, dirname
from shutil import copyfile
import json
import logging
import os
import re
import sys
import tarfile

logging.basicConfig(level=INFO)

BATCH_SIZE = 100  # Number of gene clusters packaged in one archive. This might need some tuning.


def list_unique_files(dataset_path):
  unique_files = set()
  for f in os.scandir(dataset_path):
    if f.is_dir:
      for file in glob(f"{f.path}/*"):
        unique_files.add(basename(file))
  return list(sorted(unique_files))


def json_read(filepath):
  with open(filepath, "r") as f:
    return json.load(f)


def find(name, iterable, predicate):
  results = list(filter(predicate, iterable))
  if len(results) == 0:
    warning(f"No entries found: {name}")
    return None
  if len(results) > 1:
    warning(f"More than one entry found for species: {name}")
    return None
  return results[0]


def find_downloads_table_entry(all_downloads_table, species_id):
  return find(
    f"find_downloads_table_entry: {species_id}",
    all_downloads_table["data"],
    lambda entry: entry["panX link"] == species_id
  )


def find_species_friendly_name(species_list_info, species_id):
  entry = find(
    f"find_species_friendly_name_entry: {species_id}",
    species_list_info["species_search_dt"],
    lambda entry: entry["linkName"] == species_id
  )

  if entry is not None:
    return entry["species"]

  return species_id


def find_species_category(species_list_info, species_id):
  for key, value in species_list_info["species_dt"].items():
    if "label" in value and "members" in value:
      if species_id in value["members"]:
        return value["label"].rstrip(":")
  warning(f"find_species_category: category not found for species: {species_id}")
  return None


def find_species_description(species_list_info, species_id):
  if species_id in species_list_info["species_dt"]:
    return species_list_info["species_dt"][species_id]
  warning(f"find_species_description: description not found for species: {species_id}")
  return species_id


def find_species_info_entry(species_list_info, species_id):
  name = find_species_friendly_name(species_list_info, species_id)
  category = find_species_category(species_list_info, species_id)
  description = find_species_description(species_list_info, species_id)
  return category, {"name": name, "description": description}


def generate_index_entry(species_dir_path, all_downloads_table, species_list_info):
  species_id = basename(species_dir_path)
  table_entry = find_downloads_table_entry(all_downloads_table, species_id)
  category, species_info = find_species_info_entry(species_list_info, species_id)

  if table_entry is not None:
    assert species_id == table_entry["panX link"]
    assert species_info["name"] == table_entry["species name"]
    species_info.update({
      "num_strains": int(table_entry["#strains"]),
      "source": table_entry["source"],
    })
  else:
    warning(f"table entry is empty for species '{species_id}'")

  return category, {"id": species_id, **species_info}


def generate_index_json(in_dir, out_dir):
  all_downloads_table = json_read(join(in_dir, "all_downloads_table.json"))
  species_list_info = json_read(join(in_dir, "species_list_info.json"))
  case_studies = []
  orders = []
  species = []
  dataset_in_path = join(in_dir, "dataset")
  for f in os.scandir(dataset_in_path):
    if f.is_dir:
      category, entry = generate_index_entry(f.path, all_downloads_table, species_list_info)

      if category == "Case studies":
        case_studies.append(entry)
      if category == "Orders":
        orders.append(entry)
      if category == "Pan-genomes from RefSeq records":
        species.append(entry)

  index_json = {
    "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    "case_studies": sorted(case_studies, key=lambda dataset: dataset["id"]),
    "orders": sorted(orders, key=lambda dataset: dataset["id"]),
    "species": sorted(species, key=lambda dataset: dataset["id"]),
  }

  index_json_path = join(out_dir, "index.json")
  with open(index_json_path, "w") as f:
    json.dump(index_json, f, indent=2, sort_keys=True)

  info(f"Index written to '{index_json_path}'")

  return index_json


def generate_not_found_json(out_dir):
  not_found_json_path = join(out_dir, "not_found.json")
  not_found_json = {"status": 404, "message": "Not found"}
  with open(not_found_json_path, "w") as f:
    json.dump(not_found_json, f, indent=2, sort_keys=True)


def grouper(n, iterable, padvalue=None):
  """
  Splits an iterable into a tuples of size n
  https://stackoverflow.com/a/312644

  grouper(3, 'abcdefg', 'x') --> ('a','b','c'), ('d','e','f'), ('g','x','x')
  """
  return zip_longest(*[iter(iterable)] * n, fillvalue=padvalue)


def rename_dict_key(mydict, key_old, key_new):
  assert isinstance(mydict, dict)
  if key_new != key_old:
    mydict[key_new] = mydict[key_old]
    del mydict[key_old]


def tar_add(tar, filepath):
  if not isfile(filepath):
    return None

  arcname = basename(filepath)
  tar.add(filepath, arcname=arcname)

  return arcname


def tar_add_files(tar, gene_cluster_dir_path, gene_cluster_name):
  return {
    "aa_aln": tar_add(tar, join(gene_cluster_dir_path, f"{gene_cluster_name}_aa_aln.fa")),
    "aa_aln_reduced": tar_add(tar, join(gene_cluster_dir_path, f"{gene_cluster_name}_aa_aln_reduced.fa")),
    "na_aln": tar_add(tar, join(gene_cluster_dir_path, f"{gene_cluster_name}_na_aln.fa")),
    "na_aln_reduced": tar_add(tar, join(gene_cluster_dir_path, f"{gene_cluster_name}_na_aln_reduced.fa")),
    "nwk": tar_add(tar, join(gene_cluster_dir_path, f"{gene_cluster_name}.nwk")),
    "patterns_json": tar_add(tar, join(gene_cluster_dir_path, f"{gene_cluster_name}_patterns.json")),
    "tree_json": tar_add(tar, join(gene_cluster_dir_path, f"{gene_cluster_name}_tree.json")),
  }


def extract_json_from_js(regex, content):
  match = re.search(regex, content)
  if match is None:
    raise ValueError(f"Unable to parse JavaScript: {content}")

  if match.group(1) is None:
    raise ValueError(f"Unable to extract value from JavaScript: {content}")

  data_str = str(match.group(1))
  return json.loads(data_str)


def extract_tree_meta(meta_configuration_js_path):
  with open(meta_configuration_js_path, "r") as f:
    meta_configuration_js = f.read()

  # HACK: here we ignore all errors, so anything that cannot be parsed as JSON will be omitted from the output
  try:
    meta_details = extract_json_from_js(r"meta_details\s*=\s*([\S\n ]*?),\s*meta_display", meta_configuration_js)
  except:
    meta_details = None

  try:
    meta_display = extract_json_from_js(r"meta_display\s*=\s*([\S\n ]*?);", meta_configuration_js)
  except:
    meta_display = None

  try:
    association_columns = extract_json_from_js(r"\nvar association_columns=(?s:(.*)?);", meta_configuration_js)
  except:
    association_columns = None

  return {
    "meta_details": meta_details,
    "meta_display": meta_display,
    "association_columns": association_columns,
  }


def convert_tree_json_for_species(species_in_path, species_out_path):
  meta_configuration_js_path = join(species_in_path, "metaConfiguration.js")
  meta = extract_tree_meta(meta_configuration_js_path)

  tree_json_in_path = join(species_in_path, "coreGenomeTree.json")
  with open(tree_json_in_path, "r") as f:
    tree_json = json.load(f)

  tree_json = {
    "meta": meta,
    "tree": tree_json
  }

  tree_json_out_path = join(species_out_path, "strain_tree.json")
  with open(tree_json_out_path, "w") as f:
    json.dump(tree_json, f, indent=2, sort_keys=True)


def copy_remaining_files_for_species(dataset_in_path, dataset_out_path):
  for f in [
    "all_gene_alignments.zip",
    "core_gene_alignments.zip",
    "metainfo.tsv",
    "strain_tree.nwk",
  ]:
    copyfile(join(dataset_in_path, f), join(dataset_out_path, f))


def generate_gene_cluster_json_and_archives_for_species(species_in_path, species_out_path):
  gene_cluster_dir_path = join(species_in_path, "geneCluster")
  gene_cluster_json_path = join(species_in_path, "geneCluster.json")

  with open(gene_cluster_json_path, "r") as f:
    gene_cluster_json = json.load(f)

  clusters = []

  for i, gene_cluster_group in enumerate(grouper(BATCH_SIZE, gene_cluster_json)):
    archive_path_rel = join("gene_cluster_archives", f"{i:07d}.tar")
    archive_path = join(species_out_path, archive_path_rel)
    makedirs(dirname(archive_path), exist_ok=True)

    with tarfile.open(archive_path, "w") as tar:
      for gene_cluster in gene_cluster_group:
        if gene_cluster is not None:
          gene_cluster_name = gene_cluster["msa"]

          add_files_result = tar_add_files(tar, gene_cluster_dir_path, gene_cluster_name)

          cluster = {
            **gene_cluster,
            "archive": archive_path_rel,
            "archive_files": add_files_result,
          }

          for key in ["GName", "dupli", "dup_detail"]:
            value = cluster[key].lower().strip()
            if value == "none" or value == "no":
              cluster[key] = None

          for key in ["allAnn", "allGName", "msa"]:
            del cluster[key]

          cluster["event"] = int(cluster["event"])
          cluster["divers"] = float(cluster["divers"])

          rename_dict_key(cluster, "geneId", "id")
          rename_dict_key(cluster, "geneLen", "length")
          rename_dict_key(cluster, "ann", "name")
          rename_dict_key(cluster, "GName", "mnemonic")
          rename_dict_key(cluster, "count", "num_strains")
          rename_dict_key(cluster, "event", "num_events")

          clusters.append(cluster)

  gene_cluster_v2_json = {
    "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    "clusters": clusters
  }

  gene_cluster_v2_json_path = join(species_out_path, "gene_cluster.json")
  with open(gene_cluster_v2_json_path, "w") as f:
    json.dump(gene_cluster_v2_json, f, indent=2, sort_keys=True)


def convert_data(index_json, in_dir, out_dir):
  dataset_in_path = join(in_dir, "dataset")
  dataset_out_path = join(out_dir, "dataset")
  index_json_path = join(out_dir, "index.json")

  if not isdir(dataset_in_path):
    raise NotADirectoryError(
      f"Input data root ('{in_dir}') should contain directory 'dataset', but it was not found")

  if not isfile(index_json_path):
    raise FileNotFoundError(
      f"Output data root ('{out_dir}') should contain file 'index.json', but it was not found")

  datasets = index_json["case_studies"] + index_json["orders"] + index_json["species"]
  for dataset in datasets:
    species_id = dataset["id"]
    species_in_path = join(dataset_in_path, species_id)
    species_out_path = join(dataset_out_path, species_id)
    generate_gene_cluster_json_and_archives_for_species(species_in_path, species_out_path)
    convert_tree_json_for_species(species_in_path, species_out_path)
    copy_remaining_files_for_species(species_in_path, species_out_path)


if __name__ == '__main__':
  in_dir = sys.argv[1]
  out_dir = sys.argv[2]
  os.makedirs(out_dir, exist_ok=True)
  index_json = generate_index_json(in_dir, out_dir)
  generate_not_found_json(out_dir)
  convert_data(index_json, in_dir, out_dir)
