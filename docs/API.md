# API Reference

This section documents the public API of Construct, including all endpoints that can be accessed by other addons or scripts. This is intended for advanced users who want to extend or integrate with Construct beyond the provided CLI commands and GUI features.

# API Overview

Construct's API can be accessed via the [AddonAPIKit](https://github.com/ForestOflight/addonapikit) package. Instructions for importing the API into your project can be found in the AddonAPIKit documentation.

You'll need to include Construct's Data Model definitions in your project to work with the API effectively. These data models define the structure of the data passed to and from the API endpoints. They can be found at [`packs/BP/scripts/API/ConstructAPIModel.js`](https://github.com/ForestOfLight/Construct/blob/main/packs/BP/scripts/API/ConstructAPIModel.js). Copy the file into your project and import the models as needed.

Feedback on the Construct API is very welcome! If you have suggestions for new endpoints, improvements to existing ones, or any other feedback, please open a GitHub issue.

Detailed information about the available API endpoints can be found in the following pages:

- [Endpoints](./API/Endpoints.md)
- [Data Models](./API/DataModels.md)