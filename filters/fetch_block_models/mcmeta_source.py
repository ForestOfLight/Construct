"""Downloads and indexes the misode/mcmeta `assets` branch zip so the rest
of the pipeline can read blockstates, models, and textures by path without
hitting the network per file."""

import io
import json
import urllib.request
import zipfile

MCMETA_ZIP_URL = "https://github.com/misode/mcmeta/archive/refs/heads/assets.zip"
ZIP_ROOT = "mcmeta-assets/"  # GitHub zips nest everything under "<repo>-<branch>/"


class McmetaSource:
    def __init__(self, zip_bytes):
        self._zip = zipfile.ZipFile(io.BytesIO(zip_bytes))

    @classmethod
    def download(cls):
        req = urllib.request.Request(MCMETA_ZIP_URL, headers={"User-Agent": "construct-regolith-filter"})
        with urllib.request.urlopen(req) as resp:
            return cls(resp.read())

    def read_json(self, path):
        with self._zip.open(ZIP_ROOT + path) as f:
            return json.load(f)

    def read_bytes(self, path):
        with self._zip.open(ZIP_ROOT + path) as f:
            return f.read()

    def exists(self, path):
        return (ZIP_ROOT + path) in self._zip.namelist()
