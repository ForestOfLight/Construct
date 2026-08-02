"""Stand-ins for the two things the pipeline reaches out to - the downloaded
mcmeta assets and the packed texture atlas - so tests can describe a block's
data inline."""


class FakeMcmeta:
    def __init__(self, blockstates, models):
        self._blockstates = blockstates
        self._models = models

    def exists(self, path):
        name = path[len("assets/minecraft/blockstates/"):-len(".json")]
        return name in self._blockstates

    def read_json(self, path):
        if path.startswith("assets/minecraft/blockstates/"):
            name = path[len("assets/minecraft/blockstates/"):-len(".json")]
            return self._blockstates[name]
        model_id = path[len("assets/minecraft/models/"):-len(".json")]
        return self._models[model_id]


class FakeAtlas:
    def __init__(self, transparent=()):
        self.added = []
        self._transparent = set(transparent)

    def add(self, mcmeta, name):
        self.added.append(name)

    def is_opaque(self, name):
        return name not in self._transparent
